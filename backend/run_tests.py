"""Helper script: run all backend pytest tests and write results to test_output.txt."""
import sys
import os

sys.path.insert(0, r"c:\Blockchain\anti-counterfeit-3layer")
sys.path.insert(0, r"c:\Blockchain\anti-counterfeit-3layer\backend")

import pytest

ret = pytest.main([
    r"c:\Blockchain\anti-counterfeit-3layer\backend\tests\test_api.py",
    r"c:\Blockchain\anti-counterfeit-3layer\backend\tests\test_fusion.py",
    "-v", "--tb=short", "-p", "no:cacheprovider",
])
sys.exit(ret)
