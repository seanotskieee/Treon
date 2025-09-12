import cv2
import numpy as np
import mediapipe as mp

# Helper to convert RGB to BGR for OpenCV
def rgb_to_bgr(rgb):
    return (rgb[2], rgb[1], rgb[0])

# Initialize MediaPipe Face Mesh
mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(
    static_image_mode=False,
    max_num_faces=1,
    refine_landmarks=True,
    min_detection_confidence=0.3,
    min_tracking_confidence=0.3
)

# Indices for lip landmarks (outer + inner lips)
LIPS = [
    61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308,
    324, 318, 402, 317, 14, 87, 178, 88, 95, 185, 40, 39, 37,
    0, 267, 269, 270, 409, 415, 310, 311, 312, 13, 82, 81, 42,
    183, 78
]

# Filipino-favorite lipstick shades (brand grouped)
COLOR_OPTIONS = {
    # MAC
    1: rgb_to_bgr((179, 29, 39)),     # Ruby Woo
    2: rgb_to_bgr((168, 108, 91)),    # Velvet Teddy
    3: rgb_to_bgr((144, 93, 85)),     # Whirl – Rosy brown
    4: rgb_to_bgr((142, 84, 65)),     # Taupe

    # NARS
    5: rgb_to_bgr((111, 60, 44)),     # Deborah – Chestnut brown
    6: rgb_to_bgr((155, 28, 45)),     # Cruella
    7: rgb_to_bgr((148, 94, 87)),     # Slow Ride
    8: rgb_to_bgr((202, 108, 117)),   # Tolede

    # Maybelline
    9:  rgb_to_bgr((150, 88, 85)),    # Touch of Spice
    10: rgb_to_bgr((193, 120, 101)),  # Clay Crush
    11: rgb_to_bgr((94, 22, 31)),     # Divine Wine
    12: rgb_to_bgr((77, 45, 41)),     # Raw Cocoa

    # L’Oréal
    13: rgb_to_bgr((173, 107, 101)),  # I Choose
    14: rgb_to_bgr((166, 23, 35)),    # Blake’s Red
    15: rgb_to_bgr((124, 76, 64)),    # Montmartre
    16: rgb_to_bgr((74, 44, 40)),     # Mahogany Studs
}

# Globals
selected_color_key = 1
previous_lip_points = None
smoothing_factor = 0.75

# Initialize webcam
cap = cv2.VideoCapture(0)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1920)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 1080)
cap.set(cv2.CAP_PROP_FPS, 60)

print("Width:", cap.get(cv2.CAP_PROP_FRAME_WIDTH))
print("Height:", cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
print("FPS:", cap.get(cv2.CAP_PROP_FPS))

# Set lipstick shade
def set_color(color_id):
    global selected_color_key
    selected_color_key = color_id

# Capture current frame
def capture_frame():
    ret, frame = cap.read()
    if ret:
        cv2.imwrite('captured_image.jpg', frame)

# Stream frames with lipstick overlay
def generate_frames():
    global previous_lip_points

    while True:
        success, image = cap.read()
        if not success:
            break

        image = cv2.flip(image, 1)
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        results = face_mesh.process(image_rgb)

        h, w, _ = image.shape
        image_display = image.copy()
        desired_color = np.array(COLOR_OPTIONS[selected_color_key], dtype=np.uint8)

        if results.multi_face_landmarks:
            for face_landmarks in results.multi_face_landmarks:
                current_lip_points = [
                    [int(face_landmarks.landmark[idx].x * w), int(face_landmarks.landmark[idx].y * h)]
                    for idx in LIPS
                ]

                # Smooth landmark points to reduce jitter
                if previous_lip_points is None:
                    previous_lip_points = current_lip_points
                else:
                    for i in range(len(current_lip_points)):
                        prev_x, prev_y = previous_lip_points[i]
                        cur_x, cur_y = current_lip_points[i]
                        smooth_x = int(smoothing_factor * prev_x + (1 - smoothing_factor) * cur_x)
                        smooth_y = int(smoothing_factor * prev_y + (1 - smoothing_factor) * cur_y)
                        current_lip_points[i] = [smooth_x, smooth_y]
                    previous_lip_points = current_lip_points

                # Draw lip mask only on lips (not entire mouth)
                lip_mask = np.zeros((h, w), dtype=np.uint8)
                cv2.fillPoly(lip_mask, [np.array(current_lip_points, dtype=np.int32)], 255)

                # Prevent false overlays
                if cv2.countNonZero(lip_mask) > (h * w) * 0.003:
                    overlay = np.zeros_like(image)
                    cv2.fillPoly(overlay, [np.array(current_lip_points, dtype=np.int32)], desired_color.tolist())

                    # Feathered lipstick overlay
                    feathered = cv2.GaussianBlur(overlay, (15, 15), 0)
                    lip_mask_3ch = cv2.merge([lip_mask]*3).astype(bool)

                    # Blend with original
                    blended = cv2.addWeighted(image_display, 1.0, feathered, 0.3, 0)
                    image_display[lip_mask_3ch] = blended[lip_mask_3ch]

        # Encode final output
        encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), 95]
        ret, buffer = cv2.imencode('.jpg', image_display, encode_param)
        frame = buffer.tobytes()
        yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
