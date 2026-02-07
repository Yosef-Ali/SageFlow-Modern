#!/bin/bash
# SageFlow PTB Extractor
# Extracts data from Peachtree backup files using Docker
#
# Usage: ./extract-ptb.sh /path/to/file.ptb

set -e

PTB_FILE="$1"

if [ -z "$PTB_FILE" ]; then
    echo "SageFlow PTB Extractor"
    echo "======================"
    echo ""
    echo "Usage: ./extract-ptb.sh /path/to/your/file.ptb"
    echo ""
    echo "This will:"
    echo "  1. Extract the PTB file (it's a ZIP archive)"
    echo "  2. Parse the Btrieve .DAT files"
    echo "  3. Output CSV files ready for SageFlow import"
    echo ""
    echo "Output will be saved to: ./ptb-output/"
    exit 1
fi

if [ ! -f "$PTB_FILE" ]; then
    echo "Error: File not found: $PTB_FILE"
    exit 1
fi

# Paths
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
DOCKER_DIR="$SCRIPT_DIR/docker/peachtree-extractor"
OUTPUT_DIR="$SCRIPT_DIR/ptb-output"
TEMP_DIR=$(mktemp -d)

echo "SageFlow PTB Extractor"
echo "======================"
echo ""

# Step 1: Extract PTB file
echo "Step 1: Extracting PTB file..."
unzip -q "$PTB_FILE" -d "$TEMP_DIR"
DAT_COUNT=$(find "$TEMP_DIR" -name "*.DAT" -o -name "*.dat" 2>/dev/null | wc -l | tr -d ' ')
echo "  Found $DAT_COUNT .DAT files"

# Step 2: Check if Docker image exists, build if not
echo ""
echo "Step 2: Checking Docker image..."
if ! docker image inspect peachtree-extractor >/dev/null 2>&1; then
    echo "  Building Docker image (first time only)..."
    docker build -t peachtree-extractor "$DOCKER_DIR"
else
    echo "  Docker image ready"
fi

# Step 3: Run extraction
echo ""
echo "Step 3: Running extraction..."
mkdir -p "$OUTPUT_DIR"

docker run --rm \
    -v "$TEMP_DIR:/data:ro" \
    -v "$OUTPUT_DIR:/output" \
    peachtree-extractor

# Cleanup
rm -rf "$TEMP_DIR"

echo ""
echo "======================"
echo "Extraction complete!"
echo ""
echo "Output files:"
ls -la "$OUTPUT_DIR"
echo ""
echo "To import into SageFlow, use the sageflow_import.json file"
echo "or import CSVs individually through the Settings page."
