import cv2
import numpy as np
import mediapipe as mp
import json
import os
from datetime import datetime
import logging
import time
import uuid

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger('TreonLip')

# Global for session log file
SESSION_LOG_FILE = None

def set_session_log_file(path):
    global SESSION_LOG_FILE
    SESSION_LOG_FILE = path

def rgb_to_bgr(rgb):
    return (rgb[2], rgb[1], rgb[0])

mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(
    static_image_mode=False,
    max_num_faces=1,
    refine_landmarks=True,
    min_detection_confidence=0.3,
    min_tracking_confidence=0.3
)

LIPS = [
    61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308,
    324, 318, 402, 317, 14, 87, 178, 88, 95, 185, 40, 39, 37,
    0, 267, 269, 270, 409, 415, 310, 311, 312, 13, 82, 81, 42,
    183, 78
]

# Initialize with empty colors - no defaults
COLOR_OPTIONS = {}
SHADE_BRANDS = {}

def update_colors_from_products(products):
    global COLOR_OPTIONS, SHADE_BRANDS
    new_colors = {}
    new_brands = {}
    
    logger.info(f"Updating colors from {len(products)} products")
    
    for product in products:
        try:
            hex_color = product['hex'].lstrip('#')
            if len(hex_color) == 6:
                rgb = tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
                new_colors[product['id']] = rgb_to_bgr(rgb)
                new_brands[product['id']] = product['brand']
                logger.debug(f"Added color: {product['id']} = {rgb_to_bgr(rgb)}")
        except Exception as e:
            logger.error(f"Error processing product: {e}")
            continue
    
    COLOR_OPTIONS = new_colors
    SHADE_BRANDS = new_brands
    logger.info(f"Updated with {len(COLOR_OPTIONS)} colors")

# Start with no color selected
selected_color_key = None
current_color = None
previous_lip_points = None
smoothing_factor = 0.65
current_session_start = None
current_shade_start = None
shade_times = {}

# Camera will be initialized in generate_frames
cap = None

def set_color(color_id):
    global selected_color_key, current_color, current_session_start, current_shade_start, shade_times
    
    logger.debug(f"Setting color to: {color_id}")
    
    if color_id is None or color_id == "none":
        # No color selected
        selected_color_key = None
        current_color = None
        logger.info("Color selection cleared")
        return
    
    if color_id not in COLOR_OPTIONS:
        logger.warning(f"Color ID {color_id} not found in COLOR_OPTIONS")
        return
    
    if current_session_start is None:
        current_session_start = time.time()
        logger.info("Session timer started")
    
    if current_shade_start:
        elapsed = time.time() - current_shade_start
        if selected_color_key:  # Only track if there was a previous color
            shade_times[selected_color_key] = shade_times.get(selected_color_key, 0) + elapsed
    
    selected_color_key = color_id
    current_color = COLOR_OPTIONS[color_id]
    current_shade_start = time.time()
    logger.info(f"Selected shade {color_id} at {time.time()}")
    logger.info(f"Current color set to: {current_color}")

