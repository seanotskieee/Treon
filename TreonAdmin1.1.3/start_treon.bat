@echo off
cd /d "%~dp0"

echo [🔄] Activating virtual environment...
if not exist venv (
    python -m venv venv
)
call venv\Scripts\activate.bat

echo [📦] Installing packages...
pip install --upgrade pip
pip install -r requirements.txt

echo [🚀] Launching TREON...
python app.py

pause
