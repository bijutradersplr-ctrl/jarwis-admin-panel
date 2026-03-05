import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
import os

# Use existing credentials
cred_path = "c:/Users/biju/Downloads/New Test Software/jarwis-web/jarwis_credentials.json"
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = cred_path

if not firebase_admin._apps:
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)

db = firestore.client()

print("Querying route_settlements...")
docs = db.collection('route_settlements').order_by('timestamp', direction=firestore.Query.DESCENDING).limit(5).stream()

for doc in docs:
    data = doc.to_dict()
    print(f"\n--- Document ID: {doc.id} ---")
    print(f"Timestamp: {data.get('timestamp')}")
    print(f"Status: {data.get('status')}")
    print(f"Route: {data.get('route_name')}")
    print(f"Salesman: {data.get('salesman')}")
