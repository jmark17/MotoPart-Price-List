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

    # Convert logo to 192x192 PNG for launcher icon
    logo_path = os.path.join(root_dir, "public", "logo.jpg")
    launcher_icon_path = "/tmp/ic_launcher.png"
    if os.path.exists(logo_path):
        try:
            subprocess.run(["convert", logo_path, "-resize", "192x192", launcher_icon_path], check=True)
            print(f"  + Generated launcher icon from {logo_path}")
        except Exception as e:
            print(f"  ! Warning converting logo: {e}")

    unsigned_apk = "/tmp/app-unsigned.apk"
    aligned_apk = "/tmp/app-aligned.apk"

    print("=== 2. Updating APK Assets, Icons & Stripping Old Signatures ===")
    with zipfile.ZipFile(template_apk, 'r') as zin:
        with zipfile.ZipFile(unsigned_apk, 'w', compression=zipfile.ZIP_DEFLATED) as zout:
            for item in zin.infolist():
                # Strip old signatures so apksigner can re-sign cleanly
                if item.filename.startswith("META-INF/"):
                    continue
                # Skip old assets/www/ files
                if item.filename.startswith("assets/www/"):
                    continue
                # Skip old launcher icon if we have a fresh one
                if item.filename == "res/drawable/ic_launcher.png" and os.path.exists(launcher_icon_path):
                    continue

                buffer = zin.read(item.filename)
                zout.writestr(item, buffer)

            # Add fresh launcher icon if available
            if os.path.exists(launcher_icon_path):
                zout.write(launcher_icon_path, "res/drawable/ic_launcher.png")
                print("  + Injected custom MotoParts launcher icon into APK")

            # Add fresh dist files to assets/www/
            for root, _, files in os.walk(dist_dir):
                for file in files:
                    # Do not include the apk inside the apk assets
                    if file.endswith(".apk"):
                        continue
                    full_path = os.path.join(root, file)
                    rel_path = os.path.relpath(full_path, dist_dir)
                    apk_entry_name = f"assets/www/{rel_path}".replace("\\", "/")
                    zout.write(full_path, apk_entry_name)

    # Ensure debug keystore exists
    keystore_path = "/tmp/debug.keystore"
    if not os.path.exists(keystore_path):
        print("=== Generating Debug Keystore ===")
        subprocess.run([
            "keytool", "-genkeypair", "-v",
            "-keystore", keystore_path,
            "-alias", "androiddebugkey",
            "-keypass", "android",
            "-storepass", "android",
            "-keyalg", "RSA",
            "-keysize", "2048",
            "-validity", "10000",
            "-dname", "CN=Android Debug,O=Android,C=US"
        ], check=True)

    print("=== 3. Applying v1 JAR signature with jarsigner ===")
    subprocess.run([
        "jarsigner",
        "-keystore", keystore_path,
        "-storepass", "android",
        "-keypass", "android",
        unsigned_apk,
        "androiddebugkey"
    ], check=True)

    print("=== 4. Aligning APK with zipalign (4-byte alignment) ===")
    if os.path.exists(aligned_apk):
        os.remove(aligned_apk)
    subprocess.run(["zipalign", "-f", "-p", "4", unsigned_apk, aligned_apk], check=True)

    print("=== 5. Signing APK with apksigner (v1 & v2 Signature Schemes) ===")
    subprocess.run([
        "apksigner", "sign",
        "--ks", keystore_path,
        "--ks-pass", "pass:android",
        "--key-pass", "pass:android",
        "--ks-key-alias", "androiddebugkey",
        "--v1-signing-enabled", "true",
        "--v2-signing-enabled", "true",
        aligned_apk
    ], check=True)

    print("=== 5. Verifying APK Signature ===")
    verify_res = subprocess.run(["apksigner", "verify", "--verbose", aligned_apk], capture_output=True, text=True)
    print(verify_res.stdout)
    if "DOES NOT VERIFY" in verify_res.stdout or verify_res.returncode != 0:
        print("ERROR: APK verification failed!")
        sys.exit(1)

    print("=== 6. Distributing valid signed APK to download targets ===")
    output_dirs = [
        os.path.join(root_dir, "APK_DOWNLOAD"),
        os.path.join(root_dir, ".build-outputs"),
        os.path.join(root_dir, "public"),
    ]
    for d in output_dirs:
        os.makedirs(d, exist_ok=True)
        target = os.path.join(d, "app-debug.apk")
        shutil.copy2(aligned_apk, target)
        size_mb = os.path.getsize(target) / (1024 * 1024)
        print(f"  -> Saved {target} ({size_mb:.2f} MB)")

    # Clean up temp files
    for tmp in [unsigned_apk, aligned_apk, launcher_icon_path]:
        if os.path.exists(tmp):
            os.remove(tmp)

    print("=== SUCCESS! 100% Valid, Signed & Verified Android APK Ready ===")

if __name__ == "__main__":
    main()
