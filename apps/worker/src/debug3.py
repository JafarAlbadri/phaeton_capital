import yfinance as yf
import json
import numpy as np
import pandas as pd

def safe_float(val):
    if val is None or pd.isna(val) or np.isinf(val):
        return None
    return float(val)

stock = yf.Ticker('UNH')
info = stock.info
financials = stock.financials
balance_sheet = stock.balance_sheet

shares_out = info.get('sharesOutstanding')
if not shares_out:
    shares_out = info.get('impliedSharesOutstanding', 1)

history_list = []
for col in financials.columns:
    year = pd.to_datetime(col).year
    def get_val(df, row_name):
        if row_name in df.index and col in df.columns:
            return df.at[row_name, col]
        return None

    net_income = get_val(financials, 'Net Income')
    total_revenue = get_val(financials, 'Total Revenue')
    ebitda = get_val(financials, 'EBITDA')
    
    total_equity = get_val(balance_sheet, 'Stockholders Equity')
    total_debt = get_val(balance_sheet, 'Total Debt')
    cash = get_val(balance_sheet, 'Cash And Cash Equivalents')

    eps = net_income / shares_out if net_income and shares_out else None
    rev_per_share = total_revenue / shares_out if total_revenue and shares_out else None
    roe = net_income / total_equity if net_income and total_equity and total_equity > 0 else None
    
    net_debt = (total_debt or 0) - (cash or 0)
    net_debt_ebitda = net_debt / ebitda if ebitda and ebitda > 0 else None

    # Let's also print out the raw math values to see what is missing
    history_list.append({
        "year": int(year),
        "eps": safe_float(eps),
        "roe": safe_float(roe),
        "shares_out": shares_out,
        "net_income": safe_float(net_income),
        "total_equity": safe_float(total_equity),
        "total_revenue": safe_float(total_revenue)
    })
print(json.dumps(history_list))
