#!/usr/bin/env python3
"""
Peachtree Data Extractor
Main entry point for Docker container
Attempts ODBC first, falls back to pattern-based extraction
"""

import os
import sys
import json
import csv
from pathlib import Path

# Check if Actian Zen ODBC is available
ODBC_AVAILABLE = False
try:
    import pyodbc
    # Check for Pervasive/Actian ODBC driver
    drivers = pyodbc.drivers()
    if any('Pervasive' in d or 'PSQL' in d or 'Zen' in d for d in drivers):
        ODBC_AVAILABLE = True
        print("✓ Actian Zen ODBC driver detected")
except ImportError:
    pass

DATA_DIR = os.environ.get('DATA_DIR', '/data')
OUTPUT_DIR = os.environ.get('OUTPUT_DIR', '/output')


def extract_with_odbc():
    """Extract data using proper ODBC connection"""
    import pyodbc

    # Find the ODBC driver
    drivers = pyodbc.drivers()
    driver = next((d for d in drivers if 'Pervasive' in d or 'PSQL' in d or 'Zen' in d), None)

    if not driver:
        raise Exception("No Pervasive/Actian ODBC driver found")

    # Connection string for Btrieve files
    conn_str = f"Driver={{{driver}}};ServerName=localhost;DBQ={DATA_DIR}"

    try:
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()

        results = {
            'chart_of_accounts': [],
            'balances': [],
            'customers': [],
            'vendors': []
        }

        # Query Chart of Accounts
        try:
            cursor.execute("SELECT * FROM CHART")
            columns = [desc[0] for desc in cursor.description]
            for row in cursor.fetchall():
                results['chart_of_accounts'].append(dict(zip(columns, row)))
        except Exception as e:
            print(f"Warning: Could not query CHART: {e}")

        # Query Balance data
        try:
            cursor.execute("SELECT * FROM CHARTAR")
            columns = [desc[0] for desc in cursor.description]
            for row in cursor.fetchall():
                results['balances'].append(dict(zip(columns, row)))
        except Exception as e:
            print(f"Warning: Could not query CHARTAR: {e}")

        # Query Customers
        try:
            cursor.execute("SELECT * FROM CUSTOMER")
            columns = [desc[0] for desc in cursor.description]
            for row in cursor.fetchall():
                results['customers'].append(dict(zip(columns, row)))
        except Exception as e:
            print(f"Warning: Could not query CUSTOMER: {e}")

        # Query Vendors
        try:
            cursor.execute("SELECT * FROM VENDOR")
            columns = [desc[0] for desc in cursor.description]
            for row in cursor.fetchall():
                results['vendors'].append(dict(zip(columns, row)))
        except Exception as e:
            print(f"Warning: Could not query VENDOR: {e}")

        conn.close()
        return results

    except Exception as e:
        print(f"ODBC connection failed: {e}")
        raise


def extract_with_pattern():
    """Fallback: Extract using pattern-based binary reading"""
    from btrieve_reader import BtrieveReader

    reader = BtrieveReader(DATA_DIR)

    results = {
        'chart_of_accounts': reader.extract_chart_of_accounts(),
        'balances': reader.extract_balances_from_chartar(),  # Now returns list of dicts
        'customers': reader.extract_customers(),
        'vendors': reader.extract_vendors()
    }

    return results


