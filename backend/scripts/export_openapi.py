"""Write the API's OpenAPI schema to a file (or stdout), without starting a server.

The frontend generates its TypeScript client types from this file, so the contract between
the two apps comes from one source and can't drift.

Usage (from backend/):  uv run python -m scripts.export_openapi [OUTPUT_PATH]
"""

import json
import sys
from pathlib import Path

from app.main import app


def main() -> None:
    schema = json.dumps(app.openapi(), indent=2, ensure_ascii=False) + "\n"
    if len(sys.argv) > 1:
        Path(sys.argv[1]).write_text(schema, encoding="utf-8")
    else:
        sys.stdout.write(schema)


if __name__ == "__main__":
    main()
