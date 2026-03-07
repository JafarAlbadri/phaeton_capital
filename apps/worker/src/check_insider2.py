import yfinance as yf
import json

stock = yf.Ticker("AAPL")
try:
    df = stock.insider_transactions
    if df is not None:
        print("Columns:", df.columns.tolist())
        print(df.head(2).to_json(orient="records", date_format="iso"))
except Exception as e:
    print(str(e))
