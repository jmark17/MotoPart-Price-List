import os
import subprocess
import sys

def main():
    script_path = os.path.join(os.path.dirname(__file__), "build_native_apk.sh")
    if not os.path.exists(script_path):
        print(f"Error: {script_path} not found")
        sys.exit(1)
    
    os.chmod(script_path, 0o755)
    result = subprocess.run([script_path], cwd=os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    if result.returncode != 0:
        print("Build failed")
        sys.exit(result.returncode)
    print("Native APK build completed successfully.")

if __name__ == "__main__":
    main()

