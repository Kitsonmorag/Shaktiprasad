#!/usr/bin/env python3
"""Turn an ASCII-art text file into an animated neon SVG banner.
Usage: python ascii_to_svg.py art.txt assets/ascii-banner.svg [blue|red|green]"""
import sys, html
src, dst = sys.argv[1], sys.argv[2]
col = {"blue": "#00E5FF", "red": "#FF2D55", "green": "#00FF9C"}[sys.argv[3] if len(sys.argv) > 3 else "blue"]
lines = open(src, encoding="utf-8").read().rstrip("\n").split("\n")
lh, cw = 16, 9.6
w = int(max(len(l) for l in lines) * cw + 80); h = len(lines) * lh + 80
rows = "".join(
    f'<text x="40" y="{50+i*lh}" xml:space="preserve" opacity="0"><animate attributeName="opacity" from="0" to="1" begin="{i*.08:.2f}s" dur=".3s" fill="freeze"/>{html.escape(l)}</text>'
    for i, l in enumerate(lines))
open(dst, "w", encoding="utf-8").write(f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" role="img" aria-label="ASCII art banner">
<defs><filter id="g" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
<rect width="{w}" height="{h}" rx="14" fill="#07090D"/><rect x=".5" y=".5" width="{w-1}" height="{h-1}" rx="13.5" fill="none" stroke="{col}" stroke-opacity=".4"/>
<g font-family="ui-monospace,Menlo,Consolas,monospace" font-size="14" fill="{col}" filter="url(#g)">{rows}</g></svg>
''')
print("wrote", dst)
