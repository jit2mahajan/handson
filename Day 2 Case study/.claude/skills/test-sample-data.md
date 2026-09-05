# Test Sample Data

Validates and displays information about the sample pharma shipment data.

```bash
cd "/home/labuser/Downloads/handson/Day 2 Case study"
python << 'PYTHON'
import pandas as pd
import numpy as np

df = pd.read_excel('sample_data.xlsx')
print(f"✅ Sample data loaded: {len(df)} shipments")
print(f"\nColumns: {', '.join(df.columns.tolist())}")
print(f"\nData preview:\n{df.head()}")
print(f"\nData types:\n{df.dtypes}")
print(f"\nMissing values:\n{df.isnull().sum()}")
PYTHON
```

## What it does
- Loads the Excel sample data
- Shows number of records
- Displays data structure
- Checks for missing values
