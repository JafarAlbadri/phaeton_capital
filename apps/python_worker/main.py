from fastapi import FastAPI, Request
import advanced_math
import yfinance_fetcher
import macro_fetcher

app = FastAPI(title="Phaeton Capital Python Worker")

@app.post("/quant")
async def quant_endpoint(request: Request):
    payload = await request.json()
    result = advanced_math.process_quant(payload)
    return result

@app.get("/fundamentals/{ticker}")
async def fundamentals_endpoint(ticker: str):
    result = yfinance_fetcher.get_stock_data(ticker)
    return result

@app.post("/macro")
async def macro_endpoint(request: Request):
    payload = await request.json()
    result = macro_fetcher.process_macro(payload)
    return result

@app.get("/health")
def health_endpoint():
    return {"status": "ok"}

@app.get("/options/{ticker}")
async def options_endpoint(ticker: str):
    try:
        import yfinance as yf
        import numpy as np

        stock = yf.Ticker(ticker.upper())
        expirations = stock.options
        if not expirations:
            return {"error": "No options data"}

        nearest_expiry = expirations[0]
        chain = stock.option_chain(nearest_expiry)
        calls = chain.calls
        puts = chain.puts

        call_vol = int(calls['volume'].fillna(0).sum())
        put_vol = int(puts['volume'].fillna(0).sum())
        total_oi = int(calls['openInterest'].fillna(0).sum() + puts['openInterest'].fillna(0).sum())
        put_call_ratio = round(put_vol / call_vol, 4) if call_vol > 0 else None

        current_iv = float(calls['impliedVolatility'].mean()) if not calls.empty else None
        iv_percentile = None
        try:
            hist = stock.history(period="1y")
            if hist is not None and len(hist) > 20:
                hv = float(hist['Close'].pct_change().dropna().std() * np.sqrt(252))
                if hv > 0 and current_iv is not None:
                    iv_percentile = min(100.0, round((current_iv / hv) * 50, 1))
        except Exception:
            pass

        avg_call_vol = call_vol / max(len(expirations), 1)
        avg_put_vol = put_vol / max(len(expirations), 1)

        max_pain_price = None
        try:
            import pandas as pd
            all_strikes = sorted(set(calls['strike'].tolist() + puts['strike'].tolist()))
            if all_strikes:
                pain = []
                for s in all_strikes:
                    cp = float(((s - calls['strike']) * calls['openInterest'].fillna(0)).clip(lower=0).sum())
                    pp = float(((puts['strike'] - s) * puts['openInterest'].fillna(0)).clip(lower=0).sum())
                    pain.append(cp + pp)
                max_pain_price = round(all_strikes[pain.index(min(pain))], 2)
        except Exception:
            pass

        return {
            "ticker": ticker.upper(),
            "put_call_ratio": put_call_ratio,
            "call_volume": call_vol,
            "put_volume": put_vol,
            "total_open_interest": total_oi,
            "iv_percentile": iv_percentile,
            "unusual_call_volume": call_vol > avg_call_vol * 2,
            "unusual_put_volume": put_vol > avg_put_vol * 2,
            "max_pain_price": max_pain_price,
            "nearest_expiry": nearest_expiry,
        }
    except Exception as e:
        return {"error": str(e)}

