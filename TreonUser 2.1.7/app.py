import csv
import os
import uuid
import json
import lip
import firebase_admin
from firebase_admin import credentials, firestore, storage
from datetime import datetime
from flask import send_file
from flask import Flask, Response, send_from_directory, render_template, request, jsonify
from lip import generate_frames, set_color, capture_frame
import pytz

# Philippine Timezone
ph_timezone = pytz.timezone('Asia/Manila')

def get_ph_time():
    """Get current time in Philippine Timezone"""
    return datetime.now(ph_timezone)

def format_ph_time(dt=None):
    """Format datetime to ISO string in Philippine Timezone"""
    if dt is None:
        dt = get_ph_time()
    return dt.isoformat()

def format_display_time(dt=None):
    """Format datetime to human-readable format: 'September 18, 2025 at 6:25:39 PM UTC+8'"""
    if dt is None:
        dt = get_ph_time()
    
    # Format: Month day, Year at hour:minute:second AM/PM UTC+8
    formatted = dt.strftime("%B %d, %Y at %I:%M:%S %p UTC+8")
    
    # Remove leading zero from day (change "September 05" to "September 5")
    formatted = formatted.replace(" 0", " ")
    
    return formatted

def convert_to_ph_time(naive_dt):
    """Convert naive datetime to Philippine Timezone"""
    if naive_dt.tzinfo is None:
        return ph_timezone.localize(naive_dt)
    return naive_dt.astimezone(ph_timezone)

# 🔹 Firebase initialization with service account
firebase_initialized = False
db = None
bucket = None

try:
    # Check if service account file exists
    if not os.path.exists("serviceAccountKey.json"):
        raise FileNotFoundError("serviceAccountKey.json not found")
    print("✅ Service account file found")
    
    cred = credentials.Certificate("serviceAccountKey.json")
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("✅ Firestore client created")
    
    # Try to initialize Storage with better error handling
    try:
        bucket = storage.bucket()
        # Test storage access
        test_blob = bucket.blob("test_connection.txt")
        test_blob.upload_from_string("Connection test successful")
        print("✅ Firebase Storage initialized and tested successfully")
    except Exception as storage_error:
        print(f"⚠️ Firebase Storage initialization failed: {storage_error}")
        print("💡 Please enable Firebase Storage in your project console")
        bucket = None  # Continue without storage
    
    # Test Firestore connection
    test_doc = db.collection('connection_test').document('test')
    test_doc.set({
        'timestamp': format_ph_time(),
        'message': 'Firebase connection test',
        'storage_available': bucket is not None
    })
    print("✅ Firestore connection test successful")
    
    firebase_initialized = True
    print("✅ Firebase initialized successfully")
    
except FileNotFoundError:
    print("❌ serviceAccountKey.json file not found in the current directory")
    firebase_initialized = False
    db = None
    bucket = None
    
except ValueError as e:
    print(f"❌ Invalid service account key format: {e}")
    firebase_initialized = False
    db = None
    bucket = None
    
except Exception as e:
    error_msg = str(e)
    if "database (default) does not exist" in error_msg:
        print("❌ Firestore database not created. Please:")
        print("   1. Go to Firebase Console → Firestore Database")
        print("   2. Create the database")
        print("   3. Wait a few minutes, then restart your app")
    elif "storage" in error_msg.lower() or "bucket" in error_msg.lower():
        print("❌ Firebase Storage not enabled. Please:")
        print("   1. Go to Firebase Console → Storage")
        print("   2. Click 'Get Started' and create storage bucket")
        print("   3. Storage will be available after creation")
    else:
        print(f"⚠️ Firebase initialization error: {error_msg}")
    firebase_initialized = False
    db = None
    bucket = None
    

app = Flask(__name__, static_folder='.', template_folder='.')

# In-memory sessions
sessions = {}

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

