#!/bin/bash
# download-vosk-model.sh
# Downloads the small English Vosk model and installs it into the Android assets folder.
#
# Usage (from project root):
#   bash scripts/download-vosk-model.sh
#
# The model is placed at:
#   android/app/src/main/assets/vosk-model-small-en-us/
#
# RNFS.copyFileAssets() will copy this to the device filesystem on first launch.

set -e

MODEL_URL="https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip"
MODEL_ZIP="vosk-model-small-en-us-0.15.zip"
MODEL_EXTRACTED_DIR="vosk-model-small-en-us-0.15"
ASSETS_DIR="android/app/src/main/assets"
MODEL_TARGET_DIR="${ASSETS_DIR}/vosk-model-small-en-us"

# Run from project root regardless of where the script is called from
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${PROJECT_ROOT}"

echo "==> Downloading Vosk small English model..."
echo "    URL: ${MODEL_URL}"

curl -L --progress-bar -o "${MODEL_ZIP}" "${MODEL_URL}"

echo "==> Extracting ${MODEL_ZIP}..."
unzip -q "${MODEL_ZIP}"

echo "==> Installing model to ${MODEL_TARGET_DIR}..."

# Remove any existing (partial or outdated) model copy
if [ -d "${MODEL_TARGET_DIR}" ]; then
    echo "    Removing existing model directory..."
    rm -rf "${MODEL_TARGET_DIR}"
fi

# Ensure assets directory exists
mkdir -p "${ASSETS_DIR}"

# Move the extracted model to the target assets path
mv "${MODEL_EXTRACTED_DIR}" "${MODEL_TARGET_DIR}"

echo "==> Cleaning up zip file..."
rm -f "${MODEL_ZIP}"

echo ""
echo "Done! Model installed at:"
echo "  ${MODEL_TARGET_DIR}"
echo ""
echo "Confirm the sentinel file exists:"
ls "${MODEL_TARGET_DIR}/am/final.mdl" && echo "  am/final.mdl present" || echo "  WARNING: am/final.mdl not found — model may be incomplete"
echo ""
echo "Rebuild the app to include the model in the APK:"
echo "  cd android && ./gradlew assembleDebug"
