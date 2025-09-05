"""Small helper to append timestamped test-update entries to TEST_UPDATE_LOG.md

Usage (PowerShell, from repo root):
.\.venv\Scripts\Activate; python backend\scripts\append_test_log.py "Short title" "One-line summary" --files "file1.py,file2.py" --results "All tests passed"

The script will append a timestamped section to backend/TEST_UPDATE_LOG.md.
"""
import argparse
from datetime import datetime
from pathlib import Path

LOG_PATH = Path(__file__).resolve().parents[1] / "TEST_UPDATE_LOG.md"


def append_entry(title: str, summary: str, files: str, commands: str, results: str, notes: str):
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    files_list = [f"- {f.strip()}" for f in files.split(",")] if files else []
    commands_list = [f"- {c.strip()}" for c in commands.split(",")] if commands else []
    entry = []
    entry.append(f"## {now} — {title}\n")
    entry.append("Summary\n")
    entry.append(f"- {summary}\n\n")
    if files_list:
        entry.append("Files changed\n")
        entry.extend(f + "\n" for f in files_list)
        entry.append("\n")
    if commands_list:
        entry.append("Commands run\n")
        entry.extend(c + "\n" for c in commands_list)
        entry.append("\n")
    entry.append("Test results\n")
    entry.append(f"- {results}\n\n")
    if notes:
        entry.append("Notes\n")
        entry.append(f"- {notes}\n\n")
    entry.append("Next steps\n")
    entry.append("- \n\n---\n\n")

    LOG_PATH.write_text(LOG_PATH.read_text() + "\n" + "".join(entry))
    print(f"Appended entry to {LOG_PATH}")


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('title')
    p.add_argument('summary')
    p.add_argument('--files', default='')
    p.add_argument('--commands', default='')
    p.add_argument('--results', default='')
    p.add_argument('--notes', default='')
    args = p.parse_args()
    append_entry(args.title, args.summary, args.files, args.commands, args.results, args.notes)
