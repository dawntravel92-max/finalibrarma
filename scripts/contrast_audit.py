from __future__ import annotations

from pathlib import Path
import re

css = Path("client/src/index.css").read_text()

def rgb(hex_color: str):
    value = hex_color.lstrip("#")
    if len(value) == 3:
        value = "".join(c * 2 for c in value)
    return tuple(int(value[i:i+2], 16) / 255 for i in (0, 2, 4))

def luminance(hex_color: str):
    channels = []
    for channel in rgb(hex_color):
        channels.append(channel / 12.92 if channel <= 0.03928 else ((channel + 0.055) / 1.055) ** 2.4)
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]

def contrast(foreground: str, background: str):
    light = max(luminance(foreground), luminance(background))
    dark = min(luminance(foreground), luminance(background))
    return (light + 0.05) / (dark + 0.05)

print("candidates")
for name, color in (("muted-candidate", "#5f697a"), ("gold-candidate", "#85661e"), ("success-candidate", "#28704f"), ("danger-candidate", "#9b3f3f")):
    print(f"{name:18} {color} {contrast(color, '#f4f1ea'):.2f}:1")

for theme, block in (("light", css.split("html.dark")[0]), ("dark", css.split("html.dark", 1)[1])):
    tokens = dict(re.findall(r"--([\w-]+):\s*(#[0-9A-Fa-f]{3,8})", block))
    background = tokens.get("paper")
    print(theme, "background", background)
    for name in ("ink", "ink-soft", "muted", "gold", "success", "danger"):
        color = tokens.get(name)
        if color and background:
            print(f"{name:10} {color} {contrast(color, background):.2f}:1")
