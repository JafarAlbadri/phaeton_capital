import yfinance as yf
import sys
import json

def get_stock_data(ticker_symbol):
    try:
        stock = yf.Ticker(ticker_symbol)
        info = stock.info
        
        data = {
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
        print(json.dumps(data))
    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    if len(sys.argv) > 1:
        get_stock_data(sys.argv[1])
    else:
        print(json.dumps({"error": "No ticker provided"}))
