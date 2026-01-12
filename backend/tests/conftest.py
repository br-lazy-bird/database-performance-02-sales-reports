"""
pytest configuration and fixtures for integration tests.
"""

import os
import pytest


@pytest.fixture(scope="session")
def api_url():
    """
    Provides the API URL.
    When running in Docker, uses Docker network hostname.
    When running locally, uses localhost.
    """
    return os.getenv("API_URL", "http://localhost:8000")
