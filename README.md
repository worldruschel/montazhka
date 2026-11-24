# Montazhka

**Локальный AI-контент-завод для автоматической сборки видео любым ИИ-агентом.**

От текстовой идеи — к готовому `.mp4`:
**сценарий → озвучка и пословные тайминги → анимация на Remotion / 3D-объекты / снятый видеоряд → проверка кадров → финальный рендер**.

Работает на **Windows, macOS и Linux** в любом ИИ-агенте: **Claude Code, Antigravity, Cursor, Codex, Windsurf, Gemini CLI, DeepSeek Harness** и других.

---

## Быстрый старт (развернуть на любом агенте за 1 сообщение)

Откройте ваш любимый ИИ-агент с доступом к терминалу и просто напишите:

```text
Разверни проект https://github.com/worldruschel/montazhka в отдельной папке montazhka, открой AGENTS.md и следуй инструкциям по установке и первому запуску.
```

Дальше агент сделает всё сам:
1. Склонирует репозиторий в папку `montazhka`.
2. Запустит кроссплатформенный установщик `tools/setup.py` (создаст `.venv`, поставит зависимости Python и Remotion, проверит FFmpeg и подготовит `.env`).
3. Сразу предложит **адаптировать Montazhka под вас за ~3 минуты** (тематика, формат, стиль, голос, 3D и звуки) или **начать в универсальном режиме** прямо сейчас (бесплатная озвучка Edge TTS без API-ключей).

> Если вы начали в универсальном режиме, в любой момент просто напишите агенту **«Настрой под меня»** — и запустится мастер настройки.

---

## Что умеет Montazhka

- **Любые форматы:** `16:9` (1920×1080 для YouTube и презентаций) и `9:16` (1080×1920 для Reels, Shorts и TikTok), 30 к/с.
- **Моушн-графика + снятый видеоряд:** чистые анимированные сцены, карточки и инфографика — или монтаж поверх ваших видеоклипов («говорящая голова», B-roll) через компонент `<Footage>` с пословными субтитрами.
- **3D-объекты из коробки (Sand3D):** встроенный поиск и скачивание из каталога на **100 000+ готовых 3D-моделей** (гаджеты, техника, предметы, интерьеры, механизмы; *без людей/персонажей*) с плавной 3D-анимацией прямо в кадре.
- **Гибкая озвучка (TTS) и выравнивание `-16 LUFS`:**
  - **Edge TTS** — бесплатно (0 ₽), работает сразу без регистрации и ключей.
  - **OpenRouter** (`elevenlabs/eleven-v4` и др.) — студийный голос (~$0.05–0.15/мин; нужен VPN, оплата зарубежной картой или криптой).
  - **AI Tunnel** (`aitunnel.ru`) — студийные голоса без VPN с оплатой в рублях.
  - **ElevenLabs / OpenAI** — прямое подключение по вашему ключу.
- **Визуальный контроль до рендера:** агент сам снимает контрольный лист `sheet.jpg`, проверяет кадры глазами на наложения и обрезку текста, и только потом рендерит финальный `.mp4`.
- **Длинные ролики без падений:** видео длиннее 50 секунд автоматически рендерятся чанками с возможностью докачки (`--resume`).

---

## Структура проекта

- `AGENTS.md` — единая инструкция, мастер настройки и конвейер для всех ИИ-агентов (`CLAUDE.md`, `GEMINI.md`, `.cursorrules` и Copilot ссылаются на него).
- `tools/setup.py` — автоустановщик окружения (Windows / macOS / Linux).
- `tools/pipeline.py` — главный CLI-дирижёр (`new`, `voice`, `stills`, `render`, `3d`, `sfx`, `state`).
- `tools/tts.py` — модуль озвучки (`edge`, `openrouter`, `aitunnel`, `elevenlabs`, `openai`) и пословных таймингов.
- `video/` — Remotion-проект (React + TypeScript):
  - `src/brand.ts` — палитра, шрифты и адаптивные отступы для `16:9` и `9:16`.
  - `src/ui/` — готовые компоненты (`Stage`, `Intro`, `Outro`, `Card`, `StepList`, `Captions`, `Footage`, `Scene3D`, `GlbModel`).
  - `src/videos/001/` — эталонный демо-ролик о том, как устроена Montazhka.
- `videos/NNN-slug/` — сценарий (`SCRIPT.md`), дикторский текст (`text.txt`) и итоговый `NNN-slug.mp4`.
- `out/NNN/` — контрольные листы кадров (`sheet.jpg`, `final-sheet.jpg`) и чанки рендера.

---

## Основные команды CLI

> На Windows используйте `.venv\Scripts\python.exe`, на macOS / Linux — `.venv/bin/python`.

```bash
# Автоустановка окружения
python tools/setup.py

# 1. Создать заготовку нового ролика (16:9 или 9:16)
.venv/bin/python tools/pipeline.py new my-topic --format 16:9

# 2. Сгенерировать озвучку (-16 LUFS) и captions.json
.venv/bin/python tools/pipeline.py voice 001

# 3. Найти и скачать 3D-объект из Sand3D (опционально)
.venv/bin/python tools/pipeline.py 3d search "modern laptop" --limit 12
.venv/bin/python tools/pipeline.py 3d download <object_id> --video 001 --name laptop

# 4. Проверить типы и снять контрольные кадры в out/001/sheet.jpg
npm --prefix video run typecheck
.venv/bin/python tools/pipeline.py stills 001 15 90 180 270

# 5. Отрендерить финальный .mp4 и out/001/final-sheet.jpg
.venv/bin/python tools/pipeline.py render 001

# Интерактивный предпросмотр в браузере (Remotion Studio)
npm --prefix video run studio
```

---

## Поддержка и обратная связь

- ❤️ Поддержать автора: [Boosty](https://boosty.to/worldruschel/donate)
- ✉️ Предложения, идеи и замечания: [worldruschel@gmail.com](mailto:worldruschel@gmail.com)
