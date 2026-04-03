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

# ── Epic 1: Backtesting ────────────────────────────────────────────────────────

@app.get("/backtest/{ticker}")
async def backtest_endpoint(ticker: str, horizon: int = 15, years: int = 2,
                            start: str = "", end: str = ""):
    """Walk-forward backtest using RSI + MACD + SMA signals. Returns equity curve vs SPY."""
    try:
        import yfinance as yf
        import numpy as np
        import pandas as pd

        t = ticker.upper()
        stock = yf.Ticker(t)
        spy   = yf.Ticker("SPY")

        if start and end:
            hist     = stock.history(start=start, end=end)
            spy_hist = spy.history(start=start, end=end)
        else:
            hist     = stock.history(period=f"{years}y")
            spy_hist = spy.history(period=f"{years}y")

        if hist is None or len(hist) < 60:
            return {"error": "Insufficient historical data"}

        close     = hist["Close"]
        spy_close = spy_hist["Close"]

        delta     = close.diff()
        gain      = delta.clip(lower=0).rolling(14).mean()
        loss      = (-delta.clip(upper=0)).rolling(14).mean()
        rs        = gain / loss.replace(0, np.nan)
        rsi       = 100 - (100 / (1 + rs))
        ema12     = close.ewm(span=12, adjust=False).mean()
        ema26     = close.ewm(span=26, adjust=False).mean()
        macd_hist = (ema12 - ema26) - (ema12 - ema26).ewm(span=9, adjust=False).mean()
        sma50     = close.rolling(50).mean()
        sma200    = close.rolling(200).mean()

        h_int     = int(horizon)
        trades    = []
        equity    = [100.0]
        eq        = 100.0
        start_idx = 200

        for i in range(start_idx, len(close) - h_int, h_int):
            ep   = float(close.iloc[i])
            xp   = float(close.iloc[i + h_int])
            r    = float(rsi.iloc[i])       if not np.isnan(rsi.iloc[i])       else 50.0
            m    = float(macd_hist.iloc[i]) if not np.isnan(macd_hist.iloc[i]) else 0.0
            s50  = float(sma50.iloc[i])     if not np.isnan(sma50.iloc[i])     else ep
            s200 = float(sma200.iloc[i])    if not np.isnan(sma200.iloc[i])    else ep

            score = 50.0
            if r < 30: score += 15
            elif r > 70: score -= 15
            else: score += (50 - r) * 0.3
            score += 15 if m > 0 else -15
            score += 10 if s50 > s200 else -10

            if score > 60:
                direction = "BUY"
                ret = (xp - ep) / ep
            elif score < 40:
                direction = "SELL"
                ret = (ep - xp) / ep
            else:
                continue

            eq *= (1 + ret)
            equity.append(round(eq, 4))
            trades.append({
                "date":       close.index[i].strftime("%Y-%m-%d"),
                "direction":  direction,
                "score":      round(score, 1),
                "entry":      round(ep, 4),
                "exit":       round(xp, 4),
                "return_pct": round(ret * 100, 3),
                "outcome":    "CORRECT" if ret > 0 else "INCORRECT",
            })

        if not trades:
            return {"error": "No trades generated"}

        rets      = [t["return_pct"] / 100 for t in trades]
        hit_rate  = sum(1 for r in rets if r > 0) / len(rets)
        avg_ret   = float(np.mean(rets))
        std_ret   = float(np.std(rets))
        sharpe    = (avg_ret / std_ret * np.sqrt(252 / h_int)) if std_ret > 0 else 0.0
        eq_arr    = np.array(equity)
        peak      = np.maximum.accumulate(eq_arr)
        max_dd    = float(((eq_arr - peak) / peak).min())
        bh_start  = float(close.iloc[start_idx])
        bh        = float((close.iloc[-1] - bh_start) / bh_start) * 100

        spy_start = float(spy_close.iloc[min(start_idx, len(spy_close) - 1)]) if len(spy_close) > 0 else 1.0
        step = max(1, len(equity) // 80)
        curve = []
        for i in range(0, len(equity), step):
            trade_idx = min(i, len(trades) - 1)
            d = trades[trade_idx]["date"]
            spy_val = None
            try:
                matched = spy_close[spy_close.index >= pd.Timestamp(d)]
                if len(matched) > 0 and spy_start > 0:
                    spy_val = round(float(matched.iloc[0]) / spy_start * 100, 4)
            except Exception:
                pass
            curve.append({"date": d, "equity": equity[i], "spy": spy_val})

        signal_markers = [
            {"date": t["date"], "direction": t["direction"], "score": t["score"]}
            for t in trades
        ]

        return {
            "ticker": t, "horizon": h_int, "years_tested": years, "total_trades": len(trades),
            "hit_rate": round(hit_rate, 4), "avg_return_pct": round(avg_ret * 100, 4),
            "sharpe_ratio": round(sharpe, 4), "max_drawdown_pct": round(max_dd * 100, 4),
            "final_equity": round(eq, 4), "benchmark_return_pct": round(bh, 4),
            "equity_curve": curve, "signal_markers": signal_markers, "recent_trades": trades[-15:],
        }
    except Exception as e:
        return {"error": str(e)}

# ── Epic 5: Contrarian Signal ──────────────────────────────────────────────────

@app.get("/contrarian/{ticker}")
async def contrarian_endpoint(ticker: str):
    """Detect RSI + sentiment divergence contrarian setups."""
    try:
        import yfinance as yf
        import numpy as np

        stock = yf.Ticker(ticker.upper())
        hist  = stock.history(period="3mo")
        if hist is None or len(hist) < 14:
            return {"isContrarian": False, "type": None, "confidence": 0, "reasons": []}

        close = hist["Close"]
        delta = close.diff()
        gain  = delta.clip(lower=0).rolling(14).mean()
        loss  = (-delta.clip(upper=0)).rolling(14).mean()
        rs    = gain / loss.replace(0, np.nan)
        rsi   = float((100 - (100 / (1 + rs))).iloc[-1]) if not np.isnan((100 - (100 / (1 + rs))).iloc[-1]) else 50.0

        ema12 = close.ewm(span=12, adjust=False).mean()
        ema26 = close.ewm(span=26, adjust=False).mean()
        macd_line = ema12 - ema26
        macd_signal = macd_line.ewm(span=9, adjust=False).mean()
        macd_cross_up = float(macd_line.iloc[-1]) > float(macd_signal.iloc[-1]) and float(macd_line.iloc[-2]) <= float(macd_signal.iloc[-2])
        macd_cross_dn = float(macd_line.iloc[-1]) < float(macd_signal.iloc[-1]) and float(macd_line.iloc[-2]) >= float(macd_signal.iloc[-2])

        price_5d_ret = float((close.iloc[-1] - close.iloc[-6]) / close.iloc[-6]) if len(close) >= 6 else 0.0

        reasons = []
        contrarian_type = None
        confidence = 0.0

        # Reversal Long: RSI oversold + MACD turning up
        if rsi < 30:
            reasons.append(f"RSI extremely oversold: {rsi:.1f}")
            confidence += 0.4
            if macd_cross_up:
                reasons.append("MACD crossing above signal — momentum turning")
                confidence += 0.3
                contrarian_type = "REVERSAL_LONG"
            if price_5d_ret < -0.08:
                reasons.append(f"Price down {price_5d_ret*100:.1f}% in 5 days — potential capitulation")
                confidence += 0.2

        # Reversal Short: RSI overbought + MACD turning down
        elif rsi > 70:
            reasons.append(f"RSI extremely overbought: {rsi:.1f}")
            confidence += 0.4
            if macd_cross_dn:
                reasons.append("MACD crossing below signal — momentum fading")
                confidence += 0.3
                contrarian_type = "REVERSAL_SHORT"
            if price_5d_ret > 0.08:
                reasons.append(f"Price up {price_5d_ret*100:.1f}% in 5 days — potential exhaustion")
                confidence += 0.2

        is_contrarian = confidence >= 0.4 and contrarian_type is not None

        return {
            "isContrarian": is_contrarian,
            "type": contrarian_type,
            "confidence": round(min(confidence, 1.0), 3),
            "reasons": reasons,
            "rsi": round(rsi, 1),
        }
    except Exception as e:
        return {"isContrarian": False, "type": None, "confidence": 0, "reasons": [], "error": str(e)}

# ── Epic 7: Earnings History ───────────────────────────────────────────────────

@app.get("/earnings-history/{ticker}")
async def earnings_history_endpoint(ticker: str):
    """Fetch last 8 earnings dates with EPS drift and price reaction stats."""
    try:
        import yfinance as yf
        import numpy as np

        stock = yf.Ticker(ticker.upper())
        earnings_dates = stock.earnings_dates
        if earnings_dates is None or len(earnings_dates) == 0:
            return {"error": "No earnings history available"}

        hist = stock.history(period="3y")
        close = hist["Close"]

        results = []
        for dt, row in list(earnings_dates.iterrows())[:8]:
            try:
                date_str = dt.strftime("%Y-%m-%d") if hasattr(dt, "strftime") else str(dt)[:10]
                eps_actual   = row.get("Reported EPS") or row.get("EPS Actual")
                eps_estimate = row.get("EPS Estimate")

                prices_at = close[close.index >= dt]
                if len(prices_at) < 2:
                    continue

                price_on_day = float(prices_at.iloc[0])
                price_day_after = float(prices_at.iloc[1]) if len(prices_at) > 1 else None
                price_5d  = float(prices_at.iloc[5])  if len(prices_at) > 5  else None
                price_30d = float(prices_at.iloc[30]) if len(prices_at) > 30 else None

                day_ret  = (price_day_after - price_on_day) / price_on_day if price_day_after else None
                ret_5d   = (price_5d  - price_on_day) / price_on_day if price_5d   else None
                ret_30d  = (price_30d - price_on_day) / price_on_day if price_30d  else None

                beat = None
                if eps_actual is not None and eps_estimate is not None:
                    try:
                        beat = float(eps_actual) > float(eps_estimate)
                    except Exception:
                        pass

                results.append({
                    "date":            date_str,
                    "eps_actual":      float(eps_actual)   if eps_actual   is not None else None,
                    "eps_estimate":    float(eps_estimate) if eps_estimate is not None else None,
                    "beat":            beat,
                    "price_on_day":    round(price_on_day, 4),
                    "day_return_pct":  round(day_ret  * 100, 3) if day_ret  is not None else None,
                    "return_5d_pct":   round(ret_5d   * 100, 3) if ret_5d   is not None else None,
                    "return_30d_pct":  round(ret_30d  * 100, 3) if ret_30d  is not None else None,
                })
            except Exception:
                continue

        if not results:
            return {"error": "Could not compute earnings drift"}

        valid_day = [r["day_return_pct"] for r in results if r["day_return_pct"] is not None]
        median_drift = round(float(np.median(valid_day)), 3) if valid_day else None
        beat_rally = sum(1 for r in results if r["beat"] and (r["day_return_pct"] or 0) > 0)
        beat_total = sum(1 for r in results if r["beat"] is not None)

        return {
            "ticker": ticker.upper(),
            "earnings_history": results,
            "summary": {
                "median_day_drift_pct": median_drift,
                "beat_rally_rate": round(beat_rally / beat_total, 3) if beat_total > 0 else None,
                "count": len(results),
            }
        }
    except Exception as e:
        return {"error": str(e)}

# ── V2: Google Trends ──────────────────────────────────────────────────────────

@app.get("/trends/{ticker}")
async def trends_endpoint(ticker: str):
    try:
        import asyncio
        import numpy as np
        from pytrends.request import TrendReq

        pytrends = TrendReq(hl='en-US', tz=360)
        kw = f"{ticker.upper()} stock"
        pytrends.build_payload([kw], timeframe='today 3-m', geo='US')
        await asyncio.sleep(10)
        df = pytrends.interest_over_time()

        if df is None or df.empty or kw not in df.columns:
            return {"trends_score": 50, "weekly_data": [], "direction": "flat"}

        values = df[kw].tolist()
        dates = [d.strftime("%Y-%m-%d") for d in df.index]
        weekly_data = [{"week": dates[i], "interest": values[i]} for i in range(len(values))]

        arr = np.array(values, dtype=float)
        mean_12w = float(np.mean(arr[-12:]) if len(arr) >= 12 else np.mean(arr))
        std_12w  = float(np.std(arr[-12:])  if len(arr) >= 12 else np.std(arr))
        last_val = float(arr[-1]) if len(arr) > 0 else mean_12w

        z = (last_val - mean_12w) / max(std_12w, 1.0)
        trends_score = float(max(0.0, min(100.0, 50 + z * 10)))
        direction = "up" if len(arr) >= 4 and arr[-1] > arr[-4] else ("down" if len(arr) >= 4 and arr[-1] < arr[-4] else "flat")

        return {"trends_score": round(trends_score, 2), "weekly_data": weekly_data, "direction": direction}
    except Exception as e:
        return {"trends_score": 50, "weekly_data": [], "direction": "flat", "error": str(e)}

# ── V2: ADR Cross-Listing Gap ──────────────────────────────────────────────────

@app.get("/crosslist/{ticker}")
async def crosslist_endpoint(ticker: str):
    """ADR / cross-listing gap monitor."""
    try:
        import yfinance as yf
        ADR_MAP: dict = {
            "ASML": {"home": "ASML.AS", "exchange": "AEX",   "fx_pair": "EURUSD=X"},
            "TM":   {"home": "7203.T",  "exchange": "TSE",   "fx_pair": "JPYUSD=X"},
            "SAP":  {"home": "SAP.DE",  "exchange": "XETRA", "fx_pair": "EURUSD=X"},
            "HSBC": {"home": "0005.HK", "exchange": "HKEX",  "fx_pair": "HKDUSD=X"},
            "NVO":  {"home": "NOVO-B.CO","exchange": "OMX",  "fx_pair": "DKKUSD=X"},
            "SONY": {"home": "6758.T",  "exchange": "TSE",   "fx_pair": "JPYUSD=X"},
        }
        t = ticker.upper()
        if t not in ADR_MAP:
            return {"error": "No ADR mapping for this ticker", "ticker": t}

        mapping       = ADR_MAP[t]
        adr_price     = float(yf.Ticker(t).fast_info.last_price or 0)
        home_price    = float(yf.Ticker(mapping["home"]).fast_info.last_price or 0)
        fx_rate       = float(yf.Ticker(mapping["fx_pair"]).fast_info.last_price or 1)
        home_price_usd = home_price * fx_rate
        gap_pct = ((adr_price - home_price_usd) / home_price_usd * 100) if home_price_usd > 0 else 0.0

        return {
            "ticker": t, "home_ticker": mapping["home"], "home_exchange": mapping["exchange"],
            "home_price": round(home_price, 4), "adr_price": round(adr_price, 4),
            "fx_rate": round(fx_rate, 6), "home_price_usd": round(home_price_usd, 4),
            "gap_pct": round(gap_pct, 4),
        }
    except Exception as e:
        return {"error": str(e)}

# ── Ticker Search ──────────────────────────────────────────────────────────────

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
                "symbol":    item.get("symbol", ""),
                "shortname": item.get("shortname") or item.get("longname") or item.get("symbol", ""),
                "exchange":  item.get("exchange", ""),
                "quoteType": qt,
            })
            if len(results) >= 6:
                break
        return results
    except Exception:
        return []