def capture_frame(rating=0):
    global selected_color_key, current_session_start, current_shade_start, shade_times
    # We'll capture from the last frame in generate_frames
    brand = SHADE_BRANDS.get(selected_color_key, "None") if selected_color_key else "None"
    
    duration = "0m 0s"
    if current_session_start:
        if current_shade_start and selected_color_key:
            elapsed = time.time() - current_shade_start
            shade_times[selected_color_key] = shade_times.get(selected_color_key, 0) + elapsed
        
        total_duration = sum(shade_times.values())
        
        minutes = int(total_duration // 60)
        seconds = int(total_duration % 60)
        duration = f"{minutes}m {seconds}s"
        logger.info(f"Session duration: {duration}")
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f'captured_image_{timestamp}.jpg'
    
    session_data = {
        "id": str(uuid.uuid4()),
        "datetime": datetime.now().strftime("%m/%d/%Y %H:%M"),
        "brand": brand,
        "shade_id": selected_color_key or "None",
        "duration": duration,
        "image_filename": filename,
        "rating": rating  # Add the rating to session data
    }
    
    try:
        sessions = []
        if os.path.exists(SESSION_LOG_FILE):
            try:
                with open(SESSION_LOG_FILE, 'r') as f:
                    sessions = json.load(f)
            except:
                sessions = []
                
        sessions.append(session_data)
        
        with open(SESSION_LOG_FILE, 'w') as f:
            json.dump(sessions, f, indent=2)
            
    except Exception as e:
        logger.error(f"Error saving session: {e}")
    
    # We'll actually save the image in generate_frames
    logger.info(f"Image capture requested: {filename}")
    
    current_session_start = None
    current_shade_start = None
    shade_times = {}
    logger.info("Session timer reset")
    
    return filename

def generate_frames():
    global previous_lip_points, current_color, cap
    
    frame_counter = 0
    last_frame = None
    capture_requested = False
    capture_filename = ""
    
    while True:
        try:
            # Initialize camera if not opened
            if cap is None or not cap.isOpened():
                logger.info("Initializing camera...")
                cap = cv2.VideoCapture(0)
                if not cap.isOpened():
                    logger.error("Cannot open camera")
                    # Create a black frame
                    image = np.zeros((480, 640, 3), dtype=np.uint8)
                    cv2.putText(image, "Camera Error", (220, 240), 
                                cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
                    ret, buffer = cv2.imencode('.jpg', image)
                    frame = buffer.tobytes()
                    yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
                    time.sleep(0.1)
                    continue
                else:
                    logger.info("Camera opened successfully")
                    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
                    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
                    cap.set(cv2.CAP_PROP_FPS, 30)
            
            ret, image = cap.read()
            if not ret:
                logger.error("Failed to grab frame from camera")
                # Release and reopen the camera
                cap.release()
                cap = None
                logger.info("Released camera. Trying to reopen...")
                time.sleep(0.1)
                continue

            image = cv2.flip(image, 1)
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            results = face_mesh.process(image_rgb)

            h, w, _ = image.shape
            image_display = image.copy()
            
            # Log current color every 30 frames for debugging
            frame_counter += 1
            if frame_counter % 30 == 0:
                logger.debug(f"Current color: {current_color} for shade: {selected_color_key}")

            # Only apply lip color if a color is selected
            if current_color and results.multi_face_landmarks:
                for face_landmarks in results.multi_face_landmarks:
                    current_lip_points = [
                        [int(face_landmarks.landmark[idx].x * w), int(face_landmarks.landmark[idx].y * h)]
                        for idx in LIPS
                    ]

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

                    lip_mask = np.zeros((h, w), dtype=np.uint8)
                    cv2.fillPoly(lip_mask, [np.array(current_lip_points, dtype=np.int32)], 255)

                    if cv2.countNonZero(lip_mask) > (h * w) * 0.003:
                        overlay = np.zeros_like(image)
                        cv2.fillPoly(overlay, [np.array(current_lip_points, dtype=np.int32)], current_color)

                        feathered = cv2.GaussianBlur(overlay, (15, 15), 0)
                        lip_mask_3ch = cv2.merge([lip_mask]*3).astype(bool)

                        blended = cv2.addWeighted(image_display, 1.0, feathered, 0.3, 0)
                        image_display[lip_mask_3ch] = blended[lip_mask_3ch]
                    else:
                        logger.warning("Lip mask too small to apply filter")
            
            # Save last frame for capture
            last_frame = image_display.copy()
            
            # Handle capture request
            if capture_requested:
                cv2.imwrite(capture_filename, last_frame)
                logger.info(f"Image captured: {capture_filename}")
                capture_requested = False

            # Display the frame
            ret, buffer = cv2.imencode('.jpg', image_display)
            if not ret:
                logger.error("Failed to encode image")
                continue
                
            frame = buffer.tobytes()
            yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
            
        except Exception as e:
            logger.error(f"Error in frame generation: {e}")
            # Create error frame
            error_frame = np.zeros((480, 640, 3), dtype=np.uint8)
            cv2.putText(error_frame, "Camera Error", (220, 240), 
                        cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
            ret, buffer = cv2.imencode('.jpg', error_frame)
            frame = buffer.tobytes()
            yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
            time.sleep(0.1)