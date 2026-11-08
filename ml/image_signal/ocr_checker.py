"""
ml/image_signal/ocr_checker.py
==============================
Optical Character Recognition (OCR) and deceptive brand lookalike detector.
Uses RapidOCR to inspect physical packaging labels for counterfeit spelling
substitutions (e.g. 'DEVTOL' vs 'Dettol', 'Bislie' vs 'Bisleri', 'Adibas' vs 'Adidas',
'Mike' vs 'Nike').
"""

from __future__ import annotations
import difflib
import gc
import io
import re
from typing import Optional

import numpy as np
from PIL import Image

_OCR_INSTANCE = None

# Common generic categories that should not trigger false trademark matches
CATEGORY_WORDS = {
    "hand", "sanitizer", "soap", "water", "shoes", "shoe", "shirt", "tshirt",
    "jacket", "bottle", "drink", "drinking", "packaged", "running", "liquid",
    "protection", "spray", "original", "product", "item", "care", "brand",
    "edition", "classic", "clean", "pure", "oil", "tea", "milk", "cream",
    "the", "and", "for", "with", "from", "plus", "germ", "germs", "kill",
    "kills", "anti", "bacterial", "medical", "grade"
}


def get_ocr():
    """Lazy-load the RapidOCR engine singleton with lightweight settings."""
    global _OCR_INSTANCE
    if _OCR_INSTANCE is None:
        try:
            from rapidocr_onnxruntime import RapidOCR
            # Initialize with single-threaded mode to keep memory footprint < 40MB on free cloud tiers
            _OCR_INSTANCE = RapidOCR(intra_op_num_threads=1, inter_op_num_threads=1)
        except Exception:
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
        matched_token?: str
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
        # Resize to max 400px to ensure CPU inference finishes in ~1s and avoids cloud OOM
        if max(pil_img.size) > 400:
            pil_img.thumbnail((400, 400), Image.Resampling.LANCZOS)
        img_np = np.array(pil_img)
        results, _ = ocr(img_np)
        del pil_img, img_np
        gc.collect()
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

    # Collect target brand and product keywords, filtering out generic category stopwords
    brand_tokens = [
        w.lower() for w in re.findall(r"[A-Za-z0-9]+", target_brand or "")
        if len(w) >= 3 and w.lower() not in CATEGORY_WORDS
    ]
    name_tokens = [
        w.lower() for w in re.findall(r"[A-Za-z0-9]+", target_name or "")
        if len(w) >= 3 and w.lower() not in CATEGORY_WORDS
    ]

    all_targets = set(brand_tokens + name_tokens)
    if target_brand and target_brand.strip().lower() not in CATEGORY_WORDS:
        all_targets.add(target_brand.strip().lower())

    exact_matches: list[tuple[str, str]] = []
    lookalikes: list[tuple[str, str, float]] = []

    for text in extracted_words:
        tokens = re.findall(r"[A-Za-z0-9]+", text)
        for token in tokens:
            t_lower = token.lower()
            if len(t_lower) < 3 or t_lower in CATEGORY_WORDS:
                continue

            for tw in all_targets:
                if t_lower == tw:
                    exact_matches.append((token, tw))
                else:
                    ratio = difflib.SequenceMatcher(None, t_lower, tw).ratio()
                    # 0.65 <= ratio < 1.0 isolates deceptive lookalikes:
                    # DEVTOL vs Dettol (0.83), Adibas vs Adidas (0.83), Bislie vs Bisleri (0.77), Mike vs Nike (0.75)
                    # while not confusing separate valid brands (e.g. Bailley vs Bisleri = 0.57)
                    if 0.65 <= ratio < 1.0 and len(t_lower) >= 4 and len(tw) >= 4:
                        lookalikes.append((token, tw, ratio))
                    elif 0.70 <= ratio < 1.0 and (len(t_lower) == 3 or len(tw) == 3):
                        lookalikes.append((token, tw, ratio))

    # Deceptive lookalike found without exact brand presence -> Counterfeit!
    if lookalikes and not exact_matches:
        lookalikes.sort(key=lambda x: x[2], reverse=True)
        best_tok, best_target, best_ratio = lookalikes[0]
        return {
            "status": "counterfeit",
            "detected_words": extracted_words,
            "matched_token": best_tok,
            "reason": (
                f"Deceptive brand lookalike detected on label: '{best_tok}' "
                f"instead of registered keyword '{best_target}' (similarity={best_ratio:.2f})"
            ),
        }

    # Exact brand text verified on label
    if exact_matches:
        best_tok, best_target = exact_matches[0]
        return {
            "status": "genuine",
            "detected_words": extracted_words,
            "matched_token": best_tok,
            "reason": f"Brand text '{best_tok}' verified on packaging",
        }

    sample_words = ", ".join(extracted_words[:5]) if extracted_words else "none"
    return {
        "status": "inconclusive",
        "detected_words": extracted_words,
        "reason": f"Extracted text ({sample_words}) does not contain brand keyword",
    }
