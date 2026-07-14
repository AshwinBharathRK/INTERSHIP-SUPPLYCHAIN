"""Demand forecasting: Holt-Winters exponential smoothing with explainability."""
import warnings

import numpy as np
import pandas as pd

warnings.filterwarnings("ignore")


def forecast_series(dates: list[str], values: list[float], horizon: int = 30) -> dict:
    """Fit Holt-Winters (add trend, weekly seasonality) and forecast `horizon` days.

    Returns dict with forecast, confidence bands, holdout accuracy and model meta.
    Falls back to EWMA if the fit fails or data is too short.
    """
    s = pd.Series(np.asarray(values, dtype=float), index=pd.to_datetime(dates))
    s = s.asfreq("D").ffill().fillna(0.0)

    model_name = "holt_winters"
    fc = lower = upper = None
    mape = None

    if len(s) >= 60:
        try:
            from statsmodels.tsa.holtwinters import ExponentialSmoothing

            # holdout evaluation on last 14 days
            train, test = s.iloc[:-14], s.iloc[-14:]
            m_eval = ExponentialSmoothing(
                train, trend="add", seasonal="add", seasonal_periods=7,
                initialization_method="estimated",
            ).fit(optimized=True)
            pred_test = np.maximum(m_eval.forecast(14).to_numpy(), 0)
            denom = np.maximum(test.to_numpy(), 1.0)
            mape = float(np.mean(np.abs(pred_test - test.to_numpy()) / denom) * 100)

            model = ExponentialSmoothing(
                s, trend="add", seasonal="add", seasonal_periods=7,
                initialization_method="estimated",
            ).fit(optimized=True)
            fc = np.maximum(model.forecast(horizon).to_numpy(), 0.0)
            resid_std = float(np.std(model.resid)) if len(model.resid) else float(s.std())
            widen = np.sqrt(np.arange(1, horizon + 1) / 3.0 + 1.0)
            lower = np.maximum(fc - 1.28 * resid_std * widen, 0.0)
            upper = fc + 1.28 * resid_std * widen
        except Exception:
            fc = None

    if fc is None:
        model_name = "ewma"
        ewma = s.ewm(span=14).mean().iloc[-1]
        weekly = np.array([
            s[s.index.dayofweek == d].tail(8).mean() / max(s.tail(56).mean(), 0.01)
            for d in range(7)
        ])
        weekly = np.nan_to_num(weekly, nan=1.0)
        last_date = s.index[-1]
        fc = np.array([
            max(ewma * weekly[(last_date + pd.Timedelta(days=i + 1)).dayofweek], 0)
            for i in range(horizon)
        ])
        std = float(s.tail(28).std())
        lower = np.maximum(fc - 1.28 * std, 0)
        upper = fc + 1.28 * std
        mape = None

    future_dates = pd.date_range(s.index[-1] + pd.Timedelta(days=1), periods=horizon, freq="D")
    return {
        "model": model_name,
        "horizon": horizon,
        "dates": [d.strftime("%Y-%m-%d") for d in future_dates],
        "forecast": [round(float(v), 2) for v in fc],
        "lower": [round(float(v), 2) for v in lower],
        "upper": [round(float(v), 2) for v in upper],
        "mape": round(mape, 1) if mape is not None else None,
        "history_days": int(len(s)),
        "avg_daily": round(float(s.tail(28).mean()), 2),
        "trend_pct_30d": round(
            float((s.tail(14).mean() - s.tail(42).head(28).mean()) / max(s.tail(42).head(28).mean(), 0.01) * 100), 1
        ),
    }