@app.post("/backtest/{ticker}")
async def backtest_endpoint(ticker: str, years: int = 2):
    try:
        import yfinance as yf
        import numpy as np

        stock = yf.Ticker(ticker.upper())
        hist = stock.history(period=f"{years}y")
        if hist is None or len(hist) < 60:
            return {"error": "Insufficient historical data"}

        close = hist['Close']
        delta = close.diff()
        gain = delta.clip(lower=0).rolling(14).mean()
        loss = (-delta.clip(upper=0)).rolling(14).mean()
        rs = gain / loss.replace(0, np.nan)
        rsi = 100 - (100 / (1 + rs))
        ema12 = close.ewm(span=12, adjust=False).mean()
        ema26 = close.ewm(span=26, adjust=False).mean()
        macd_hist = (ema12 - ema26) - (ema12 - ema26).ewm(span=9, adjust=False).mean()
        sma50 = close.rolling(50).mean()
        sma200 = close.rolling(200).mean()

        holding = 15
        trades = []
        equity = [1.0]
        eq = 1.0
        start_idx = 200

        for i in range(start_idx, len(close) - holding, holding):
            ep = float(close.iloc[i])
            xp = float(close.iloc[i + holding])
            r = float(rsi.iloc[i]) if not np.isnan(rsi.iloc[i]) else 50.0
            m = float(macd_hist.iloc[i]) if not np.isnan(macd_hist.iloc[i]) else 0.0
            s50 = float(sma50.iloc[i]) if not np.isnan(sma50.iloc[i]) else ep
            s200 = float(sma200.iloc[i]) if not np.isnan(sma200.iloc[i]) else ep

            score = 50.0
            if r < 30: score += 15
            elif r > 70: score -= 15
            else: score += (50 - r) * 0.3
            score += 15 if m > 0 else -15
            score += 10 if s50 > s200 else -10

            if score > 60:
                direction = 'BUY'
                ret = (xp - ep) / ep
            elif score < 40:
                direction = 'SELL'
                ret = (ep - xp) / ep
            else:
                continue

            eq *= (1 + ret)
            equity.append(round(eq, 6))
            trades.append({
                "date": close.index[i].strftime("%Y-%m-%d"),
                "direction": direction,
                "score": round(score, 1),
                "entry": round(ep, 4),
                "exit": round(xp, 4),
                "return_pct": round(ret * 100, 3),
                "outcome": "CORRECT" if ret > 0 else "INCORRECT",
            })

        if not trades:
            return {"error": "No trades generated"}

        rets = [t["return_pct"] / 100 for t in trades]
        hit_rate = sum(1 for r in rets if r > 0) / len(rets)
        avg_ret = float(np.mean(rets))
        std_ret = float(np.std(rets))
        sharpe = (avg_ret / std_ret * np.sqrt(252 / 15)) if std_ret > 0 else 0.0
        eq_arr = np.array(equity)
        peak = np.maximum.accumulate(eq_arr)
        max_dd = float(((eq_arr - peak) / peak).min())
        bh = float((close.iloc[-1] - close.iloc[start_idx]) / close.iloc[start_idx])

        step = max(1, len(equity) // 60)
        curve = [{"date": trades[min(i, len(trades)-1)]["date"], "equity": round(equity[i], 4), "bh": round(1 + bh * (i / len(equity)), 4)} for i in range(0, len(equity), step)]

        return {
            "ticker": ticker.upper(), "years_tested": years, "total_trades": len(trades),
            "hit_rate": round(hit_rate, 4), "avg_return_pct": round(avg_ret * 100, 4),
            "sharpe_ratio": round(sharpe, 4), "max_drawdown_pct": round(max_dd * 100, 4),
            "final_equity": round(eq, 4), "benchmark_return_pct": round(bh * 100, 4),
            "equity_curve": curve, "recent_trades": trades[-10:],
        }
    except Exception as e:
        return {"error": str(e)}

@app.get("/trends/{ticker}")
async def trends_endpoint(ticker: str):
    try:
        import time
        import numpy as np
        from pytrends.request import TrendReq

        pytrends = TrendReq(hl='en-US', tz=360)
        kw = f"{ticker.upper()} stock"
        pytrends.build_payload([kw], timeframe='today 3-m', geo='US')
        time.sleep(10)  # mandatory to avoid IP block
        df = pytrends.interest_over_time()

        if df is None or df.empty or kw not in df.columns:
            return {"trends_score": 50, "weekly_data": [], "direction": "flat"}

        values = df[kw].tolist()
        dates = [d.strftime("%Y-%m-%d") for d in df.index]
        weekly_data = [{"week": dates[i], "interest": values[i]} for i in range(len(values))]

        # 12-week z-score
        arr = np.array(values, dtype=float)
        mean_12w = float(np.mean(arr[-12:]) if len(arr) >= 12 else np.mean(arr))
        std_12w  = float(np.std(arr[-12:])  if len(arr) >= 12 else np.std(arr))
        last_val = float(arr[-1]) if len(arr) > 0 else mean_12w

        z = (last_val - mean_12w) / max(std_12w, 1.0)
        trends_score = float(max(0.0, min(100.0, 50 + z * 10)))

        if len(arr) >= 4:
            direction = "up" if arr[-1] > arr[-4] else ("down" if arr[-1] < arr[-4] else "flat")
        else:
            direction = "flat"

        return {
            "trends_score": round(trends_score, 2),
            "weekly_data": weekly_data,
            "direction": direction,
        }
    except Exception as e:
        return {"trends_score": 50, "weekly_data": [], "direction": "flat", "error": str(e)}

@app.get("/crosslist/{ticker}")
async def crosslist_endpoint(ticker: str):
    """ADR / cross-listing gap monitor. Returns gap between home listing and US ADR."""
    try:
        import yfinance as yf
        # Map of known US ADR tickers to their home market equivalents
        ADR_MAP: dict[str, dict] = {
            "ASML": {"home": "ASML.AS", "exchange": "AEX", "fx_pair": "EURUSD=X"},
            "TM":   {"home": "7203.T",  "exchange": "TSE", "fx_pair": "JPYUSD=X"},
            "SAP":  {"home": "SAP.DE",  "exchange": "XETRA", "fx_pair": "EURUSD=X"},
            "HSBC": {"home": "0005.HK", "exchange": "HKEX", "fx_pair": "HKDUSD=X"},
            "NVO":  {"home": "NOVO-B.CO","exchange": "OMX", "fx_pair": "DKKUSD=X"},
            "SONY": {"home": "6758.T",  "exchange": "TSE", "fx_pair": "JPYUSD=X"},
        }
        t = ticker.upper()
        if t not in ADR_MAP:
            return {"error": "No ADR mapping for this ticker", "ticker": t}

        mapping = ADR_MAP[t]
        adr_data  = yf.Ticker(t).fast_info
        home_data = yf.Ticker(mapping["home"]).fast_info
        fx_data   = yf.Ticker(mapping["fx_pair"]).fast_info

        adr_price  = float(adr_data.last_price or 0)
        home_price = float(home_data.last_price or 0)
        fx_rate    = float(fx_data.last_price or 1)

        home_price_usd = home_price * fx_rate
        gap_pct = ((adr_price - home_price_usd) / home_price_usd * 100) if home_price_usd > 0 else 0.0

        return {
            "ticker": t,
            "home_ticker": mapping["home"],
            "home_exchange": mapping["exchange"],
            "home_price": round(home_price, 4),
            "adr_price": round(adr_price, 4),
            "fx_rate": round(fx_rate, 6),
            "home_price_usd": round(home_price_usd, 4),
            "gap_pct": round(gap_pct, 4),
        }
    except Exception as e:
        return {"error": str(e)}


@app.get("/search")
async def search_endpoint(q: str = ""):
    """Ticker search: company name or partial ticker → ranked equity results."""
    if not q or len(q.strip()) < 1:
        return []
    try:
        import yfinance as yf
        search = yf.Search(q.strip(), max_results=8, news_count=0)
        quotes = getattr(search, 'quotes', None) or []
        results = []
        for item in quotes:
            qt = item.get("quoteType", "")
            if qt not in ("EQUITY", "ETF"):
                continue
            results.append({
                "symbol": item.get("symbol", ""),
                "shortname": item.get("shortname") or item.get("longname") or item.get("symbol", ""),
                "exchange": item.get("exchange", ""),
                "quoteType": qt,
            })
            if len(results) >= 6:
                break
        return results
    except Exception:
        return []
