# lip.py
"""
Hybrid landmark + segmentation lip overlay for TREON
- Uses MediaPipe FaceMesh each frame to follow facial geometry (landmarks)
- Uses an optional scripted BiSeNet-style segmentation model (if present in models/)
- Anchors segmentation output to landmark-derived lip bbox so overlay follows movement
- Uses a translated previous-mask + EMA smoothing (in full-frame coords) to reduce jitter
- Public functions kept: generate_frames(), set_color(), capture_frame(), update_products()
"""

import os
import cv2
import time
import uuid
import requests
import numpy as np
from datetime import datetime
import threading

# MediaPipe (stable landmark detection)
import mediapipe as mp

# Optional PyTorch for segmentation model
try:
    import torch
    TORCH_AVAILABLE = True
except Exception:
    TORCH_AVAILABLE = False

# -------------------------
# Config / Globals
# -------------------------
MODELS_DIR = "models"
BISENET_CANDIDATES = [
    os.path.join(MODELS_DIR, "bisenet.pth"),
    os.path.join(MODELS_DIR, "bisenet.jit"),
    os.path.join(MODELS_DIR, "bisenet_scripted.pth"),
    os.path.join(MODELS_DIR, "bisenet_scripted.jit"),
]

# MediaPipe Face Mesh
mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(
    static_image_mode=False,
    max_num_faces=1,
    refine_landmarks=True,
    min_detection_confidence=0.35,
    min_tracking_confidence=0.35
)

# Landmark indices (outer+inner lips)
LIPS = [
    61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308,
    324, 318, 402, 317, 14, 87, 178, 88, 95, 185, 40, 39, 37,
    0, 267, 269, 270, 409, 415, 310, 311, 312, 13, 82, 81, 42,
    183, 78
]

# Colors and admin products
ADMIN_COLORS = {}
ADMIN_COLORS_LOADED = False
selected_color_key = 1

# Video capture (keep your previous settings)
cap = cv2.VideoCapture(0)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
cap.set(cv2.CAP_PROP_FPS, 30)

# Smoothing / state
previous_lip_points = None
smoothing_factor = 0.4  # landmark smoothing (0..1, higher = keep prev)
last_processed_frame = None
last_mask_full = None          # last full-frame float mask in [0,1]
last_mask_center = None        # (cx, cy) center of bbox used to translate prev mask
ema_alpha = 0.6                # EMA coefficient (higher -> slower changes)

# Segmentation model related
seg_model = None
seg_device = torch.device("cpu") if TORCH_AVAILABLE else None
seg_input_size = (512, 512)  # model input size (H, W)
use_segmentation = False

# Morphology and feathering
MORPH_KERNEL = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
GAUSSIAN_BLUR_KERNEL = (9, 9)

# -------------------------
# Helpers: color conversions
# -------------------------
def rgb_to_bgr(rgb):
    return (rgb[2], rgb[1], rgb[0])

def hex_to_bgr(hex_color):
    """Convert hex color string to BGR tuple"""
    if not hex_color or hex_color == '#cccccc':
        return (204, 204, 204)  # Default gray
    hex_color = hex_color.lstrip('#')
    if len(hex_color) == 6:
        r = int(hex_color[0:2], 16)
        g = int(hex_color[2:4], 16)
        b = int(hex_color[4:6], 16)
    elif len(hex_color) == 3:
        r = int(hex_color[0]*2, 16)
        g = int(hex_color[1]*2, 16)
        b = int(hex_color[2]*2, 16)
    else:
        return (204, 204, 204)
    return (b, g, r)

