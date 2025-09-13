import cv2
import numpy as np
import mediapipe as mp
import requests
import mysql.connector
import datetime

# MySQL Connection Setup
mysql_conn = mysql.connector.connect(
    host='localhost',
    user='root',
    password='',
    database='appiots'
)
mysql_cursor = mysql_conn.cursor()

# MediaPipe setup
mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(
    static_image_mode=False,
    max_num_faces=1,
    refine_landmarks=True,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

LIPS = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95, 185, 40, 39, 37, 0, 267, 269, 270, 409, 415, 310, 311, 312, 13, 82, 81, 42, 183, 78]

# Create windows
cv2.namedWindow('Lipstick Color Adjustments')  # For trackbars
cv2.namedWindow('Virtual Lipstick Application')  # Main screen
cv2.namedWindow('Lip Landmarks Preview')  # New window for dots
cv2.namedWindow('Lip Mask')  # Existing mask window

def nothing(x): pass
cv2.createTrackbar('B', 'Lipstick Color Adjustments', 0, 255, nothing)
cv2.createTrackbar('G', 'Lipstick Color Adjustments', 0, 255, nothing)
cv2.createTrackbar('R', 'Lipstick Color Adjustments', 255, 255, nothing)

cap = cv2.VideoCapture(0)
apply_lipstick = True

def upload_to_php(filename):
    url = "http://localhost/upload.php"
    try:
        with open(filename, 'rb') as f:
            files = {'photo': f}
            response = requests.post(url, files=files)
            print("Upload response:", response.text)
    except Exception as e:
        print("Upload failed:", e)

def get_average_skin_color(image, landmarks, padding=10):
    h, w, _ = image.shape
    x_coords = [int(landmarks.landmark[i].x * w) for i in LIPS]
    y_coords = [int(landmarks.landmark[i].y * h) for i in LIPS]
    x_min, x_max = min(x_coords) - padding, max(x_coords) + padding
    y_min, y_max = min(y_coords) - padding, max(y_coords) + padding

    x_min = max(x_min, 0)
    y_min = max(y_min, 0)
    x_max = min(x_max, w)
    y_max = min(y_max, h)

    roi = image[y_min:y_max, x_min:x_max]
    avg_color = np.mean(roi, axis=(0, 1))
    return avg_color

while cap.isOpened():
    success, image = cap.read()
    if not success:
        break

    image = cv2.flip(image, 1)
    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    results = face_mesh.process(image_rgb)

    b = cv2.getTrackbarPos('B', 'Lipstick Color Adjustments')
    g = cv2.getTrackbarPos('G', 'Lipstick Color Adjustments')
    r = cv2.getTrackbarPos('R', 'Lipstick Color Adjustments')
    desired_color = np.array([b, g, r], dtype=np.uint8)

    image_display = image.copy()  # Main screen (no dots)
    landmarks_image = image.copy()  # New screen (with dots)
    image_save = image.copy()

    if results.multi_face_landmarks:
        for face_landmarks in results.multi_face_landmarks:
            h, w, _ = image.shape
            lip_points = []
            
            # Draw green dots on LANDMARKS_IMAGE
            for idx in LIPS:
                x = int(face_landmarks.landmark[idx].x * w)
                y = int(face_landmarks.landmark[idx].y * h)
                lip_points.append([x, y])
                cv2.circle(landmarks_image, (x, y), 1, (0, 255, 0), -1)  # Sa lain na window

            lip_mask = np.zeros((h, w), dtype=np.uint8)
            lip_points_array = np.array([lip_points], dtype=np.int32)
            cv2.fillPoly(lip_mask, lip_points_array, 255)

            if apply_lipstick:
                average_color = get_average_skin_color(image, face_landmarks, padding=10)
                avg_color = np.array(average_color, dtype=np.uint8)
                blend_ratio = 0.5
                adjusted_color = cv2.addWeighted(desired_color, blend_ratio, avg_color, 1 - blend_ratio, 0)
                b_adj, g_adj, r_adj = adjusted_color

                alpha = 0.3
                overlay = np.zeros_like(image)
                cv2.fillPoly(overlay, lip_points_array, (int(b_adj), int(g_adj), int(r_adj)))
                feathered_overlay = cv2.GaussianBlur(overlay, (15, 15), 0)
                image_display = cv2.addWeighted(feathered_overlay, alpha, image_display, 1 - alpha, 0)
                image_save = cv2.addWeighted(feathered_overlay, alpha, image_save, 1 - alpha, 0)

            cv2.imshow('Lip Mask', lip_mask)

    # Text overlay sa MAIN SCREEN
    cv2.putText(image_display, "Press 'c' to capture & upload photo", (10, 30),
                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2, cv2.LINE_AA)
    cv2.putText(image_display, "Press 't' to toggle lipstick", (10, 60),
                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2, cv2.LINE_AA)
    cv2.putText(image_display, "Press 'ESC' to exit", (10, 90),
                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2, cv2.LINE_AA)

    # Display all 3 screens
    cv2.imshow('Virtual Lipstick Application', image_display)
    cv2.imshow('Lip Landmarks Preview', landmarks_image)
    cv2.imshow('Lip Mask', lip_mask)

    key = cv2.waitKey(5) & 0xFF
    if key == 27:
        break
    elif key == ord('t'):
        apply_lipstick = not apply_lipstick
    elif key == ord('c'):
        filename = "captured_lipstick.jpg"
        cv2.imwrite(filename, image_save)
        print(f"Saved {filename}")

        # Save to MySQL
        with open(filename, 'rb') as f:
            image_data = f.read()

        insert_query = """
            INSERT INTO Photos (timestamp, image_data, file_name)
            VALUES (%s, %s, %s)
        """
        current_time = datetime.datetime.now()
        mysql_cursor.execute(insert_query, (current_time, image_data, filename))
        mysql_conn.commit()
        print("✅ Photo saved to MySQL.")

        upload_to_php(filename)
        saved_image = cv2.imread(filename)
        if saved_image is not None:
            cv2.imshow('Saved Photo', saved_image)
        else:
            print("Failed to load the saved image.")

# Cleanup
mysql_cursor.close()
mysql_conn.close()
cap.release()
cv2.destroyAllWindows()
