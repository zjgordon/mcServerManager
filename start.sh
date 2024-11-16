#!/bin/bash

# Check if the virtual environment directory already exists
if [ -d "venv" ]; then
    echo "Virtual environment 'venv' already exists."
    source ./venv/bin/activate
    python3 ./run.py
    exit 1
fi

# Create the virtual environment
python3 -m venv venv

echo "Virtual environment created successfully."

# Activate the virtual environment
source ./venv/bin/activate

pip3 install -r ./requirements.txt

echo "Virtual environment activated."
python3 ./run.py