"""
Кроссплатформенный установщик окружения для Montazhka (Windows / macOS / Linux).

Запуск:
  python tools/setup.py
  python3 tools/setup.py

Что делает:
  1. Проверяет Python >= 3.10, Node.js >= 18, npm, FFmpeg / ffprobe.
  2. Создаёт виртуальное окружение .venv и устанавливает зависимости из requirements.txt.
  3. Устанавливает Node-пакеты в папке video/ (npm install).
  4. Копирует .env.example -> .env (если .env ещё нет).
  5. Генерирует базовые SFX-файлы в video/public/sfx/ (если их нет).
  6. Инициализирует .montazhka-state.json для мастера первого запуска.
"""

from __future__ import annotations

import json
import os
import platform
import shutil
import subprocess
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
VENV_DIR = ROOT_DIR / ".venv"
VIDEO_DIR = ROOT_DIR / "video"
STATE_FILE = ROOT_DIR / ".montazhka-state.json"

IS_WIN = platform.system() == "Windows"
IS_MAC = platform.system() == "Darwin"


def venv_python() -> Path:
    if IS_WIN:
        return VENV_DIR / "Scripts" / "python.exe"
    return VENV_DIR / "bin" / "python"


def npm_exe() -> str:
    return shutil.which("npm.cmd") or shutil.which("npm") or "npm"


def run(cmd: list[str], cwd: Path | None = None) -> None:
    print(f"→ {' '.join(cmd)}")
    proc = subprocess.run(cmd, cwd=str(cwd) if cwd else None)
    if proc.returncode != 0:
        raise SystemExit(f"Ошибка: команда завершилась с кодом {proc.returncode}")


def install_hint(tool: str) -> str:
    if IS_WIN:
        hints = {
            "node": "winget install OpenJS.NodeJS.LTS",
            "ffmpeg": "winget install Gyan.FFmpeg",
        }
    elif IS_MAC:
        hints = {
            "node": "brew install node",
            "ffmpeg": "brew install ffmpeg",
        }
    else:
        hints = {
            "node": "sudo apt update && sudo apt install -y nodejs npm",
            "ffmpeg": "sudo apt update && sudo apt install -y ffmpeg",
        }
    return hints.get(tool, f"Установите {tool}")


def check_prereqs() -> list[str]:
    missing: list[str] = []
    if sys.version_info < (3, 10):
        missing.append(f"Python >= 3.10 (сейчас {sys.version.split()[0]})")

    if not shutil.which("node"):
        missing.append(f"Node.js >= 18 ({install_hint('node')})")
    if not (shutil.which("npm") or shutil.which("npm.cmd")):
        missing.append(f"npm ({install_hint('node')})")
    if not shutil.which("ffmpeg") or not shutil.which("ffprobe"):
        missing.append(f"FFmpeg + ffprobe ({install_hint('ffmpeg')})")

    return missing


def ensure_state() -> dict:
    if STATE_FILE.exists():
        try:
            return json.loads(STATE_FILE.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            pass
    state = {
        "mode": "new",
        "first_video_done": False,
        "boosty_shown": False,
    }
    STATE_FILE.write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return state


def main() -> None:
    print("=== Montazhka Setup ===\n")
    missing = check_prereqs()
    if missing:
        print("Не найдены обязательные системные инструменты:")
        for item in missing:
            print(f"  - {item}")
        print("\nУстановите недостающие инструменты и повторно запустите setup.py.")
        raise SystemExit(1)

    py = venv_python()
    if not py.exists():
        print("1. Создаём виртуальное окружение .venv...")
        run([sys.executable, "-m", "venv", str(VENV_DIR)])
    else:
        print("1. Виртуальное окружение .venv уже существует.")

    print("2. Устанавливаем Python-зависимости...")
    run([str(py), "-m", "pip", "install", "--upgrade", "pip"])
    run([str(py), "-m", "pip", "install", "-r", str(ROOT_DIR / "requirements.txt")])

    if not (VIDEO_DIR / "node_modules").exists():
        print("3. Устанавливаем Node-зависимости Remotion (video/)...")
        run([npm_exe(), "install"], cwd=VIDEO_DIR)
    else:
        print("3. Node-зависимости в video/node_modules уже установлены.")

    env_path = ROOT_DIR / ".env"
    env_example = ROOT_DIR / ".env.example"
    if not env_path.exists() and env_example.exists():
        shutil.copyfile(env_example, env_path)
        print("4. Создан файл .env из .env.example (по умолчанию: бесплатный Edge TTS).")
    else:
        print("4. Файл .env уже существует.")

    sfx_dir = VIDEO_DIR / "public" / "sfx"
    if not (sfx_dir / "pop.wav").exists():
        print("5. Генерируем базовые звуковые акценты (SFX)...")
        run([str(py), str(ROOT_DIR / "tools" / "pipeline.py"), "sfx"])
    else:
        print("5. Звуковые акценты (SFX) уже готовы.")

    state = ensure_state()
    print(f"6. Состояние онбординга (.montazhka-state.json): mode={state.get('mode')}")

    rel_py = ".venv\\Scripts\\python.exe" if IS_WIN else ".venv/bin/python"
    print("\nMontazhka готова к работе!")
    print(f"Python в проекте: {rel_py}")
    if state.get("mode") == "new":
        print("NEXT_STEP: Задай пользователю первый вопрос онбординга из AGENTS.md.")


if __name__ == "__main__":
    main()
