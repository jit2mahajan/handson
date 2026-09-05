# Pharma Shipment Risk Analyzer

A lightweight Streamlit application for identifying high-risk shipments in pharmaceutical supply chains.

## Features

- **Upload Excel Data**: Load your pharma supply-chain dataset
- **Risk Scoring**: Automatic calculation of risk scores based on:
  - Temperature excursions
  - Humidity levels
  - Transit duration
  - Handling violations
  - Storage location & product type mismatch
- **Visual Analytics**: Charts and metrics for risk distribution
- **Filtering & Export**: Filter by risk level and export results to Excel

## Quick Start

### Installation

```bash
pip install -r requirements.txt
```

### Run the App

```bash
streamlit run pharma_risk_app.py
```

The app will open at `http://localhost:8501`

## Data Format

Upload an Excel file with the following columns:

| Column | Type | Example |
|--------|------|---------|
| Shipment_ID | String | SHP0001 |
| Product | String | Vaccine, Biologics, Injectable, Oral |
| Temperature_Min | Float | 2.0 |
| Temperature_Max | Float | 8.5 |
| Temp_Excursion | Int (0/1) | 1 (if excursion occurred) |
| Humidity | Float | 45.2 |
| Days_in_Transit | Int | 5 |
| Storage_Location | String | Cold Chain, Ambient, Room Temp |
| Handling_Violations | Int | 0-5 |

## Risk Scoring Criteria

- **Temperature Excursion**: +40 points
- **Temperature Max > 25°C**: +30 points
- **Humidity > 75%**: +20 points
- **Transit > 14 days**: +15 points
- **Handling Violations > 2**: +20 points
- **Wrong Storage Location**: +25 points (for temperature-sensitive products)

**Risk Levels:**
- Low: 0-30 points
- Medium: 31-60 points
- High: 61-100 points

## Sample Data

Click "Load Sample Data" in the sidebar to test with auto-generated data.
