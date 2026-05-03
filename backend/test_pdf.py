import requests
import sys

res = requests.post("http://127.0.0.1:8000/api/v1/auth/login", data={"username": "admin@medsegai.com", "password": "password"})
token = res.json().get("access_token")

headers = {"Authorization": f"Bearer {token}"}
# Find a result ID
res = requests.get("http://127.0.0.1:8000/api/v1/patients/", headers=headers)
patients = res.json().get("items", [])
if not patients:
    print("No patients")
    sys.exit()

res = requests.get(f"http://127.0.0.1:8000/api/v1/patients/{patients[0]['id']}/studies", headers=headers)
studies = res.json()
if not studies:
    print("No studies")
    sys.exit()

res = requests.get(f"http://127.0.0.1:8000/api/v1/results/by-study/{studies[0]['id']}", headers=headers)
result = res.json()
if "id" not in result:
    print("No result")
    sys.exit()

res = requests.get(f"http://127.0.0.1:8000/api/v1/results/{result['id']}/report/pdf", headers=headers)
print(f"Status: {res.status_code}")
print(f"Content-Type: {res.headers.get('Content-Type')}")
print(f"Size: {len(res.content)} bytes")
with open("test.pdf", "wb") as f:
    f.write(res.content)
print("Saved to test.pdf")
