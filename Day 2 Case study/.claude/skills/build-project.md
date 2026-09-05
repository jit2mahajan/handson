# Build Project

Prepares the project for deployment and testing.

```bash
cd "/home/labuser/Downloads/handson/Day 2 Case study"

# Clean old artifacts
rm -rf .next dist __pycache__ .pytest_cache *.pyc 2>/dev/null

# Install dependencies
pip install -r requirements.txt

# Verify installation
python -c "import streamlit, pandas, plotly; print('✅ All dependencies verified')"

echo "✅ Project build complete"
```

## Checks performed
- Cleans temporary files
- Installs dependencies
- Verifies all imports
- Confirms build success
