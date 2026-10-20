"""
ml/image_signal/ocr_checker.py
==============================
Optical Character Recognition (OCR) and deceptive brand lookalike detector.
Uses RapidOCR to inspect physical packaging labels for counterfeit spelling
substitutions (e.g. 'Bislie' vs 'Bisleri', 'Adibas' vs 'Adidas').
"""

from __future__ import annotations
import difflib
import io
import re
from functools import lru_cache
from typing import Optional

import numpy as np
from PIL import Image

_OCR_INSTANCE = None


def get_ocr():
    """Lazy-load the RapidOCR engine singleton."""
    global _OCR_INSTANCE
    if _OCR_INSTANCE is None:
        try:
            from rapidocr_onnxruntime import RapidOCR
            _OCR_INSTANCE = RapidOCR()
        except Exception:
            _OCR_INSTANCE = False
    return _OCR_INSTANCE if _OCR_INSTANCE is not False else None


def verify_label_text(
    image_bytes: bytes,
    target_brand: str,
    target_name: str = "",
) -> dict:
    """
    Inspect image bytes for brand name text and detect deceptive lookalikes.

    Returns dict with keys:
        status: "genuine" | "counterfeit" | "inconclusive"
        detected_words: list[str]
        reason: str
    """
    ocr = get_ocr()
    if ocr is None:
        return {
            "status": "inconclusive",
            "detected_words": [],
            "reason": "OCR engine not available",
        }

    try:
        pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img_np = np.array(pil_img)
        results, _ = ocr(img_np)
    except Exception as exc:
        return {
            "status": "inconclusive",
            "detected_words": [],
            "reason": f"OCR extraction error: {exc}",
        }

    if not results:
        return {
            "status": "inconclusive",
            "detected_words": [],
            "reason": "No legible text detected on product packaging",
        }

    extracted_words = []
    for item in results:
        # RapidOCR returns list of [box, text, score]
        if len(item) >= 2 and item[1]:
            extracted_words.append(str(item[1]).strip())

    brand_clean = target_brand.strip().lower()
    name_clean = target_name.strip().lower()

    # Search for exact or deceptive match
    for text in extracted_words:
        # Tokenize by words and alphanumeric
        tokens = re.findall(r"[A-Za-z0-9]+", text)
        for token in tokens:
            t_lower = token.lower()
            if not t_lower:
                continue

            # Check against brand
            if brand_clean:
                if t_lower == brand_clean:
                    return {
                        "status": "genuine",
                        "detected_words": extracted_words,
                        "matched_token": token,
                        "reason": f"Brand text '{token}' verified on packaging",
                    }
                # Check for lookalike spoofing
                ratio = difflib.SequenceMatcher(None, t_lower, brand_clean).ratio()
                if 0.55 <= ratio < 1.0 and len(t_lower) >= 4 and len(brand_clean) >= 4:
                    return {
                        "status": "counterfeit",
                        "detected_words": extracted_words,
                        "matched_token": token,
                        "reason": (
                            f"Deceptive brand lookalike detected on label: '{token}' "
                            f"instead of registered brand '{target_brand}' (similarity={ratio:.2f})"
                        ),
                    }

            # Check against name
            if name_clean and name_clean != brand_clean:
                if t_lower == name_clean:
                    return {
                        "status": "genuine",
                        "detected_words": extracted_words,
                        "matched_token": token,
                        "reason": f"Product name '{token}' verified on packaging",
                    }
                ratio = difflib.SequenceMatcher(None, t_lower, name_clean).ratio()
                if 0.60 <= ratio < 1.0 and len(t_lower) >= 4 and len(name_clean) >= 4:
                    return {
                        "status": "counterfeit",
                        "detected_words": extracted_words,
                        "matched_token": token,
                        "reason": (
                            f"Deceptive product name lookalike detected on label: '{token}' "
                            f"instead of '{target_name}' (similarity={ratio:.2f})"
                        ),
                    }

    return {
        "status": "inconclusive",
        "detected_words": extracted_words,
        "reason": f"Extracted text ({', '.join(extracted_words[:5])}) does not contain brand keyword",
    }
