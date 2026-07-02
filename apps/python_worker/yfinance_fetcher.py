import yfinance as yf
import sys
import json
import numpy as np
import pandas as pd
import re

def safe_float(val):
    try:
        if val is None:
            return None
        if isinstance(val, float) and (np.isnan(val) or np.isinf(val)):
            return None
        if pd.isna(val):
            return None
        return float(val)
    except Exception:
        return None

def compute_technical_indicators(hist: pd.DataFrame, current_price: float) -> dict:
    """
    hist: DataFrame with columns Open, High, Low, Close, Volume
    Returns dict with all technical indicator values
    """
    close = hist['Close']
    high = hist['High']
    low = hist['Low']
    volume = hist['Volume']

    result = {}

    # RSI-14
    try:
        delta = close.diff()
        gain = delta.clip(lower=0)
        loss = -delta.clip(upper=0)
        avg_gain = gain.rolling(14).mean()
        avg_loss = loss.rolling(14).mean()
        rs = avg_gain / avg_loss.replace(0, np.nan)
        rsi = 100 - (100 / (1 + rs))
        result['rsi_14'] = safe_float(rsi.iloc[-1])
    except Exception:
        result['rsi_14'] = None

    # MACD (EMA12 - EMA26)
    try:
        ema12 = close.ewm(span=12, adjust=False).mean()
        ema26 = close.ewm(span=26, adjust=False).mean()
        macd_line = ema12 - ema26
        signal_line = macd_line.ewm(span=9, adjust=False).mean()
        histogram = macd_line - signal_line
        result['macd'] = safe_float(macd_line.iloc[-1])
        result['macd_signal'] = safe_float(signal_line.iloc[-1])
        result['macd_histogram'] = safe_float(histogram.iloc[-1])
        result['ema_12'] = safe_float(ema12.iloc[-1])
        result['ema_26'] = safe_float(ema26.iloc[-1])
    except Exception:
        result['macd'] = result['macd_signal'] = result['macd_histogram'] = None
        result['ema_12'] = result['ema_26'] = None

    # Bollinger Bands (20-period, 2σ)
    try:
        sma20 = close.rolling(20).mean()
        std20 = close.rolling(20).std()
        bb_upper = sma20 + 2 * std20
        bb_lower = sma20 - 2 * std20
        bb_width = bb_upper.iloc[-1] - bb_lower.iloc[-1]
        price_vs_bb = (current_price - bb_lower.iloc[-1]) / bb_width * 2 - 1 if bb_width > 0 else 0
        result['bb_upper'] = safe_float(bb_upper.iloc[-1])
        result['bb_middle'] = safe_float(sma20.iloc[-1])
        result['bb_lower'] = safe_float(bb_lower.iloc[-1])
        result['price_vs_bb'] = safe_float(np.clip(price_vs_bb, -1, 1))
    except Exception:
        result['bb_upper'] = result['bb_middle'] = result['bb_lower'] = result['price_vs_bb'] = None

    # Moving Averages
    try:
        result['sma_20'] = safe_float(close.rolling(20).mean().iloc[-1])
        result['sma_50'] = safe_float(close.rolling(50).mean().iloc[-1]) if len(close) >= 50 else None
        result['sma_200'] = safe_float(close.rolling(200).mean().iloc[-1]) if len(close) >= 200 else None
    except Exception:
        result['sma_20'] = result['sma_50'] = result['sma_200'] = None

    # Volume SMA
    try:
        result['volume_sma_20'] = safe_float(volume.rolling(20).mean().iloc[-1])
    except Exception:
        result['volume_sma_20'] = None

    # ATR-14 (Average True Range)
    try:
        tr1 = high - low
        tr2 = abs(high - close.shift(1))
        tr3 = abs(low - close.shift(1))
        true_range = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        result['atr_14'] = safe_float(true_range.rolling(14).mean().iloc[-1])
    except Exception:
        result['atr_14'] = None

    # Pattern detection: Golden Cross / Death Cross
    try:
        sma50 = close.rolling(50).mean()
        sma200 = close.rolling(200).mean()
        if len(sma50.dropna()) >= 2 and len(sma200.dropna()) >= 2:
            golden_cross = bool(sma50.iloc[-1] > sma200.iloc[-1] and sma50.iloc[-2] <= sma200.iloc[-2])
            death_cross = bool(sma50.iloc[-1] < sma200.iloc[-1] and sma50.iloc[-2] >= sma200.iloc[-2])
        else:
            golden_cross = death_cross = False
        result['golden_cross'] = golden_cross
        result['death_cross'] = death_cross
    except Exception:
        result['golden_cross'] = result['death_cross'] = None

    # Technical signal from indicator consensus
    try:
        bull_signals = 0
        bear_signals = 0
        total = 0

        if result['rsi_14'] is not None:
            total += 1
            if result['rsi_14'] < 40:
                bull_signals += 1
            elif result['rsi_14'] > 60:
                bear_signals += 1

        if result['macd_histogram'] is not None:
            total += 1
            if result['macd_histogram'] > 0:
                bull_signals += 1
            else:
                bear_signals += 1

        if result['price_vs_bb'] is not None:
            total += 1
            if result['price_vs_bb'] < -0.3:
                bull_signals += 1
            elif result['price_vs_bb'] > 0.3:
                bear_signals += 1

        if result.get('sma_50') and result.get('sma_200'):
            total += 1
            if result['sma_50'] > result['sma_200']:
                bull_signals += 1
            else:
                bear_signals += 1

        if total > 0:
            ratio = bull_signals / total
            if ratio >= 0.6:
                signal = 'BULLISH'
            elif ratio <= 0.4:
                signal = 'BEARISH'
            else:
                signal = 'NEUTRAL'
        else:
            signal = 'NEUTRAL'
        result['technical_signal'] = signal
    except Exception:
        result['technical_signal'] = None

    return result


