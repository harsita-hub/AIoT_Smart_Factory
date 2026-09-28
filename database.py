from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy import Column
from sqlalchemy import Integer
from sqlalchemy import String
from sqlalchemy import Float


Base = declarative_base()

engine = create_engine("sqlite:///factory.db")

SessionLocal = sessionmaker(bind=engine)


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(String)
    temperature = Column(Float)
    vibration = Column(Float)
    current = Column(Float)
    timestamp = Column(String)
    is_anomaly = Column(Integer, default=0)

Base.metadata.create_all(bind=engine)
