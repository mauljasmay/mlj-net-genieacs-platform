#!/usr/bin/env python3
"""Generate PWA icons as SVG-based PNGs for all required sizes."""
import os

ICON_DIR = '/home/z/my-project/public/icons'
os.makedirs(ICON_DIR, exist_ok=True)

# Generate SVG icon template
def make_svg(size):
    # Background: dark rounded square with cyan border
    # Icon: Radio tower / signal icon in cyan
    # Text: "MLJ" in bold
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 {size} {size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0f172a"/>
      <stop offset="100%" style="stop-color:#1e293b"/>
    </linearGradient>
    <linearGradient id="icon-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#06b6d4"/>
      <stop offset="100%" style="stop-color:#22d3ee"/>
    </linearGradient>
  </defs>
  <rect width="{size}" height="{size}" rx="{int(size*0.2)}" fill="url(#bg)"/>
  <rect width="{size}" height="{size}" rx="{int(size*0.2)}" fill="none" stroke="#06b6d4" stroke-width="{max(2, int(size*0.015))}" opacity="0.3"/>
  <!-- Tower base -->
  <rect x="{int(size*0.46)}" y="{int(size*0.35)}" width="{int(size*0.08)}" height="{int(size*0.4)}" rx="2" fill="url(#icon-grad)"/>
  <!-- Tower top -->
  <circle cx="{int(size*0.5)}" cy="{int(size*0.33)}" r="{int(size*0.06)}" fill="#22d3ee"/>
  <!-- Signal waves -->
  <path d="M {int(size*0.35)} {int(size*0.32)} A {int(size*0.15)} {int(size*0.15)} 0 0 1 {int(size*0.65)} {int(size*0.32)}" fill="none" stroke="#06b6d4" stroke-width="{max(2, int(size*0.02))}" opacity="0.9"/>
  <path d="M {int(size*0.28)} {int(size*0.27)} A {int(size*0.22)} {int(size*0.22)} 0 0 1 {int(size*0.72)} {int(size*0.27)}" fill="none" stroke="#06b6d4" stroke-width="{max(2, int(size*0.02))}" opacity="0.6"/>
  <path d="M {int(size*0.22)} {int(size*0.22)} A {int(size*0.28)} {int(size*0.28)} 0 0 1 {int(size*0.78)} {int(size*0.22)}" fill="none" stroke="#06b6d4" stroke-width="{max(2, int(size*0.02))}" opacity="0.3"/>
  <!-- MLJ text -->
  <text x="{int(size*0.5)}" y="{int(size*0.88)}" font-family="system-ui, -apple-system, sans-serif" font-size="{int(size*0.12)}" font-weight="800" fill="#06b6d4" text-anchor="middle">MLJ NET</text>
</svg>'''

# Generate SVG icons for all sizes
sizes = [72, 96, 128, 144, 152, 192, 384, 512]

for size in sizes:
    svg_content = make_svg(size)
    svg_path = os.path.join(ICON_DIR, f'icon-{size}x{size}.svg')
    with open(svg_path, 'w') as f:
        f.write(svg_content)
    print(f"Generated SVG icon: {size}x{size}")

# Also create a favicon.svg for the root
favicon_svg = make_svg(32)
with open('/home/z/my-project/public/favicon.svg', 'w') as f:
    f.write(favicon_svg)
print("Generated favicon.svg")

print(f"\nAll icons generated in {ICON_DIR}")
print("Note: For production, convert SVGs to PNGs using a tool like sharp or an online converter")
print("The SVGs will work in most modern browsers")