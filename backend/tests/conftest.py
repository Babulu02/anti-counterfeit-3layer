"""
conftest.py — pytest configuration for backend tests.

Adds the repo root to sys.path so tests can import backend.identity
without installing the package.
"""
import sys
import os

# Repo root is two levels up from this file (backend/tests/conftest.py)
repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if repo_root not in sys.path:
    sys.path.insert(0, repo_root)
