import sys
from unittest.mock import MagicMock

# Global mocks for heavy or environment-specific dependencies
# This prevents DLL loading errors on Windows and speeds up tests
sys.modules["motor"] = MagicMock()
sys.modules["motor.motor_asyncio"] = MagicMock()
sys.modules["langchain_mcp_adapters"] = MagicMock()
sys.modules["langchain_mcp_adapters.tools"] = MagicMock()
sys.modules["ml_job_matcher"] = MagicMock()
sys.modules["sentence_transformers"] = MagicMock()
sys.modules["torch"] = MagicMock()

# Mock prometheus metrics globally
mock_metrics = MagicMock()
sys.modules["metrics"] = mock_metrics
