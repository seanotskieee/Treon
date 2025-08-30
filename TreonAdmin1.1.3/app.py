import cv2
from flask import Flask, Response, send_from_directory, render_template, jsonify, request
import numpy as np
from lip import generate_frames, set_color, capture_frame, update_colors_from_products
from flask_cors import CORS
import os
import json
import logging
from datetime import datetime, timedelta
import uuid
from collections import defaultdict

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger('TreonAdmin')

app = Flask(__name__, static_folder='.', template_folder='.')
CORS(app)

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
SESSION_LOG_FILE = os.path.join(BASE_DIR, 'capture_sessions.json')
RATINGS_FILE = os.path.join(BASE_DIR, 'customer_ratings.json')
logger.debug(f"Session log path: {SESSION_LOG_FILE}")

if not os.path.exists(SESSION_LOG_FILE):
    logger.info("Creating new session log file")
    with open(SESSION_LOG_FILE, 'w') as f:
        json.dump([], f)

if not os.path.exists(RATINGS_FILE):
    logger.info("Creating new ratings file")
    with open(RATINGS_FILE, 'w') as f:
        json.dump({"brands": {}, "colors": {}, "brand_colors": {}}, f)

# Pass session file path to lip module
from lip import set_session_log_file
set_session_log_file(SESSION_LOG_FILE)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/video_feed')
def video_feed():
    try:
        logger.info("Starting video feed")
        return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')
    except Exception as e:
        logger.error(f"Error in video feed: {e}")
        # Return a simple error message
        error_image = np.zeros((480, 640, 3), dtype=np.uint8)
        cv2.putText(error_image, "Camera Error", (220, 240), 
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
        ret, buffer = cv2.imencode('.jpg', error_image)
        frame = buffer.tobytes()
        return Response(b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + frame + b'\r\n', 
                        mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/set_color/<color_id>')
def set_color_route(color_id):
    if color_id == 'none':
        set_color(None)
    else:
        set_color(color_id)
    return ('', 204)

@app.route('/capture')
def capture_route():
    rating = request.args.get('rating', 0, type=int)
    filename = capture_frame(rating)
    return jsonify({"status": "success", "filename": filename})

@app.route('/submit_rating', methods=['POST'])
def submit_rating():
    try:
        data = request.json
        brand = data.get('brand')
        color_id = data.get('color_id')
        rating = data.get('rating')
        
        if not all([brand, color_id, rating]):
            return jsonify(success=False, error="Missing required fields"), 400
        
        brand_color_key = f"{brand}_{color_id}"
        
        if os.path.exists(RATINGS_FILE):
            with open(RATINGS_FILE, 'r') as f:
                ratings_data = json.load(f)
        else:
            ratings_data = {"brands": {}, "colors": {}, "brand_colors": {}}
        
        if brand not in ratings_data["brands"]:
            ratings_data["brands"][brand] = {"total": 0, "count": 0, "ratings": []}
        
        ratings_data["brands"][brand]["total"] += rating
        ratings_data["brands"][brand]["count"] += 1
        ratings_data["brands"][brand]["ratings"].append({
            "rating": rating,
            "timestamp": datetime.now().isoformat(),
            "color_id": color_id
        })
        
        if color_id not in ratings_data["colors"]:
            ratings_data["colors"][color_id] = {"total": 0, "count": 0, "ratings": []}
        
        ratings_data["colors"][color_id]["total"] += rating
        ratings_data["colors"][color_id]["count"] += 1
        ratings_data["colors"][color_id]["ratings"].append({
            "rating": rating,
            "timestamp": datetime.now().isoformat(),
            "brand": brand
        })
        
        if brand_color_key not in ratings_data["brand_colors"]:
            ratings_data["brand_colors"][brand_color_key] = {"total": 0, "count": 0, "ratings": []}
        
        ratings_data["brand_colors"][brand_color_key]["total"] += rating
        ratings_data["brand_colors"][brand_color_key]["count"] += 1
        ratings_data["brand_colors"][brand_color_key]["ratings"].append({
            "rating": rating,
            "timestamp": datetime.now().isoformat()
        })
        
        with open(RATINGS_FILE, 'w') as f:
            json.dump(ratings_data, f, indent=2)
        
        logger.info(f"Rating submitted: {brand} - {color_id} - {rating}")
        return jsonify(success=True)
        
    except Exception as e:
        logger.error(f"Error submitting rating: {e}")
        return jsonify(success=False, error=str(e)), 500

@app.route('/get_ratings')
def get_ratings():
    try:
        if not os.path.exists(RATINGS_FILE):
            return jsonify({"brands": {}, "colors": {}, "brand_colors": {}})
        
        with open(RATINGS_FILE, 'r') as f:
            ratings_data = json.load(f)
        
        result = {"brands": {}, "colors": {}, "brand_colors": {}}
        
        for brand, data in ratings_data["brands"].items():
            if data["count"] > 0:
                result["brands"][brand] = {
                    "average": round(data["total"] / data["count"], 1),
                    "count": data["count"],
                    "distribution": get_rating_distribution(data["ratings"])
                }
        
        for color_id, data in ratings_data["colors"].items():
            if data["count"] > 0:
                result["colors"][color_id] = {
                    "average": round(data["total"] / data["count"], 1),
                    "count": data["count"],
                    "distribution": get_rating_distribution(data["ratings"])
                }
                
        for brand_color_key, data in ratings_data.get("brand_colors", {}).items():
            if data["count"] > 0:
                result["brand_colors"][brand_color_key] = {
                    "average": round(data["total"] / data["count"], 1),
                    "count": data["count"],
                    "distribution": get_rating_distribution(data["ratings"])
                }
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error getting ratings: {e}")
        return jsonify({"brands": {}, "colors": {}, "brand_colors": {}})

def get_rating_distribution(ratings):
    distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    for rating in ratings:
        r = rating["rating"]
        if 1 <= r <= 5:
            distribution[r] += 1
    return distribution

@app.route('/clear_ratings', methods=['POST'])
def clear_ratings():
    try:
        empty_ratings = {"brands": {}, "colors": {}, "brand_colors": {}}
        with open(RATINGS_FILE, 'w') as f:
            json.dump(empty_ratings, f, indent=2)
        logger.info("All ratings have been cleared")
        return jsonify(success=True, ratings=empty_ratings)
    except Exception as e:
        logger.error(f"Error clearing ratings: {e}")
        return jsonify(success=False, error=str(e)), 500

@app.route('/get_sessions')
def get_sessions():
    try:
        logger.debug("Fetching sessions data")
        if os.path.exists(SESSION_LOG_FILE):
            with open(SESSION_LOG_FILE, 'r') as f:
                try:
                    sessions = json.load(f)
                    logger.debug(f"Found {len(sessions)} sessions")
                    
                    for session in sessions:
                        dt = datetime.strptime(session["datetime"], "%m/%d/%Y %H:%M")
                        session["formatted_datetime"] = dt.strftime("[%m/%d/%Y %H:%M]")
                    
                    return jsonify(sessions)
                except json.JSONDecodeError as e:
                    logger.error(f"JSON decode error: {e}")
                    return jsonify([])
        logger.warning("Session file does not exist")
        return jsonify([])
    except Exception as e:
        logger.error(f"Error getting sessions: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/delete_session', methods=['POST'])
def delete_session():
    try:
        session_id = request.json['id']
        if not os.path.exists(SESSION_LOG_FILE):
            return jsonify(success=False, error="Session file not found")
        
        with open(SESSION_LOG_FILE, 'r') as f:
            sessions = json.load(f)
            
        session_to_delete = None
        new_sessions = []
        for s in sessions:
            if s['id'] == session_id:
                session_to_delete = s
            else:
                new_sessions.append(s)
                
        if session_to_delete and 'image_filename' in session_to_delete:
            image_path = os.path.join(BASE_DIR, session_to_delete['image_filename'])
            try:
                if os.path.exists(image_path):
                    os.remove(image_path)
                    logger.info(f"✅ Deleted image: {image_path}")
                else:
                    logger.warning(f"⚠️ Image file not found: {image_path}")
            except Exception as e:
                logger.error(f"❌ Error deleting image: {e}")
        elif session_to_delete:
            logger.warning(f"⚠️ No image filename in session: {session_id}")
        
        with open(SESSION_LOG_FILE, 'w') as f:
            json.dump(new_sessions, f, indent=2)
            
        return jsonify(success=True)
        
    except Exception as e:
        logger.error(f"❌ Error deleting session: {e}")
        return jsonify(success=False, error=str(e))

@app.route('/update_session', methods=['POST'])
def update_session():
    try:
        data = request.json
        if not os.path.exists(SESSION_LOG_FILE):
            return jsonify(success=False, error="Session file not found")
        
        with open(SESSION_LOG_FILE, 'r') as f:
            sessions = json.load(f)
            
        for session in sessions:
            if session['id'] == data['id']:
                session['brand'] = data['brand']
                session['shade_id'] = data['shade_id']
                break
        
        with open(SESSION_LOG_FILE, 'w') as f:
            json.dump(sessions, f, indent=2)
            
        return jsonify(success=True)
        
    except Exception as e:
        logger.error(f"Error updating session: {e}")
        return jsonify(success=False, error=str(e))

@app.route('/get_session_stats')
def get_session_stats():
    try:
        if not os.path.exists(SESSION_LOG_FILE):
            return jsonify({
                "total_sessions": 0,
                "daily_avg": "0m 0s",
                "weekly_avg": "0m 0s",
                "peak_sessions": 0
            })
        
        with open(SESSION_LOG_FILE, 'r') as f:
            sessions = json.load(f)
            
        total_sessions = len(sessions)
        today = datetime.now().date()
        daily_sessions = []
        daily_duration = 0
        
        week_ago = today - timedelta(days=7)
        weekly_sessions = []
        weekly_duration = 0
        
        session_counts = defaultdict(int)
        
        for session in sessions:
            session_date = datetime.strptime(session["datetime"], "%m/%d/%Y %H:%M").date()
            session_duration = parse_duration(session["duration"])
            
            if session_date == today:
                daily_sessions.append(session)
                daily_duration += session_duration
                
            if session_date >= week_ago:
                weekly_sessions.append(session)
                weekly_duration += session_duration
                
            date_str = session_date.strftime("%m/%d/%Y")
            session_counts[date_str] += 1
            
        daily_avg = format_duration(daily_duration / len(daily_sessions)) if daily_sessions else "0m 0s"
        weekly_avg = format_duration(weekly_duration / len(weekly_sessions)) if weekly_sessions else "0m 0s"
        peak_sessions = max(session_counts.values(), default=0)
        
        return jsonify({
            "total_sessions": total_sessions,
            "daily_avg": daily_avg,
            "weekly_avg": weekly_avg,
            "peak_sessions": peak_sessions
        })
        
    except Exception as e:
        logger.error(f"Error getting session stats: {e}")
        return jsonify({
            "total_sessions": 0,
            "daily_avg": "0m 0s",
            "weekly_avg": "0m 0s",
            "peak_sessions": 0
        })

def parse_duration(duration_str):
    parts = duration_str.split()
    total_seconds = 0
    for part in parts:
        if 'm' in part:
            total_seconds += int(part.replace('m', '')) * 60
        elif 's' in part:
            total_seconds += int(part.replace('s', ''))
    return total_seconds

def format_duration(seconds):
    minutes = int(seconds // 60)
    seconds = int(seconds % 60)
    return f"{minutes}m {seconds}s"

@app.route('/update_colors', methods=['POST'])
def update_colors():
    try:
        products = request.json
        update_colors_from_products(products)
        return jsonify(success=True)
    except Exception as e:
        logger.error(f"Error updating colors: {e}")
        return jsonify(success=False, error=str(e)), 500

@app.route('/get_products_from_server')
def get_products_from_server():
    try:
        from lip import COLOR_OPTIONS, SHADE_BRANDS
        products = []
        color_to_brand = {}
        for shade_id, brand in SHADE_BRANDS.items():
            color_to_brand[shade_id] = brand
        
        brands_data = {}
        for shade_id, color in COLOR_OPTIONS.items():
            brand_name = color_to_brand.get(shade_id, "Unknown")
            if brand_name not in brands_data:
                brands_data[brand_name] = []
            hex_color = f"#{color[2]:02x}{color[1]:02x}{color[0]:02x}"
            brands_data[brand_name].append({
                "name": shade_id.split('-', 1)[1] if '-' in shade_id else shade_id,
                "id": shade_id,
                "hex": hex_color.upper()
            })
        
        for brand, colors in brands_data.items():
            products.append({
                "id": hash(brand) % 10000,
                "brand": brand,
                "colors": colors
            })
        
        return jsonify(products)
    except Exception as e:
        logger.error(f"Error getting products from server: {e}")
        return jsonify([])

@app.route('/<path:filename>')
def static_files(filename):
    return send_from_directory('.', filename)

if __name__ == '__main__':
    app.run(debug=True, port=5500, threaded=True)
