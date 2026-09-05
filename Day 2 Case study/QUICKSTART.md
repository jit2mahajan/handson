# Quick Start Guide - Pharma Shipment Risk Analyzer

## Get Started in 2 Minutes

### 1. Install Dependencies (one-time setup)
```bash
cd "Day 2 Case study"
pip install -r requirements.txt
```

### 2. Run the Application
```bash
streamlit run app.py
```

The app will automatically open in your browser at `http://localhost:8501`

---

## Features at a Glance

### Metrics Dashboard
- **Total Shipments**: See your complete shipment count
- **High-Risk Count**: Identify critical shipments at a glance
- **Temperature Excursions**: Track cold chain violations
- **Average Risk Score**: Monitor overall risk profile

### Visual Analytics
- **Pie Chart**: Risk level distribution (Low/Medium/High)
- **Bar Chart**: Shipments by risk category

### Risk Analysis
- **Top 5 Highest-Risk Shipments**: Detailed table with sorting
- **AI Recommendations**: 3 smart recommendations based on your data

### Data Management
- **Upload Your Own Data**: Use Excel files with your shipment data
- **Filter & Explore**: Advanced filtering by risk level and temperature
- **Export Results**: Download analysis as CSV

---

## Risk Scoring Explained

| Risk Factor | Points | Trigger |
|------------|--------|---------|
| Temperature Excursion | +40 | Any excursion detected |
| High Temperature | +30 | > 25°C average |
| High Humidity | +20 | > 75% average |
| Long Transit | +15 | > 14 days |
| Violations | +20 | > 2 handling violations |
| Improper Storage | +25 | Temp-sensitive + improper storage |

**Risk Categories:**
- 0-30: Low Risk
- 31-60: Medium Risk  
- 61-100: High Risk

---

## Sample Data

The app includes 50 realistic pharma shipment records to test all features. Click "Load Sample Data" to see it in action.

---

## Troubleshooting

**Port already in use?**
```bash
streamlit run app.py --server.port=8502
```

**Dependencies not installing?**
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

**Need to regenerate sample data?**
```bash
python generate_sample_data_simple.py
```

---

## Your Data Format

To upload your own data, prepare an Excel file with these columns:

```
shipment_id              (unique identifier)
origin                   (source location)
destination              (target location)
avg_temperature          (Celsius)
avg_humidity             (percentage 0-100)
transit_days             (number of days)
handling_violations      (count of violations)
temp_sensitive           (TRUE/FALSE)
temperature_excursion    (TRUE/FALSE)
improper_storage         (TRUE/FALSE)
```

---

**Ready? Run: `streamlit run app.py`**
