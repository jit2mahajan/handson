const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Typical long-term equity mutual fund/index assumption (%).
// Update this by researching current fund/index performance data.
const DEFAULT_ANNUAL_RETURN = 12;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/default-rate', (req, res) => {
  res.json({ defaultAnnualReturnRate: DEFAULT_ANNUAL_RETURN });
});

app.post('/api/calculate', (req, res) => {
  const monthlyInvestment = Number(req.body.monthlyInvestment);
  const annualReturnRate = Number(req.body.annualReturnRate);
  const years = Number(req.body.years);

  if (
    !Number.isFinite(monthlyInvestment) || monthlyInvestment <= 0 ||
    !Number.isFinite(annualReturnRate) || annualReturnRate < 0 ||
    !Number.isFinite(years) || years <= 0
  ) {
    return res.status(400).json({
      error: 'monthlyInvestment and years must be positive numbers, annualReturnRate must be non-negative.',
    });
  }

  const months = Math.round(years * 12);
  const monthlyRate = annualReturnRate / 100 / 12;

  const futureValue = monthlyRate === 0
    ? monthlyInvestment * months
    : monthlyInvestment *
      ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) *
      (1 + monthlyRate);

  const investedAmount = monthlyInvestment * months;
  const estimatedReturns = futureValue - investedAmount;

  res.json({
    investedAmount: round2(investedAmount),
    estimatedReturns: round2(estimatedReturns),
    futureValue: round2(futureValue),
  });
});

function round2(value) {
  return Math.round(value * 100) / 100;
}

app.listen(PORT, () => {
  console.log(`SIP calculator running at http://localhost:${PORT}`);
});
