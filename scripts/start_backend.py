import socket
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FRONTEND_ENV = ROOT / "frontend" / ".env.local"


def is_free(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.2)
        return sock.connect_ex(("127.0.0.1", port)) != 0


def find_port(start: int = 8000, attempts: int = 50) -> int:
    for port in range(start, start + attempts):
        if is_free(port):
            return port
    raise RuntimeError(f"No free backend port found from {start} to {start + attempts - 1}")


def main() -> None:
    port = find_port()
    api_url = f"http://localhost:{port}"
    FRONTEND_ENV.write_text(f"VITE_API_BASE_URL={api_url}\n", encoding="utf-8")

    print(f"Starting MeetMind backend on {api_url}")
    print(f"Wrote frontend env: {FRONTEND_ENV}")

    subprocess.run(
        [
            str(ROOT / ".venv" / "bin" / "uvicorn"),
            "backend.main:app",
            "--host",
            "127.0.0.1",
            "--port",
            str(port),
            "--reload",
        ],
        cwd=ROOT,
        check=False,
    )


if __name__ == "__main__":
    main()
