from sklearn.ensemble import IsolationForest
from database.database import SessionLocal, SensorReading
model = IsolationForest(contamination=0.1, random_state=42)
def get_sensor_data():
        db = SessionLocal()
        readings = db.query(SensorReading).all()
        db.close()
        return [
        [reading.temperature, reading.vibration, reading.current]
        for reading in readings
    ]
data = get_sensor_data()
model.fit(data)
def detect_anomaly(temperature, vibration, current):
    prediction = model.predict([[temperature, vibration, current]])

    return bool(prediction[0] == -1)
print(detect_anomaly(75, 0.4, 4.5))

