"""
Модуль озвучки (TTS) и получения пословных таймингов (STT / alignment) для Montazhka.
Поддерживает провайдеров:
  - edge       (бесплатный Microsoft Edge TTS с нативными таймингами слов, без ключей)
  - openrouter (OpenRouter API, напр. elevenlabs/eleven-v4)
  - aitunnel   (AI Tunnel — OpenAI-совместимый API без VPN и с оплатой в рублях)
  - elevenlabs (ElevenLabs TTS + нативные пословные тайминги /with-timestamps)
  - openai     (прямой OpenAI TTS + Whisper)

Громкость итогового аудио выравнивается через FFmpeg под стандарт -16 LUFS.
"""

from __future__ import annotations

import asyncio
import base64
import json
import os
import re
import subprocess
import wave
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional, Tuple

import httpx
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / ".env")


@dataclass
class WordTiming:
    index: int
    word: str
    start: float
    end: float
    start_frame: int
    end_frame: int

    def to_dict(self) -> dict:
        return {
            "index": self.index,
            "word": self.word,
            "start": round(self.start, 3),
            "end": round(self.end, 3),
            "startFrame": self.start_frame,
            "endFrame": self.end_frame,
        }


def run_cmd(cmd: list[str], capture: bool = True) -> subprocess.CompletedProcess:
    proc = subprocess.run(
        cmd,
        capture_output=capture,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    if proc.returncode != 0:
        err = (proc.stderr or proc.stdout or "").strip()
        raise RuntimeError(f"Command failed ({proc.returncode}): {' '.join(cmd)}\n{err}")
    return proc


def get_audio_duration(audio_path: Path) -> float:
    proc = run_cmd([
        "ffprobe",
        "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        str(audio_path),
    ])
    return float(proc.stdout.strip())


def normalize_lufs(raw_audio: Path, out_mp3: Path, target_lufs: float = -16.0) -> None:
    """
    Выравнивает громкость аудио под стандарт -16 LUFS (2-pass loudnorm с fallback на 1-pass).
    """
    out_mp3.parent.mkdir(parents=True, exist_ok=True)
    # Pass 1: анализ громкости
    probe = subprocess.run(
        [
            "ffmpeg", "-y", "-i", str(raw_audio),
            "-af", f"loudnorm=I={target_lufs}:TP=-1.5:LRA=11:print_format=json",
            "-f", "null", "-",
        ],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    match = re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", probe.stderr, re.S)
    if match:
        try:
            stats = json.loads(match.group(0))
            af = (
                f"loudnorm=I={target_lufs}:TP=-1.5:LRA=11:"
                f"measured_I={stats['input_i']}:"
                f"measured_TP={stats['input_tp']}:"
                f"measured_LRA={stats['input_lra']}:"
                f"measured_thresh={stats['input_thresh']}:"
                f"offset={stats['target_offset']}:linear=true"
            )
            run_cmd([
                "ffmpeg", "-y", "-i", str(raw_audio),
                "-af", af,
                "-ar", "44100", "-ac", "1", "-b:a", "192k",
                str(out_mp3),
            ])
            return
        except Exception:
            pass

    # Fallback: 1-pass loudnorm
    run_cmd([
        "ffmpeg", "-y", "-i", str(raw_audio),
        "-af", f"loudnorm=I={target_lufs}:TP=-1.5:LRA=11",
        "-ar", "44100", "-ac", "1", "-b:a", "192k",
        str(out_mp3),
    ])


# ---------------------------------------------------------------------------
# Провайдеры TTS
# ---------------------------------------------------------------------------

def _synthesize_openrouter(
    text: str,
    raw_dir: Path,
    model: Optional[str] = None,
    voice: Optional[str] = None,
) -> Tuple[Path, Optional[List[Tuple[str, float, float]]]]:
    api_key = os.getenv("OPENROUTER_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("Не задан OPENROUTER_API_KEY в файле .env")

    model = model or os.getenv("OPENROUTER_TTS_MODEL", "elevenlabs/eleven-v4")
    voice = voice or os.getenv("OPENROUTER_TTS_VOICE", "ogi2DyUAKJb7CEdqqvlU")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/worldruschel/montazhka",
        "X-Title": "Montazhka",
    }

    # Специализированные Speech/TTS-модели на OpenRouter (ElevenLabs, Gemini TTS, Fish Audio и др.) -> /audio/speech
    m_low = model.lower()
    is_speech_endpoint = (
        "tts" in m_low
        or m_low.startswith("elevenlabs/")
        or any(
            k in m_low
            for k in ("speechify/", "fish-audio/", "deepgram/", "heygen/", "kokoro", "orpheus", "mai-voice")
        )
    )
    if is_speech_endpoint:
        raw_mp3 = raw_dir / "voice_raw.mp3"
        req_json: dict = {
            "model": model,
            "voice": voice,
            "input": text,
            "response_format": "mp3",
        }
        with httpx.Client(timeout=180.0) as client:
            resp = client.post(
                "https://openrouter.ai/api/v1/audio/speech",
                headers=headers,
                json=req_json,
            )
            if resp.status_code == 200 and len(resp.content) > 512:
                raw_mp3.write_bytes(resp.content)
                return raw_mp3, None
            raise RuntimeError(
                f"OpenRouter Speech API error {resp.status_code} ({model}): {resp.text[:600]}"
            )

    # Основной путь OpenRouter: /chat/completions с modalities=["text", "audio"] + SSE pcm16
    payload = {
        "model": model,
        "modalities": ["text", "audio"],
        "audio": {"voice": voice, "format": "pcm16"},
        "stream": True,
        "messages": [
            {
                "role": "system",
                "content": (
                    "Ты профессиональный диктор озвучки. "
                    "Прочитай текст пользователя вслух СТРОГО дословно, на том же языке, "
                    "без каких-либо вступлений, комментариев, правок или добавлений. "
                    "Темп естественный, чёткий и уверенный."
                ),
            },
            {"role": "user", "content": text},
        ],
    }

    pcm_chunks: list[bytes] = []
    with httpx.Client(timeout=240.0) as client:
        with client.stream(
            "POST",
            "https://openrouter.ai/api/v1/chat/completions",
            headers=headers,
            json=payload,
        ) as resp:
            if resp.status_code != 200:
                body = resp.read().decode("utf-8", errors="replace")
                raise RuntimeError(f"OpenRouter TTS error {resp.status_code}: {body[:600]}")

            for line in resp.iter_lines():
                if not line or not line.startswith("data:"):
                    continue
                data_str = line[len("data:"):].strip()
                if data_str == "[DONE]":
                    break
                try:
                    event = json.loads(data_str)
                except json.JSONDecodeError:
                    continue
                choices = event.get("choices") or []
                if not choices:
                    continue
                delta = choices[0].get("delta") or {}
                audio = delta.get("audio") or {}
                b64_data = audio.get("data")
                if b64_data:
                    pcm_chunks.append(base64.b64decode(b64_data))

    if not pcm_chunks:
        raise RuntimeError(
            f"OpenRouter ({model}) не вернул аудиоданные. Проверьте модель и баланс ключа."
        )

    raw_wav = raw_dir / "voice_raw.wav"
    pcm_bytes = b"".join(pcm_chunks)
    with wave.open(str(raw_wav), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)  # 16-bit PCM
        wf.setframerate(24000)
        wf.writeframes(pcm_bytes)

    return raw_wav, None


def _synthesize_edge(
    text: str,
    raw_dir: Path,
    voice: Optional[str] = None,
) -> Tuple[Path, Optional[List[Tuple[str, float, float]]]]:
    import edge_tts

    voice = voice or os.getenv("EDGE_TTS_VOICE", "ru-RU-DmitryNeural")
    rate = os.getenv("EDGE_TTS_RATE", "+0%")
    raw_mp3 = raw_dir / "voice_raw.mp3"

    async def _run() -> List[Tuple[str, float, float]]:
        communicate = edge_tts.Communicate(text, voice=voice, rate=rate)
        boundaries: List[Tuple[str, float, float]] = []
        with open(raw_mp3, "wb") as f:
            async for chunk in communicate.stream():
                ctype = chunk.get("type")
                if ctype == "audio":
                    f.write(chunk["data"])
                elif ctype == "WordBoundary":
                    start_s = chunk["offset"] / 10_000_000.0
                    dur_s = chunk["duration"] / 10_000_000.0
                    word = chunk["text"].strip()
                    if word:
                        boundaries.append((word, start_s, start_s + dur_s))
        return boundaries

    words = asyncio.run(_run())
    return raw_mp3, (words if words else None)


def _synthesize_openai(
    text: str,
    raw_dir: Path,
    model: Optional[str] = None,
    voice: Optional[str] = None,
) -> Tuple[Path, Optional[List[Tuple[str, float, float]]]]:
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("Не задан OPENAI_API_KEY в файле .env")

    model = model or os.getenv("OPENAI_TTS_MODEL", "gpt-4o-mini-tts")
    voice = voice or os.getenv("OPENAI_TTS_VOICE", "alloy")
    raw_mp3 = raw_dir / "voice_raw.mp3"

    with httpx.Client(timeout=180.0) as client:
        resp = client.post(
            "https://api.openai.com/v1/audio/speech",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "voice": voice,
                "input": text,
                "response_format": "mp3",
            },
        )
        if resp.status_code != 200:
            raise RuntimeError(f"OpenAI TTS error {resp.status_code}: {resp.text[:500]}")
        raw_mp3.write_bytes(resp.content)

    return raw_mp3, None


def _synthesize_aitunnel(
    text: str,
    raw_dir: Path,
    model: Optional[str] = None,
    voice: Optional[str] = None,
) -> Tuple[Path, Optional[List[Tuple[str, float, float]]]]:
    api_key = os.getenv("AITUNNEL_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("Не задан AITUNNEL_API_KEY в файле .env")

    base_url = os.getenv("AITUNNEL_BASE_URL", "https://api.aitunnel.ru/v1").strip().rstrip("/")
    model = model or os.getenv("AITUNNEL_TTS_MODEL", "gpt-4o-mini-tts")
    voice = voice or os.getenv("AITUNNEL_TTS_VOICE", "alloy")
    raw_mp3 = raw_dir / "voice_raw.mp3"

    with httpx.Client(timeout=180.0) as client:
        resp = client.post(
            f"{base_url}/audio/speech",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "voice": voice,
                "input": text,
                "response_format": "mp3",
            },
        )
        if resp.status_code != 200 or len(resp.content) <= 512:
            raise RuntimeError(f"AI Tunnel TTS error {resp.status_code}: {resp.text[:500]}")
        raw_mp3.write_bytes(resp.content)

    return raw_mp3, None


def _chars_to_word_timings(
    chars: List[str],
    starts: List[float],
    ends: List[float],
) -> Optional[List[Tuple[str, float, float]]]:
    """
    Собирает пословные тайминги из посимвольного выравнивания ElevenLabs.
    """
    if not chars or len(chars) != len(starts) or len(chars) != len(ends):
        return None

    words: List[Tuple[str, float, float]] = []
    buf: List[str] = []
    w_start: Optional[float] = None
    w_end: float = 0.0

    for ch, st, en in zip(chars, starts, ends):
        if ch.isspace():
            if buf and w_start is not None:
                token = "".join(buf).strip()
                if token:
                    words.append((token, w_start, max(w_end, w_start + 0.04)))
            buf = []
            w_start = None
        else:
            if w_start is None:
                w_start = float(st)
            buf.append(ch)
            w_end = float(en)

    if buf and w_start is not None:
        token = "".join(buf).strip()
        if token:
            words.append((token, w_start, max(w_end, w_start + 0.04)))

    return words if words else None


def _synthesize_elevenlabs(
    text: str,
    raw_dir: Path,
    model: Optional[str] = None,
    voice: Optional[str] = None,
) -> Tuple[Path, Optional[List[Tuple[str, float, float]]]]:
    api_key = os.getenv("ELEVENLABS_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("Не задан ELEVENLABS_API_KEY в файле .env")

    model = model or os.getenv("ELEVENLABS_TTS_MODEL", "eleven_multilingual_v2")
    voice_id = (voice or os.getenv("ELEVENLABS_VOICE_ID", "")).strip()
    if not voice_id:
        raise RuntimeError("Не задан ELEVENLABS_VOICE_ID в файле .env (или --voice)")

    raw_mp3 = raw_dir / "voice_raw.mp3"
    headers = {
        "xi-api-key": api_key,
        "Content-Type": "application/json",
    }
    payload = {
        "text": text,
        "model_id": model,
        "voice_settings": {
            "stability": float(os.getenv("ELEVENLABS_STABILITY", "0.45")),
            "similarity_boost": float(os.getenv("ELEVENLABS_SIMILARITY", "0.78")),
            "style": float(os.getenv("ELEVENLABS_STYLE", "0.2")),
            "use_speaker_boost": True,
        },
    }

    with httpx.Client(timeout=180.0) as client:
        # Основной путь: /with-timestamps для точной синхронизации слов
        resp = client.post(
            f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/with-timestamps",
            params={"output_format": "mp3_44100_128"},
            headers=headers,
            json=payload,
        )
        if resp.status_code == 200:
            data = resp.json()
            audio_b64 = data.get("audio_base64")
            if audio_b64:
                raw_mp3.write_bytes(base64.b64decode(audio_b64))
                align = data.get("alignment") or data.get("normalized_alignment") or {}
                words = _chars_to_word_timings(
                    align.get("characters") or [],
                    align.get("character_start_times_seconds") or [],
                    align.get("character_end_times_seconds") or [],
                )
                return raw_mp3, words

        # Fallback: обычный эндпоинт без таймингов
        resp2 = client.post(
            f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
            params={"output_format": "mp3_44100_128"},
            headers={**headers, "Accept": "audio/mpeg"},
            json=payload,
        )
        if resp2.status_code != 200:
            raise RuntimeError(
                f"ElevenLabs TTS error {resp2.status_code}: {resp2.text[:600]}"
            )
        raw_mp3.write_bytes(resp2.content)
        return raw_mp3, None


# ---------------------------------------------------------------------------
# Получение пословных таймингов (STT / выравнивание)
# ---------------------------------------------------------------------------

def _try_faster_whisper(audio_path: Path) -> Optional[List[Tuple[str, float, float]]]:
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        return None

    model_name = os.getenv("WHISPER_MODEL", "small")
    lang = os.getenv("WHISPER_LANGUAGE", "ru") or None
    model = WhisperModel(model_name, device="cpu", compute_type="int8")
    segments, _ = model.transcribe(
        str(audio_path),
        language=lang,
        word_timestamps=True,
        vad_filter=True,
    )
    words: List[Tuple[str, float, float]] = []
    for seg in segments:
        if not seg.words:
            continue
        for w in seg.words:
            token = (w.word or "").strip()
            if token:
                words.append((token, float(w.start), float(w.end)))
    return words if words else None


def _try_openai_whisper(audio_path: Path) -> Optional[List[Tuple[str, float, float]]]:
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        return None
    with httpx.Client(timeout=180.0) as client:
        with open(audio_path, "rb") as f:
            resp = client.post(
                "https://api.openai.com/v1/audio/transcriptions",
                headers={"Authorization": f"Bearer {api_key}"},
                data={
                    "model": "whisper-1",
                    "response_format": "verbose_json",
                    "timestamp_granularities[]": "word",
                },
                files={"file": (audio_path.name, f, "audio/mpeg")},
            )
    if resp.status_code != 200:
        return None
    data = resp.json()
    raw_words = data.get("words") or []
    result: List[Tuple[str, float, float]] = []
    for w in raw_words:
        token = str(w.get("word", "")).strip()
        if token:
            result.append((token, float(w["start"]), float(w["end"])))
    return result if result else None


def _detect_speech_intervals(audio_path: Path, total_duration: float) -> List[Tuple[float, float]]:
    """
    Находит реальные речевые интервалы (без пауз тишины) через FFmpeg silencedetect.
    """
    proc = subprocess.run(
        [
            "ffmpeg", "-i", str(audio_path),
            "-af", "silencedetect=noise=-34dB:d=0.18",
            "-f", "null", "-",
        ],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    silences: List[Tuple[float, float]] = []
    cur_start: Optional[float] = None
    for line in proc.stderr.splitlines():
        m_start = re.search(r"silence_start:\s*([0-9.]+)", line)
        m_end = re.search(r"silence_end:\s*([0-9.]+)", line)
        if m_start:
            cur_start = float(m_start.group(1))
        elif m_end:
            end_t = float(m_end.group(1))
            s_t = cur_start if cur_start is not None else 0.0
            silences.append((s_t, end_t))
            cur_start = None
    if cur_start is not None:
        silences.append((cur_start, total_duration))

    # Инвертируем паузы в речевые интервалы
    speech: List[Tuple[float, float]] = []
    cursor = 0.0
    for s_start, s_end in silences:
        if s_start - cursor > 0.05:
            speech.append((cursor, s_start))
        cursor = max(cursor, s_end)
    if total_duration - cursor > 0.05:
        speech.append((cursor, total_duration))

    return speech if speech else [(0.0, total_duration)]


def _word_weight(word: str) -> float:
    clean = re.sub(r"[^a-zA-Zа-яА-ЯёЁ0-9]", "", word)
    vowels = len(re.findall(r"[аеёиоуыэюяaeiouyАЕЁИОУЫЭЮЯAEIOUY]", clean))
    base = max(1.0, len(clean) * 0.55 + vowels * 0.9)
    if re.search(r"[.!?…]$", word):
        base += 2.2
    elif re.search(r"[,;:—–-]$", word):
        base += 1.0
    return base


def _align_with_speech_intervals(
    text: str,
    audio_path: Path,
    total_duration: float,
) -> List[Tuple[str, float, float]]:
    """
    Выравнивает слова текста по реальным речевым отрезкам аудио (с учётом пауз и слоговой длины).
    """
    tokens = [t for t in re.split(r"\s+", text.strip()) if t]
    if not tokens:
        return []

    speech = _detect_speech_intervals(audio_path, total_duration)
    total_speech = sum(e - s for s, e in speech)
    if total_speech <= 0.05:
        speech = [(0.0, total_duration)]
        total_speech = total_duration

    weights = [_word_weight(t) for t in tokens]
    total_weight = sum(weights)

    # Маппинг виртуального времени речи [0..total_speech] в реальное время аудио
    def map_time(speech_t: float) -> float:
        rem = max(0.0, min(total_speech, speech_t))
        for seg_s, seg_e in speech:
            seg_len = seg_e - seg_s
            if rem <= seg_len + 1e-6:
                return seg_s + rem
            rem -= seg_len
        return speech[-1][1]

    result: List[Tuple[str, float, float]] = []
    acc = 0.0
    for token, w in zip(tokens, weights):
        st = map_time((acc / total_weight) * total_speech)
        acc += w
        en = map_time((acc / total_weight) * total_speech)
        if en <= st:
            en = min(total_duration, st + 0.06)
        result.append((token, st, en))
    return result


# ---------------------------------------------------------------------------
# Главная точка входа
# ---------------------------------------------------------------------------

def generate_voice(
    text: str,
    out_mp3: Path,
    fps: int = 30,
    provider: Optional[str] = None,
    voice: Optional[str] = None,
    model: Optional[str] = None,
) -> dict:
    """
    Генерирует озвучку, выравнивает громкость под -16 LUFS и возвращает данные для captions.json.
    """
    provider = (provider or os.getenv("TTS_PROVIDER", "edge")).strip().lower()
    raw_dir = out_mp3.parent
    raw_dir.mkdir(parents=True, exist_ok=True)

    native_words: Optional[List[Tuple[str, float, float]]] = None

    if provider == "openrouter":
        raw_audio, native_words = _synthesize_openrouter(text, raw_dir, model=model, voice=voice)
    elif provider == "aitunnel":
        raw_audio, native_words = _synthesize_aitunnel(text, raw_dir, model=model, voice=voice)
    elif provider == "elevenlabs":
        raw_audio, native_words = _synthesize_elevenlabs(text, raw_dir, model=model, voice=voice)
    elif provider == "edge":
        raw_audio, native_words = _synthesize_edge(text, raw_dir, voice=voice)
    elif provider == "openai":
        raw_audio, native_words = _synthesize_openai(text, raw_dir, model=model, voice=voice)
    else:
        raise ValueError(
            f"Неизвестный TTS-провайдер: {provider} (ожидается edge | openrouter | aitunnel | elevenlabs | openai)"
        )

    # Нормализация громкости под -16 LUFS
    normalize_lufs(raw_audio, out_mp3, target_lufs=-16.0)
    try:
        raw_audio.unlink(missing_ok=True)
    except OSError:
        pass

    duration = get_audio_duration(out_mp3)
    duration_frames = max(1, int(round(duration * fps)))

    # Получение таймингов слов
    stt_pref = os.getenv("STT_PROVIDER", "auto").strip().lower()
    raw_timings = native_words
    align_method = "native"

    if not raw_timings:
        if stt_pref in ("auto", "faster-whisper"):
            raw_timings = _try_faster_whisper(out_mp3)
            if raw_timings:
                align_method = "faster-whisper"
        if not raw_timings and stt_pref in ("auto", "openai"):
            raw_timings = _try_openai_whisper(out_mp3)
            if raw_timings:
                align_method = "openai-whisper"
        if not raw_timings:
            raw_timings = _align_with_speech_intervals(text, out_mp3, duration)
            align_method = "speech-intervals"

    words: List[WordTiming] = []
    for idx, (token, start_s, end_s) in enumerate(raw_timings):
        sf = max(0, int(round(start_s * fps)))
        ef = max(sf + 1, int(round(end_s * fps)))
        words.append(
            WordTiming(
                index=idx,
                word=token,
                start=start_s,
                end=end_s,
                start_frame=sf,
                end_frame=ef,
            )
        )

    return {
        "provider": provider,
        "alignment": align_method,
        "fps": fps,
        "duration": round(duration, 3),
        "durationInFrames": duration_frames,
        "words": [w.to_dict() for w in words],
    }
