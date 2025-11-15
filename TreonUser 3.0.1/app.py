import csv
import os
import uuid
import json
import lip
import firebase_admin
from firebase_admin import credentials, firestore, storage
from datetime import datetime
from flask import Flask, Response, send_from_directory, render_template, request, jsonify, send_file
from lip import generate_frames, set_color, capture_frame
import pytz
import threading
import atexit

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

# Global variables to store products data
products_data = {"brands": [], "shades": []}
products_listener = None

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

# Function to ensure collections exist
def ensure_collections_exist():
    """Ensure all required collections exist in Firestore"""
    collections = ['sessions', 'products', 'ratings', 'captures', 'active_sessions']
    
    for collection in collections:
        try:
            # Try to create a document to ensure the collection exists
            doc_ref = db.collection(collection).document('init')
            doc_ref.set({
                'created_at': firestore.SERVER_TIMESTAMP,
                'purpose': 'Initialization document'
            })
            print(f"✅ Collection '{collection}' initialized")
        except Exception as e:
            print(f"⚠️ Failed to initialize collection '{collection}': {e}")

def setup_products_listener():
    """Set up real-time listener for products collection"""
    global products_listener
    
    if not firebase_initialized:
        print("❌ Firebase not initialized, cannot set up products listener")
        return
    
    try:
        # Reference to the products collection
        products_ref = db.collection('products')
        
        # Create a real-time listener
        products_listener = products_ref.on_snapshot(on_products_update)
        print("✅ Products listener set up successfully")
        
    except Exception as e:
        print(f"❌ Failed to set up products listener: {e}")

def on_products_update(query_snapshot, changes, read_time):
    """Callback function when products collection changes"""
    global products_data
    
    try:
        print("🔄 Products collection updated - processing changes...")
        
        # Clear existing data
        new_brands = []
        new_shades = []
        
        # Process all documents in the collection
        for doc in query_snapshot:
            product_data = doc.to_dict()
            product_data["id"] = doc.id
            
            # Organize data by type
            if product_data.get("type") == "brand":
                new_brands.append(product_data)
            elif product_data.get("type") == "shade":
                new_shades.append(product_data)
        
        # Update global data
        products_data["brands"] = new_brands
        products_data["shades"] = new_shades
        
        print(f"✅ Updated products data: {len(products_data['brands'])} brands, {len(products_data['shades'])} shades")
        
        # Update the lip module with new data if it has the capability
        try:
            if hasattr(lip, 'update_products'):
                lip.update_products(products_data)
                print("✅ Updated lip module with new products data")
        except Exception as e:
            print(f"⚠️ Could not update lip module: {e}")
            
    except Exception as e:
        print(f"❌ Error processing products update: {e}")

def load_initial_products():
    """Load initial products data from Firestore"""
    global products_data
    
    if not firebase_initialized:
        print("❌ Firebase not initialized, cannot load products")
        return
    
    try:
        products_ref = db.collection('products')
        docs = products_ref.stream()
        
        new_brands = []
        new_shades = []
        
        for doc in docs:
            product_data = doc.to_dict()
            product_data["id"] = doc.id
            
            if product_data.get("type") == "brand":
                new_brands.append(product_data)
            elif product_data.get("type") == "shade":
                new_shades.append(product_data)
        
        products_data["brands"] = new_brands
        products_data["shades"] = new_shades
        
        print(f"✅ Loaded initial products: {len(products_data['brands'])} brands, {len(products_data['shades'])} shades")
        
    except Exception as e:
        print(f"❌ Failed to load initial products: {e}")

def cleanup_listeners():
    """Clean up listeners when application exits"""
    global products_listener
    if products_listener:
        products_listener.unsubscribe()
        print("✅ Products listener cleaned up")

# Register cleanup function
atexit.register(cleanup_listeners)

if firebase_initialized:
    ensure_collections_exist()
    # Load initial products and set up listener
    load_initial_products()
    # Set up the products listener in a separate thread to avoid blocking
    threading.Thread(target=setup_products_listener, daemon=True).start()

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
    brand = data.get("brand", "Unknown")  # Get brand from request
    
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
                "brand": brand,  # Add brand to capture metadata
                "timestamp": timestamp,
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
            
            # Save to Firestore - this will automatically create the document
            db.collection("captures").document(capture_id).set(capture_data)
            print(f"💾 Capture metadata saved to Firestore for user {user_id}")
            
        except Exception as e:
            print(f"❌ Failed to save capture data: {e}")
            # Continue to return local paths even if Firebase fails

    # Save session snapshot after capture
    save_session_snapshot(user_id)

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

