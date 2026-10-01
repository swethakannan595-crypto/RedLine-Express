"""
Builds the student version: ../rag-tutor-starter

Every block between `>>> SOLUTION: hint` and `<<< SOLUTION` is replaced
with a TODO + hint. Usage: python tools/make_starter.py
"""
import pathlib
import re
import shutil

SRC = pathlib.Path(__file__).resolve().parent.parent
OUT = SRC.parent / "rag-tutor-student"

pattern = re.compile(
    r"^([ \t]*)(#|//) >>> SOLUTION: ([^\n]*)\n.*?^[ \t]*(?:#|//) <<< SOLUTION\n",
    re.S | re.M,
)


def blank(m: re.Match) -> str:
    indent, comment, hint = m.groups()
    stub = "raise NotImplementedError" if comment == "#" else 'throw new Error("TODO")'
    return f"{indent}{comment} TODO: {hint}\n{indent}{stub}\n"


if OUT.exists():
    shutil.rmtree(OUT)
shutil.copytree(
    SRC, OUT,
    ignore=shutil.ignore_patterns("node_modules", ".venv", "__pycache__", "dist", ".env", "tools", ".git"),
)

count = 0
for f in OUT.rglob("*"):
    if f.suffix in {".py", ".js", ".jsx"}:
        text = f.read_text()
        new, n = pattern.subn(blank, text)
        if n:
            f.write_text(new)
            count += n
print(f"Starter written to {OUT} ({count} tasks blanked)")