def get_stock_data(ticker_symbol):
    try:
        # Replace dot with dash ONLY for US class shares (e.g. BRK.A -> BRK-A),
        # but preserve exchange suffixes (e.g. VOLV-B.ST)
        normalized_ticker = re.sub(r'\.([A-Z])$', r'-\1', ticker_symbol.upper())
        stock = yf.Ticker(normalized_ticker)
        info = stock.info

        current_data = {
            'ticker': ticker_symbol,
            'current_price': info.get('currentPrice') or info.get('regularMarketPrice'),
            'target_price': info.get('targetMeanPrice'),
            'target_low_price': info.get('targetLowPrice'),
            'target_high_price': info.get('targetHighPrice'),
            'recommendation': info.get('recommendationKey'),
            'pe_ratio': info.get('forwardPE') or info.get('trailingPE'),
            'high_52_week': info.get('fiftyTwoWeekHigh'),
            'low_52_week': info.get('fiftyTwoWeekLow'),
            'market_cap': info.get('marketCap'),
            'volume': info.get('regularMarketVolume') or info.get('averageVolume'),
            'sector': info.get('sector'),
            'industry': info.get('industry'),
        }

        # --- Extended analyst data ---
        try:
            current_data['analyst_count'] = info.get('numberOfAnalystOpinions')
        except Exception:
            current_data['analyst_count'] = None

        try:
            rec_summary = stock.recommendations_summary
            if rec_summary is not None and not rec_summary.empty:
                latest = rec_summary.iloc[0]
                current_data['analyst_strong_buy'] = safe_float(latest.get('strongBuy'))
                current_data['analyst_buy'] = safe_float(latest.get('buy'))
                current_data['analyst_hold'] = safe_float(latest.get('hold'))
                current_data['analyst_sell'] = safe_float(latest.get('sell'))
                current_data['analyst_strong_sell'] = safe_float(latest.get('strongSell'))
            else:
                current_data['analyst_strong_buy'] = None
                current_data['analyst_buy'] = None
                current_data['analyst_hold'] = None
                current_data['analyst_sell'] = None
                current_data['analyst_strong_sell'] = None
        except Exception:
            current_data['analyst_strong_buy'] = None
            current_data['analyst_buy'] = None
            current_data['analyst_hold'] = None
            current_data['analyst_sell'] = None
            current_data['analyst_strong_sell'] = None

        # --- Next earnings date ---
        try:
            calendar = stock.calendar
            if calendar and 'Earnings Date' in calendar:
                earnings_dates = calendar['Earnings Date']
                if earnings_dates and len(earnings_dates) > 0:
                    ed = earnings_dates[0]
                    current_data['next_earnings_date'] = ed.isoformat() if hasattr(ed, 'isoformat') else str(ed)
                else:
                    current_data['next_earnings_date'] = None
            else:
                current_data['next_earnings_date'] = None
        except Exception:
            current_data['next_earnings_date'] = None

        # --- Fetch 6-month OHLCV for technical indicators ---
        hist_6mo = None
        try:
            hist_6mo = stock.history(period="6mo")
            if hist_6mo is not None and not hist_6mo.empty:
                if hist_6mo.index.tz is not None:
                    hist_6mo.index = hist_6mo.index.tz_localize(None)
                hist_6mo.index = hist_6mo.index.normalize()
        except Exception:
            hist_6mo = None

        # --- Technical Indicators ---
        technical_indicators = {}
        if hist_6mo is not None and not hist_6mo.empty and len(hist_6mo) >= 20:
            current_price = current_data.get('current_price')
            if current_price is None and not hist_6mo.empty:
                current_price = float(hist_6mo['Close'].iloc[-1])
            try:
                technical_indicators = compute_technical_indicators(hist_6mo, float(current_price))
            except Exception:
                technical_indicators = {}
        current_data['technical_indicators'] = technical_indicators

        # --- IV/HV Ratio ---
        iv_hv_ratio = None
        try:
            if hist_6mo is not None and not hist_6mo.empty:
                current_price = current_data.get('current_price')
                if current_price is None:
                    current_price = float(hist_6mo['Close'].iloc[-1])

                expirations = stock.options
                if expirations:
                    # Use first (nearest) expiration
                    opt_chain = stock.option_chain(expirations[0])
                    # Historical volatility (20-day)
                    returns_std = hist_6mo['Close'].pct_change().rolling(20).std().iloc[-1]
                    hv = float(returns_std) * np.sqrt(252)

                    # Get ATM options (strikes closest to current price)
                    calls_df = opt_chain.calls
                    puts_df = opt_chain.puts

                    if not calls_df.empty and current_price:
                        atm_call = calls_df.iloc[(calls_df['strike'] - current_price).abs().argsort().iloc[0]]
                        call_iv = float(atm_call.get('impliedVolatility', 0))
                        atm_put_idx = puts_df.iloc[(puts_df['strike'] - current_price).abs().argsort().iloc[0]] if not puts_df.empty else None
                        put_iv = float(atm_put_idx.get('impliedVolatility', 0)) if atm_put_idx is not None else call_iv
                        avg_iv = (call_iv + put_iv) / 2
                        if hv > 0:
                            iv_hv_ratio = avg_iv / hv
        except Exception:
            pass
        current_data['iv_hv_ratio'] = safe_float(iv_hv_ratio)

        # --- Fetch Financials for History ---
        history_list = []
        try:
            financials = stock.financials
            balance_sheet = stock.balance_sheet

            # yfinance returns columns as DatetimeIndex (most recent first, usually 4 years)
            if not financials.empty and not balance_sheet.empty:
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

                    # Fallback balance sheet field names
                    if total_liab is None:
                        total_liab = get_val(balance_sheet, 'Total Liabilities')
                    if total_equity is None:
                        total_equity = get_val(balance_sheet, 'Total Equity Gross Minority Interest')

                    # Calculate generic metrics
                    eps = net_income / shares_out if net_income and shares_out else None
                    rev_per_share = total_revenue / shares_out if total_revenue and shares_out else None
                    roe = net_income / total_equity if net_income and total_equity and total_equity > 0 else None

                    net_debt = (total_debt or 0) - (cash or 0)
                    net_debt_ebitda = net_debt / ebitda if ebitda and ebitda > 0 else None

                    # Ratios based on historical price for the end of that year
                    pe_ratio = None
                    ps_ratio = None
                    pb_ratio = None
                    ev_ebit = None

                    try:
                        hist_year = stock.history(start=f"{year}-01-01", end=f"{year}-12-31")
                        if not hist_year.empty:
                            year_end_price = hist_year['Close'].iloc[-1]

                            if eps and eps > 0:
                                pe_ratio = year_end_price / eps

                            if rev_per_share and rev_per_share > 0:
                                ps_ratio = year_end_price / rev_per_share

                            if total_equity and shares_out:
                                bvps = total_equity / shares_out
                                if bvps > 0:
                                    pb_ratio = year_end_price / bvps

                            if shares_out and ebit and ebit > 0:
                                ev = (year_end_price * shares_out) + net_debt
                                ev_ebit = ev / ebit
                    except Exception:
                        pass  # if price fetching fails, leave as None

                    history_list.append({
                        "year": int(year),
                        "eps": safe_float(eps),
                        "revenue_per_share": safe_float(rev_per_share),
                        "roe": safe_float(roe),
                        "net_debt_ebitda": safe_float(net_debt_ebitda),
                        "pe_ratio": safe_float(pe_ratio),
                        "ps_ratio": safe_float(ps_ratio),
                        "pb_ratio": safe_float(pb_ratio),
                        "ev_ebit": safe_float(ev_ebit)
                    })
        except Exception:
            pass  # Ignore history failures to guarantee current data is returned at least

        current_data["history"] = history_list

        # --- Insider Transactions ---
        insider_list = []
        try:
            insiders_df = stock.insider_transactions
            if insiders_df is not None and not insiders_df.empty:
                for idx, row in insiders_df.iterrows():
                    if len(insider_list) >= 20:
                        break
                    date_val = row.get('Start Date')
                    date_str = date_val.isoformat() if hasattr(date_val, 'isoformat') else str(date_val)

                    # yfinance's 'Transaction' column is empty on most rows
                    # these days — the classification lives in the free-text
                    # 'Text' column ("Sale at price 172.50...", "Purchase...").
                    transaction = str(row.get('Transaction') or '').strip()
                    if not transaction:
                        text = str(row.get('Text') or '').lower()
                        if 'purchase' in text or 'buy' in text:
                            transaction = 'Purchase'
                        elif 'sale' in text or 'sell' in text:
                            transaction = 'Sale'
                        elif 'gift' in text:
                            transaction = 'Gift'
                        elif 'exercise' in text or 'conversion' in text:
                            transaction = 'Option Exercise'

                    insider_list.append({
                        "insider_name": str(row.get('Insider', '')),
                        "position": str(row.get('Position', '')),
                        "transaction": transaction,
                        "shares": safe_float(row.get('Shares')),
                        "value": safe_float(row.get('Value')),
                        "date": date_str
                    })
        except Exception:
            pass

        current_data["insiders"] = insider_list

        return current_data

    except Exception as e:
        return {"error": str(e)}