# -------------------------
# Attempt to load segmentation model (non-blocking thread)
# -------------------------
def try_load_segmentation():
    global seg_model, seg_device, use_segmentation, seg_input_size
    if not TORCH_AVAILABLE:
        print("🔸 PyTorch not available — skipping segmentation model load.")
        use_segmentation = False
        return

    # Prefer CUDA if available
    if torch.cuda.is_available():
        seg_device = torch.device("cuda")
    else:
        seg_device = torch.device("cpu")

    for candidate in BISENET_CANDIDATES:
        if not os.path.exists(candidate):
            continue
        try:
            print(f"🔍 Trying to load segmentation model from {candidate} ...")
            # Prefer jit first
            try:
                model = torch.jit.load(candidate, map_location=seg_device)
                model.to(seg_device)
                model.eval()
                seg_model = model
                use_segmentation = True
                print(f"✅ Loaded scripted segmentation model from {candidate}")
                return
            except Exception as e_script:
                # try torch.load (maybe full model object saved)
                try:
                    loaded = torch.load(candidate, map_location=seg_device)
                    if isinstance(loaded, torch.nn.Module):
                        loaded.eval()
                        loaded.to(seg_device)
                        seg_model = loaded
                        use_segmentation = True
                        print(f"✅ Loaded segmentation model object via torch.load from {candidate}")
                        return
                    else:
                        print(f"⚠️ torch.load returned non-module for {candidate}, skipping.")
                except Exception as e_load:
                    print(f"⚠️ Failed to torch.load {candidate}: {e_load}")
        except Exception as e:
            print(f"⚠️ Unexpected error loading {candidate}: {e}")

    print("ℹ️ No usable segmentation model found. Continuing with landmark-only fallback.")
    use_segmentation = False

# Launch model loader in background so app starts quickly
threading.Thread(target=try_load_segmentation, daemon=True).start()

# -------------------------
# Admin color loading (kept from your app)
# -------------------------
def load_admin_colors():
    """Load colors from admin API"""
    global ADMIN_COLORS, ADMIN_COLORS_LOADED
    try:
        response = requests.get('http://localhost:5000/api/products', timeout=5)
        if response.status_code == 200:
            data = response.json()
            if data.get('status') == 'success':
                products = data.get('data', [])
                ADMIN_COLORS = {}
                color_id = 1
                for brand in products:
                    colors = brand.get('colors', [])
                    for color in colors:
                        hex_color = color.get('hex') or color.get('colorHex')
                        if hex_color:
                            bgr_color = hex_to_bgr(hex_color)
                            ADMIN_COLORS[color_id] = bgr_color
                            print(f"🎨 Loaded color {color_id}: {color.get('name')} -> {hex_color} -> BGR{bgr_color}")
                            color_id += 1
                ADMIN_COLORS_LOADED = True
                print(f"✅ Loaded {len(ADMIN_COLORS)} colors from admin")
                if not ADMIN_COLORS:
                    setup_fallback_colors()
            else:
                setup_fallback_colors()
        else:
            setup_fallback_colors()
    except Exception as e:
        print(f"❌ Failed to load admin colors: {e}")
        setup_fallback_colors()

def setup_fallback_colors():
    global ADMIN_COLORS, ADMIN_COLORS_LOADED
    print("⚠️ Using minimal fallback colors")
    fallback_colors = {
        1: rgb_to_bgr((179, 29, 39)),     # Red
        2: rgb_to_bgr((168, 108, 91)),    # Nude
        3: rgb_to_bgr((144, 93, 85)),     # Brown
    }
    ADMIN_COLORS = fallback_colors
    ADMIN_COLORS_LOADED = False

def update_products(products_data):
    """Update colors when admin changes products"""
    global ADMIN_COLORS
    try:
        ADMIN_COLORS = {}
        color_id = 1
        for brand in products_data:
            colors = brand.get('colors', [])
            for color in colors:
                hex_color = color.get('hex') or color.get('colorHex')
                if hex_color:
                    bgr_color = hex_to_bgr(hex_color)
                    ADMIN_COLORS[color_id] = bgr_color
                    color_id += 1
        print(f"🔄 Updated {len(ADMIN_COLORS)} colors from admin")
    except Exception as e:
        print(f"❌ Failed to update colors: {e}")

