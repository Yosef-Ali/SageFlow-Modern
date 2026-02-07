#!/bin/bash
# Peachtree Data Extraction Helper Script
# Usage: ./extract.sh /path/to/ptb/file.ptb

set -e

PTB_FILE="$1"
OUTPUT_DIR="${2:-./output}"

if [ -z "$PTB_FILE" ]; then
    echo "Usage: ./extract.sh /path/to/file.ptb [output_dir]"
    echo ""
    echo "This script extracts data from a Peachtree backup file (.ptb)"
    echo "and outputs CSV files ready for SageFlow import."
    exit 1
fi

if [ ! -f "$PTB_FILE" ]; then
    echo "Error: PTB file not found: $PTB_FILE"
    exit 1
fi

# Create temp directory for extraction
TEMP_DIR=$(mktemp -d)
echo "Extracting PTB file to $TEMP_DIR..."

# PTB files are ZIP archives
unzip -q "$PTB_FILE" -d "$TEMP_DIR"

# Count DAT files
DAT_COUNT=$(find "$TEMP_DIR" -name "*.DAT" -o -name "*.dat" | wc -l)
echo "Found $DAT_COUNT .DAT files"

# Run Python extractor
echo "Running data extraction..."
python3 /app/btrieve_reader.py "$TEMP_DIR" "$OUTPUT_DIR"

# Cleanup
rm -rf "$TEMP_DIR"

echo ""
echo "Extraction complete!"
echo "Output files in: $OUTPUT_DIR"
ls -la "$OUTPUT_DIR"
