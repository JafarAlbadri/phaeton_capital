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

def process_quant(payload):
    try:
        ticker_symbol = payload.get("ticker", "")
        sentiments_raw = payload.get("sentiments", [])

        # 1. Normalize Ticker for yfinance
        normalized_ticker = re.sub(r'\.([A-Z])$', r'-\1', ticker_symbol.upper())
        stock = yf.Ticker(normalized_ticker)

        # 2. Fetch Historical Price Data (2 years minimum for HMM stability)
        hist = stock.history(period="2y")
        if hist.empty:
            print(json.dumps({"error": f"No historical price data found for {ticker_symbol}"}))
            return

        if hist.index.tz is not None:
            hist.index = hist.index.tz_localize(None)
        hist.index = hist.index.normalize()
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
        recent_sentiments = np.array([])
        merged_df = pd.DataFrame()

        if not sent_df.empty:
            # Time-order the observations — the z-score "latest", the OU
            # calibration and the FFT all assume a chronological series and
            # the worker gives no ordering guarantee.
            sent_df = sent_df.sort_values('post_timestamp').reset_index(drop=True)
            sent_df['date'] = pd.to_datetime(sent_df['post_timestamp']).dt.tz_localize(None).dt.normalize()
            # Use pre-computed time-decay weights from worker (falls back to 1.0 if absent)
            if 'decay_weight' not in sent_df.columns:
                sent_df['decay_weight'] = 1.0
            # Daily sentiment aggregated by confidence × decay-weighted mean
            sent_df['combined_weight'] = sent_df['confidence'].fillna(0.5) * sent_df['decay_weight']
            sent_df['weighted_sent'] = sent_df['sentiment'] * sent_df['combined_weight']

            daily_sent = sent_df.groupby('date').apply(
                lambda x: x['weighted_sent'].sum() / x['combined_weight'].sum() if x['combined_weight'].sum() > 0 else 0
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
            shifted_sents = shifted_sents[(shifted_sents > 0.001) & (shifted_sents < 0.999)]

            if len(shifted_sents) > 5:
                try:
                    params = beta.fit(shifted_sents, floc=0, fscale=1)
                    beta_alpha, beta_beta_val, _, _ = params
                    beta_beta = beta_beta_val
                except Exception:
                    pass

                try:
                    kde = gaussian_kde(recent_sentiments)
                    x_grid = np.linspace(-1, 1, 100)
                    y_grid = kde(x_grid)
                    kde_list = [{"x": float(x), "density": float(y)} for x, y in zip(x_grid, y_grid)]
                except Exception:
                    pass

            # --- Granger Causality ---
            if len(merged_df) > 10:
                try:
                    gc_data = merged_df[['return', 'sentiment']].values
                    gc_res = grangercausalitytests(gc_data, maxlag=[1], verbose=False)
                    granger_p = gc_res[1][0]['ssr_ftest'][1]
                except Exception:
                    pass

        # --- Hidden Markov Model (Regime Detection) ---
        returns = hist['return'].values.reshape(-1, 1)
        hmm_state = None
        # Require 500 obs for 2 years
        if len(returns) > 500:
            try:
                # Use 3 states to represent Bear, Range, Bull
                model = hmm.GaussianHMM(n_components=3, covariance_type="diag", n_iter=200)
                # Expanding window conceptually for the live prediction:
                # We fit on data up to T-1, predict for T to avoid fitting on the event we classify.
                train_returns = returns[:-1]
                model.fit(train_returns)
                hidden_states = model.predict(returns)

                means = model.means_.flatten()
                bull_state_idx = np.argmax(means)
                bear_state_idx = np.argmin(means)

                current_state = hidden_states[-1]
                # Encoding contract shared with the TypeScript side
                # (recommendation.ts, UI, backtest): 2=bull, 1=neutral, 0=bear.
                # The old 1/0/-1 encoding meant bull regimes were read as
                # neutral downstream — bull was never detected.
                if current_state == bull_state_idx:
                    hmm_state = 2
                elif current_state == bear_state_idx:
                    hmm_state = 0
                else:
                    hmm_state = 1  # Neutral/Range
            except Exception:
                pass

        # --- Hurst Exponent (DFA) ---
        # DFA operates on the PROFILE (cumulative sum) of a stationary series,
        # i.e. returns. Feeding prices (already integrated returns) and
        # integrating again shifts the exponent by +1 — live values sat at
        # 1.4-1.7, an impossible range for H, and the "trending" bonus fired
        # for every ticker. True H lives in (0, 1) with 0.5 = random walk.
        hurst_exponent = None
        if len(hist) > 100:
            try:
                ret_series = hist['return'].values
                # 1. Calculate profile of returns
                y = np.cumsum(ret_series - np.mean(ret_series))
                # 2. Define scale/lags
                min_scale = 10
                max_scale = len(y) // 4
                if max_scale > 20:
                    scales = np.floor(np.logspace(np.log10(min_scale), np.log10(max_scale), 20)).astype(int)
                    scales = np.unique(scales)
                    
                    F = []
                    valid_scales = []
                    for s in scales:
                        n_windows = len(y) // s
                        if n_windows == 0: continue
                        y_trunc = y[:n_windows * s]
                        windows = y_trunc.reshape((n_windows, s))
                        
                        # Local detrending
                        x = np.arange(s)
                        rms = 0
                        for i in range(n_windows):
                            p = np.polyfit(x, windows[i], 1)
                            fit = np.polyval(p, x)
                            rms += np.sum((windows[i] - fit) ** 2)
                        
                        F.append(np.sqrt(rms / (n_windows * s)))
                        valid_scales.append(s)
                    
                    if len(valid_scales) > 5:
                        p = np.polyfit(np.log(valid_scales), np.log(F), 1)
                        hurst_exponent = float(p[0])
            except Exception:
                pass

        # --- Kelly Criterion ---
        kelly_fraction = None
        if len(returns) > 20:
            tx_cost = 0.0005 # Subtract estimated transaction costs
            mean_ret = np.mean(returns) - tx_cost
            var_ret = np.var(returns)
            if var_ret > 0:
                # Continuous Kelly: (mu - r) / sigma^2
                full_kelly = mean_ret / var_ret
                # Fractional Kelly x0.25 to limit max drawdown
                kelly_fraction = full_kelly * 0.25
                kelly_fraction = max(-1.0, min(1.0, kelly_fraction))

        # =========================================================
        # PHASE 2: New mathematical models
        # =========================================================

        # --- GARCH(1,1) Volatility ---
        garch_volatility = None
        if len(returns) > 30:
            try:
                from arch import arch_model
                am = arch_model(returns.flatten() * 100, vol='Garch', p=1, q=1, dist='Normal')
                res = am.fit(disp='off', show_warning=False)
                garch_vol_daily = float(np.asarray(res.conditional_volatility)[-1]) / 100
                garch_volatility = garch_vol_daily * np.sqrt(252)
            except ImportError:
                # Fallback: EWMA volatility
                try:
                    ewma_var = 0.0
                    lam = 0.94
                    for r in returns.flatten():
                        ewma_var = lam * ewma_var + (1 - lam) * r ** 2
                    garch_volatility = float(np.sqrt(ewma_var * 252))
                except Exception:
                    pass
            except Exception:
                pass

        # --- Monte Carlo — 1000 paths, GARCH vol, percentile cone ---
        mc_paths_sample = []
        mc_mean = None
        mc_var = None
        mc_p5 = None
        mc_p25 = None
        mc_p75 = None
        mc_p95 = None
        S0 = None
        all_final_prices = np.array([])

        if len(returns) > 5:
            try:
                S0 = hist['Close'].values[-1]
                mu = np.mean(returns)
                # Use GARCH vol if available, else historical
                sigma = (garch_volatility / np.sqrt(252)) if garch_volatility else np.std(returns)

                days_forward = 15
                num_simulations = 1000

                all_paths_day_by_day = np.zeros((num_simulations, days_forward + 1))
                all_paths_day_by_day[:, 0] = S0

                for sim in range(num_simulations):
                    # Using Student-t shocks with df=4 (fat tails) scaled to match unit variance
                    df_t = 4.0
                    scale_factor = np.sqrt((df_t - 2.0) / df_t)
                    
                    for day in range(days_forward):
                        drift = mu - (0.5 * sigma ** 2)
                        standard_t_shock = np.random.standard_t(df_t) * scale_factor
                        shock = sigma * standard_t_shock
                        all_paths_day_by_day[sim, day + 1] = all_paths_day_by_day[sim, day] * np.exp(drift + shock)

                all_final_prices = all_paths_day_by_day[:, -1]

                mc_mean = float(np.mean(all_final_prices))
                mc_var = float(np.var(all_final_prices))
                mc_p5 = float(np.percentile(all_final_prices, 5))
                mc_p25 = float(np.percentile(all_final_prices, 25))
                mc_p75 = float(np.percentile(all_final_prices, 75))
                mc_p95 = float(np.percentile(all_final_prices, 95))

                # For UI: only store 50 sample paths
                sample_indices = np.random.choice(num_simulations, min(50, num_simulations), replace=False)
                mc_paths_sample = [[float(p) for p in all_paths_day_by_day[i]] for i in sample_indices]
            except Exception:
                pass

        # --- Sharpe, Sortino, Calmar Ratios ---
        sharpe_ratio = None
        sortino_ratio = None
        calmar_ratio = None
        if len(returns) > 10:
            try:
                risk_free_daily = 0.0525 / 252  # 5.25% annual
                excess_returns = returns.flatten() - risk_free_daily
                ann_excess_mean = np.mean(excess_returns) * 252
                ann_vol = np.std(returns) * np.sqrt(252)
                if ann_vol > 0:
                    sharpe_ratio = float(ann_excess_mean / ann_vol)

                # Sortino — canonical downside deviation: RMS of returns below
                # target over ALL observations, not the std of the negative
                # subset (which understates risk by ignoring how often
                # downside happens).
                downside_dev = np.sqrt(np.mean(np.minimum(excess_returns, 0.0) ** 2)) * np.sqrt(252)
                if downside_dev > 0:
                    sortino_ratio = float(ann_excess_mean / downside_dev)

                # Calmar: return / max drawdown
                close_prices = hist['Close'].values
                peak = np.maximum.accumulate(close_prices)
                drawdowns = (close_prices - peak) / peak
                max_dd = float(np.min(drawdowns))
                if max_dd < 0:
                    ann_return = float(np.mean(returns) * 252)
                    calmar_ratio = float(ann_return / abs(max_dd))
            except Exception:
                pass

        # --- Max Drawdown ---
        max_drawdown = None
        avg_drawdown = None
        if len(hist) > 10:
            try:
                close_prices = hist['Close'].values
                peak = np.maximum.accumulate(close_prices)
                drawdowns = (close_prices - peak) / peak
                max_drawdown = float(np.min(drawdowns))
                neg_dd = drawdowns[drawdowns < -0.001]
                avg_drawdown = float(np.mean(neg_dd)) if len(neg_dd) > 0 else 0.0
            except Exception:
                pass

        # --- Rolling Beta vs SPY ---
        rolling_beta = None
        try:
            spy = yf.Ticker("SPY")
            spy_hist = spy.history(period="3mo")
            if spy_hist.index.tz is not None:
                spy_hist = spy_hist.tz_localize(None)
            spy_hist.index = spy_hist.index.normalize()
            spy_returns = spy_hist['Close'].pct_change().dropna()

            stock_aligned = hist['return'].dropna()
            common_dates = stock_aligned.index.intersection(spy_returns.index)
            if len(common_dates) >= 20:
                s = stock_aligned[common_dates].values[-20:]
                m = spy_returns[common_dates].values[-20:]
                cov = np.cov(s, m)[0, 1]
                # np.cov uses ddof=1 — the variance must match or beta is
                # inflated by n/(n-1) (~5% at n=20)
                var_m = np.var(m, ddof=1)
                if var_m > 0:
                    rolling_beta = float(cov / var_m)
        except Exception:
            pass

        # --- VaR and CVaR (from Monte Carlo) ---
        var_95 = None
        var_99 = None
        cvar_95 = None
        if mc_p5 is not None and S0 is not None and len(all_final_prices) > 0:
            try:
                all_returns_mc = (all_final_prices - S0) / S0
                var_95 = float(np.percentile(all_returns_mc, 5))
                var_99 = float(np.percentile(all_returns_mc, 1))
                worst_5pct = all_returns_mc[all_returns_mc <= var_95]
                cvar_95 = float(np.mean(worst_5pct)) if len(worst_5pct) > 0 else var_95
            except Exception:
                pass

        # =========================================================
        # PHASE 3: Bayesian and information-theoretic models
        # =========================================================

        # --- Bayesian Sentiment Aggregation ---
        bayes_posterior = None
        bayes_std = None
        if not sent_df.empty and len(recent_sentiments) > 2:
            try:
                prior_mean = 0.0
                prior_var = 0.25  # 0.5^2 — market neutral prior

                posterior_mean = prior_mean
                posterior_var = prior_var

                for sent_row in sent_df.itertuples():
                    obs = float(sent_row.sentiment)
                    conf = float(getattr(sent_row, 'confidence', 0.5))
                    decay = float(getattr(sent_row, 'decay_weight', 1.0))
                    # Scale observation variance by inverse decay — older posts contribute less certainty
                    obs_var = max(0.001, (1 - conf) ** 2 / max(decay, 0.01))

                    # Bayesian update (conjugate Normal-Normal)
                    posterior_var_new = 1.0 / (1.0 / posterior_var + 1.0 / obs_var)
                    posterior_mean_new = posterior_var_new * (posterior_mean / posterior_var + obs / obs_var)
                    posterior_mean = posterior_mean_new
                    posterior_var = posterior_var_new

                bayes_posterior = float(posterior_mean)
                bayes_std = float(np.sqrt(posterior_var))
            except Exception:
                pass

        # --- ADF Stationarity Test ---
        adf_stationary = None
        if not sent_df.empty and len(recent_sentiments) > 10:
            try:
                from statsmodels.tsa.stattools import adfuller
                adf_result = adfuller(recent_sentiments, autolag='AIC')
                adf_p_value = float(adf_result[1])
                adf_stationary = bool(adf_p_value < 0.05)  # True = stationary
            except Exception:
                pass

        # --- Sentiment-Price Cross-Correlation ---
        sentiment_price_corr = None
        if len(merged_df) > 5:
            try:
                from scipy.stats import pearsonr
                corr, _ = pearsonr(merged_df['sentiment'].values, merged_df['return'].values)
                sentiment_price_corr = float(corr) if not np.isnan(corr) else None
            except Exception:
                pass

        # --- Ornstein-Uhlenbeck calibration on sentiment ---
        ou_theta = None
        ou_mu = None
        ou_sigma = None
        if not sent_df.empty and len(recent_sentiments) > 10:
            try:
                s = recent_sentiments
                # One observation = one time step. The old dt = 1/len(s) made
                # theta scale with sample size, which is meaningless.
                dt = 1.0
                X = s[:-1]
                dX = np.diff(s)

                # OLS regression: dX = a + b*X + epsilon
                from numpy.linalg import lstsq
                A = np.column_stack([np.ones(len(X)), X])
                coeffs, residuals, _, _ = lstsq(A, dX, rcond=None)
                a, b = coeffs

                theta = -b / dt
                mu_ou = a / (-b) if b != 0 else np.mean(s)

                if theta > 0:
                    ou_theta = float(theta)
                    ou_mu = float(mu_ou)
                    ou_sigma = float(np.std(dX - (a + b * X)) / np.sqrt(dt))
            except Exception:
                pass

        # --- FFT Cycle Detection ---
        # Runs on DAILY aggregated sentiment so the dominant period is in
        # days. Running it on the raw per-post series (old behaviour) gave a
        # period measured in "posts", which the UI mislabelled as days.
        dominant_cycle_days = None
        if not merged_df.empty and len(merged_df['sentiment']) > 20:
            try:
                from numpy.fft import fft, fftfreq
                daily_vals = merged_df['sentiment'].values
                signal_arr = daily_vals - np.mean(daily_vals)
                N = len(signal_arr)
                fft_vals = np.abs(fft(signal_arr))[:N // 2]
                freqs = fftfreq(N)[:N // 2]

                if len(freqs) > 1:
                    dominant_idx = np.argmax(fft_vals[1:]) + 1
                    dominant_freq = freqs[dominant_idx]
                    if dominant_freq > 0:
                        dominant_cycle_days = float(1.0 / dominant_freq)
            except Exception:
                pass

        # --- Transfer Entropy (Information-theoretic) ---
        # TE(S→R) = H(R⁺|R) − H(R⁺|R,S): how much knowing today's sentiment
        # reduces uncertainty about tomorrow's return beyond what today's
        # return already tells us. Computed from discretized joint counts via
        # the chain rule H(X|Y) = H(X,Y) − H(Y). The previous version compared
        # entropies of two unrelated joint distributions, which is not TE.
        transfer_entropy = None
        if len(merged_df) > 10:
            try:
                sent_vals = merged_df['sentiment'].values
                ret_vals = merged_df['return'].values

                n_bins = 3
                sent_bins = pd.cut(sent_vals, bins=n_bins, labels=False)
                ret_bins = pd.cut(ret_vals, bins=n_bins, labels=False)

                r_now = np.asarray(ret_bins[:-1], dtype=int)
                s_now = np.asarray(sent_bins[:-1], dtype=int)
                r_next = np.asarray(ret_bins[1:], dtype=int)

                def _joint_entropy(*cols):
                    counts = {}
                    for key in zip(*cols):
                        counts[key] = counts.get(key, 0) + 1
                    p = np.array(list(counts.values()), dtype=float)
                    p /= p.sum()
                    return float(-(p * np.log2(p)).sum())

                h_r = _joint_entropy(r_now)
                h_rr = _joint_entropy(r_now, r_next)
                h_rs = _joint_entropy(r_now, s_now)
                h_rrs = _joint_entropy(r_now, s_now, r_next)

                # H(R⁺|R) − H(R⁺|R,S), in bits
                te = (h_rr - h_r) - (h_rrs - h_rs)
                transfer_entropy = max(0.0, float(te))
            except Exception:
                pass

        # =========================================================
        # Final output
        # =========================================================
        output = {
            # Existing fields
            "ticker": ticker_symbol,
            "beta_alpha": float(beta_alpha) if beta_alpha is not None else None,
            "beta_beta": float(beta_beta) if beta_beta is not None else None,
            "kde_data": kde_list,
            "granger_p_value": float(granger_p) if granger_p is not None else None,
            "hmm_state": int(hmm_state) if hmm_state is not None else None,
            "kelly_fraction": float(kelly_fraction) if kelly_fraction is not None else None,
            "hurst_exponent": float(hurst_exponent) if hurst_exponent is not None else None,
            "monte_carlo_paths": mc_paths_sample,
            "monte_carlo_mean": float(mc_mean) if mc_mean is not None else None,
            "monte_carlo_var": float(mc_var) if mc_var is not None else None,
            "z_score": float(z_score) if z_score is not None else None,
            # Phase 2 fields
            "garch_volatility": float(garch_volatility) if garch_volatility is not None else None,
            "sharpe_ratio": float(sharpe_ratio) if sharpe_ratio is not None else None,
            "sortino_ratio": float(sortino_ratio) if sortino_ratio is not None else None,
            "calmar_ratio": float(calmar_ratio) if calmar_ratio is not None else None,
            "rolling_beta": float(rolling_beta) if rolling_beta is not None else None,
            "var_95": float(var_95) if var_95 is not None else None,
            "var_99": float(var_99) if var_99 is not None else None,
            "cvar_95": float(cvar_95) if cvar_95 is not None else None,
            "max_drawdown": float(max_drawdown) if max_drawdown is not None else None,
            "avg_drawdown": float(avg_drawdown) if avg_drawdown is not None else None,
            "monte_carlo_p5": float(mc_p5) if mc_p5 is not None else None,
            "monte_carlo_p25": float(mc_p25) if mc_p25 is not None else None,
            "monte_carlo_p75": float(mc_p75) if mc_p75 is not None else None,
            "monte_carlo_p95": float(mc_p95) if mc_p95 is not None else None,
            "iv_hv_ratio": None,  # Computed in yfinance_fetcher, passed from quant.ts
            # Phase 3 fields
            "bayes_posterior": float(bayes_posterior) if bayes_posterior is not None else None,
            "bayes_std": float(bayes_std) if bayes_std is not None else None,
            "adf_stationary": adf_stationary,
            "sentiment_price_corr": float(sentiment_price_corr) if sentiment_price_corr is not None else None,
            "ou_theta": float(ou_theta) if ou_theta is not None else None,
            "ou_mu": float(ou_mu) if ou_mu is not None else None,
            "ou_sigma": float(ou_sigma) if ou_sigma is not None else None,
            "dominant_cycle_days": float(dominant_cycle_days) if dominant_cycle_days is not None else None,
            "transfer_entropy": float(transfer_entropy) if transfer_entropy is not None else None,
        }

        return output

    except Exception as e:
        import traceback
        return {"error": str(e), "traceback": traceback.format_exc()}

def main():
    try:
        input_data = sys.stdin.read()
        if not input_data:
            print(json.dumps({"error": "No input data provided"}))
            return
        payload = json.loads(input_data)
        result = process_quant(payload)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    main()
