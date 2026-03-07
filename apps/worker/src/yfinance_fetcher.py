import yfinance as yf
import sys
import json
import numpy as np
import pandas as pd

def safe_float(val):
    if val is None or pd.isna(val) or np.isinf(val):
        return None
    return float(val)

def get_stock_data(ticker_symbol):
    try:
        stock = yf.Ticker(ticker_symbol)
        info = stock.info
        
        current_data = {
            'ticker': ticker_symbol,
            'current_price': info.get('currentPrice') or info.get('regularMarketPrice'),
            'target_price': info.get('targetMeanPrice'),
            'recommendation': info.get('recommendationKey'),
            'pe_ratio': info.get('forwardPE') or info.get('trailingPE'),
            'high_52_week': info.get('fiftyTwoWeekHigh'),
            'low_52_week': info.get('fiftyTwoWeekLow'),
            'market_cap': info.get('marketCap'),
            'volume': info.get('regularMarketVolume') or info.get('averageVolume')
        }

        # Fetch Financials for History
        history_list = []
        try:
            financials = stock.financials
            balance_sheet = stock.balance_sheet
            
            # yfinance returns columns as DatetimeIndex (most recent first, usually 4 years)
            if not financials.empty and not balance_sheet.empty:
                years = sorted([pd.to_datetime(col).year for col in financials.columns], reverse=True)
                
                shares_out = info.get('sharesOutstanding')
                if not shares_out:
                    shares_out = info.get('impliedSharesOutstanding', 1)

                for col in financials.columns:
                    year = pd.to_datetime(col).year
                    
                    # Safe get from dataframes
                    def get_val(df, row_name):
                        if row_name in df.index and col in df.columns:
                            return df.at[row_name, col]
                        return None

                    net_income = get_val(financials, 'Net Income')
                    total_revenue = get_val(financials, 'Total Revenue')
                    ebit = get_val(financials, 'EBIT')
                    ebitda = get_val(financials, 'EBITDA')
                    
                    total_assets = get_val(balance_sheet, 'Total Assets')
                    total_liab = get_val(balance_sheet, 'Total Liabilities Net Minority Interest')
                    total_equity = get_val(balance_sheet, 'Stockholders Equity')
                    total_debt = get_val(balance_sheet, 'Total Debt')
                    cash = get_val(balance_sheet, 'Cash And Cash Equivalents')

                    # If some balance sheet fields are missing due to mapping, fallback to general names
                    if total_liab is None: total_liab = get_val(balance_sheet, 'Total Liabilities')
                    if total_equity is None: total_equity = get_val(balance_sheet, 'Total Equity Gross Minority Interest')

                    # Calculate generic metrics
                    eps = net_income / shares_out if net_income and shares_out else None
                    rev_per_share = total_revenue / shares_out if total_revenue and shares_out else None
                    roe = net_income / total_equity if net_income and total_equity and total_equity > 0 else None
                    
                    net_debt = (total_debt or 0) - (cash or 0)
                    net_debt_ebitda = net_debt / ebitda if ebitda and ebitda > 0 else None

                    # Ratios based on current price (simulated trailing ratios for the historical year using end of year metrics)
                    # Note: True historical P/E requires historical price. We approximate or leave None if current_price unavailable.
                    # Or we skip P/E for history if we don't fetch historical price. Let's pull historical price for the end of that year.
            
            # Since historical price per year is complex and slows down the scraper, 
            # Avanza style usually relies on fundamental data reported.
            # We will use the info.get proxies or basic math if possible, otherwise we leave None for now.
                    
                    history_list.append({
                        "year": int(year),
                        "eps": safe_float(eps),
                        "revenue_per_share": safe_float(rev_per_share),
                        "roe": safe_float(roe),
                        "net_debt_ebitda": safe_float(net_debt_ebitda),
                        "pe_ratio": None, # Complex to calculate historically without exact price
                        "ps_ratio": None,
                        "pb_ratio": None,
                        "ev_ebit": None
                    })
        except Exception as inner_e:
            pass # Ignore history failures to guarantee current data is returned at least
            
        current_data["history"] = history_list
        
        insider_list = []
        try:
            insiders_df = stock.insider_transactions
            if insiders_df is not None and not insiders_df.empty:
                for idx, row in insiders_df.iterrows():
                    if len(insider_list) >= 20: 
                        break
                    # Convert pandas timestamp to ISO string if possible
                    date_val = row.get('Start Date')
                    date_str = date_val.isoformat() if hasattr(date_val, 'isoformat') else str(date_val)
                    
                    insider_list.append({
                        "insider_name": str(row.get('Insider', '')),
                        "position": str(row.get('Position', '')),
                        "transaction": str(row.get('Transaction', '')),
                        "shares": safe_float(row.get('Shares')),
                        "value": safe_float(row.get('Value')),
                        "date": date_str
                    })
        except Exception as inner_e:
            pass
            
        current_data["insiders"] = insider_list

        print(json.dumps(current_data))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    if len(sys.argv) > 1:
        get_stock_data(sys.argv[1])
    else:
        print(json.dumps({"error": "No ticker provided"}))
