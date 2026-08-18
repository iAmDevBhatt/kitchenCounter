#!/bin/bash

# Start KitchenCounter Application (Linux/Mac)
# This script assumes you have PostgreSQL running and a database created

echo "Starting KitchenCounter Application..."

# Change to the backend directory and activate virtual environment
cd backend
source venv/bin/activate

# Start the FastAPI server in background
uvicorn main:app --reload --port 8000 &

# Change to frontend directory and start React development server
cd ../frontend
npm run dev

echo "KitchenCounter started successfully!"