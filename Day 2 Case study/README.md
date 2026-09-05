# 🏥 Pharma Shipment Risk Analyzer

A web-based application for analyzing pharmaceutical shipment data and identifying risk factors in the cold chain supply process.

## Features

- **Excel File Upload** - Analyze your own shipment data in .xlsx format
- **Risk Scoring** - Automatic calculation of risk scores based on multiple factors
- **Key Metrics** - Dashboard showing total shipments, high-risk count, and temperature excursions
- **Top 5 Analysis** - View the highest-risk shipments in a sortable table
- **Risk Visualization** - Pie and bar charts showing risk distribution
- **AI Recommendations** - Automated insights and recommendations based on data patterns
- **Data Explorer** - Filter and explore all shipments with custom criteria
- **CSV Export** - Download analysis results for reporting

## Installation

### Prerequisites
- Python 3.8 or higher
- pip package manager

### Setup

1. **Clone or navigate to the project directory**
   ```bash
   cd "Day 2 Case study"
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Generate sample data (optional but recommended for first run)**
   ```bash
   python generate_sample_data.py
   ```

## Running the Application

Start the Streamlit app with:

```bash
streamlit run app.py
```

This will:
- Open your default web browser automatically
- Display the application at `http://localhost:8501`
- Hot-reload on code changes

## Usage

### First-Time Users

1. Run the app: `streamlit run app.py`
2. Click **"Load Sample Data"** to see the analyzer in action
3. Explore the metrics, charts, and recommendations
4. Download the filtered data as CSV

### Using Your Own Data

1. Prepare an Excel file (.xlsx) with the following columns:
   - `shipment_id` - Unique identifier
   - `origin` - Source location
   - `destination` - Target location
   - `avg_temperature` - Average temperature in Celsius
   - `avg_humidity` - Average humidity percentage
   - `transit_days` - Number of days in transit
   - `handling_violations` - Count of handling violations
   - `temp_sensitive` - Boolean: is product temperature-sensitive?
   - `temperature_excursion` - Boolean: was temperature exceeded?
   - `improper_storage` - Boolean: was storage improper?

2. Click **"Upload Excel file"** and select your file
3. The app will automatically calculate risk scores and generate insights

## Risk Scoring Logic

Risk scores are calculated as follows (0-100):

| Factor | Points | Condition |
|--------|--------|-----------|
| Temperature Excursion | +40 | Any excursion detected |
| High Temperature | +30 | Average > 25°C |
| High Humidity | +20 | Average > 75% |
| Long Transit | +15 | Duration > 14 days |
| Handling Violations | +20 | More than 2 violations |
| Improper Storage (Temp-Sensitive) | +25 | Temp-sensitive + improper storage |

**Risk Levels:**
- **Low**: 0-30 points
- **Medium**: 31-60 points
- **High**: 61-100 points

## Sample Data

The app includes built-in sample data with 50 realistic pharma shipment records. Use it to:
- Understand the data format required
- Explore the app features without your own data
- Test different scenarios

## Troubleshooting

### "ModuleNotFoundError"
```bash
pip install -r requirements.txt
```

### Port 8501 already in use
```bash
streamlit run app.py --server.port=8502
```

### Sample data not loading
```bash
python generate_sample_data.py
```

## Project Structure

```
Day 2 Case study/
├── app.py                      # Main Streamlit application
├── generate_sample_data.py     # Helper script to create sample data
├── requirements.txt            # Python dependencies
├── sample_data.xlsx            # Sample shipment data (auto-generated)
└── README.md                   # This file
```

## Performance Notes

- The app can handle 1000+ shipments smoothly
- Data upload and processing is instant for typical datasets
- Charts update in real-time as filters are applied

## Data Privacy

- All data processing happens locally on your machine
- No data is sent to external servers
- Files are not automatically saved or transmitted

## Support & Feedback

For issues or suggestions, please check the error messages in the terminal where you ran `streamlit run app.py`.

## License

This application is provided as-is for pharmaceutical supply chain analysis.

---

**Built with Streamlit** | Last Updated: 2024
