import os
import sys
import subprocess
import time
import webbrowser

# Always run from the same folder as this script
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(BASE_DIR)

def fancy_print(msg, emoji="🔹"):
    print(f"[{emoji}] {msg}")
    sys.stdout.flush()

def main():
    fancy_print("Welcome to TREON Launcher 🚀", "✨")
    time.sleep(0.5)

    # Step 1: Create virtual environment if missing
    if not os.path.exists("venv"):
        fancy_print("Creating virtual environment...", "🔧")
        subprocess.run([sys.executable, "-m", "venv", "venv"])
    else:
        fancy_print("Virtual environment already exists", "📦")

    # Step 2: Install requirements
    fancy_print("Checking dependencies...", "📥")
    pip = os.path.join("venv", "Scripts", "pip.exe")
    subprocess.run([pip, "install", "--upgrade", "pip"])
    subprocess.run([pip, "install", "-r", "requirements.txt"])

    # Step 3: Launch Flask app
    fancy_print("Starting TREON app...", "🔥")
    python_exe = os.path.join("venv", "Scripts", "python.exe")
    server = subprocess.Popen([python_exe, "app.py"], cwd=BASE_DIR)

    # Step 4: Wait before opening browser
    fancy_print("Waiting for server to start...", "⏳")
    time.sleep(3)

    web_url = "http://127.0.0.1:5000"
    fancy_print(f"Opening browser at {web_url}", "🌍")
    webbrowser.open(web_url)

    # Step 5: Keep console open
    fancy_print("TREON is running! Press CTRL+C to stop.", "✅")
    server.wait()

if __name__ == "__main__":
    main()
