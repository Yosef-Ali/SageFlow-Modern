# Peachtree PTB Data Extractor

Extract data from Peachtree backup files (.ptb) using Docker.

## Quick Start (Without Actian Zen)

This extracts data using pattern-based parsing:

```bash
# 1. Extract PTB file (it's a ZIP)
unzip -d /tmp/ptb_data "path/to/your/file.ptb"

# 2. Run the Python extractor
python3 btrieve_reader.py /tmp/ptb_data ./output

# 3. Check output CSVs
ls -la ./output/
```

## Full Solution (With Actian Zen ODBC)

For 100% accurate data extraction with proper ODBC access:

### Step 1: Download Actian Zen

1. Go to https://esd.actian.com/product/Zen_PSQL
2. Create free account
3. Download "Zen Workgroup" for Linux (x64)
4. Save the .tar.gz file to this directory

### Step 2: Build Docker Image

```bash
# Copy Actian Zen to this directory first
docker build -t peachtree-extractor .
```

### Step 3: Run Extraction

```bash
# Extract PTB first
unzip -d /tmp/ptb_data "path/to/your/file.ptb"

# Run with Docker
docker run -v /tmp/ptb_data:/data -v $(pwd)/output:/output peachtree-extractor
```

### Step 4: Import to SageFlow

The output CSVs can be imported using SageFlow's "Import Balances" feature.

## Output Files

- `chart_of_accounts.csv` - Account numbers and names
- `balances.csv` - Extracted balance values
- `customers.csv` - Customer names
- `vendors.csv` - Vendor names

## Limitations

Without Actian Zen ODBC:
- Balance-to-account matching requires AI assistance
- Some data may be incomplete

With Actian Zen ODBC:
- Full structured data access
- Proper SQL queries
- 100% accurate extraction
