import sys
import json
import yfinance as yf
import numpy as np
import pandas as pd

def safe_float(val):
    try:
        if val is None or (isinstance(val, float) and (np.isnan(val) or np.isinf(val))):
            return None
        return float(val)
    except:
        return None

def main():
    try:
        payload = json.loads(sys.stdin.read())
        ticker_symbol = payload.get("ticker", "")
        sector_etf = payload.get("sector_etf", "SPY")

        # Fetch VIX
        vix = None
        try:
            vix_data = yf.Ticker("^VIX").history(period="1d")
            if not vix_data.empty:
                vix = safe_float(vix_data['Close'].iloc[-1])
        except:
            pass

        # Fetch 10-year yield
        ten_year = None
        try:
            tnx = yf.Ticker("^TNX").history(period="1d")
            if not tnx.empty:
                ten_year = safe_float(tnx['Close'].iloc[-1])
        except:
            pass

        # Fetch Fed Funds Rate proxy (13-week T-bill ^IRX)
        fed_rate = None
        try:
            irx = yf.Ticker("^IRX").history(period="1d")
            if not irx.empty:
                fed_rate = safe_float(irx['Close'].iloc[-1])
        except:
            pass

        # Sector ETF momentum (1m, 3m)
        sector_1m = None
        sector_3m = None
        try:
            etf_hist = yf.Ticker(sector_etf).history(period="3mo")
            if not etf_hist.empty and len(etf_hist) > 1:
                latest = float(etf_hist['Close'].iloc[-1])
                # 1-month momentum
                one_month_ago_idx = max(0, len(etf_hist) - 21)
                sector_1m = safe_float((latest - float(etf_hist['Close'].iloc[one_month_ago_idx])) / float(etf_hist['Close'].iloc[one_month_ago_idx]))
                # 3-month momentum
                sector_3m = safe_float((latest - float(etf_hist['Close'].iloc[0])) / float(etf_hist['Close'].iloc[0]))
        except:
            pass

        # SPY P/E ratio proxy (use trailing P/E from info)
        spy_pe = None
        try:
            spy_info = yf.Ticker("SPY").info
            spy_pe = safe_float(spy_info.get('trailingPE'))
        except:
            pass

        # Ticker's P/E for premium calculation
        pe_premium_pct = None
        try:
            stock_info = yf.Ticker(ticker_symbol).info
            stock_pe = stock_info.get('forwardPE') or stock_info.get('trailingPE')
            if stock_pe and spy_pe and spy_pe > 0:
                pe_premium_pct = safe_float(((stock_pe - spy_pe) / spy_pe) * 100)
        except:
            pass

        # Fear & Greed proxy: combine VIX-based fear (inverted), and sector momentum
        fear_greed = None
        try:
            fg = 50.0
            if vix is not None:
                # VIX > 30 => fear, VIX < 15 => greed
                vix_component = max(0, min(100, 100 - (vix - 10) * 2.5))
                fg = 0.6 * vix_component + 0.4 * 50  # Blend
            if sector_1m is not None:
                momentum_component = max(0, min(100, 50 + sector_1m * 300))
                fg = 0.7 * fg + 0.3 * momentum_component
            fear_greed = safe_float(fg)
        except:
            pass

        # Rate sensitivity: high PE stocks are more rate sensitive
        rate_sensitive = None
        try:
            stock_info = yf.Ticker(ticker_symbol).info
            pe = stock_info.get('forwardPE') or stock_info.get('trailingPE')
            if pe and spy_pe:
                rate_sensitive = pe > spy_pe * 1.5
        except:
            pass

        result = {
            "vix": vix,
            "ten_year_yield": ten_year,
            "fed_funds_rate": fed_rate,
            "cpi_yoy": None,  # Would need FRED API for CPI
            "sector_etf_momentum_1m": sector_1m,
            "sector_etf_momentum_3m": sector_3m,
            "spy_pe_ratio": spy_pe,
            "fear_greed_index": fear_greed,
            "rate_sensitive": rate_sensitive,
            "pe_premium_pct": pe_premium_pct,
        }
        print(json.dumps(result))

    except Exception as e:
        import traceback
        print(json.dumps({"error": str(e), "traceback": traceback.format_exc()}))

if __name__ == "__main__":
    main()
