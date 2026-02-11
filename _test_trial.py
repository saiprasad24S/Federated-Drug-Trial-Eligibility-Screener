import requests, time

t0 = time.time()
r = requests.get('http://localhost:8002/trials/Cardiozen-B/eligible',
                 params={'page': 1, 'page_size': 50, 'tab': 'eligible'}, timeout=120)
elapsed = time.time() - t0
print(f"Status: {r.status_code}, Time: {elapsed:.1f}s")
d = r.json()
print(f"Patients: {len(d.get('patients', []))}")
print(f"eligible_count: {d.get('eligible_count')}")
print(f"not_eligible_count: {d.get('not_eligible_count')}")
print(f"columns: {d.get('columns')}")
print(f"total_pages: {d.get('total_pages')}")
print(f"page: {d.get('page')}")
if d.get('patients'):
    print(f"First patient: {d['patients'][0]}")
