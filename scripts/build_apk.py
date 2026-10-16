import os
import sys
import subprocess
import zipfile
import shutil

def main():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    print("=== 1. Building Production Web Assets (npm run build) ===")
    res = subprocess.run(["npm", "run", "build"], cwd=root_dir)
    if res.returncode != 0:
        print("npm run build failed")
        sys.exit(res.returncode)

    dist_dir = os.path.join(root_dir, "dist")
    if not os.path.exists(dist_dir):
        print(f"Error: {dist_dir} does not exist")
        sys.exit(1)

    template_apk = os.path.join(root_dir, "APK_DOWNLOAD", "app-debug.apk")
    if not os.path.exists(template_apk):
        template_apk = os.path.join(root_dir, ".build-outputs", "app-debug.apk")

    if not os.path.exists(template_apk):
        print(f"Error: Template APK not found at {template_apk}")
        sys.exit(1)

    output_dirs = [
        os.path.join(root_dir, "APK_DOWNLOAD"),
        os.path.join(root_dir, ".build-outputs"),
        os.path.join(root_dir, "public"),
    ]
    for d in output_dirs:
        os.makedirs(d, exist_ok=True)

    temp_apk = os.path.join(root_dir, "app-temp-updating.apk")
    print(f"=== 2. Updating APK Assets from {dist_dir} into APK ===")
    
    # Read existing APK and filter out old assets/www/ files
    with zipfile.ZipFile(template_apk, 'r') as zin:
        with zipfile.ZipFile(temp_apk, 'w', compression=zipfile.ZIP_DEFLATED) as zout:
            for item in zin.infolist():
                if item.filename.startswith("assets/www/"):
                    # skip old www files
                    continue
                # Copy existing non-www files (manifest, classes.dex, resources.arsc, etc.)
                buffer = zin.read(item.filename)
                zout.writestr(item, buffer)

            # Add fresh dist files to assets/www/
            for root, _, files in os.walk(dist_dir):
                for file in files:
                    full_path = os.path.join(root, file)
                    rel_path = os.path.relpath(full_path, dist_dir)
                    apk_entry_name = f"assets/www/{rel_path}".replace("\\", "/")
                    zout.write(full_path, apk_entry_name)
                    print(f"  + Added {apk_entry_name}")

    print("=== 3. Distributing updated APK to output paths ===")
    for d in output_dirs:
        target = os.path.join(d, "app-debug.apk")
        shutil.copy2(temp_apk, target)
        size_mb = os.path.getsize(target) / (1024 * 1024)
        print(f"  -> Saved {target} ({size_mb:.2f} MB)")

    if os.path.exists(temp_apk):
        os.remove(temp_apk)

    print("=== Successfully updated APK with latest codebase! ===")

if __name__ == "__main__":
    main()
