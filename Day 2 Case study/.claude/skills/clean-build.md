# Clean Build

Removes build artifacts and cache files.

```bash
cd "/home/labuser/Downloads/handson/Day 2 Case study"

rm -rf \
  dist/ \
  .next/ \
  build/ \
  .pytest_cache/ \
  __pycache__/ \
  *.pyc \
  .streamlit/cache/ \
  node_modules/.cache/ \
  2>/dev/null

echo "✅ Build cleaned"
```

## Removes
- Distribution files (dist/, .next/)
- Python cache (__pycache__/, *.pyc)
- Test cache (.pytest_cache/)
- Streamlit cache
- Node modules cache
