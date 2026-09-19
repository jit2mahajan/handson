const form = document.getElementById('sip-form');
const resultSection = document.getElementById('result');
const errorEl = document.getElementById('error');
const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorEl.classList.add('hidden');
  resultSection.classList.add('hidden');

  const payload = {
    monthlyInvestment: document.getElementById('monthlyInvestment').value,
    annualReturnRate: document.getElementById('annualReturnRate').value,
    years: document.getElementById('years').value,
  };

  try {
    const response = await fetch('/api/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Something went wrong.');
    }

    document.getElementById('investedAmount').textContent = currency.format(data.investedAmount);
    document.getElementById('estimatedReturns').textContent = currency.format(data.estimatedReturns);
    document.getElementById('futureValue').textContent = currency.format(data.futureValue);
    resultSection.classList.remove('hidden');
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove('hidden');
  }
});
