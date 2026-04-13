import re

files = [
    r"D:\pacifica-colosseum\wild-ui\src\app\page.tsx",
    r"D:\pacifica-colosseum\wild-ui\src\app\arenas\page.tsx",
    r"D:\pacifica-colosseum\wild-ui\src\app\spectate\page.tsx",
    r"D:\pacifica-colosseum\wild-ui\src\app\trade\page.tsx",
]

for filepath in files:
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    # Replace // inside terminal-label JSX text (any className containing terminal-label)
    content = re.sub(
        r'(<(?:div|span)[^>]*className="[^"]*terminal-label[^"]*"[^>]*>\s*)\s*//\s*',
        r"\1",
        content,
    )
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Fixed: {filepath}")
