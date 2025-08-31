from flask import Flask, Response, send_from_directory, render_template, request, jsonify
from lip import generate_frames, set_color, capture_frame
import csv
import os
from datetime import datetime
import uuid
from flask import send_file
import lip


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
    save_dir = os.path.join("static", "captures")
    os.makedirs(save_dir, exist_ok=True)

    filename = f"capture_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
    save_path = os.path.join(save_dir, filename)

    img_bytes = lip.capture_frame(save_path)
    if img_bytes is None:
        return jsonify({"status": "error", "message": "Capture failed"}), 500

    return jsonify({
        "status": "success",
        "file_path": f"/{save_path}"
    })

# ⭐ Start session when Try-On screen loads
@app.route('/start_session', methods=['POST'])
def start_session():
    user_id = str(uuid.uuid4())
    start_time = datetime.now()

    sessions[user_id] = {
        "start_time": start_time,
        "end_time": None,
        "shades": [],
        "current_shade": None,
        "current_shade_start": None,
        "feedback": None   # 👈 new field for storing feedback
    }

    print(f"🎬 Session started for user {user_id} at {start_time}")
    return jsonify({"user_id": user_id}), 200


# ⭐ Log shade usage
@app.route('/log_shade', methods=['POST'])
def log_shade():
    data = request.get_json()
    user_id = data.get("user_id")
    shade_id = data.get("shade_id")

    if user_id not in sessions:
        return jsonify({"error": "Invalid session"}), 400

    now = datetime.now()
    session = sessions[user_id]

    # close previous shade if exists
    if session["current_shade"]:
        duration = (now - session["current_shade_start"]).total_seconds()
        session["shades"].append({
            "shade_id": session["current_shade"],
            "start": session["current_shade_start"].isoformat(),
            "end": now.isoformat(),
            "duration_sec": duration
        })

    # start new shade
    session["current_shade"] = shade_id
    session["current_shade_start"] = now

    print(f"💄 User {user_id} switched to shade {shade_id} at {now}")
    return jsonify({"message": "Shade logged"}), 200

# ⭐ End session at Privacy screen
@app.route('/end_session', methods=['POST'])
def end_session():
    data = request.get_json()
    user_id = data.get("user_id")

    if user_id not in sessions:
        return jsonify({"error": "Invalid session"}), 400

    now = datetime.now()
    session = sessions[user_id]

    # close last shade if active
    if session["current_shade"]:
        duration = (now - session["current_shade_start"]).total_seconds()
        session["shades"].append({
            "shade_id": session["current_shade"],
            "start": session["current_shade_start"].isoformat(),
            "end": now.isoformat(),
            "duration_sec": duration
        })

    session["end_time"] = now
    total_duration = (session["end_time"] - session["start_time"]).total_seconds()

    print(f"🛑 Session ended for user {user_id} at {now} (Duration: {total_duration:.2f} sec)")
    print("📊 Session data: ", session)

    return jsonify({
        "message": "Session ended",
        "user_id": user_id,
        "total_duration_sec": total_duration,
        "shades": session["shades"]
    }), 200

# ⭐ Shade rating → save to CSV
@app.route('/rate', methods=['POST'])
def rate_shade():
    data = request.get_json()
    shade_id = data.get("shade_id")
    rating = data.get("rating")

    file_exists = os.path.isfile("shade_ratings.csv")
    with open("shade_ratings.csv", mode="a", newline="", encoding="utf-8") as file:
        writer = csv.writer(file)
        if not file_exists:
            writer.writerow(["timestamp", "shade_id", "rating"])
        writer.writerow([datetime.now().isoformat(), shade_id, rating])

    print(f"⭐ Shade {shade_id} rated {rating} stars")
    return jsonify({"message": "Rating saved"}), 200

# ⭐ App feedback → save to CSV
@app.route('/feedback', methods=['POST'])
def feedback():
    data = request.get_json()
    user_id = data.get("user_id")  # 👈 make sure frontend sends this
    feedback_rating = data.get("feedback_rating")
    feedback_text = data.get("feedback_text")

    # Track feedback inside session
    if user_id and user_id in sessions:
        sessions[user_id]["feedback"] = {
            "rating": feedback_rating,
            "comment": feedback_text,
            "time": datetime.now().isoformat()
        }

    # Save feedback to CSV
    file_exists = os.path.isfile("feedback.csv")
    with open("feedback.csv", mode="a", newline="", encoding="utf-8") as file:
        writer = csv.writer(file)
        if not file_exists:
            writer.writerow(["timestamp", "user_id", "rating", "comment"])
        writer.writerow([datetime.now().isoformat(), user_id, feedback_rating, feedback_text])

    print(f"📝 Feedback from {user_id} - Rating: {feedback_rating}, Comment: {feedback_text}")
    print("\n\n")

    return jsonify({"message": "Feedback saved"}), 200



@app.route('/<path:filename>')
def static_files(filename):
    return send_from_directory('.', filename)

if __name__ == '__main__':
    app.run(debug=True)
