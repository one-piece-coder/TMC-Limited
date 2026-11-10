#!/usr/bin/env python3
"""Bundle index.html + styles.css + app.js into one self-contained page
(the format used to host the planner as a shareable claude.ai artifact).

Usage: python3 build-artifact.py OUTPUT.html
"""
import pathlib
import re
import sys

here = pathlib.Path(__file__).parent
html = (here / "index.html").read_text()
css = (here / "styles.css").read_text()
js = (here / "app.js").read_text()

title = re.search(r"<title>.*?</title>", html).group(0)
fonts = "\n".join(re.findall(r'<link rel="(?:preconnect|stylesheet)" href="https://fonts[^>]*>', html))
body = re.search(r"<body>(.*)</body>", html, re.S).group(1)
body = body.replace('<script src="app.js"></script>', f"<script>\n{js}\n</script>")

out = f"""{title}
<meta name="claude:viewport-fit-sides" content="cover">
{fonts}
<style>
{css}
</style>
{body.strip()}
"""
pathlib.Path(sys.argv[1]).write_text(out)
print(f"wrote {sys.argv[1]} ({len(out):,} bytes)")