def save_session_snapshot(user_id):
    """Save current session state to Firebase"""
    if user_id not in sessions:
        print(f"❌ No active session found for user {user_id}")
        return
    
    if not firebase_initialized:
        return
    
    try:
        session = sessions[user_id]
        now = get_ph_time()
        
        # Prepare session data for snapshot
        session_data = {
            "user_id": user_id,
            "start_time": session["start_time"],
            "last_activity": now,
            "current_shade_id": session["current_shade_id"],
            "current_brand": session["current_brand"],
            "shades_used": session["shades"],
            "shade_ratings": session.get("shade_ratings", []),
            "has_captures": True,
            "status": "active",
            "last_updated": firestore.SERVER_TIMESTAMP
        }
        
        # Save to active_sessions collection
        db.collection("active_sessions").document(user_id).set(session_data)
        print(f"📸 Session snapshot saved for user {user_id}")
        
    except Exception as e:
        print(f"⚠️ Failed to save session snapshot: {e}")

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
        "storage_available": bucket is not None,
        "products_loaded": len(products_data["brands"]) > 0 or len(products_data["shades"]) > 0,
        "brands_count": len(products_data["brands"]),
        "shades_count": len(products_data["shades"])
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

# Products API endpoints - UPDATED to return empty data when no products exist
@app.route('/api/products')
def get_products():
    """Get current products data from Firebase"""
    try:
        if not firebase_initialized:
            return jsonify({
                "status": "success",
                "message": "Firebase not initialized",
                "data": []
            }), 200
        
        # Get products from Firebase
        products_ref = db.collection('products')
        docs = products_ref.stream()
        
        products_data = []
        for doc in docs:
            product_data = doc.to_dict()
            product_data["id"] = doc.id
            products_data.append(product_data)
        
        # If no products, return empty array
        if not products_data:
            return jsonify({
                "status": "success",
                "data": [],
                "timestamp": format_ph_time()
            })
        
        # Organize by brand
        organized_data = {}
        color_counter = 1  # Start color IDs from 1
        
        for product in products_data:
            brand = product.get("brand", "Unknown")
            if brand not in organized_data:
                organized_data[brand] = {
                    "brand": brand,
                    "colors": []
                }
            
            # Add colors for this brand (only if colors exist)
            colors = product.get("colors", [])
            if colors:
                for color in colors:
                    # Ensure we have a valid hex color
                    hex_color = color.get("hex") or color.get("colorHex") or "#cccccc"
                    
                    # Validate hex color format
                    if not hex_color.startswith('#'):
                        hex_color = f"#{hex_color}"
                    
                    # Ensure 6-digit hex (remove alpha if present)
                    if len(hex_color) > 7:
                        hex_color = hex_color[:7]
                    
                    organized_data[brand]["colors"].append({
                        "name": color.get("name", f"Color {color_counter}"),
                        "hex": hex_color,
                        "colorHex": hex_color,  # Ensure both fields have the same value
                        "id": color_counter  # Use sequential IDs
                    })
                    color_counter += 1
        
        # Filter out brands that have no colors
        organized_data = {brand: data for brand, data in organized_data.items() if data["colors"]}
        
        # Debug output
        print(f"📦 Sending {sum(len(data['colors']) for data in organized_data.values())} colors to user")
        
        return jsonify({
            "status": "success",
            "data": list(organized_data.values()),
            "timestamp": format_ph_time()
        })
        
    except Exception as e:
        print(f"❌ Error fetching products: {e}")
        return jsonify({
            "status": "success",
            "message": str(e),
            "data": []
        }), 200

@app.route('/api/products/brands')
def get_brands():
    """Get only brands list"""
    try:
        if not firebase_initialized:
            return jsonify({
                "status": "success",
                "brands": [],
                "timestamp": format_ph_time()
            }), 200
            
        products_ref = db.collection('products')
        docs = products_ref.stream()
        
        brands = set()
        for doc in docs:
            product_data = doc.to_dict()
            brand = product_data.get("brand")
            if brand:
                brands.add(brand)
        
        return jsonify({
            "status": "success",
            "brands": list(brands),
            "timestamp": format_ph_time()
        })
        
    except Exception as e:
        return jsonify({
            "status": "success",
            "message": str(e),
            "brands": []
        }), 200

@app.route('/api/products/shades')
def get_shades():
    """Get only shades"""
    return jsonify({
        "status": "success",
        "shades": products_data.get("shades", []),
        "timestamp": format_ph_time()
    })
        
