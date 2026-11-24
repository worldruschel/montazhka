---
name: create-video
description: Создаёт и рендерит видеоролик в локальном AI-контент-заводе Montazhka (сценарий -> озвучка -> Remotion-анимация / 3D / снятый видеоряд -> проверка кадров -> финальный MP4). Используй этот скилл всегда, когда пользователь просит сделать, собрать или отрендерить ролик.
---

# Создание видео в Montazhka

Следуй правилам из `AGENTS.md` и персональному профилю `MONTAZHKA_PROFILE.md` (если он создан). Не пропускай согласование сценария и визуальную проверку кадров.

> `<PY>` = `.venv\Scripts\python.exe` (Windows) или `.venv/bin/python` (macOS / Linux).

## Этап 1. Сценарий и текст (ДО озвучки)
1. Определи формат (`16:9` или `9:16` по профилю или запросу).
2. Создай папку ролика:
   ```bash
   <PY> tools/pipeline.py new <slug> --format <16:9|9:16>
   ```
3. Заполни `videos/NNN-slug/SCRIPT.md` и `videos/NNN-slug/text.txt` (и `voice.txt`, если нужны ударения).
4. Покажи сценарий и текст пользователю и **дождись явного «ок»** перед запуском озвучки.

## Этап 2. Озвучка и сборка сцен (`Video.tsx`)
1. Сгенерируй озвучку и `captions.json` (провайдер и голос берутся из `.env`):
   ```bash
   <PY> tools/pipeline.py voice NNN
   ```
2. Изучи таблицу «№ — время — кадр — слово».
3. Напиши `video/src/videos/NNN/Video.tsx`:
   - Используй `Stage`, `Intro`, `Outro`, `AlertScreen`, `Card`, `StepList`, `Captions`, `Footage`, `Scene3D`, `GlbModel`, `cues` из `../../ui`.
   - Привязывай моменты появления сцен к словам через `c.at(...)` / `c.find(...)`.
   - Анимации — только через `useCurrentFrame()` и `prog()` / `lerp()`. Никаких `useState` и CSS-переходов.
   - Для снятого видеоряда (Reels/Shorts/B-roll) используй `<Footage src={staticFile('NNN/clip.mp4')} ... />`.
   - Для 3D-объектов (предметы, техника, механизмы — без людей/персонажей) используй каталог Sand3D (`pipeline.py 3d search` → проверь `out/3d_search.jpg` → `pipeline.py 3d download`).
   - При желании добавь звуковые акценты из `staticFile('sfx/pop.wav')`, `chime.wav`, `whoosh.wav` (`volume={0.25}`).

## Этап 3. Проверка типов и контрольных кадров
1. Проверь TypeScript:
   ```bash
   npm --prefix video run typecheck
   ```
2. Сними 6–9 контрольных кадров:
   ```bash
   <PY> tools/pipeline.py stills NNN <f1> <f2> <f3> ...
   ```
3. Визуально проверь `out/NNN/sheet.jpg` на отсутствие обрезанного текста, наложений субтитров и пустых кадров. При дефектах — исправь и пересними.

## Этап 4. Финальный рендер
1. Запусти рендер:
   ```bash
   <PY> tools/pipeline.py render NNN
   ```
2. Визуально проверь `out/NNN/final-sheet.jpg`.
3. Отдай пользователю ссылки на `videos/NNN-slug/NNN-slug.mp4` и `out/NNN/final-sheet.jpg`.
4. Если в выводе появился маркер `[MONTAZHKA_BOOSTY_REMINDER]`, добавь одноразовое предложение поддержать автора на Boosty (`https://boosty.to/worldruschel/donate`) и выполни `<PY> tools/pipeline.py state --boosty-shown`.
