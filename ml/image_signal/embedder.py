"""
ml/image_signal/embedder.py
===========================
MobileNetV2 feature-embedding extractor.
Produces 1280-dimensional L2-normalized float32 vectors suitable for cosine similarity.

Reused from C:\\Project-MF\\ml\\embedder.py with clean CPU fallback.
"""

from __future__ import annotations
import io
from pathlib import Path
from typing import Union

import numpy as np
import torch
import torch.nn as nn
from PIL import Image
from torchvision import models, transforms

_TRANSFORM = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225],
    ),
])


def _preprocess(img: Image.Image) -> torch.Tensor:
    rgb = img.convert("RGB")
    return _TRANSFORM(rgb).unsqueeze(0)


class Embedder:
    """
    MobileNetV2 fixed feature extractor.
    Cached singleton model producing unit-length 1280-d embeddings.
    """

    def __init__(self, device: str = "cpu"):
        self.device = torch.device(device)
        weights = models.MobileNet_V2_Weights.DEFAULT
        base = models.mobilenet_v2(weights=weights)
        # Retain features and adaptive pooling, discard classifier
        self.features = base.features
        self.pool = nn.AdaptiveAvgPool2d((1, 1))
        self.eval()
        self.to(self.device)

    def to(self, device: torch.device):
        self.features.to(device)
        self.pool.to(device)

    def eval(self):
        self.features.eval()
        self.pool.eval()

    def embed(self, image: Image.Image) -> np.ndarray:
        tensor = _preprocess(image).to(self.device)
        with torch.no_grad():
            feat = self.features(tensor)
            pooled = self.pool(feat)
            flattened = torch.flatten(pooled, 1)
            norm = torch.nn.functional.normalize(flattened, p=2, dim=1)
        return norm.squeeze(0).cpu().numpy().astype(np.float32)

    def embed_bytes(self, data: bytes) -> np.ndarray:
        img = Image.open(io.BytesIO(data))
        return self.embed(img)

    def embed_file(self, path: Union[str, Path]) -> np.ndarray:
        img = Image.open(path)
        return self.embed(img)


_INSTANCE: Embedder | None = None


def get_embedder() -> Embedder:
    global _INSTANCE
    if _INSTANCE is None:
        _INSTANCE = Embedder(device="cpu")
    return _INSTANCE
