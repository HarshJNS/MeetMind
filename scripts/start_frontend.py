import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "frontend"


def main() -> None:
    env_file = FRONTEND / ".env.local"
    if env_file.exists():
        print(env_file.read_text(encoding="utf-8").strip())
    else:
        print("Using default VITE_API_BASE_URL=http://localhost:8000")

    subprocess.run(
        ["npm", "run", "dev", "--", "--host", "127.0.0.1", "--port", "5173"],
        cwd=FRONTEND,
        check=False,
    )


if __name__ == "__main__":
    main()
