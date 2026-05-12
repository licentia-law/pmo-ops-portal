from __future__ import annotations

import argparse

from app.core.database import SessionLocal
from app.tools.seed_bundle import import_seed_bundle


def main() -> None:
    parser = argparse.ArgumentParser(description="Import PMO seed CSV bundle into DB.")
    parser.add_argument(
        "--seed-dir",
        default="../../docs/schema/chatGPT",
        help="Seed CSV directory path.",
    )
    parser.add_argument(
        "--truncate",
        action="store_true",
        help="Delete existing table data before import.",
    )
    args = parser.parse_args()

    with SessionLocal() as session:
        inserted = import_seed_bundle(session=session, seed_dir=args.seed_dir, truncate=args.truncate)

    print("IMPORT_OK")
    for filename, count in inserted.items():
        print(f"{filename}: {count}")


if __name__ == "__main__":
    main()
