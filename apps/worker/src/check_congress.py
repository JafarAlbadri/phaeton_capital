import requests
import json

try:
    res = requests.get("https://house-stock-watcher-data.s3-us-west-2.amazonaws.com/data/all_transactions.json", timeout=5)
    data = res.json()
    print("Total trades:", len(data))
    print(json.dumps(data[:2], indent=2))
except Exception as e:
    print(str(e))
