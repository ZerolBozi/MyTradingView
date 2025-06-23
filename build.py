import os
import sys
import shutil
import argparse
import subprocess

def safe_rmtree(path):
    if os.path.exists(path):
        shutil.rmtree(path)

def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--debug", action="store_true", help="Build in debug mode")
    return parser.parse_args()

def build_executable(debug=False):
    for cleanup_dir in ["dist", "run.build", "run.dist", "run.onefile-build"]:
        safe_rmtree(cleanup_dir)

    if os.path.exists("run.exe"):
        os.remove("run.exe")

    os.makedirs("dist", exist_ok=True)

    cmd = [
        sys.executable, "-m", "nuitka",
        "--standalone", "--onefile",
        "--follow-imports", "--assume-yes-for-downloads",
        "--windows-company-name=MyTradingView",
        "--windows-product-name=MyTradingViewServer",
        "--windows-file-description=MyTradingView Server Application",
        "--windows-product-version=1.0.0.0",
        "--output-dir=dist",
        "--include-data-dir=app/frontend_dist=frontend_dist",
    ]

    packages = ["app", "robyn", "ccxt", "ccxt.async_support", "ccxt.pro"]
    for package in packages:
        cmd.append(f"--include-package={package}")

    if debug:
        cmd += ["--show-modules", "--verbose", "--debug"]

    cmd.append("run.py")

    print("[*] Running Nuitka compilation...")
    print(" ".join(cmd))

    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode != 0:
        print("[!] Build failed")
        print(result.stdout)
        print(result.stderr)
        sys.exit(result.returncode)

    print("\n[✔] Build completed successfully.")
    print("     ➜ dist/run.exe\n")

if __name__ == "__main__":
    args = parse_args()
    build_executable(debug=args.debug)
