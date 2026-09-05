import streamlit as st
import pandas as pd
import numpy as np
from io import BytesIO

st.set_page_config(page_title="Pharma Shipment Risk Analyzer", layout="wide")
st.title("🔬 Pharma Shipment Risk Analyzer")

# Sidebar for file upload
st.sidebar.header("Upload Data")
uploaded_file = st.sidebar.file_uploader("Upload Excel file", type=["xlsx", "xls"])

if uploaded_file:
    df = pd.read_excel(uploaded_file)
else:
    st.info("📥 Upload an Excel file or use sample data to analyze shipments.")
    if st.sidebar.button("Load Sample Data"):
        df = pd.DataFrame({
            "Shipment_ID": [f"SHP{i:04d}" for i in range(1, 21)],
            "Product": np.random.choice(["Vaccine", "Biologics", "Injectable", "Oral"], 20),
            "Temperature_Min": np.random.uniform(2, 8, 20),
            "Temperature_Max": np.random.uniform(8, 25, 20),
            "Temp_Excursion": np.random.choice([0, 1, 1, 1, 1, 0, 0, 0], 20),
            "Humidity": np.random.uniform(30, 80, 20),
            "Days_in_Transit": np.random.randint(1, 30, 20),
            "Storage_Location": np.random.choice(["Cold Chain", "Ambient", "Room Temp"], 20),
            "Handling_Violations": np.random.randint(0, 5, 20),
        })
    else:
        st.stop()

# Calculate risk scores
def calculate_risk_score(row):
    score = 0
    if row.get("Temp_Excursion", 0) == 1:
        score += 40
    if row.get("Temperature_Max", 0) > 25:
        score += 30
    if row.get("Humidity", 0) > 75:
        score += 20
    if row.get("Days_in_Transit", 0) > 14:
        score += 15
    if row.get("Handling_Violations", 0) > 2:
        score += 20
    if row.get("Storage_Location", "") != "Cold Chain" and row.get("Product", "") in ["Vaccine", "Biologics"]:
        score += 25
    return min(score, 100)

df["Risk_Score"] = df.apply(calculate_risk_score, axis=1)
df["Risk_Level"] = pd.cut(df["Risk_Score"], bins=[0, 30, 60, 100], labels=["Low", "Medium", "High"])

# Display metrics
col1, col2, col3, col4 = st.columns(4)
with col1:
    st.metric("Total Shipments", len(df))
with col2:
    st.metric("High Risk", len(df[df["Risk_Level"] == "High"]))
with col3:
    st.metric("Medium Risk", len(df[df["Risk_Level"] == "Medium"]))
with col4:
    st.metric("Low Risk", len(df[df["Risk_Level"] == "Low"]))

st.divider()

# Risk distribution chart
col1, col2 = st.columns(2)
with col1:
    risk_counts = df["Risk_Level"].value_counts()
    st.bar_chart(risk_counts)

with col2:
    st.write("**Risk Score Distribution**")
    st.bar_chart(df["Risk_Score"].value_counts().sort_index())

st.divider()

# Detailed table with filtering
st.subheader("Shipment Details")
risk_filter = st.multiselect("Filter by Risk Level", ["Low", "Medium", "High"], default=["High"])
filtered_df = df[df["Risk_Level"].isin(risk_filter)].sort_values("Risk_Score", ascending=False)

# Color code risk levels
def highlight_risk(val):
    if val == "High":
        return "background-color: #ff6b6b"
    elif val == "Medium":
        return "background-color: #ffd93d"
    else:
        return "background-color: #51cf66"

display_df = filtered_df.copy()
display_df["Risk_Score"] = display_df["Risk_Score"].round(0).astype(int)
st.dataframe(
    display_df.style.applymap(highlight_risk, subset=["Risk_Level"]),
    use_container_width=True,
    height=400
)

# Download results
if st.sidebar.button("📥 Download Risk Report"):
    output = BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, sheet_name="Shipments", index=False)
    output.seek(0)
    st.sidebar.download_button(
        label="Download Excel Report",
        data=output.getvalue(),
        file_name="pharma_risk_report.xlsx",
        mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
