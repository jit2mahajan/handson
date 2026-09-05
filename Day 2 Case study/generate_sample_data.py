#!/usr/bin/env python3
"""
Generate sample pharmaceutical shipment data for testing the Risk Analyzer.
Run this script to create sample_data.xlsx with realistic test data.
"""

import random
import sys

try:
    import pandas as pd
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment
except ImportError:
    print("Error: Required packages not installed.")
    print("Please run: pip install -r requirements.txt")
    sys.exit(1)

def generate_sample_data(n_shipments=50):
    """Generate realistic pharmaceutical shipment data."""
    
    random.seed(42)
    
    origins = ['NYC Hub', 'LA Facility', 'Chicago Center', 'Houston Depot', 'Atlanta Terminal']
    destinations = [
        'Boston Hospital', 'Miami Clinic', 'Seattle Medical', 'Denver Health',
        'Dallas Center', 'San Francisco Pharma', 'Phoenix Med Center', 'Austin Health'
    ]
    
    data = {
        'shipment_id': [f'SHP-{i:05d}' for i in range(1, n_shipments + 1)],
        'origin': [random.choice(origins) for _ in range(n_shipments)],
        'destination': [random.choice(destinations) for _ in range(n_shipments)],
        'avg_temperature': [round(random.uniform(8, 32), 1) for _ in range(n_shipments)],
        'avg_humidity': [round(random.uniform(30, 85), 1) for _ in range(n_shipments)],
        'transit_days': [random.randint(3, 24) for _ in range(n_shipments)],
        'handling_violations': [random.randint(0, 4) for _ in range(n_shipments)],
        'temp_sensitive': [random.random() < 0.6 for _ in range(n_shipments)],
        'temperature_excursion': [random.random() < 0.15 for _ in range(n_shipments)],
        'improper_storage': [random.random() < 0.2 for _ in range(n_shipments)],
    }
    
    df = pd.DataFrame(data)
    
    # Add some intentional high-risk shipments for demo purposes
    high_risk_indices = list(range(min(5, len(df))))
    
    if len(df) > 0:
        df.loc[0, 'avg_temperature'] = 32
        df.loc[0, 'temperature_excursion'] = True
    if len(df) > 1:
        df.loc[1, 'avg_humidity'] = 85
        df.loc[1, 'temp_sensitive'] = True
    if len(df) > 2:
        df.loc[2, 'transit_days'] = 20
        df.loc[2, 'avg_temperature'] = 28
    if len(df) > 3:
        df.loc[3, 'handling_violations'] = 4
        df.loc[3, 'avg_humidity'] = 80
    if len(df) > 4:
        df.loc[4, 'temperature_excursion'] = True
        df.loc[4, 'improper_storage'] = True
        df.loc[4, 'temp_sensitive'] = True
    
    return df

def save_to_excel(df, filepath):
    """Save DataFrame to Excel file with formatting."""
    df.to_excel(filepath, index=False, sheet_name='Shipments')
    print(f"✓ Sample data saved to: {filepath}")

def main():
    """Main execution function."""
    print("=" * 60)
    print("Pharma Shipment Risk Analyzer - Sample Data Generator")
    print("=" * 60)
    
    filepath = 'sample_data.xlsx'
    
    print(f"\nGenerating {50} sample pharma shipments...")
    df = generate_sample_data(50)
    
    print(f"Saving to Excel file: {filepath}")
    save_to_excel(df, filepath)
    
    print("\n" + "=" * 60)
    print("Sample Data Summary:")
    print("=" * 60)
    print(f"Total Records: {len(df)}")
    print(f"Temperature Range: {df['avg_temperature'].min()}°C - {df['avg_temperature'].max()}°C")
    print(f"Humidity Range: {df['avg_humidity'].min()}% - {df['avg_humidity'].max()}%")
    print(f"Transit Days Range: {df['transit_days'].min()}-{df['transit_days'].max()} days")
    print(f"Temperature Excursions: {df['temperature_excursion'].sum()} shipments")
    print(f"Improper Storage Cases: {df['improper_storage'].sum()} shipments")
    print(f"Total Handling Violations: {df['handling_violations'].sum()}")
    
    print("\n✓ Data generation complete!")
    print("\nNext step: Run the app with:")
    print("  streamlit run app.py")
    print("=" * 60)

if __name__ == '__main__':
    main()
