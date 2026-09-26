"""Local hashing-based text embedding — a deterministic stand-in for a real
embedding model, so the pgvector retrieval path (extension, vector column,
cosine-similarity query) is genuinely exercised without any external model
or API key. Swap for a real embedding model/API by replacing `embed()`.
"""
import math
import re
import zlib

DIMENSIONS = 64

_TOKEN_RE = re.compile(r"[a-z0-9]+")


def embed(text: str) -> list[float]:
    vector = [0.0] * DIMENSIONS
    for token in _TOKEN_RE.findall(text.lower()):
        bucket = zlib.crc32(token.encode("utf-8")) % DIMENSIONS
        vector[bucket] += 1.0
    norm = math.sqrt(sum(v * v for v in vector)) or 1.0
    return [v / norm for v in vector]


def to_pgvector_literal(vector: list[float]) -> str:
    return "[" + ",".join(repr(v) for v in vector) + "]"
