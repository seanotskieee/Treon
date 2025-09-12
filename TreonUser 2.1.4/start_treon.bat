@echo off
cd /d "%~dp0"

echo [🔄] Activating virtual environment...
if not exist venv (
    echo [🆕] Creating virtual environment...
    python -m venv venv
)
call venv\Scripts\activate.bat

echo [📦] Checking required packages...
for /f "tokens=*" %%p in (requirements.txt) do (
    pip show %%p >nul 2>&1
    if errorlevel 1 (
        echo [⬇️] Installing missing package: %%p
        pip install %%p
    ) else (
        echo [✅] Already installed: %%p
    )
)

echo [🚀] Launching TREON...
python app.py

pause
