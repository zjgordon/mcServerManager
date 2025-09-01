import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'your_secret_key'  # Replace with a secure key
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///minecraft_manager.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Memory Management Configuration
    MAX_TOTAL_MEMORY_MB = int(os.environ.get('MAX_TOTAL_MEMORY_MB', '8192'))  # Default 8GB total
    DEFAULT_SERVER_MEMORY_MB = int(os.environ.get('DEFAULT_SERVER_MEMORY_MB', '1024'))  # Default 1GB per server
    MIN_SERVER_MEMORY_MB = int(os.environ.get('MIN_SERVER_MEMORY_MB', '512'))  # Minimum 512MB per server
    MAX_SERVER_MEMORY_MB = int(os.environ.get('MAX_SERVER_MEMORY_MB', '4096'))  # Maximum 4GB per server
