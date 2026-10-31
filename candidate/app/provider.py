import json
import math

import httpx
from pydantic import ValidationError

from app.config import ROOT
from app.errors import ServiceError
from app.schemas import Extraction


class Provider:
    """Hosted OpenAI-compatible HTTP provider. No local fake vectors in production."""

    def __init__(self, config):
        self.config = config

    def request(self, path, payload):
        if not self.config.provider_api_key.get_secret_value():
            raise ServiceError("provider_not_configured", 503)
        try:
            with httpx.Client(timeout=self.config.provider_timeout) as client:
                response = client.post(
                    self.config.provider_url.rstrip("/") + path,
                    headers={
                        "Authorization": "Bearer " + self.config.provider_api_key.get_secret_value()
                    },
                    json=payload,
                )
                response.raise_for_status()
                return response.json()
        except (httpx.HTTPError, ValueError):
            raise ServiceError("provider_unavailable", 503) from None

    def extract(self, text, rubric):
        result = self.request(
            "/chat/completions",
            {
                "model": self.config.extraction_model,
                "temperature": 0,
                "response_format": {"type": "json_object"},
                "messages": [
                    {
                        "role": "system",
                        "content": (ROOT / "prompts/resume_extraction.md").read_text()
                        + "\nSCHEMA:\n"
                        + json.dumps(Extraction.model_json_schema())
                        + "\nRUBRIC:\n"
                        + json.dumps(rubric["categories"]),
                    },
                    {"role": "user", "content": json.dumps({"resume_chunk": text})},
                ],
            },
        )
        try:
            choice = result["choices"][0]
            if choice["finish_reason"] != "stop":
                raise ValueError("Incomplete output")
            extracted = Extraction.model_validate_json(choice["message"]["content"])
            for entry in [
                *extracted.evidence,
                *extracted.other_details,
                *extracted.identity_details,
            ]:
                if entry.quote not in text:
                    raise ValueError("Unsupported citation")
            return extracted.model_dump()
        except (KeyError, IndexError, TypeError, ValueError, ValidationError):
            raise ServiceError("invalid_extraction_output", 503) from None

    def embed(self, chunks):
        vectors = []
        for start in range(0, len(chunks), 32):
            batch = chunks[start : start + 32]
            result = self.request(
                "/embeddings",
                {
                    "model": self.config.embedding_model,
                    "dimensions": self.config.embedding_dimensions,
                    "input": batch,
                },
            )
            try:
                rows = sorted(result["data"], key=lambda row: row["index"])
                if [r["index"] for r in rows] != list(range(len(batch))):
                    raise ValueError("Incomplete embedding batch")
                for row in rows:
                    vector = row["embedding"]
                    if (
                        len(vector) != self.config.embedding_dimensions
                        or not all(isinstance(v, (int, float)) and math.isfinite(v) for v in vector)
                        or not any(vector)
                    ):
                        raise ValueError("Invalid embedding")
                    vectors.append(vector)
            except (KeyError, TypeError, ValueError):
                raise ServiceError("invalid_embedding_output", 503) from None
        return vectors
