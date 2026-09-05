import streamlit as st
import pandas as pd
import numpy as np
import plotly.graph_objects as go
import plotly.express as px
from datetime import datetime, timedelta
import io

st.set_page_config(page_title="Pharma Shipment Risk Analyzer", layout="wide")

# ============================================================================
# RISK SCORING LOGIC
# ============================================================================

def calculate_risk_score(row):
    """
    Calculate risk score based on multiple factors.
    Risk Levels: Low (0-30), Medium (31-60), High (61-100)
    """
    score = 0

    # Temperature excursion: +40 points
    if row.get('temperature_excursion', False):
        score += 40

    # Temperature > 25°C: +30 points
    if pd.notna(row.get('avg_temperature')) and row['avg_temperature'] > 25:
        score += 30

    # Humidity > 75%: +20 points
    if pd.notna(row.get('avg_humidity')) and row['avg_humidity'] > 75:
        score += 20

    # Transit time > 14 days: +15 points
    if pd.notna(row.get('transit_days')) and row['transit_days'] > 14:
        score += 15

    # Handling violations > 2: +20 points
    if pd.notna(row.get('handling_violations')) and row['handling_violations'] > 2:
        score += 20

    # Wrong storage for temp-sensitive products: +25 points
    if row.get('temp_sensitive', False) and row.get('improper_storage', False):
        score += 25

    return min(score, 100)  # Cap at 100


def get_risk_level(score):
    """Categorize risk based on score."""
    if score <= 30:
        return "Low"
    elif score <= 60:
        return "Medium"
    else:
        return "High"


def get_risk_color(level):
    """Return color for risk level."""
    colors = {"Low": "#00cc00", "Medium": "#ffaa00", "High": "#ff3333"}
    return colors.get(level, "#cccccc")


# ============================================================================
# FILE UPLOAD AND DATA PROCESSING
# ============================================================================

st.title("🏥 Pharma Shipment Risk Analyzer")
st.markdown("Upload an Excel file with shipment data to analyze risk profiles and get AI-powered recommendations.")

col1, col2 = st.columns([3, 1])
with col1:
    uploaded_file = st.file_uploader(
        "Upload Excel file (.xlsx) with shipment data",
        type=["xlsx"],
        help="File should contain columns: shipment_id, origin, destination, avg_temperature, avg_humidity, transit_days, handling_violations, temp_sensitive, temperature_excursion, improper_storage"
    )

with col2:
    if st.button("📥 Load Sample Data", use_container_width=True):
        uploaded_file = None

# Load sample data if available
sample_file_path = "sample_data.xlsx"

if uploaded_file is not None:
    df = pd.read_excel(uploaded_file)
elif st.session_state.get("use_sample", False) or not uploaded_file:
    try:
        df = pd.read_excel(sample_file_path)
        st.info("✅ Using sample data from local file")
    except Exception as e:
        df = None

if uploaded_file is None and "use_sample" not in st.session_state:
    st.session_state.use_sample = True

# ============================================================================
# MAIN APPLICATION
# ============================================================================

