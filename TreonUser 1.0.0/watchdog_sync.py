import time
import subprocess
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

class MySQLWatcher(FileSystemEventHandler):
    def on_modified(self, event):
        if event.src_path.endswith('mysql-bin.index'):
            print("Change detected in MySQL — Triggering sync...")
            # Fix: Use raw string (r"...") or double backslashes
            subprocess.run(["python", r"C:\Users\tepen\OneDrive\Desktop\Bulos, Karl Michael T\kiss\sync_data.py"])

if __name__ == "__main__":
    # Fix: Use raw string for Windows path
    path = r"C:\xampp\mysql\data" if subprocess.os.name == 'nt' else "/var/lib/mysql"
    
    event_handler = MySQLWatcher()
    observer = Observer()
    observer.schedule(event_handler, path, recursive=True)
    
    print(f"Watching for changes in {path}...")
    observer.start()

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()