# ⭐ Start session when Try-On screen loads - FIXED initialization
@app.route('/start_session', methods=['POST'])
def start_session():
    user_id = str(uuid.uuid4())
    start_time = get_ph_time()

    sessions[user_id] = {
        "start_time": start_time,
        "end_time": None,
        "shades": [],
        "current_shade_id": 1,   # Set default shade ID
        "current_brand": "MAC",  # Set default brand
        "current_shade_start": start_time,  # FIXED: Initialize with start time, not None
        "shade_ratings": [],
        "feedback": None
    }

    print(f"\n🎬 Session started for user {user_id} at {format_display_time(start_time)}")
    return jsonify({"user_id": user_id}), 200

# ⭐ Log shade usage - FIXED to handle None case
@app.route('/log_shade', methods=['POST'])
def log_shade():
    data = request.get_json()
    user_id = data.get("user_id")
    shade_id = data.get("shade_id", 1)  # Default to 1 if no shade provided
    brand = data.get("brand", "MAC")    # Default to MAC if no brand provided

    if user_id not in sessions:
        return jsonify({"error": "Invalid session"}), 400

    now = get_ph_time()
    session = sessions[user_id]

    # Close previous shade if exists and has start time
    if session["current_shade_id"] and session["current_shade_start"] is not None:
        duration = (now - session["current_shade_start"]).total_seconds()
        session["shades"].append({
            "shade_id": session["current_shade_id"],
            "brand": session["current_brand"],
            "start": session["current_shade_start"],
            "end": now,
            "duration_sec": duration
        })

    # Start new shade with proper defaults
    session["current_shade_id"] = shade_id
    session["current_brand"] = brand
    session["current_shade_start"] = now

    print(f"💄 User {user_id} switched to shade {shade_id} ({brand}) at {format_display_time(now)}")
    return jsonify({"message": "Shade logged"}), 200

# ⭐ Save session snapshot after capture
@app.route('/save_session_snapshot', methods=['POST'])
def save_session_snapshot_route():
    data = request.get_json()
    user_id = data.get("user_id")
    
    if user_id not in sessions:
        return jsonify({"error": "Invalid session"}), 400
    
    save_session_snapshot(user_id)
    return jsonify({"status": "success", "message": "Session snapshot saved"}), 200

# ⭐ Shade rating → save to CSV + session - FIXED to properly track brand and shade
@app.route('/rate', methods=['POST'])
def rate_shade():
    data = request.get_json()
    user_id = data.get("user_id")
    shade_id = data.get("shade_id", 1)  # Default to 1
    shade_name = data.get("shade_name", "Default Shade")  # Get shade name from request
    rating = data.get("rating")
    brand = data.get("brand", "MAC")  # Default to MAC

    print(f"⭐ Rating received - User: {user_id}, Brand: {brand}, Shade ID: {shade_id}, Shade Name: {shade_name}, Rating: {rating}")

    # ✅ Attach rating into the active session
    if user_id and user_id in sessions:
        session = sessions[user_id]
        if "shade_ratings" not in session:
            session["shade_ratings"] = []
        session["shade_ratings"].append({
            "brand": brand,
            "shade_id": shade_id,
            "shade_name": shade_name,  # Store shade name
            "rating": rating,
            "time": get_ph_time()
        })

    # ✅ Save ratings to CSV for backup
    file_exists = os.path.isfile("shade_ratings.csv")
    with open("shade_ratings.csv", mode="a", newline="", encoding="utf-8") as file:
        writer = csv.writer(file)
        if not file_exists:
            writer.writerow(["timestamp", "user_id", "brand", "shade_id", "shade_name", "rating"])
        writer.writerow([format_ph_time(), user_id, brand, shade_id, shade_name, rating])

    # ✅ Save rating to Firebase - with proper brand and shade tracking
    if firebase_initialized:
        try:
            rating_data = {
                "brand": brand,
                "shade_id": shade_id,
                "shade_name": shade_name,  # Store shade name
                "rating": rating,
                "user_id": user_id,
                "timestamp": firestore.SERVER_TIMESTAMP
            }
            db.collection("ratings").add(rating_data)
            print(f"⭐ Rating saved to Firebase - Brand: {brand}, Shade: {shade_name}, Rating: {rating}")
        except Exception as e:
            print(f"⚠️ Failed to save rating to Firebase: {e}")

    print(f"⭐ User {user_id} rated shade {shade_name} ({brand}) with {rating} stars at {format_display_time()}")
    return jsonify({"message": "Rating saved"}), 200

