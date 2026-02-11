import json
from urllib.request import Request, urlopen

url = 'http://127.0.0.1:8002/start-training'
data = json.dumps({'num_rounds': 3}).encode('utf-8')
req = Request(url, data=data, headers={'Content-Type': 'application/json'})
try:
    with urlopen(req, timeout=10) as resp:
        print(resp.read().decode())
except Exception as e:
    print('ERROR', e)
