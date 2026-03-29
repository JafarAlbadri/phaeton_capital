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
