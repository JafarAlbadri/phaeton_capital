import yfinance as yf
import json

s = yf.Ticker('UNH')
f = s.financials
ans = {}
for col in f.columns:
    try:
        val = f.at['Net Income', col]
        ans[str(col)] = float(val) if val is not None else None
    except Exception as e:
        ans[str(col)] = str(e)
print(json.dumps(ans))
