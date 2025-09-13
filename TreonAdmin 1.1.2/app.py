from flask import Flask, Response, send_from_directory, render_template, jsonify, request
from lip import generate_frames, set_color, capture_frame
from flask_cors import CORS
import os
import json
import logging
from datetime import datetime, timedelta
import uuid
from collections import defaultdict

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger('TreonAdmin')

app = Flask(__name__, static_folder='.', template_folder='.')
CORS(app)

# Define session log file with absolute path
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
SESSION_LOG_FILE = os.path.join(BASE_DIR, 'capture_sessions.json')
logger.debug(f"Session log path: {SESSION_LOG_FILE}")

# Create empty session file if it doesn't exist
if not os.path.exists(SESSION_LOG_FILE):
    logger.info("Creating new session log file")
    with open(SESSION_LOG_FILE, 'w') as f:
        json.dump([], f)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/set_color/<int:color_id>')
def set_color_route(color_id):
    set_color(color_id)
    return ('', 204)

@app.route('/capture')
def capture_route():
    capture_frame()
    return '✅ Image captured!'

@app.route('/get_sessions')
def get_sessions():
    try:
        logger.debug("Fetching sessions data")
        if os.path.exists(SESSION_LOG_FILE):
            with open(SESSION_LOG_FILE, 'r') as f:
                try:
                    sessions = json.load(f)
                    logger.debug(f"Found {len(sessions)} sessions")
                    
                    # Format datetime to match your requested format
                    for session in sessions:
                        # Parse the original datetime
                        dt = datetime.strptime(session["datetime"], "%m/%d/%Y %H:%M")
                        # Format to: [Date / Time]
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
            
        # Find and remove session + delete image
        session_to_delete = None
        new_sessions = []
        for s in sessions:
            if s['id'] == session_id:
                session_to_delete = s
            else:
                new_sessions.append(s)
                
        # Delete image if exists
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
            
        # Find and update session
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
        
        # Calculate daily average
        today = datetime.now().date()
        daily_sessions = []
        daily_duration = 0
        
        # Calculate weekly average
        week_ago = today - timedelta(days=7)
        weekly_sessions = []
        weekly_duration = 0
        
        # Find peak sessions
        session_counts = defaultdict(int)
        
        for session in sessions:
            # Parse session datetime
            session_date = datetime.strptime(session["datetime"], "%m/%d/%Y %H:%M").date()
            session_duration = parse_duration(session["duration"])
            
            # Daily stats
            if session_date == today:
                daily_sessions.append(session)
                daily_duration += session_duration
                
            # Weekly stats
            if session_date >= week_ago:
                weekly_sessions.append(session)
                weekly_duration += session_duration
                
            # Peak sessions
            date_str = session_date.strftime("%m/%d/%Y")
            session_counts[date_str] += 1
            
        # Calculate averages
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
    """Convert 'Xm Ys' to seconds"""
    parts = duration_str.split()
    total_seconds = 0
    for part in parts:
        if 'm' in part:
            total_seconds += int(part.replace('m', '')) * 60
        elif 's' in part:
            total_seconds += int(part.replace('s', ''))
    return total_seconds

def format_duration(seconds):
    """Convert seconds to 'Xm Ys' format"""
    minutes = int(seconds // 60)
    seconds = int(seconds % 60)
    return f"{minutes}m {seconds}s"

@app.route('/<path:filename>')
def static_files(filename):
    return send_from_directory('.', filename)

if __name__ == '__main__':
    app.run(debug=True, port=5500)