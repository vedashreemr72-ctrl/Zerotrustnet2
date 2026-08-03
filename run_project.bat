@echo off
echo ===================================================
echo [🛡️] ZeroTrustNet Enterprise Cybersecurity Rebuild
echo ===================================================

echo [!] Setting up Python virtual environment...
python -m venv backend\venv
call backend\venv\Scripts\activate
pip install -r backend\requirements.txt

echo [!] Starting Flask backend API (port 5000) in new window...
start cmd /k "call backend\venv\Scripts\activate && python backend\app.py"

echo [!] Starting React frontend (Vite)...
npm --prefix frontend run dev
