from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from database.database import SessionLocal, SensorReading as SensorReadingDB
from datetime import datetime
from ai.anomaly_detection import detect_anomaly
from ai.groq_service import ask_groq

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SensorReading(BaseModel):
    machine_id: str
    temperature: float
    vibration: float
    current: float


@app.get("/")
def home():
    return {"message": "AIoT Smart Factory Backend is running"}


@app.post("/api/v1/sensor-readings")
def receive_sensor_reading(data: SensorReading):
    db = SessionLocal()
    is_anomaly = detect_anomaly(
    data.temperature,
    data.vibration,
    data.current
)
    reading = SensorReadingDB(
    machine_id=data.machine_id,
    temperature=data.temperature,
    vibration=data.vibration,
    current=data.current,
    timestamp=datetime.now().isoformat(),
    is_anomaly=int(is_anomaly)
)
    db.add(reading)
    db.commit()
    db.close()
    return {
    "message": "Sensor reading received",
    "is_anomaly": is_anomaly,
    "status": "ANOMALY" if is_anomaly else "NORMAL",
    "data": data
}
@app.get("/api/v1/sensor-readings")
def get_sensor_readings():
    db = SessionLocal()
    readings = db.query(SensorReadingDB).all()
    db.close()
    return [
    {
        "id": reading.id,
        "machine_id": reading.machine_id,
        "temperature": reading.temperature,
        "vibration": reading.vibration,
        "current": reading.current,
        "timestamp": reading.timestamp
    }
    for reading in readings
]
@app.get("/api/v1/sensor-readings/latest")
def get_latest_sensor_reading():
    db = SessionLocal()
    latest = db.query(SensorReadingDB).order_by(
    SensorReadingDB.id.desc()
).first()
    db.close()
    return latest
@app.get("/api/v1/sensor-readings/history")
def get_sensor_history(machine_id: str, date: str):
    db = SessionLocal()

    readings = db.query(SensorReadingDB).filter(
        SensorReadingDB.machine_id == machine_id,
        SensorReadingDB.timestamp.like(f"{date}%")
    ).order_by(
        SensorReadingDB.id.asc()
    ).all()

    db.close()

    return readings

@app.get("/api/v1/sensor-readings/history-summary")
def get_sensor_history_summary(machine_id: str, date: str):
    db = SessionLocal()

    # Is machine aur date ki saari readings
    readings = db.query(SensorReadingDB).filter(
        SensorReadingDB.machine_id == machine_id,
        SensorReadingDB.timestamp.like(f"{date}%")
    ).order_by(
        SensorReadingDB.id.asc()
    ).all()

    # Sirf anomaly wali readings
    anomalies = [
        reading for reading in readings
        if reading.is_anomaly == 1
    ]

    db.close()

    return {
        "machine_id": machine_id,
        "date": date,
        "total_readings": len(readings),
        "anomaly_detected": len(anomalies) > 0,
        "anomaly_count": len(anomalies),
        "anomalies": [
            {
                "time": reading.timestamp.split("T")[1]
                if reading.timestamp and "T" in reading.timestamp
                else reading.timestamp,
                "temperature": reading.temperature,
                "vibration": reading.vibration,
                "current": reading.current
            }
            for reading in anomalies
        ]
    }
@app.get("/api/v1/ai/ask")
def ask_ai(question: str):

    answer = ask_groq(question)

    return {
        "question": question,
        "answer": answer
    }