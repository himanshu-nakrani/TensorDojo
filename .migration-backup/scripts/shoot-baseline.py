#!/usr/bin/env python3
"""Take baseline screenshots: 21 lessons + home + map × 2 themes = 46 PNGs."""
import os
import re
import sys
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3002"
OUT = Path("docs/screenshots/before-polish")
LESSONS = [
    "dot-product", "vector-projection", "softmax", "attention-scores",
    "attention-output", "scaled-attention", "causal-mask", "token-embeddings",
    "positional-encoding", "multi-head-attention", "residuals-layernorm",
    "feed-forward", "transformer-block", "sampling-decoding",
    "cross-entropy", "gradient-descent", "backpropagation", "sgd",
    "optimizers", "lr-schedules", "training-end-to-end",
]
THEMES = [
    ("dark",  "dark"),
    ("light", "light"),
]


def shoot(page, url, out_path, wait_ms=1200):
    page.goto(url, wait_until="networkidle", timeout=30000)
    # Make sure theme applied; ensure no FOUC, wait for the page to settle.
    page.wait_for_timeout(wait_ms)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    page.screenshot(path=str(out_path), full_page=True)
    print(f"  wrote {out_path}")


def set_theme(page, theme):
    page.add_init_script(
        f"""
        (() => {{
          try {{
            localStorage.setItem('tld-theme', '{theme}');
            document.documentElement.classList.toggle('dark', '{theme}' === 'dark');
          }} catch (e) {{}}
        }})();
        """
    )


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for theme_label, theme in THEMES:
            print(f"=== {theme_label} ===")
            ctx = browser.new_context(viewport={"width": 1440, "height": 900})
            page = ctx.new_page()
            set_theme(page, theme)
            # Home
            shoot(page, f"{BASE}/", OUT / theme_label / "home.png", 800)
            # Map
            shoot(page, f"{BASE}/map", OUT / theme_label / "map.png", 1200)
            # Lessons
            for slug in LESSONS:
                shoot(page, f"{BASE}/lessons/{slug}", OUT / theme_label / f"lessons-{slug}.png", 1500)
            ctx.close()
        browser.close()


if __name__ == "__main__":
    main()
