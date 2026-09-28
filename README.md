# AIoT Smart Factory Monitoring Platform

An AIoT-based smart factory monitoring platform designed to monitor machine sensor data in real time, detect abnormal behaviour using Machine Learning, store historical sensor readings, and provide an AI-powered interface for factory data analysis.

## Project Overview

The AIoT Smart Factory Monitoring Platform combines:

- Internet of Things (IoT)
- Artificial Intelligence
- Machine Learning
- FastAPI
- SQLite Database
- Real-time Sensor Simulation
- Web Dashboard

The system collects machine parameters such as **temperature, vibration, and current**, stores the readings in a database, and uses a Machine Learning model to identify unusual sensor behaviour.

## Features

### Real-Time Monitoring
- Live temperature monitoring
- Live vibration monitoring
- Live current monitoring
- Machine status monitoring
- Continuous sensor data updates

### AI-Based Anomaly Detection
- Uses Machine Learning for anomaly detection
- Detects unusual sensor patterns
- Marks readings as `NORMAL` or `ANOMALY`
- Stores anomaly status with sensor readings

### Machine History
- Historical sensor data stored in SQLite
- Search machine data by date
- Check historical anomalies
- View anomaly time and sensor values
- View temperature, vibration, and current readings

### Smart Dashboard
- Total machine count
- Average temperature
- Average vibration
- Average current
- Machine overview
- Recent alerts
- Temperature trend
- Vibration trend
- Current trend
- AI insights
- Live sensor data

### AI Assistant
The project also includes a Groq-powered AI assistant through the FastAPI backend.

Users can ask questions such as:
What is AIoT?
What is anomaly detection?
Explain machine monitoring.