@app.get("/squeeze/{ticker}")
async def squeeze_endpoint(ticker: str):
    """Short squeeze pressure indicator combining short interest, days-to-cover, and float."""
    try:
        import yfinance as yf
        import numpy as np

        stock = yf.Ticker(ticker.upper())
        info = stock.info

        short_float = info.get("shortPercentOfFloat") or info.get("shortRatio")
        short_ratio = info.get("shortRatio")  # days to cover
        float_shares = info.get("floatShares")
        shares_short = info.get("sharesShort")
        avg_volume = info.get("averageVolume")

        if short_float is None and shares_short is None:
            return {"error": "No short interest data available", "ticker": ticker.upper()}

        # Normalise short float to 0-1 if given as decimal (e.g. 0.05 = 5%)
        sf = float(short_float) if short_float is not None else 0.0
        if sf > 1: sf = sf / 100  # Already a percentage

        # Days-to-cover: shares_short / avg_daily_volume
        dtc = float(short_ratio) if short_ratio is not None else None
        if dtc is None and shares_short and avg_volume and avg_volume > 0:
            dtc = shares_short / avg_volume

        # Score components (0-100 each):
        # Short float score: >20% = very high pressure
        sf_score = min(100.0, (sf / 0.20) * 100)
        # DTC score: >10 days = high; >5 days = moderate
        dtc_score = min(100.0, ((dtc or 0) / 10.0) * 100) if dtc else 0.0

        pressure = round((sf_score * 0.6 + dtc_score * 0.4), 1)

        level = "LOW"
        if pressure >= 70: level = "EXTREME"
        elif pressure >= 50: level = "HIGH"
        elif pressure >= 30: level = "MODERATE"

        return {
            "ticker": ticker.upper(),
            "short_float_pct": round(sf * 100, 2),
            "days_to_cover": round(dtc, 2) if dtc else None,
            "shares_short": shares_short,
            "pressure_score": pressure,
            "level": level,
        }
    except Exception as e:
        return {"error": str(e)}