def save_results(results):
    """Save extracted data to CSV and JSON files"""
    output_path = Path(OUTPUT_DIR)
    output_path.mkdir(parents=True, exist_ok=True)

    # Save as JSON (complete data)
    with open(output_path / 'extracted_data.json', 'w') as f:
        json.dump(results, f, indent=2, default=str)
    print(f"✓ Saved extracted_data.json")

    # Save Chart of Accounts CSV
    if results['chart_of_accounts']:
        accounts = results['chart_of_accounts']
        fieldnames = list(accounts[0].keys()) if accounts else ['account_number', 'account_name']
        with open(output_path / 'chart_of_accounts.csv', 'w', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(accounts)
        print(f"✓ Saved chart_of_accounts.csv ({len(accounts)} accounts)")

    # Save Balances CSV
    if results['balances']:
        balances = results['balances']
        fieldnames = list(balances[0].keys()) if balances else ['balance']
        with open(output_path / 'balances.csv', 'w', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(balances)
        print(f"✓ Saved balances.csv ({len(balances)} records)")

    # Save Customers CSV
    if results['customers']:
        customers = results['customers']
        fieldnames = list(customers[0].keys()) if customers else ['name']
        with open(output_path / 'customers.csv', 'w', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(customers)
        print(f"✓ Saved customers.csv ({len(customers)} customers)")

    # Save Vendors CSV
    if results['vendors']:
        vendors = results['vendors']
        fieldnames = list(vendors[0].keys()) if vendors else ['name']
        with open(output_path / 'vendors.csv', 'w', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(vendors)
        print(f"✓ Saved vendors.csv ({len(vendors)} vendors)")

    # Create SageFlow-compatible import file
    create_sageflow_import(results, output_path)


def create_sageflow_import(results, output_path):
    """Create a JSON file ready for SageFlow import"""

    # Combine accounts with their balances if possible
    accounts = results.get('chart_of_accounts', [])
    balances = results.get('balances', [])

    # Create import-ready format
    sageflow_data = {
        'accounts': [],
        'customers': results.get('customers', []),
        'vendors': results.get('vendors', [])
    }

    # If we have both accounts and balances with account references
    balance_map = {}
    for b in balances:
        if 'account_number' in b and 'balance' in b:
            balance_map[b['account_number']] = b['balance']

    for acc in accounts:
        acct_num = acc.get('account_number', '')
        sageflow_data['accounts'].append({
            'account_number': acct_num,
            'account_name': acc.get('account_name', ''),
            'type': acc.get('type', 'asset'),
            'balance': balance_map.get(acct_num, acc.get('balance', '0'))
        })

    with open(output_path / 'sageflow_import.json', 'w') as f:
        json.dump(sageflow_data, f, indent=2)
    print(f"✓ Saved sageflow_import.json (ready for import)")


def main():
    print("=" * 60)
    print("Peachtree Data Extractor")
    print("=" * 60)
    print(f"Data directory: {DATA_DIR}")
    print(f"Output directory: {OUTPUT_DIR}")
    print()

    # Check data directory
    if not os.path.exists(DATA_DIR):
        print(f"ERROR: Data directory not found: {DATA_DIR}")
        print("Make sure to mount your PTB data with -v /path/to/data:/data")
        sys.exit(1)

    # List .DAT files
    dat_files = list(Path(DATA_DIR).glob('*.DAT'))
    if not dat_files:
        dat_files = list(Path(DATA_DIR).glob('*.dat'))

    if not dat_files:
        print("ERROR: No .DAT files found in data directory")
        print("Extract your PTB file first: unzip -d /tmp/ptb_data yourfile.ptb")
        sys.exit(1)

    print(f"Found {len(dat_files)} .DAT files")
    print()

    # Try ODBC first, fall back to pattern extraction
    results = None

    if ODBC_AVAILABLE:
        print("Attempting ODBC extraction (high accuracy)...")
        try:
            results = extract_with_odbc()
            print("✓ ODBC extraction successful")
        except Exception as e:
            print(f"ODBC extraction failed: {e}")
            print("Falling back to pattern extraction...")

    if results is None:
        print("Using pattern-based extraction...")
        results = extract_with_pattern()
        print("✓ Pattern extraction complete")
        print("Note: Pattern extraction may miss some data. For 100% accuracy,")
        print("      install Actian Zen ODBC driver and rebuild the container.")

    print()

    # Save results
    save_results(results)

    print()
    print("=" * 60)
    print("Extraction complete!")
    print(f"Output files are in: {OUTPUT_DIR}")
    print("=" * 60)


if __name__ == '__main__':
    main()
