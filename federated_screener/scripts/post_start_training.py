import json
import urllib.request

def post_start_rounds(n=3):
    url = "http://127.0.0.1:8002/start-training"
    data = json.dumps({"num_rounds": n}).encode()
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        print(resp.read().decode())

if __name__ == '__main__':
    post_start_rounds(3)
