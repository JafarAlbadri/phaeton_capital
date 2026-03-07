import yfinance as yf
import json

try:
    stock = yf.Ticker("AAPL")
    insider_purchases = stock.insider_purchases
    insider_transactions = stock.insider_transactions
    insider_roster = stock.insider_roster_holders
    
    print("Purchases:", insider_purchases is not None and not insider_purchases.empty)
    print("Transactions:", insider_transactions is not None and not insider_transactions.empty)
    if insider_transactions is not None and not insider_transactions.empty:
        print(insider_transactions.head(5).to_json(orient="records", date_format="iso"))
except Exception as e:
    print("Error:", str(e))
