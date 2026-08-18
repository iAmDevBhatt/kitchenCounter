#!/bin/bash

# Initialize KitchenCounter Application
# This script will setup the project for development

echo "Initializing KitchenCounter Application..."

# Check if Python 3.11+ is installed
if ! command -v python3 &> /dev/null; then
    echo "Python 3 is not installed"
    exit 1
fi

PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
MAJOR_VERSION=$(echo $PYTHON_VERSION | cut -d'.' -f1)
MINOR_VERSION=$(echo $PYTHON_VERSION | cut -d'.' -f2)

if [[ $MAJOR_VERSION -lt 3 || ($MAJOR_VERSION -eq 3 && $MINOR_VERSION -lt 11) ]]; then
    echo "Python 3.11 or higher is required"
    exit 1
fi

# Check if Node.js 18+ is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed"
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2)
MAJOR_NODE_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1)

if [[ $MAJOR_NODE_VERSION -lt 18 ]]; then
    echo "Node.js 18 or higher is required"
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "backend/venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv backend/venv
fi

# Activate virtual environment
source backend/venv/bin/activate

# Install Python dependencies
echo "Installing Python dependencies..."
pip install --upgrade pip
pip install -r backend/requirements.txt

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
cd frontend
npm install
cd ..

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating .env file from example..."
    cp .env.example .env
fi

# Run database migrations
echo "Running database migrations..."
cd backend
alembic upgrade head
cd ..

# Create default admin user and root category
echo "Setting up initial data..."

# Print instructions for the developer
echo ""
echo "==================================="
echo "KitchenCounter initialized successfully!"
echo "==================================="
echo ""
echo "To run the application:"
echo "  Windows: ./start.ps1"
echo "  Linux/Mac: ./start.sh"
echo ""
echo "Prerequisites:"
echo "- PostgreSQL server running on localhost:5432"
echo "- Database 'kitchendb' created with user 'kitchenuser'"
echo ""

echo "Next steps:"
echo "1. Ensure PostgreSQL is running"
echo "2. Run './init.sh' to set up the application"
echo "3. Run './start.sh' (Linux/Mac) or './start.ps1' (Windows) to start the server"