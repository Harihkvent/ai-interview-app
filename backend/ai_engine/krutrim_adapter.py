import os
import httpx
from typing import Any, List, Optional, Dict
from langchain_core.language_models.llms import LLM
from langchain_core.callbacks.manager import CallbackManagerForLLMRun
from pydantic import Field, SecretStr
import logging

logger = logging.getLogger("ai_engine")

class KrutrimLLM(LLM):
    """
    Custom LangChain Adapter for Krutrim API.
    Enables using Krutrim with standard LangChain agents and chains.
    """
    
    krutrim_api_key: SecretStr = Field(..., alias="api_key")
    api_url: str = Field(default="https://cloud.olakrutrim.com/v1/chat/completions")
    model_name: str = Field(default="Krutrim-spectre-v2")
    temperature: float = 0.7
    max_tokens: int = 1000
    timeout: float = 60.0

    @property
    def _llm_type(self) -> str:
        return "krutrim"

    def _call(
        self,
        prompt: str,
        stop: Optional[List[str]] = None,
        run_manager: Optional[CallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> str:
        """
        Execute the API call to Krutrim.
        """
        headers = {
            "Authorization": f"Bearer {self.krutrim_api_key.get_secret_value()}",
            "Content-Type": "application/json"
        }

        # Adapt prompt for Chat API (Krutrim is likely chat-based)
        messages = [{"role": "user", "content": prompt}]

        payload = {
            "model": self.model_name,
            "messages": messages,
            "temperature": kwargs.get("temperature", self.temperature),
            "max_tokens": kwargs.get("max_tokens", self.max_tokens)
        }

        try:
            with httpx.Client(timeout=self.timeout) as client:
                response = client.post(self.api_url, json=payload, headers=headers)
                response.raise_for_status()
                
                result = response.json()
                content = result['choices'][0]['message']['content']
                
                if stop:
                    # Simple stop sequence handling
                    for s in stop:
                        if s in content:
                            content = content.split(s)[0]
                            
                return content

        except Exception as e:
            logger.error(f"Krutrim API Call Failed: {e}")
            raise ValueError(f"Error calling Krutrim API: {e}")

    @property
    def _identifying_params(self) -> Dict[str, Any]:
        return {
            "model_name": self.model_name,
            "temperature": self.temperature,
            "api_url": self.api_url
        }
