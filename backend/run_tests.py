"""Helper script: run pytest and write results to a log file."""
import sys
import os

# Set paths
sys.path.insert(0, r"c:\Blockchain\anti-counterfeit-3layer")
sys.path.insert(0, r"c:\Blockchain\anti-counterfeit-3layer\backend")

import pytest

ret = pytest.main([
    r"c:\Blockchain\anti-counterfeit-3layer\backend\tests\test_api.py",
    "-v", "--tb=short", "-p", "no:cacheprovider",
])
sys.exit(ret)