# ⭐ End session at Privacy screen - UPDATED with proper brand and shade storage
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
    if session["current_shade_id"] and session["current_shade_start"] is not None:
        duration = (now - session["current_shade_start"]).total_seconds()
        session["shades"].append({
            "shade_id": session["current_shade_id"],
            "brand": session["current_brand"],
            "start": session["current_shade_start"],
            "end": now,
            "duration_sec": duration
        })

    # Attach session end
    session["end_time"] = now
    total_duration = (session["end_time"] - session["start_time"]).total_seconds()
    
    # Store duration in session for easy access
    session["duration_sec"] = total_duration
    session["brand"] = session["current_brand"]  # Store final brand
    session["shade_id"] = session["current_shade_id"]  # Store final shade ID

    # ✅ Attach feedback
    if feedback and not session.get("feedback"):
        session["feedback"] = {
            "rating": feedback.get("rating"),
            "comment": feedback.get("comment"),
            "time": now
        }

    # ✅ Save feedback to CSV only once (keep ISO format for CSV)
    if session.get("feedback") and not session.get("feedback").get("saved"):
        file_exists = os.path.isfile("feedback.csv")
        with open("feedback.csv", mode="a", newline="", encoding="utf-8") as file:
            writer = csv.writer(file)
            if not file_exists:
                writer.writerow(["timestamp", "user_id", "rating", "comment"])
            writer.writerow([
                format_ph_time(),
                user_id,
                session["feedback"]["rating"],
                session["feedback"]["comment"]
            ])
        session["feedback"]["saved"] = True
        print(f"📝 Feedback from {user_id} - Rating: {session['feedback']['rating']}, Comment: {session['feedback']['comment']}")

    print(f"🛑 Session ended for user {user_id} at {format_display_time(now)} (Duration: {total_duration:.2f} sec)")

    # 🔹 Prepare JSON-safe copy with duration
    session_copy = session.copy()
    session_copy["start_time"] = session_copy["start_time"]
    session_copy["end_time"] = session_copy["end_time"]
    session_copy["duration_sec"] = total_duration  # Ensure duration is included
    session_copy["brand"] = session["current_brand"]  # Ensure brand is set
    session_copy["shade_id"] = session["current_shade_id"]  # Ensure shade_id is set
    
    # Convert any datetime objects in shade_ratings
    if "shade_ratings" in session_copy:
        for rating in session_copy["shade_ratings"]:
            if "time" in rating and isinstance(rating["time"], datetime):
                rating["time"] = rating["time"]

    # ✅ Save session JSON file
    os.makedirs("sessions", exist_ok=True)
    json_filename = f"sessions/{user_id}_{now.strftime('%Y%m%d_%H%M%S')}.json"
    with open(json_filename, "w", encoding="utf-8") as f:
        json.dump(session_copy, f, indent=4, ensure_ascii=False, default=str)
    print(f"💾 Session saved locally as {json_filename}")

    # 🔹 Send to Firebase if ready - this will automatically create the document
    if firebase_initialized:
        try:
            firebase_data = session_copy.copy()
            # Convert datetime objects to Firestore timestamps
            if "start_time" in firebase_data and isinstance(firebase_data["start_time"], datetime):
                firebase_data["start_time"] = firestore.SERVER_TIMESTAMP
            if "end_time" in firebase_data and isinstance(firebase_data["end_time"], datetime):
                firebase_data["end_time"] = firestore.SERVER_TIMESTAMP
            
            # Ensure duration, brand and shade_id are included
            firebase_data["duration_sec"] = total_duration
            firebase_data["brand"] = session["current_brand"]
            firebase_data["shade_id"] = session["current_shade_id"]
            firebase_data["status"] = "completed"
                
            # Add any additional processing needed for Firebase
            db.collection("sessions").add(firebase_data)
            print(f"🌐 Session sent to Firebase for user {user_id}")
            
            # Remove from active sessions
            try:
                db.collection("active_sessions").document(user_id).delete()
                print(f"🗑️ Removed from active sessions: {user_id}")
            except Exception as e:
                print(f"⚠️ Could not remove from active sessions: {e}")
                
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
            "time": get_ph_time()
        }

    # Save feedback to CSV (keep ISO format for CSV)
    file_exists = os.path.isfile("feedback.csv")
    with open("feedback.csv", mode="a", newline="", encoding="utf-8") as file:
        writer = csv.writer(file)
        if not file_exists:
            writer.writerow(["timestamp", "user_id", "rating", "comment"])
        writer.writerow([format_ph_time(), user_id, feedback_rating, feedback_text])

    print(f"📝 Feedback from {user_id} at {format_display_time()} - Rating: {feedback_rating}, Comment: {feedback_text}")
    print("\n\n")

    return jsonify({"message": "Feedback saved"}), 200

@app.route('/<path:filename>')
def static_files(filename):
    return send_from_directory('.', filename)

@app.errorhandler(Exception)
def handle_error(e):
    print(f"❌ Application error: {e}")
    return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)  # Added explicit port