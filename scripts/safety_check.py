#!/usr/bin/env python3
"""
Safety check script for pre-commit hook
"""
import subprocess
import sys


def main():
    """Run safety check on requirements files"""
    try:
        # Run safety check on both requirements files
        result = subprocess.run(
            [
                "safety",
                "check",
                "--file",
                "requirements.txt",
                "--file",
                "requirements-dev.txt",
                "--short-report",
            ],
            capture_output=True,
            text=True,
        )

        print(result.stdout)
        if result.stderr:
            print(result.stderr, file=sys.stderr)

        sys.exit(result.returncode)
    except Exception as e:
        print(f"Error running safety: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
