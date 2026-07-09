#!/usr/bin/env python3
"""Fail if a screenshot is effectively a blank screen.

A Capacitor app that shows a white (or black) screen is as broken as one that
crashes, and a launch test that only checks "is the process alive" passes it.
This looks at the actual pixels: a real screen has many distinct colours.

Usage: assert-not-blank.py <screenshot.png> [--min-colors N]
"""
import sys

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow is not installed; cannot verify the screenshot")

path = sys.argv[1]
min_colors = 40
if "--min-colors" in sys.argv:
    min_colors = int(sys.argv[sys.argv.index("--min-colors") + 1])

img = Image.open(path).convert("RGB")
img.thumbnail((400, 400))
total = img.size[0] * img.size[1]
counts = img.getcolors(maxcolors=total)  # [(count, colour), ...]

distinct = len(counts)
dominant_n, dominant = max(counts)
dominant_share = dominant_n / total

print(f"{path}: {img.size[0]}x{img.size[1]}, {distinct} distinct colours, "
      f"dominant {dominant} covers {dominant_share:.0%}")

if distinct < min_colors:
    sys.exit(f"BLANK SCREEN: only {distinct} distinct colours (need {min_colors})")
if dominant_share > 0.97:
    sys.exit(f"BLANK SCREEN: one colour covers {dominant_share:.0%} of the screen")

print("Screen has real content.")
