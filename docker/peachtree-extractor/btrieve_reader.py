#!/usr/bin/env python3
"""
Btrieve/Peachtree Data Extractor (Enhanced)
Reads .DAT files from Peachtree PTB backups and extracts structured data.

This script uses multiple strategies:
1. DDF (Data Dictionary Files) if available for schema
2. Pattern-based extraction with multiple strategies
3. Account type inference from account numbers
"""

import os
import sys
import struct
import json
import csv
import re
from pathlib import Path
from collections import defaultdict

class BtrieveReader:
    """Read Btrieve .DAT files with enhanced extraction"""

    def __init__(self, data_dir):
        self.data_dir = Path(data_dir)
        self.ddf_schema = {}

    def read_fcr(self, filepath):
        """Read File Control Record (header) from Btrieve file"""
        with open(filepath, 'rb') as f:
            data = f.read(512)

        return {
            'signature': data[0:2],
            'record_count': struct.unpack('<I', data[0x1C:0x20])[0],
            'key_count': struct.unpack('<H', data[0x14:0x16])[0],
        }

    def infer_account_type(self, account_number):
        """Infer account type from Peachtree account number ranges"""
        try:
            num = int(account_number.replace('.', '').replace('-', '')[:4])
            if 1000 <= num < 2000:
                return 'ASSET'
            elif 2000 <= num < 3000:
                return 'LIABILITY'
            elif 3000 <= num < 4000:
                return 'EQUITY'
            elif 4000 <= num < 5000:
                return 'REVENUE'
            elif 5000 <= num < 10000:
                return 'EXPENSE'
            else:
                return 'ASSET'  # Default
        except:
            return 'ASSET'

    def extract_strings(self, data, min_len=4, max_len=60):
        """Extract readable strings from binary data"""
        strings = []
        current = []

        for byte in data:
            if 32 <= byte < 127:  # Printable ASCII
                current.append(chr(byte))
            else:
                if len(current) >= min_len:
                    s = ''.join(current).strip()
                    if len(s) >= min_len and len(s) <= max_len:
                        strings.append(s)
                current = []

        if len(current) >= min_len:
            s = ''.join(current).strip()
            if len(s) >= min_len:
                strings.append(s)

        return strings

    def extract_chart_of_accounts(self):
        """Extract Chart of Accounts from CHART.DAT using multiple strategies"""
        chart_path = self.data_dir / 'CHART.DAT'
        if not chart_path.exists():
            print(f"CHART.DAT not found in {self.data_dir}")
            return []

        with open(chart_path, 'rb') as f:
            data = f.read()

        fcr = self.read_fcr(chart_path)
        print(f"CHART.DAT: {fcr['record_count']} records")

        accounts = {}  # Use dict to deduplicate

        # Strategy 1: Find account numbers using strings command approach
        # Account numbers are typically 4-6 digits, sometimes with decimals
        account_pattern = re.compile(r'^(\d{4,6}(?:\.\d+)?)$')
        
        # Extract all readable strings from the file
        all_strings = self.extract_strings(data, 3, 50)
        
        # Find account numbers and try to pair with nearby names
        i = 0
        while i < len(data) - 100:
            # Look for length-prefixed strings (Btrieve format)
            # Pattern: [length byte] [string content]
            length_byte = data[i]
            
            if 4 <= length_byte <= 50:
                try:
                    potential_str = data[i+1:i+1+length_byte].decode('ascii', errors='ignore')
                    if potential_str.isprintable() and len(potential_str.strip()) >= 4:
                        # Check if it's an account number
                        if account_pattern.match(potential_str.strip()):
                            acct_num = potential_str.strip()
                            # Look for the name in the next ~100 bytes
                            name_search_start = i + length_byte + 1
                            name_search_end = min(name_search_start + 100, len(data))
                            name_data = data[name_search_start:name_search_end]
                            
                            # Find length-prefixed name
                            for j in range(min(20, len(name_data) - 5)):
                                name_len = name_data[j]
                                if 5 <= name_len <= 45:
                                    try:
                                        name = name_data[j+1:j+1+name_len].decode('ascii', errors='ignore')
                                        if name.isprintable() and sum(c.isalpha() for c in name) >= 3:
                                            if acct_num not in accounts:
                                                accounts[acct_num] = {
                                                    'account_number': acct_num,
                                                    'account_name': name.strip(),
                                                    'type': self.infer_account_type(acct_num)
                                                }
                                            break
                                    except:
                                        pass
                except:
                    pass
            i += 1

        # Strategy 2: Look for known Peachtree patterns
        # Pattern: 04 00 [4-digit account] ... [length] ... [name]
        i = 0
        while i < len(data) - 100:
            if data[i:i+2] == b'\x04\x00':
                try:
                    acct_num = data[i+2:i+6].decode('ascii')
                    if acct_num.isdigit() and acct_num not in accounts:
                        # Search wider range for name
                        for j in range(8, 80):
                            if i + j >= len(data):
                                break
                            name_len = data[i+j]
                            if 5 <= name_len <= 45:
                                # Try multiple offsets for the actual name start
                                for offset in [1, 2, 3, 4]:
                                    name_start = i + j + offset
                                    if name_start + name_len <= len(data):
                                        name = data[name_start:name_start+name_len].decode('ascii', errors='ignore')
                                        if name.isprintable() and sum(c.isalpha() for c in name) >= 3:
                                            accounts[acct_num] = {
                                                'account_number': acct_num,
                                                'account_name': name.strip(),
                                                'type': self.infer_account_type(acct_num)
                                            }
                                            break
                                break
                except:
                    pass
            i += 1

        # Strategy 3: Direct string search for known account names
        known_patterns = [
            (b'Cash on hand', 'Cash on hand'),
            (b'Petty cash', 'Petty cash'),
            (b'Bank', None),  # Will use surrounding context
            (b'Accounts Receivable', 'Accounts Receivable'),
            (b'Accounts Payable', 'Accounts Payable'),
            (b'Sales', 'Sales'),
            (b'Office', None),
            (b'Equipment', None),
            (b'Inventory', 'Inventory'),
            (b'Rent', None),
        ]
        
        for pattern, default_name in known_patterns:
            idx = 0
            while True:
                pos = data.find(pattern, idx)
                if pos == -1:
                    break
                # Look backwards for account number
                search_back = data[max(0, pos-50):pos]
                for back_pos in range(len(search_back)-1, 0, -1):
                    if search_back[back_pos:back_pos+4].isdigit() if back_pos+4 <= len(search_back) else False:
                        try:
                            acct_num = search_back[back_pos:back_pos+4].decode('ascii')
                            if acct_num not in accounts:
                                # Extract full name from this position
                                name_end = pos
                                while name_end < len(data) and data[name_end] >= 32 and data[name_end] < 127:
                                    name_end += 1
                                full_name = data[pos:min(name_end, pos+45)].decode('ascii', errors='ignore').strip()
                                if full_name:
                                    accounts[acct_num] = {
                                        'account_number': acct_num,
                                        'account_name': full_name,
                                        'type': self.infer_account_type(acct_num)
                                    }
                        except:
                            pass
                        break
                idx = pos + 1

        # Strategy 4: Parse strings output style - find adjacent number/name pairs
        strings_in_file = []
        i = 0
        while i < len(data):
            # Find printable string runs
            if 32 <= data[i] < 127:
                start = i
                while i < len(data) and 32 <= data[i] < 127:
                    i += 1
                if i - start >= 4:
                    try:
                        s = data[start:i].decode('ascii').strip()
                        strings_in_file.append((start, s))
                    except:
                        pass
            else:
                i += 1

        # Look for account number followed by name
        for idx, (pos, s) in enumerate(strings_in_file):
            if account_pattern.match(s) and s not in accounts:
                # Look at next few strings for the name
                for next_idx in range(idx+1, min(idx+5, len(strings_in_file))):
                    _, next_s = strings_in_file[next_idx]
                    # Name should have letters and not be just numbers
                    if sum(c.isalpha() for c in next_s) >= 3 and not account_pattern.match(next_s):
                        accounts[s] = {
                            'account_number': s,
                            'account_name': next_s,
                            'type': self.infer_account_type(s)
                        }
                        break

        print(f"  Extracted {len(accounts)} accounts using multi-strategy approach")
        return list(accounts.values())

    def extract_balances_from_chartar(self):
        """Extract balance values from CHARTAR.DAT with account linking"""
        chartar_path = self.data_dir / 'CHARTAR.DAT'
        if not chartar_path.exists():
            print(f"CHARTAR.DAT not found")
            return []

        with open(chartar_path, 'rb') as f:
            data = f.read()

        fcr = self.read_fcr(chartar_path)
        print(f"CHARTAR.DAT: {fcr['record_count']} records")

        balances = []
        i = 0

        while i < len(data) - 20:
            # Pattern: ff ff ff ff ff ff [11|15] 00 [8-byte double]
            if (data[i:i+6] == b'\xff\xff\xff\xff\xff\xff' and
                data[i+6] in [0x11, 0x15] and
                data[i+7] == 0x00):
                try:
                    val = struct.unpack('<d', data[i+8:i+16])[0]
                    if 1 < abs(val) < 100000000 and val == val:
                        # Try to find associated account number nearby
                        search_back = data[max(0, i-50):i]
                        acct_num = None
                        for j in range(len(search_back)-4, -1, -1):
                            try:
                                potential = search_back[j:j+4].decode('ascii')
                                if potential.isdigit():
                                    acct_num = potential
                                    break
                            except:
                                pass
                        
                        balances.append({
                            'account_number': acct_num,
                            'balance': round(val, 2)
                        })
                except:
                    pass
                i += 16
            else:
                i += 1

        # Deduplicate and aggregate
        unique_balances = {}
        for b in balances:
            key = b.get('account_number') or str(b['balance'])
            if key not in unique_balances:
                unique_balances[key] = b

        print(f"  Extracted {len(unique_balances)} balance records")
        return list(unique_balances.values())

    def extract_customers(self):
        """Extract customers from CUSTOMER.DAT with deduplication"""
        cust_path = self.data_dir / 'CUSTOMER.DAT'
        if not cust_path.exists():
            return []

        with open(cust_path, 'rb') as f:
            data = f.read()

        fcr = self.read_fcr(cust_path)
        print(f"CUSTOMER.DAT: {fcr['record_count']} records")

        strings = self.extract_strings(data, 4, 50)

        # Filter and deduplicate
        junk_patterns = ['AirborneQ', 'DupF', 'Fv1b', 'QC7P', 'THx', 'A1Ww', 
                         'ArvB', 'DIXT', 'Customer', 'customer']
        seen = set()
        customers = []
        
        for s in strings:
            s_clean = s.strip()
            s_lower = s_clean.lower()
            
            # Skip junk
            if any(junk.lower() in s_lower for junk in junk_patterns):
                continue
            
            # Must start with uppercase, have letters, not be too short
            if (len(s_clean) >= 4 and
                s_clean[0].isupper() and
                sum(c.isalpha() for c in s_clean) >= 3 and
                not any(x in s_lower for x in ['dat', 'ptb', '.', 'rpt'])):
                
                if s_lower not in seen:
                    seen.add(s_lower)
                    customers.append({'name': s_clean})

        print(f"  Extracted {len(customers)} unique customers")
        return customers

    def extract_vendors(self):
        """Extract vendors from VENDOR.DAT with deduplication"""
        vend_path = self.data_dir / 'VENDOR.DAT'
        if not vend_path.exists():
            return []

        with open(vend_path, 'rb') as f:
            data = f.read()

        fcr = self.read_fcr(vend_path)
        print(f"VENDOR.DAT: {fcr['record_count']} records")

        strings = self.extract_strings(data, 4, 50)

        # Filter and deduplicate
        junk_patterns = ['AirborneQ', 'DupF', 'Fv1b', 'QC7P', 'THx', 'A1Ww',
                         "Airborne'", 'ArvB', 'DIXT', 'Vendor', 'vendor',
                         'Employee', 'Payment', 'Supplies', 'Cost', 'Inventory']
        seen = set()
        vendors = []
        
        for s in strings:
            s_clean = s.strip()
            s_lower = s_clean.lower()
            
            # Skip junk
            if any(junk.lower() in s_lower for junk in junk_patterns):
                continue
            
            # Must start with uppercase, have letters
            if (len(s_clean) >= 4 and
                s_clean[0].isupper() and
                sum(c.isalpha() for c in s_clean) >= 3 and
                not any(x in s_lower for x in ['dat', 'ptb', '.', 'rpt'])):
                
                if s_lower not in seen:
                    seen.add(s_lower)
                    vendors.append({'name': s_clean})

        print(f"  Extracted {len(vendors)} unique vendors")
        return vendors

    def export_all(self, output_dir):
        """Export all extracted data to CSV files"""
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)

        # Chart of Accounts
        accounts = self.extract_chart_of_accounts()
        if accounts:
            with open(output_path / 'chart_of_accounts.csv', 'w', newline='') as f:
                writer = csv.DictWriter(f, fieldnames=['account_number', 'account_name', 'type'])
                writer.writeheader()
                writer.writerows(accounts)
            print(f"Exported {len(accounts)} accounts")

        # Balances
        balances = self.extract_balances_from_chartar()
        if balances:
            with open(output_path / 'balances.csv', 'w', newline='') as f:
                writer = csv.DictWriter(f, fieldnames=['account_number', 'balance'])
                writer.writeheader()
                writer.writerows(balances)
            print(f"Exported {len(balances)} balance records")

        # Customers
        customers = self.extract_customers()
        if customers:
            with open(output_path / 'customers.csv', 'w', newline='') as f:
                writer = csv.DictWriter(f, fieldnames=['name'])
                writer.writeheader()
                writer.writerows(customers)
            print(f"Exported {len(customers)} customers")

        # Vendors
        vendors = self.extract_vendors()
        if vendors:
            with open(output_path / 'vendors.csv', 'w', newline='') as f:
                writer = csv.DictWriter(f, fieldnames=['name'])
                writer.writeheader()
                writer.writerows(vendors)
            print(f"Exported {len(vendors)} vendors")

        print(f"\nAll data exported to {output_path}")


def main():
    if len(sys.argv) < 2:
        print("Usage: python btrieve_reader.py <data_directory> [output_directory]")
        print("  data_directory: Path to extracted PTB files (.DAT files)")
        print("  output_directory: Path for CSV output (default: ./output)")
        sys.exit(1)

    data_dir = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else './output'

    print(f"Btrieve/Peachtree Data Extractor (Enhanced)")
    print(f"==========================================")
    print(f"Data directory: {data_dir}")
    print(f"Output directory: {output_dir}\n")

    reader = BtrieveReader(data_dir)
    reader.export_all(output_dir)


if __name__ == '__main__':
    main()
