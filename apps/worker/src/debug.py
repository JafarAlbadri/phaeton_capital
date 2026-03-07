import yfinance as yf
import json

s = yf.Ticker('UNH')
out = {
    'f': s.financials.index.tolist(),
    'b': s.balance_sheet.index.tolist()
}
print(json.dumps(out, indent=2))
