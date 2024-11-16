import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'your_secret_key'  # Replace with a secure key
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///minecraft_manager.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