# -------------------------
# set_color kept as before
# -------------------------
def set_color(color_id):
    global selected_color_key
    selected_color_key = color_id

    # Get color name for logging (best-effort)
    color_name = "Unknown"
    try:
        response = requests.get('http://localhost:5000/api/products', timeout=2)
        if response.status_code == 200:
            data = response.json()
            if data.get('status') == 'success':
                products = data.get('data', [])
                current_id = 1
                for brand in products:
                    colors = brand.get('colors', [])
                    for color in colors:
                        if current_id == color_id:
                            color_name = color.get('name', 'Unknown')
                            break
                        current_id += 1
    except:
        pass

    print(f"🎨 Set color to ID {color_id} ({color_name})")

# -------------------------
# Capture function (kept behavior)
# -------------------------
def capture_frame(user_id=None):
    global last_processed_frame, last_mask_full
    if last_processed_frame is None or last_mask_full is None:
        return None, None

    if user_id is None:
        user_id = "temp_" + str(uuid.uuid4())[:8]

    session_folder = datetime.now().strftime("%Y%m%d")
    save_dir = os.path.join("static", "captures", session_folder)
    os.makedirs(save_dir, exist_ok=True)

    timestamp = datetime.now().strftime("%H%M%S")
    lipstick_path = os.path.join(save_dir, f"{user_id}_lipstick_{timestamp}.jpg")
    mask_path = os.path.join(save_dir, f"{user_id}_mask_{timestamp}.png")

    # Save lipstick-applied frame
    cv2.imwrite(lipstick_path, last_processed_frame)

    # Save mask as single-channel PNG (0..255)
    mask_to_save = (np.clip(last_mask_full, 0.0, 1.0) * 255).astype(np.uint8) if last_mask_full is not None else None
    if mask_to_save is not None:
        cv2.imwrite(mask_path, mask_to_save)
    else:
        h, w, _ = last_processed_frame.shape
        cv2.imwrite(mask_path, np.zeros((h, w), dtype=np.uint8))

    return lipstick_path, mask_path

# -------------------------
# Model preprocessing / postprocessing helpers
# -------------------------
def preprocess_for_model(img_bgr, size):
    """Resize and normalize to 0..1, CHW, return torch tensor if available"""
    img = cv2.resize(img_bgr, (size[1], size[0]), interpolation=cv2.INTER_LINEAR)
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    img = img.astype(np.float32) / 255.0
    img = np.transpose(img, (2, 0, 1))  # CHW
    img = np.expand_dims(img, 0).copy()  # 1,C,H,W
    if TORCH_AVAILABLE:
        tensor = torch.from_numpy(img).to(seg_device)
        return tensor
    return img

def postprocess_mask(mask_pred, target_size):
    """
    Convert a model output into a single-channel normalized mask resized to target_size (H,W).
    Accepts torch.Tensor or numpy arrays. If multi-channel, tries argmax to pick class.
    """
    if TORCH_AVAILABLE and isinstance(mask_pred, torch.Tensor):
        arr = mask_pred.detach().cpu().numpy()
    else:
        arr = np.array(mask_pred)

    # Normalize shape possibilities
    # If arr shape is (1, C, H, W) or (C, H, W) -> choose class index
    if arr.ndim == 4 and arr.shape[0] == 1:
        arr = arr[0]
    if arr.ndim == 3:
        # arr: (C, H, W) -> pick argmax along C if C>1 else squeeze
        if arr.shape[0] > 1:
            mask = np.argmax(arr, axis=0).astype(np.float32)
        else:
            mask = arr[0].astype(np.float32)
    else:
        mask = arr.astype(np.float32)

    # Normalize mask to 0..1
    if mask.max() > 1.0:
        mask = (mask - mask.min()) / (mask.max() - mask.min() + 1e-8)
    else:
        mask = np.clip(mask, 0.0, 1.0)

    # Resize to target
    mask_resized = cv2.resize(mask, (target_size[1], target_size[0]), interpolation=cv2.INTER_LINEAR)
    return mask_resized

