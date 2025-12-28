import subprocess
import os
import signal
import sys
import time

def run():
    # Detect paths
    root_path = os.getcwd()
    backend_path = os.path.join(root_path, "backend")
    frontend_path = os.path.join(root_path, "frontend")
    
    # Path to Python in venv (Windows)
    venv_python = os.path.join(backend_path, "venv", "Scripts", "python.exe")
    venv_uvicorn = os.path.join(backend_path, "venv", "Scripts", "uvicorn.exe")

    # Fallback if venv is missing or on Linux
    if not os.path.exists(venv_python):
        venv_python = "python"
        venv_uvicorn = "uvicorn"

    processes = []
    
    try:
        print("\n" + "="*50)
        print("🚀 STARTING AI INTERVIEW APP ECOSYSTEM")
        print("="*50 + "\n")
        
        # 1. Start Infrastructure (Docker)
        if os.path.exists(os.path.join(root_path, "docker-compose.yml")):
            print("📦 [1/4] Starting Docker Services (Mongo, Redis, RabbitMQ)...")
            subprocess.run(["docker-compose", "up", "-d"], check=True)
            time.sleep(2) # Give it a moment

        # 2. Start Backend API
        print("🐍 [2/4] Starting Backend API (Uvicorn)...")
        processes.append(subprocess.Popen(
            [venv_uvicorn, "main:app", "--reload"],
            cwd=backend_path
        ))

        # 3. Start Background Worker
        print("⚙️  [3/4] Starting AI Question Worker...")
        processes.append(subprocess.Popen(
            [venv_python, "worker.py"],
            cwd=backend_path
        ))

        # 4. Start Frontend
        print("⚛️  [4/4] Starting Frontend (Vite)...")
        processes.append(subprocess.Popen(
            ["npm", "run", "dev"],
            cwd=frontend_path,
            shell=True
        ))

        print("\n" + "="*50)
        print("✅ ALL SERVICES RUNNING")
        print("👉 Frontend: http://localhost:5173")
        print("👉 Backend:  http://localhost:8000/docs")
        print("👉 Press Ctrl+C to stop all services simultaneously.")
        print("="*50 + "\n")
        
        # Wait for processes to stay alive
        while True:
            time.sleep(1)
            # Check if any process died
            for p in processes:
                if p.poll() is not None:
                    print(f"\n⚠️  A process terminated unexpectedly (Exit Code: {p.returncode})")
                    raise KeyboardInterrupt

    except KeyboardInterrupt:
        print("\n🛑 STOPPING ALL SERVICES...")
        for p in processes:
            try:
                # On Windows, taskkill is more reliable for stopping sub-processes
                if os.name == 'nt':
                    subprocess.run(['taskkill', '/F', '/T', '/PID', str(p.pid)], capture_output=True)
                else:
                    p.terminate()
            except:
                pass
        print("✨ Goodbye!\n")
        sys.exit(0)

if __name__ == "__main__":
    run()
