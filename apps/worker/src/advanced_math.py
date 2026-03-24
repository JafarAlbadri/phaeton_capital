import sys
import json
import numpy as np
import pandas as pd
import yfinance as yf
from scipy.stats import beta, gaussian_kde
from statsmodels.tsa.stattools import grangercausalitytests
from hmmlearn import hmm
import traceback
import re

def main():
    try:
        input_data = sys.stdin.read()
        if not input_data:
            print(json.dumps({"error": "No input data provided"}))
            return
            
        payload = json.loads(input_data)
        ticker_symbol = payload.get("ticker", "")
        sentiments_raw = payload.get("sentiments", [])
        
        # 1. Normalize Ticker for yfinance
        normalized_ticker = re.sub(r'\.([A-Z])$', r'-\1', ticker_symbol.upper())
        stock = yf.Ticker(normalized_ticker)
        
        # 2. Fetch Historical Price Data (e.g. 6 months for better statistical significance)
        hist = stock.history(period="6mo")
        if hist.empty:
            print(json.dumps({"error": f"No historical price data found for {ticker_symbol}"}))
            return
            
        hist.index = hist.index.tz_localize(None).normalize()
        hist['return'] = hist['Close'].pct_change()
        hist = hist.dropna()
        
        # 3. Process Sentiments
        sent_df = pd.DataFrame(sentiments_raw)
        
        # Basic defaults
        beta_alpha = None
        beta_beta = None
        kde_list = []
        granger_p = None
        z_score = None
        
        if not sent_df.empty:
            sent_df['date'] = pd.to_datetime(sent_df['post_timestamp']).dt.tz_localize(None).dt.normalize()
            # Daily sentiment aggregated by confidence-weighted mean
            sent_df['weighted_sent'] = sent_df['sentiment'] * sent_df.get('confidence', 1.0)
            
            daily_sent = sent_df.groupby('date').apply(
                lambda x: x['weighted_sent'].sum() / x['confidence'].sum() if x['confidence'].sum() > 0 else 0
            )
            daily_sent.name = 'sentiment'
            merged_df = hist.join(daily_sent, how='inner').dropna()
            
            # --- Z-Score of today's sentiment ---
            recent_sentiments = sent_df['sentiment'].dropna().values
            if len(recent_sentiments) > 2:
                mean_s = np.mean(recent_sentiments)
                std_s = np.std(recent_sentiments)
                if std_s > 0:
                    latest_sent = recent_sentiments[-1]
                    z_score = (latest_sent - mean_s) / std_s
            
            # --- Beta Distribution & KDE ---
            # Sentiment is bounded [-1, 1]. Shift to [0, 1] for Beta fitting
            shifted_sents = (recent_sentiments + 1) / 2.0
            # Exclude strict 0 and 1 boundaries which Beta cannot fit if variance is zero
            shifted_sents = shifted_sents[(shifted_sents > 0.001) & (shifted_sents < 0.999)]
            
            if len(shifted_sents) > 5:
                try:
                    params = beta.fit(shifted_sents, floc=0, fscale=1)
                    beta_alpha, beta_beta_val, _, _ = params
                    beta_beta = beta_beta_val
                except:
                    pass
                
                try:
                    kde = gaussian_kde(recent_sentiments)
                    x_grid = np.linspace(-1, 1, 100)
                    y_grid = kde(x_grid)
                    kde_list = [{"x": float(x), "density": float(y)} for x, y in zip(x_grid, y_grid)]
                except:
                    pass
            
            # --- Granger Causality ---
            if len(merged_df) > 10:
                try:
                    # Granger test: Does sentiment cause price return?
                    gc_data = merged_df[['return', 'sentiment']].values
                    # maxlag=1, test order: [target, predictor]
                    gc_res = grangercausalitytests(gc_data, maxlag=[1], verbose=False)
                    granger_p = gc_res[1][0]['ssr_ftest'][1]
                except:
                    pass
                    
        # --- Hidden Markov Model (Regime Detection) ---
        returns = hist['return'].values.reshape(-1, 1)
        hmm_state = None
        if len(returns) > 30:
            try:
                # 2 regimes: Bull and Bear
                model = hmm.GaussianHMM(n_components=2, covariance_type="diag", n_iter=100, random_state=42)
                model.fit(returns)
                hidden_states = model.predict(returns)
                
                # Identify which state is "Bull" (higher mean return)
                means = model.means_.flatten()
                bull_state_idx = np.argmax(means)
                
                current_state = hidden_states[-1]
                # Map to standard: 0 = Bear, 1 = Bull
                hmm_state = 1 if current_state == bull_state_idx else 0
            except:
                pass
                
        # --- Hurst Exponent ---
        hurst_exponent = None
        if len(hist) > 50:
            try:
                close_prices = hist['Close'].values
                lags = range(2, 20)
                tau = [np.sqrt(np.std(np.subtract(close_prices[lag:], close_prices[:-lag]))) for lag in lags]
                poly = np.polyfit(np.log(lags), np.log(tau), 1)
                hurst_exponent = poly[0] * 2.0
            except:
                pass
                
        # --- Kelly Criterion ---
        # Kelly = Mean(Return) / Variance(Return)
        kelly_fraction = None
        if len(returns) > 5:
            mean_ret = np.mean(returns)
            var_ret = np.var(returns)
            if var_ret > 0:
                kelly_fraction = mean_ret / var_ret
                # Clamp Kelly to reasonable bounds [-1, 1]
                kelly_fraction = max(-1.0, min(1.0, kelly_fraction))
                
        # --- Monte Carlo Simulation ---
        mc_paths = []
        mc_mean = None
        mc_var = None
        
        if len(returns) > 5:
            try:
                S0 = hist['Close'].values[-1]
                mu = np.mean(returns)
                sigma = np.std(returns)
                
                days_forward = 15
                num_simulations = 50 # Send 50 paths to UI for plotting
                
                final_prices = []
                for _ in range(num_simulations):
                    path = [S0]
                    for _ in range(days_forward):
                        # Geometric Brownian Motion step
                        drift = mu - (0.5 * sigma**2)
                        shock = sigma * np.random.normal()
                        price = path[-1] * np.exp(drift + shock)
                        path.append(price)
                    mc_paths.append([float(p) for p in path])
                    final_prices.append(path[-1])
                    
                mc_mean = float(np.mean(final_prices))
                mc_var = float(np.var(final_prices))
            except:
                pass

        output = {
            "ticker": ticker_symbol,
            "beta_alpha": float(beta_alpha) if beta_alpha is not None else None,
            "beta_beta": float(beta_beta) if beta_beta is not None else None,
            "kde_data": kde_list,
            "granger_p_value": float(granger_p) if granger_p is not None else None,
            "hmm_state": int(hmm_state) if hmm_state is not None else None,
            "kelly_fraction": float(kelly_fraction) if kelly_fraction is not None else None,
            "hurst_exponent": float(hurst_exponent) if hurst_exponent is not None else None,
            "monte_carlo_paths": mc_paths,
            "monte_carlo_mean": float(mc_mean) if mc_mean is not None else None,
            "monte_carlo_var": float(mc_var) if mc_var is not None else None,
            "z_score": float(z_score) if z_score is not None else None
        }
        
        print(json.dumps(output))

    except Exception as e:
        print(json.dumps({"error": str(e), "traceback": traceback.format_exc()}))

if __name__ == "__main__":
    main()
