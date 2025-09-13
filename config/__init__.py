"""
Configuration factory for the Minecraft Server Manager application.

This module provides a centralized configuration management system that supports
environment-specific configurations (development, testing, production) with
proper validation and environment variable loading.
"""

import os
from typing import Type

from .base import BaseConfig
from .development import DevelopmentConfig
from .production import ProductionConfig
from .testing import TestingConfig


def get_config() -> Type[BaseConfig]:
    """
    Get the appropriate configuration class based on the FLASK_ENV environment variable.

    Returns:
        Type[BaseConfig]: The configuration class for the current environment

    Raises:
        ValueError: If FLASK_ENV is set to an unsupported value
    """
    env = os.environ.get("FLASK_ENV", "development").lower()

    config_map = {
        "development": DevelopmentConfig,
        "testing": TestingConfig,
        "test": TestingConfig,
        "production": ProductionConfig,
        "prod": ProductionConfig,
    }

    if env not in config_map:
        raise ValueError(f"Unsupported FLASK_ENV: {env}. Must be one of: {list(config_map.keys())}")

    return config_map[env]


# Export the configuration classes for direct import if needed
__all__ = [
    "BaseConfig",
    "DevelopmentConfig",
    "TestingConfig",
    "ProductionConfig",
    "get_config",
]