@app.route('/capture', methods=['POST'])
def capture():
    data = request.get_json()
    user_id = data.get("user_id", "guest")
    
    save_dir = os.path.join("static", "captures")
    os.makedirs(save_dir, exist_ok=True)

    lipstick_path, mask_path = lip.capture_frame(user_id)
    if lipstick_path is None or mask_path is None:
        return jsonify({"status": "error", "message": "Capture failed"}), 500

    # Upload images to Firebase Storage and save URLs to Firestore
    lipstick_url = None
    mask_url = None
    capture_id = str(uuid.uuid4())
    timestamp = get_ph_time()
    
    if firebase_initialized:
        try:
            # Generate unique filenames with PH time
            lipstick_filename = f"captures/{user_id}_{timestamp.strftime('%Y%m%d_%H%M%S')}_lipstick.png"
            mask_filename = f"captures/{user_id}_{timestamp.strftime('%Y%m%d_%H%M%S')}_mask.png"
            
            # Upload to Firebase Storage if available
            if bucket:
                try:
                    # Upload lipstick image
                    lipstick_blob = bucket.blob(lipstick_filename)
                    lipstick_blob.upload_from_filename(lipstick_path)
                    lipstick_url = lipstick_blob.public_url
                    
                    # Upload mask image
                    mask_blob = bucket.blob(mask_filename)
                    mask_blob.upload_from_filename(mask_path)
                    mask_url = mask_blob.public_url
                    
                    print(f"📸 Images uploaded to Firebase Storage for user {user_id}")
                except Exception as upload_error:
                    print(f"⚠️ Storage upload failed: {upload_error}")
                    # Continue without storage URLs
            
            # Save capture metadata to Firestore
            capture_data = {
                "capture_id": capture_id,
                "user_id": user_id,
                "timestamp": format_ph_time(timestamp),
                "lipstick_image_url": lipstick_url,
                "mask_image_url": mask_url,
                "local_paths": {
                    "lipstick": lipstick_path,
                    "mask": mask_path
                },
                "storage_available": bucket is not None,
                "upload_successful": lipstick_url is not None and mask_url is not None
            }
            
            # Add storage paths if upload was successful
            if lipstick_url and mask_url:
                capture_data["storage_paths"] = {
                    "lipstick": lipstick_filename,
                    "mask": mask_filename
                }
            
            # Save to Firestore
            db.collection("captures").document(capture_id).set(capture_data)
            print(f"💾 Capture metadata saved to Firestore for user {user_id}")
            
        except Exception as e:
            print(f"❌ Failed to save capture data: {e}")
            # Continue to return local paths even if Firebase fails

    return jsonify({
        "status": "success",
        "capture_id": capture_id,
        "lipstick_path": f"/{lipstick_path}",
        "mask_path": f"/{mask_path}",
        "lipstick_url": lipstick_url,
        "mask_url": mask_url,
        "user_id": user_id,
        "timestamp": format_ph_time(timestamp)
    })

# Test Firebase connection with better error reporting
@app.route('/test_firebase')
def test_firebase():
    if not firebase_initialized:
        return jsonify({
            "status": "error", 
            "message": "Firebase not initialized. Check console for details."
        })
    
    try:
        # Test both write and read operations
        test_id = str(uuid.uuid4())
        doc_ref = db.collection('test_connections').document(test_id)
        
        # Write test data
        test_data = {
            'test': 'connection_test',
            'timestamp': format_ph_time(),
            'status': 'success',
            'id': test_id
        }
        doc_ref.set(test_data)
        
        # Read test data back
        doc = doc_ref.get()
        if doc.exists:
            return jsonify({
                "status": "success", 
                "message": "Firebase connection successful!",
                "data": doc.to_dict()
            })
        else:
            return jsonify({
                "status": "error", 
                "message": "Write succeeded but read failed"
            })
            
    except Exception as e:
        error_msg = str(e)
        if "database (default) does not exist" in error_msg:
            return jsonify({
                "status": "error",
                "message": "Firestore database not created. Please create it in Firebase console."
            })
        else:
            return jsonify({
                "status": "error", 
                "message": f"Firebase error: {error_msg}"
            })
        
# Check Firebase status and configuration
@app.route('/firebase_status')
def firebase_status():
    status = {
        "initialized": firebase_initialized,
        "service_account_exists": os.path.exists("serviceAccountKey.json"),
        "project_id": "treondatabase",
        "current_time": format_ph_time(),
        "storage_available": bucket is not None
    }
    
    if firebase_initialized:
        try:
            # Try to list collections to verify connection
            collections = db.collections()
            status["collections_count"] = len(list(collections))
            status["connection"] = "active"
        except Exception as e:
            status["connection"] = f"error: {str(e)}"
    
    return jsonify(status)

