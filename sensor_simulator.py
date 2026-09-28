import requests
import time
API_URL = "http://127.0.0.1:8000/api/v1/sensor-readings"
import random
while True:
    temperature = round(random.uniform(50, 80), 2)
    vibration = round(random.uniform(0.1, 0.8), 2)
    current = round(random.uniform(3, 6), 2)

    print(temperature)
    print(vibration)
    print(current)

    data = {
        "machine_id": "M001",
        "temperature": temperature,
        "vibration": vibration,
        "current": current
    }

    response = requests.post(API_URL, json=data)

    print(response.json())
    time.sleep(2)