# -------------------------
# Utility to translate previous mask by dx,dy using warpAffine
# -------------------------
def translate_mask(mask, dx, dy):
    """Translate single-channel mask (float) by dx,dy using warpAffine and border=0"""
    if mask is None:
        return None
    h, w = mask.shape[:2]
    M = np.float32([[1, 0, dx], [0, 1, dy]])
    shifted = cv2.warpAffine((mask*255).astype(np.uint8), M, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
    return (shifted.astype(np.float32) / 255.0)

# -------------------------
# Core pipeline: generate_frames
# -------------------------
def generate_frames():
    """
    Generator that yields MJPEG frames (bytes).
    This is the function used by Flask /video_feed endpoint.
    """
    global previous_lip_points, last_processed_frame, last_mask_full, last_mask_center, use_segmentation

    # Ensure admin colors loaded
    if not ADMIN_COLORS:
        load_admin_colors()

    while True:
        success, frame = cap.read()
        if not success:
            time.sleep(0.01)
            continue

        frame = cv2.flip(frame, 1)  # mirror
        h, w, _ = frame.shape
        out_frame = frame.copy()

        # pick desired color
        if selected_color_key in ADMIN_COLORS:
            desired_color = np.array(ADMIN_COLORS[selected_color_key], dtype=np.uint8)
        else:
            if ADMIN_COLORS:
                desired_color = np.array(list(ADMIN_COLORS.values())[0], dtype=np.uint8)
            else:
                desired_color = np.array([179, 29, 39], dtype=np.uint8)

        # Default per-frame mask (full-frame) in float 0..1
        current_mask_full = np.zeros((h, w), dtype=np.float32)
        current_bbox_center = None

        # Run MediaPipe to get face landmarks (always)
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_results = face_mesh.process(rgb)

        if mp_results.multi_face_landmarks and len(mp_results.multi_face_landmarks) > 0:
            face_lms = mp_results.multi_face_landmarks[0]

            # Compute lip polygon points in full-frame coords
            lip_pts = []
            for idx in LIPS:
                if idx < len(face_lms.landmark):
                    lm = face_lms.landmark[idx]
                    lip_pts.append([int(lm.x * w), int(lm.y * h)])
            # If too few points, ignore
            if len(lip_pts) >= 3:
                lip_pts_arr = np.array(lip_pts, dtype=np.int32)

                # Compute bounding box for the lips polygon and add padding
                xs = lip_pts_arr[:, 0]
                ys = lip_pts_arr[:, 1]
                min_x = max(int(xs.min()) - 8, 0)
                max_x = min(int(xs.max()) + 8, w - 1)
                min_y = max(int(ys.min()) - 6, 0)
                max_y = min(int(ys.max()) + 6, h - 1)

                bbox_w = max_x - min_x + 1
                bbox_h = max_y - min_y + 1
                current_bbox_center = ( (min_x + max_x) // 2, (min_y + max_y) // 2 )

                # Crop the lip bbox region for segmentation inference (if possible)
                lip_crop = frame[min_y:max_y+1, min_x:max_x+1]
                if lip_crop.size == 0:
                    lip_crop = frame.copy()

                crop_mask = None

                # Segmentation path (if model available)
                if use_segmentation and seg_model is not None:
                    try:
                        inp = preprocess_for_model(lip_crop, seg_input_size)
                        with torch.no_grad():
                            out = seg_model(inp)
                        # Try to interpret out and convert to single-channel mask
                        # postprocess_mask will attempt to pick channel/class
                        if isinstance(out, (list, tuple)):
                            out_candidate = out[0]
                        elif isinstance(out, dict):
                            # common keys
                            for k in ('out', 'mask', 'pred'):
                                if k in out:
                                    out_candidate = out[k]
                                    break
                            else:
                                # fallback: use first value
                                out_candidate = list(out.values())[0]
                        else:
                            out_candidate = out
                        crop_mask = postprocess_mask(out_candidate, (lip_crop.shape[0], lip_crop.shape[1]))
                        # Optional: if this mask appears empty, set to None to fallback
                        if crop_mask.sum() < 1e-5:
                            crop_mask = None
                    except Exception as e:
                        # segmentation failed for this frame; keep None and fallback to landmarks
                        crop_mask = None
                # Landmark-only fallback mask inside bbox
                if crop_mask is None:
                    # Build polygon relative coordinates for crop
                    rel_pts = lip_pts_arr - np.array([min_x, min_y])
                    poly_mask_crop = np.zeros((bbox_h, bbox_w), dtype=np.uint8)
                    if rel_pts.shape[0] >= 3:
                        cv2.fillPoly(poly_mask_crop, [rel_pts.astype(np.int32)], 255)
                        crop_mask = (poly_mask_crop.astype(np.float32) / 255.0)
                    else:
                        crop_mask = np.zeros((bbox_h, bbox_w), dtype=np.float32)

                # place crop_mask into full-frame coords
                current_mask_full[min_y:max_y+1, min_x:max_x+1] = crop_mask

        # -------------------------
        # Translate previous mask to current center and EMA smoothing
        # -------------------------
        if last_mask_full is None:
            # first frame: use current directly
            combined_mask = current_mask_full
        else:
            # compute translation dx,dy from previous center to current center
            if current_bbox_center is None or last_mask_center is None:
                # no reliable center -> fallback to simple EMA without translation
                combined_mask = ema_alpha * last_mask_full + (1.0 - ema_alpha) * current_mask_full
            else:
                dx = current_bbox_center[0] - last_mask_center[0]
                dy = current_bbox_center[1] - last_mask_center[1]
                # Shift previous mask by dx,dy
                shifted_prev = translate_mask(last_mask_full, dx, dy)
                # EMA between shifted previous and current
                combined_mask = ema_alpha * shifted_prev + (1.0 - ema_alpha) * current_mask_full

        # Postprocess combined_mask: morphology + blur + thresholding
        combined_uint8 = (np.clip(combined_mask, 0.0, 1.0) * 255).astype(np.uint8)
        # remove noise small speckles
        combined_uint8 = cv2.morphologyEx(combined_uint8, cv2.MORPH_OPEN, MORPH_KERNEL, iterations=1)
        combined_uint8 = cv2.morphologyEx(combined_uint8, cv2.MORPH_CLOSE, MORPH_KERNEL, iterations=1)
        # feather edges
        combined_blurred = cv2.GaussianBlur(combined_uint8, GAUSSIAN_BLUR_KERNEL, 0).astype(np.float32) / 255.0

        # small area check to avoid ghosting when no lips present
        area_thresh = 0.0025  # fraction of frame area
        detected_area = (combined_blurred > 0.15).sum()
        if detected_area > (h * w * area_thresh):
            last_mask_full = combined_blurred  # keep mask for capture
            last_mask_center = current_bbox_center
        else:
            # no confident detection -> fade mask out smoothly
            last_mask_full = ema_alpha * last_mask_full + (1-ema_alpha) * combined_blurred
            # zero small values
            last_mask_full[last_mask_full < 0.02] = 0.0
            # keep center as previous to allow translational smoothing next frame
            # (do not update last_mask_center in this branch)

        # If no mask at all, ensure last_mask_full is defined
        if last_mask_full is None:
            last_mask_full = np.zeros((h, w), dtype=np.float32)

        # -------------------------
        # Apply color overlay using last_mask_full
        # -------------------------
        if last_mask_full.sum() > 0:
            overlay = np.zeros_like(out_frame, dtype=np.uint8)
            overlay[:] = desired_color  # BGR
            mask_3ch = np.repeat(np.clip(last_mask_full[:, :, None], 0.0, 1.0), 3, axis=2)
            feathered = (overlay.astype(np.float32) * mask_3ch + out_frame.astype(np.float32) * (1 - mask_3ch)).astype(np.uint8)
            # subtle addWeighted to preserve texture
            blended = cv2.addWeighted(out_frame, 0.7, feathered, 0.3, 0)
            # apply only to masked area
            mask_bool = (mask_3ch > 0.02)
            out_frame[mask_bool] = blended[mask_bool]

        # Save last processed frame for capture endpoint
        last_processed_frame = out_frame.copy()

        # Encode and yield for MJPEG stream
        ret, buffer = cv2.imencode('.jpg', out_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
        if not ret:
            continue
        frame_bytes = buffer.tobytes()
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

# -------------------------
# Load admin colors in background
# -------------------------
print("🔄 Loading admin colors...")
threading.Thread(target=load_admin_colors, daemon=True).start()
