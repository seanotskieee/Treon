import cv2
import numpy as np
import mediapipe as mp
import json
import os
from datetime import datetime
import logging
import time
import uuid

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger('TreonLip')

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
    3: rgb_to_bgr((144, 93, 85)),     # Whirl - Rosy brown
    4: rgb_to_bgr((142, 84, 65)),     # Taupe - Reddish brown nude
    5: rgb_to_bgr((75, 46, 44)),      # Double Fudge - Deep chocolate brown

    # NARS
    6: rgb_to_bgr((111, 60, 44)),     # Deborah - Chestnut brown
    7: rgb_to_bgr((155, 28, 45)),     # Cruella - Scarlet red
    8: rgb_to_bgr((148, 94, 87)),     # Slow Ride - Soft brown-pink
    9: rgb_to_bgr((202, 108, 117)),   # Tolede - Pink rose
    10: rgb_to_bgr((179, 95, 74)),    # Jane - Terracotta brown

    # Maybelline
    11: rgb_to_bgr((150, 88, 85)),    # Touch of Spice - Warm mauve nude
    12: rgb_to_bgr((193, 120, 101)),  # Clay Crush - Terracotta brown
    13: rgb_to_bgr((94, 22, 31)),     # Divine Wine - Deep burgundy
    14: rgb_to_bgr((77, 45, 41)),     # Raw Cocoa - Deep cocoa brown
    15: rgb_to_bgr((106, 62, 56)),    # Toasted Brown - Chocolate brown

    # L'Oréal
    16: rgb_to_bgr((173, 107, 101)),  # I Choose - Brownish-pink nude ink
    17: rgb_to_bgr((166, 23, 35)),    # Blake's Red - Bold classic red
    18: rgb_to_bgr((124, 76, 64)),    # Montmartre - Coffee brown
    19: rgb_to_bgr((74, 44, 40)),     # Mahogany Studs - Mahogany brown
    20: rgb_to_bgr((95, 62, 59)),     # I Dare - Deep neutral brown

    # AVON (Filipino favorites)
    21: rgb_to_bgr((125, 68, 54)),    # Toasted Rose - Warm brown-pink
    22: rgb_to_bgr((97, 54, 47)),     # Matte Cocoa - Dark chocolate brown
    23: rgb_to_bgr((157, 94, 80)),    # Mocha - Medium rosy brown
    24: rgb_to_bgr((113, 64, 55)),    # Marvelous Mocha - Soft brown matte
    25: rgb_to_bgr((150, 87, 69)),    # Brick Rose - Reddish-brown matte
}

# Session logging setup
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
SESSION_LOG_FILE = os.path.join(BASE_DIR, 'capture_sessions.json')
logger.debug(f"Session log path: {SESSION_LOG_FILE}")

# Brand information for shades
SHADE_BRANDS = {
    1: "MAC",
    2: "MAC",
    3: "MAC",
    4: "MAC",
    5: "MAC",
    6: "NARS",
    7: "NARS",
    8: "NARS",
    9: "NARS",
    10: "NARS",
    11: "Maybelline",
    12: "Maybelline",
    13: "Maybelline",
    14: "Maybelline",
    15: "Maybelline",
    16: "Loreal",
    17: "Loreal",
    18: "Loreal",
    19: "Loreal",
    20: "Loreal",
    21: "Avon",
    22: "Avon",
    23: "Avon",
    24: "Avon",
    25: "Avon"
}

# Globals
selected_color_key = 1
previous_lip_points = None
smoothing_factor = 0.65
current_session_start = None  # Tracks overall session start time
current_shade_start = None    # Tracks when current shade was selected
shade_times = {}              # Track time spent per shade

# Initialize webcam
cap = cv2.VideoCapture(0)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1920)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 1080)
cap.set(cv2.CAP_PROP_FPS, 60)

# Set lipstick shade
def set_color(color_id):
    global selected_color_key, current_session_start, current_shade_start, shade_times
    
    # Start session timer if this is the first shade selection
    if current_session_start is None:
        current_session_start = time.time()
        logger.info("Session timer started")
    
    # Record time spent on previous shade
    if current_shade_start:
        elapsed = time.time() - current_shade_start
        shade_times[selected_color_key] = shade_times.get(selected_color_key, 0) + elapsed
    
    selected_color_key = color_id
    current_shade_start = time.time()  # Track when this shade was selected
    logger.debug(f"Selected shade {color_id} at {time.time()}")

# Capture current frame with accurate session logging
def capture_frame():
    global selected_color_key, current_session_start, current_shade_start, shade_times
    ret, frame = cap.read()
    if ret:
        # Get brand information
        brand = SHADE_BRANDS.get(selected_color_key, "Unknown")
        
        # Calculate accurate session duration
        duration = "0m 0s"
        if current_session_start:
            # Add time for current shade
            if current_shade_start:
                elapsed = time.time() - current_shade_start
                shade_times[selected_color_key] = shade_times.get(selected_color_key, 0) + elapsed
            
            # Sum all shade times
            total_duration = sum(shade_times.values())
            
            # Format duration
            minutes = int(total_duration // 60)
            seconds = int(total_duration % 60)
            duration = f"{minutes}m {seconds}s"
            logger.info(f"Session duration: {duration}")
        
        # Create session entry with ID and image filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f'captured_image_{timestamp}.jpg'
        
        session_data = {
            "id": str(uuid.uuid4()),
            "datetime": datetime.now().strftime("%m/%d/%Y %H:%M"),
            "brand": brand,
            "shade_id": selected_color_key,
            "duration": duration,
            "image_filename": filename
        }
        
        # Save to log file
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
            
        # Save captured image with timestamp
        cv2.imwrite(filename, frame)
        logger.info(f"Image captured: {filename}")
        
        # Reset session tracking
        current_session_start = None
        current_shade_start = None
        shade_times = {}
        logger.info("Session timer reset")

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