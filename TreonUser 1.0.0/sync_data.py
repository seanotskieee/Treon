import mysql.connector
import firebase_admin
from firebase_admin import credentials, db
import datetime

# Firebase setup
cred = credentials.Certificate("firebase-credentials.json")
firebase_admin.initialize_app(cred, {
    "databaseURL": "https://lipssegmentation-7ec63-default-rtdb.firebaseio.com/"
})

# MySQL connection setup
conn = mysql.connector.connect(
    host='localhost',
    user='root',
    password='',
    database='appiots'
)
cursor = conn.cursor(dictionary=True)

# Get last sync time from Firebase
last_sync_time = db.reference('sync_metadata/last_sync_time').get()

# Fetch data from PHOTOS table
if last_sync_time:
    query = "SELECT * FROM `photos` WHERE `timestamp` > %s"  # Fixed table/column name
    cursor.execute(query, (last_sync_time,))
else:
    two_hours_ago = datetime.datetime.now() - datetime.timedelta(hours=2)
    query = "SELECT * FROM `photos` WHERE `timestamp` >= %s"  # Fixed table/column name
    cursor.execute(query, (two_hours_ago,))

rows = cursor.fetchall()

if rows:
    ref = db.reference('photos')  # Changed reference path
    for row in rows:
        # Convert datetime to ISO string and handle BLOB data
        firebase_data = {
            "id": row['id'],
            "timestamp": row['timestamp'].isoformat(),  # Convert datetime
            "file_name": row['file_name'],
            # Optional: Convert BLOB to base64 if needed
            # "image_data": base64.b64encode(row['image_data']).decode('utf-8')
        }
        
        key = str(row['id'])  # Use ID as unique key
        ref.child(key).set(firebase_data)

    # Update last sync time
    db.reference('sync_metadata/last_sync_time').set(datetime.datetime.now().isoformat())
    print(f"✅ {len(rows)} photos synced to Firebase.")
else:
    print("✅ No new photos to sync.")

cursor.close()
conn.close()