if df is not None and not df.empty:
    # Ensure all required columns exist
    required_columns = [
        'shipment_id', 'origin', 'destination', 'avg_temperature',
        'avg_humidity', 'transit_days', 'handling_violations',
        'temp_sensitive', 'temperature_excursion', 'improper_storage'
    ]

    missing_cols = [col for col in required_columns if col not in df.columns]
    if missing_cols:
        st.error(f"❌ Missing required columns: {', '.join(missing_cols)}")
        st.stop()

    # Calculate risk scores
    df['risk_score'] = df.apply(calculate_risk_score, axis=1)
    df['risk_level'] = df['risk_score'].apply(get_risk_level)

    # ========================================================================
    # METRICS SECTION
    # ========================================================================
    st.markdown("## 📊 Key Metrics")

    total_shipments = len(df)
    high_risk_count = len(df[df['risk_level'] == 'High'])
    temp_excursion_count = len(df[df['temperature_excursion'] == True])
    high_risk_pct = (high_risk_count / total_shipments * 100) if total_shipments > 0 else 0

    metric_cols = st.columns(4)
    with metric_cols[0]:
        st.metric("Total Shipments", total_shipments)
    with metric_cols[1]:
        st.metric("High-Risk Shipments", high_risk_count, delta=f"{high_risk_pct:.1f}%")
    with metric_cols[2]:
        st.metric("Temperature Excursions", temp_excursion_count)
    with metric_cols[3]:
        avg_risk_score = df['risk_score'].mean()
        st.metric("Avg Risk Score", f"{avg_risk_score:.1f}", delta="out of 100")

    # ========================================================================
    # VISUALIZATIONS
    # ========================================================================
    st.markdown("## 📈 Risk Distribution")

    viz_col1, viz_col2 = st.columns(2)

    # Risk Level Distribution Pie Chart
    with viz_col1:
        risk_counts = df['risk_level'].value_counts()
        colors_map = {"Low": "#00cc00", "Medium": "#ffaa00", "High": "#ff3333"}
        fig_pie = go.Figure(data=[go.Pie(
            labels=risk_counts.index,
            values=risk_counts.values,
            marker=dict(colors=[colors_map[level] for level in risk_counts.index]),
            hovertemplate="<b>%{label}</b><br>Count: %{value}<br>Percentage: %{percent}<extra></extra>"
        )])
        fig_pie.update_layout(
            title="Risk Level Distribution",
            height=400,
            showlegend=True,
            font=dict(size=12)
        )
        st.plotly_chart(fig_pie, use_container_width=True)

    # Risk Score Distribution Bar Chart
    with viz_col2:
        risk_score_bins = pd.cut(df['risk_score'], bins=[0, 30, 60, 100], labels=['Low (0-30)', 'Medium (31-60)', 'High (61-100)'])
        bin_counts = risk_score_bins.value_counts().sort_index()
        fig_bar = go.Figure(data=[go.Bar(
            x=bin_counts.index,
            y=bin_counts.values,
            marker=dict(color=['#00cc00', '#ffaa00', '#ff3333']),
            text=bin_counts.values,
            textposition='auto',
            hovertemplate="<b>%{x}</b><br>Count: %{y}<extra></extra>"
        )])
        fig_bar.update_layout(
            title="Shipments by Risk Category",
            xaxis_title="Risk Category",
            yaxis_title="Number of Shipments",
            height=400,
            showlegend=False,
            font=dict(size=12)
        )
        st.plotly_chart(fig_bar, use_container_width=True)

    # ========================================================================
    # TOP 5 HIGHEST-RISK SHIPMENTS TABLE
    # ========================================================================
    st.markdown("## 🚨 Top 5 Highest-Risk Shipments")

    top_5 = df.nlargest(5, 'risk_score')[
        ['shipment_id', 'origin', 'destination', 'avg_temperature', 'avg_humidity',
         'transit_days', 'handling_violations', 'temperature_excursion', 'risk_score', 'risk_level']
    ].copy()

    # Format columns for display
    top_5_display = top_5.copy()
    top_5_display['avg_temperature'] = top_5_display['avg_temperature'].round(1).astype(str) + '°C'
    top_5_display['avg_humidity'] = top_5_display['avg_humidity'].round(1).astype(str) + '%'
    top_5_display['temp_excursion'] = top_5_display['temperature_excursion'].map({True: '✓', False: '✗'})
    top_5_display['risk_score'] = top_5_display['risk_score'].astype(int)

    # Rename columns for better display
    top_5_display = top_5_display.rename(columns={
        'shipment_id': 'Shipment ID',
        'origin': 'Origin',
        'destination': 'Destination',
        'avg_temperature': 'Avg Temp',
        'avg_humidity': 'Avg Humidity',
        'transit_days': 'Days',
        'handling_violations': 'Violations',
        'temp_excursion': 'Excursion',
        'risk_score': 'Risk Score',
        'risk_level': 'Risk Level'
    })

    st.dataframe(
        top_5_display,
        use_container_width=True,
        hide_index=True,
        column_config={
            "Risk Score": st.column_config.NumberColumn(format="%d"),
        }
    )

    # ========================================================================
    # AI-STYLE RECOMMENDATIONS
    # ========================================================================
    st.markdown("## 🤖 AI-Powered Recommendations")

    # Generate recommendations
    recommendations = []

    # Recommendation 1: High-risk shipments
    if high_risk_pct > 30:
        recommendations.append({
            'title': '🔴 Critical: High Risk Shipment Volume',
            'text': f'**{high_risk_pct:.1f}% of shipments ({high_risk_count}/{total_shipments}) are classified as High-Risk.** This exceeds the recommended 20% threshold. Priority actions: (1) Implement additional quality checks for high-risk routes, (2) Review carrier selection and transit routes, (3) Consider temperature-controlled packaging upgrades.'
        })
    elif high_risk_pct > 15:
        recommendations.append({
            'title': '🟠 Alert: Elevated Risk Level',
            'text': f'**{high_risk_pct:.1f}% of shipments are High-Risk.** While within acceptable range, consider process improvements: (1) Enhanced monitoring of temperature-sensitive products, (2) Route optimization to reduce transit times, (3) Carrier performance evaluation.'
        })
    else:
        recommendations.append({
            'title': '🟢 Good: Risk Level Under Control',
            'text': f'**{high_risk_pct:.1f}% High-Risk shipments** - well below the 20% threshold. Maintain current protocols and continue monitoring trends.'
        })

    # Recommendation 2: Temperature excursions
    excursion_pct = (temp_excursion_count / total_shipments * 100) if total_shipments > 0 else 0
    if excursion_pct > 15:
        recommendations.append({
            'title': '🌡️ Temperature Excursions Detected',
            'text': f'**{excursion_pct:.1f}% of shipments ({temp_excursion_count}/{total_shipments}) experienced temperature excursions.** Recommended actions: (1) Audit refrigeration units at distribution centers, (2) Review cold chain breaks in the supply route, (3) Implement real-time temperature alerts, (4) Consider insulated packaging improvements.'
        })
    elif temp_excursion_count > 0:
        recommendations.append({
            'title': '⚠️ Monitor Temperature Control',
            'text': f'**{temp_excursion_count} shipments** experienced temperature excursions. While manageable, investigate specific incidents and reinforce temperature monitoring protocols with carriers.'
        })
    else:
        recommendations.append({
            'title': '✓ Temperature Control: Optimal',
            'text': f'**No temperature excursions detected.** Current cold chain management is effective. Continue regular audits and carrier compliance monitoring.'
        })

    # Recommendation 3: Process improvements
    avg_transit = df['transit_days'].mean()
    high_humidity_count = len(df[df['avg_humidity'] > 75])
    violations_count = df['handling_violations'].sum()

    if avg_transit > 14 or high_humidity_count > total_shipments * 0.2 or violations_count > total_shipments:
        improvements = []
        if avg_transit > 14:
            improvements.append(f'transit time averaging {avg_transit:.1f} days (target: <14 days)')
        if high_humidity_count > total_shipments * 0.2:
            improvements.append(f'{high_humidity_count} shipments with high humidity (>75%)')
        if violations_count > total_shipments:
            improvements.append(f'{violations_count} total handling violations detected')

        rec_text = f"**Multiple process improvements recommended:** {', '.join(improvements)}. Action items: (1) Route optimization to reduce transit times, (2) Upgrade humidity control in storage facilities, (3) Enhanced handler training and compliance audits."
        recommendations.append({
            'title': '📋 Process Optimization Opportunities',
            'text': rec_text
        })
    else:
        recommendations.append({
            'title': '✓ Operations: On Track',
            'text': f'Transit times (avg {avg_transit:.1f} days), humidity control, and handling compliance are within acceptable parameters. Continue current best practices.'
        })

    # Display recommendations with color-coded boxes
    for i, rec in enumerate(recommendations[:3]):  # Show first 3 recommendations
        with st.container():
            col = st.columns([0.05, 0.95])[1]
            with col:
                st.markdown(f"### {rec['title']}")
                st.markdown(rec['text'])
            st.divider()

    # ========================================================================
    # DATA EXPLORER
    # ========================================================================
    st.markdown("## 📑 Full Data Explorer")

    with st.expander("View and filter all shipments"):
        # Add filter options
        filter_col1, filter_col2, filter_col3 = st.columns(3)

        with filter_col1:
            risk_filter = st.multiselect(
                "Filter by Risk Level",
                options=['Low', 'Medium', 'High'],
                default=['Low', 'Medium', 'High']
            )

        with filter_col2:
            min_temp = st.slider("Min Temperature (°C)", 0, 40, 0)

        with filter_col3:
            max_temp = st.slider("Max Temperature (°C)", 0, 40, 40)

        # Apply filters
        filtered_df = df[
            (df['risk_level'].isin(risk_filter)) &
            (df['avg_temperature'] >= min_temp) &
            (df['avg_temperature'] <= max_temp)
        ].copy()

        # Format display dataframe
        display_df = filtered_df[[
            'shipment_id', 'origin', 'destination', 'avg_temperature', 'avg_humidity',
            'transit_days', 'handling_violations', 'temperature_excursion', 'risk_score', 'risk_level'
        ]].copy()

        display_df['avg_temperature'] = display_df['avg_temperature'].round(1).astype(str) + '°C'
        display_df['avg_humidity'] = display_df['avg_humidity'].round(1).astype(str) + '%'
        display_df['temperature_excursion'] = display_df['temperature_excursion'].map({True: '✓', False: '✗'})
        display_df['risk_score'] = display_df['risk_score'].astype(int)

        display_df = display_df.rename(columns={
            'shipment_id': 'Shipment ID',
            'origin': 'Origin',
            'destination': 'Destination',
            'avg_temperature': 'Avg Temp',
            'avg_humidity': 'Avg Humidity',
            'transit_days': 'Transit Days',
            'handling_violations': 'Violations',
            'temperature_excursion': 'Excursion',
            'risk_score': 'Risk Score',
            'risk_level': 'Risk Level'
        })

        st.dataframe(display_df, use_container_width=True, hide_index=True)

        st.markdown(f"Showing {len(filtered_df)} of {len(df)} shipments")

        # Download button
        csv = display_df.to_csv(index=False)
        st.download_button(
            label="Download filtered data as CSV",
            data=csv,
            file_name="shipment_analysis.csv",
            mime="text/csv"
        )

else:
    st.info(
        "👋 Welcome! To get started:\n\n"
        "1. **Upload an Excel file** with shipment data, or\n"
        "2. **Click 'Load Sample Data'** to see the analyzer in action\n\n"
        "Required columns: shipment_id, origin, destination, avg_temperature, avg_humidity, "
        "transit_days, handling_violations, temp_sensitive, temperature_excursion, improper_storage"
    )

# Footer
st.markdown("---")
st.markdown(
    "<div style='text-align: center; font-size: 12px; color: #666;'>"
    "Pharma Shipment Risk Analyzer v1.0 | Built with Streamlit | "
    "Risk Scoring: Temperature excursion (40pts) + Temperature >25°C (30pts) + "
    "Humidity >75% (20pts) + Transit >14d (15pts) + Violations (20pts) + Improper storage (25pts)"
    "</div>",
    unsafe_allow_html=True
)
