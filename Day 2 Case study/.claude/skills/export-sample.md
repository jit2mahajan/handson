# Export Sample Data

Creates a CSV export of the sample pharma shipment data for testing.

```bash
cd "/home/labuser/Downloads/handson/Day 2 Case study"
python << 'PYTHON'
import pandas as pd

df = pd.read_excel('sample_data.xlsx')
df.to_csv('sample_data.csv', index=False)
print(f"✅ Sample data exported to sample_data.csv ({len(df)} records)")
PYTHON
```

## Output
- `sample_data.csv` - CSV version of sample data
- Useful for testing file upload with different formats