# Get all captures for a specific user
@app.route('/user_captures/<user_id>')
def get_user_captures(user_id):
    if not firebase_initialized:
        return jsonify({"error": "Firebase not initialized"}), 500
    
    try:
        captures_ref = db.collection("captures")
        query = captures_ref.where("user_id", "==", user_id).order_by("timestamp", direction=firestore.Query.DESCENDING)
        docs = query.stream()
        
        captures = []
        for doc in docs:
            capture_data = doc.to_dict()
            capture_data["id"] = doc.id
            captures.append(capture_data)
        
        return jsonify({
            "status": "success",
            "user_id": user_id,
            "captures": captures,
            "count": len(captures)
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
        
# ⭐ Start session when Try-On screen loads
@app.route('/start_session', methods=['POST'])
def start_session():
    user_id = str(uuid.uuid4())
    start_time = get_ph_time()

    sessions[user_id] = {
        "start_time": start_time,
        "end_time": None,
        "shades": [],
        "current_shade": None,
        "current_shade_start": None,
        "shade_ratings": [],
        "feedback": None
    }

    print(f"\n🎬 Session started for user {user_id} at {format_display_time(start_time)}")  # CHANGED
    return jsonify({"user_id": user_id}), 200


# ⭐ Log shade usage
@app.route('/log_shade', methods=['POST'])
def log_shade():
    data = request.get_json()
    user_id = data.get("user_id")
    shade_id = data.get("shade_id")

    if user_id not in sessions:
        return jsonify({"error": "Invalid session"}), 400

    now = get_ph_time()
    session = sessions[user_id]

    # close previous shade if exists
    if session["current_shade"]:
        duration = (now - session["current_shade_start"]).total_seconds()
        session["shades"].append({
            "shade_id": session["current_shade"],
            "start": format_display_time(session["current_shade_start"]) if session["current_shade_start"] else None,  # CHANGED
            "end": format_display_time(now),  # CHANGED
            "duration_sec": duration
        })

    # start new shade
    session["current_shade"] = shade_id
    session["current_shade_start"] = now

    print(f"💄 User {user_id} switched to shade {shade_id} at {format_display_time(now)}")  # CHANGED
    return jsonify({"message": "Shade logged"}), 200

# ⭐ End session at Privacy screen
@app.route('/end_session', methods=['POST'])
def end_session():
    data = request.get_json()
    user_id = data.get("user_id")
    feedback = data.get("feedback")

    if user_id not in sessions:
        return jsonify({"error": "Invalid session"}), 400

    now = get_ph_time()
    session = sessions[user_id]

    # Close last shade if active
    if session["current_shade"]:
        duration = (now - session["current_shade_start"]).total_seconds()
        session["shades"].append({
            "shade_id": session["current_shade"],
            "start": format_display_time(session["current_shade_start"]) if session["current_shade_start"] else None,  # CHANGED
            "end": format_display_time(now),  # CHANGED
            "duration_sec": duration
        })

    # Attach session end
    session["end_time"] = now
    total_duration = (session["end_time"] - session["start_time"]).total_seconds()

    # ✅ Attach feedback
    if feedback and not session.get("feedback"):
        session["feedback"] = {
            "rating": feedback.get("rating"),
            "comment": feedback.get("comment"),
            "time": format_display_time()  # CHANGED
        }

    # ✅ Save feedback to CSV only once (keep ISO format for CSV)
    if session.get("feedback") and not session.get("feedback").get("saved"):
        file_exists = os.path.isfile("feedback.csv")
        with open("feedback.csv", mode="a", newline="", encoding="utf-8") as file:
            writer = csv.writer(file)
            if not file_exists:
                writer.writerow(["timestamp", "user_id", "rating", "comment"])
            writer.writerow([
                format_ph_time(),  # Keep ISO format for CSV
                user_id,
                session["feedback"]["rating"],
                session["feedback"]["comment"]
            ])
        session["feedback"]["saved"] = True
        print(f"📝 Feedback from {user_id} - Rating: {session['feedback']['rating']}, Comment: {session['feedback']['comment']}")

    print(f"🛑 Session ended for user {user_id} at {format_display_time(now)} (Duration: {total_duration:.2f} sec)")  # CHANGED

    # 🔹 Prepare JSON-safe copy
    session_copy = session.copy()
    session_copy["start_time"] = format_display_time(session_copy["start_time"]) if session_copy["start_time"] else None  # CHANGED
    session_copy["end_time"] = format_display_time(session_copy["end_time"]) if session_copy["end_time"] else None  # CHANGED
    
    # Convert any datetime objects in shade_ratings
    if "shade_ratings" in session_copy:
        for rating in session_copy["shade_ratings"]:
            if "time" in rating and isinstance(rating["time"], datetime):
                rating["time"] = format_display_time(rating["time"])  # CHANGED

    # ✅ Save session JSON file
    os.makedirs("sessions", exist_ok=True)
    json_filename = f"sessions/{user_id}_{now.strftime('%Y%m%d_%H%M%S')}.json"
    with open(json_filename, "w", encoding="utf-8") as f:
        json.dump(session_copy, f, indent=4, ensure_ascii=False, default=str)
    print(f"💾 Session saved locally as {json_filename}")

    # 🔹 Send to Firebase if ready
    if firebase_initialized:
        try:
            firebase_data = session_copy.copy()
            db.collection("sessions").add(firebase_data)
            print(f"🌐 Session sent to Firebase for user {user_id}")
        except Exception as e:
            print("⚠️ Failed to send session to Firebase:", e)

    return jsonify({
        "message": "Session ended",
        "user_id": user_id,
        "total_duration_sec": total_duration,
        "shades": session_copy["shades"],
        "shade_ratings": session_copy.get("shade_ratings", []),
        "feedback": session_copy.get("feedback")
    }), 200


# ⭐ Shade rating → save to CSV + session
@app.route('/rate', methods=['POST'])
def rate_shade():
    data = request.get_json()
    user_id = data.get("user_id")
    shade_id = data.get("shade_id")
    rating = data.get("rating")

    # ✅ Attach rating into the active session
    if user_id and user_id in sessions:
        session = sessions[user_id]
        if "shade_ratings" not in session:
            session["shade_ratings"] = []
        session["shade_ratings"].append({
            "shade_id": shade_id,
            "rating": rating,
            "time": format_display_time()  # CHANGED
        })

    # ✅ Still save ratings to CSV for backup (keep ISO format for CSV)
    file_exists = os.path.isfile("shade_ratings.csv")
    with open("shade_ratings.csv", mode="a", newline="", encoding="utf-8") as file:
        writer = csv.writer(file)
        if not file_exists:
            writer.writerow(["timestamp", "user_id", "shade_id", "rating"])
        writer.writerow([format_ph_time(), user_id, shade_id, rating])  # Keep ISO format for CSV

    print(f"⭐ User {user_id} rated shade {shade_id} with {rating} stars at {format_display_time()}")  # CHANGED
    return jsonify({"message": "Rating saved"}), 200

# ⭐ App feedback → save to CSV
@app.route('/feedback', methods=['POST'])
def feedback():
    data = request.get_json()
    user_id = data.get("user_id")
    feedback_rating = data.get("feedback_rating")
    feedback_text = data.get("feedback_text")

    # Track feedback inside session
    if user_id and user_id in sessions:
        sessions[user_id]["feedback"] = {
            "rating": feedback_rating,
            "comment": feedback_text,
            "time": format_display_time()  # CHANGED
        }

    # Save feedback to CSV (keep ISO format for CSV)
    file_exists = os.path.isfile("feedback.csv")
    with open("feedback.csv", mode="a", newline="", encoding="utf-8") as file:
        writer = csv.writer(file)
        if not file_exists:
            writer.writerow(["timestamp", "user_id", "rating", "comment"])
        writer.writerow([format_ph_time(), user_id, feedback_rating, feedback_text])  # Keep ISO format for CSV

    print(f"📝 Feedback from {user_id} at {format_display_time()} - Rating: {feedback_rating}, Comment: {feedback_text}")  # CHANGED
    print("\n\n")

    return jsonify({"message": "Feedback saved"}), 200

@app.route('/<path:filename>')
def static_files(filename):
    return send_from_directory('.', filename)

if __name__ == '__main__':
    app.run(debug=True)