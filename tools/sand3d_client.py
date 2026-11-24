"""Thin client for the public API of the Sand3D Explorer space by Sandflow.

Network calls use only the standard library. Pillow is used for the contact sheet.
"""
from __future__ import annotations

import concurrent.futures as cf
import hashlib
import io
import json
import logging
import os
import re
import struct
import time
import urllib.error
import urllib.parse
import urllib.request

__version__ = "0.1.0-vf"

BASE = os.environ.get("SAND3D_BASE", "https://sandflow-sand3d-explorer.hf.space").rstrip("/")
UA = f"sand3d-mcp/{__version__}"
WAKE_S = int(os.environ.get("SAND3D_WAKE_SECONDS", "240"))  # how long to wait while a sleeping space loads the catalog
MAX_LIMIT = 200

log = logging.getLogger("sand3d_mcp")


class ApiError(RuntimeError):
    """Readable error that is shown to the model as is."""


class NotFound(ApiError):
    pass


def fetch(path: str, params: dict | None = None, *, base: str = BASE, timeout: int = 60) -> bytes:
    """GET with retries. 502/503/504 mean the space is still loading, so wait up to WAKE_S seconds.
    Short connection drops come in bursts of a few seconds, those are retried for about 40 seconds."""
    url = base + path
    if params:
        clean = {k: (str(v).lower() if isinstance(v, bool) else v) for k, v in params.items() if v not in (None, "", False)}
        if clean:
            url += "?" + urllib.parse.urlencode(clean)
    start, attempt, last = time.time(), 0, ""
    while True:
        attempt += 1
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            body = e.read()[:300].decode("utf-8", "replace")
            if e.code == 404:
                raise NotFound(f"not found (404) at {path}") from None
            last = f"HTTP {e.code} {body}"
            waking = e.code in (502, 503, 504)
        except (urllib.error.URLError, TimeoutError, ConnectionError, OSError) as e:
            last, waking = f"{type(e).__name__} {e}", False
        waited = time.time() - start
        if waking and waited < WAKE_S:
            if attempt == 1:
                log.warning("the Sand3D space is waking up, waiting for the catalog to load (up to %s s)", WAKE_S)
            time.sleep(10)
            continue
        if not waking and attempt < 7:
            time.sleep(2 * attempt)
            continue
        raise ApiError(f"could not reach {url} ({last}). The Sand3D space may be down or the network is unstable, try again later")


def api(path: str, params: dict | None = None) -> dict:
    raw = fetch(path, params)
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        raise ApiError(f"expected JSON but got {raw[:120]!r}. The space may be stopped, check {BASE}") from None


def q(oid: str) -> str:
    return urllib.parse.quote(oid.strip(), safe="")


# ---------------------------------------------------------------- catalog

_facets: dict | None = None


def facets() -> dict:
    global _facets
    if _facets is None:
        _facets = api("/api/facets")
    return _facets


def resolve_family(dataset: str, family: str) -> str:
    """Family by key or by label, case insensitive."""
    ds = next((d for d in facets()["datasets"] if d["key"] == dataset), None)
    if ds is None:
        raise ApiError(f"no dataset '{dataset}'. Available: {', '.join(d['key'] for d in facets()['datasets'])}")
    want = family.strip().lower()
    for key, label, _n in ds["families"]:
        if want in (key.lower(), label.lower()):
            return key
    close = [f"{label} ({key})" for key, label, _n in ds["families"] if want in key.lower() or want in label.lower()]
    raise ApiError(f"dataset '{dataset}' has no family '{family}'."
                   + (f" Close matches: {', '.join(close[:8])}" if close else f" Call list_datasets with dataset='{dataset}' to see families"))


def search(query: str, *, words: bool, dataset: str, family: str, joints: bool, include_no_glb: bool,
           parts: bool, offset: int, limit: int) -> dict:
    if family and not dataset:
        raise ApiError("family filter needs dataset as well")
    if dataset and dataset not in {d["key"] for d in facets()["datasets"]}:
        raise ApiError(f"no dataset '{dataset}'. Available: {', '.join(d['key'] for d in facets()['datasets'])}")
    fam = resolve_family(dataset, family) if family else ""
    d = api("/api/search", {"q": query, "mode": "words" if words else "meaning", "dataset": dataset, "family": fam,
                            "articulated": joints, "glb": not include_no_glb, "parts": parts,
                            "offset": offset, "limit": limit})
    d["family_key"] = fam
    return d


def similar(oid: str, limit: int, same_dataset: bool) -> dict:
    try:
        return api(f"/api/similar/{q(oid)}", {"limit": limit, "same_dataset": same_dataset})
    except NotFound:
        raise NotFound(f"no object with id '{oid}'. Ids look like 'objaverse-d1147d...' and come from search_objects") from None


def get(oid: str) -> dict:
    try:
        return api(f"/api/object/{q(oid)}")
    except NotFound:
        raise NotFound(f"no object with id '{oid}'. Ids look like 'objaverse-d1147d...' and come from search_objects") from None


def render_png(oid: str) -> bytes:
    return fetch(f"/r/{q(oid)}.png")


def page_url(oid: str) -> str:
    return f"{BASE}/o/{oid}"


def line(i: int, c: dict) -> str:
    bits = [f"parts {c['parts']}" if c.get("parts") else "", f"joints {c['joints']}" if c.get("joints") else "",
            f"program lines {c.get('loc')}", "" if c.get("glb") else "NO GLB", "assembly part" if c.get("part") else ""]
    return f"{i:>2}. {c['name']}  [{c['dataset']} / {c['family']}]  {', '.join(b for b in bits if b)}\n    id {c['id']}"


def slug(name: str, oid: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") or "object"
    return f"{s[:40]}-{hashlib.sha1(oid.encode()).hexdigest()[:6]}"


# ---------------------------------------------------------------- contact sheet

SHEET_MAX_ITEMS = 24
SHEET_MAX_BYTES = 380_000


def _font(size: int):
    from PIL import ImageFont  # noqa: PLC0415
    for f in ("/System/Library/Fonts/Supplemental/Arial.ttf", "/Library/Fonts/Arial.ttf",
              "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "C:/Windows/Fonts/arial.ttf"):
        try:
            return ImageFont.truetype(f, size)
        except OSError:
            continue
    try:
        return ImageFont.load_default(size)
    except TypeError:
        return ImageFont.load_default()


def sheet(cards: list[dict], title: str = "") -> bytes | None:
    """Numbered contact sheet as JPEG bytes, numbers match the text list. Only the first SHEET_MAX_ITEMS are drawn."""
    try:
        from PIL import Image, ImageDraw  # noqa: PLC0415
    except ImportError:
        return None
    cards = cards[:SHEET_MAX_ITEMS]
    if not cards:
        return None

    def grab(c):
        try:
            return Image.open(io.BytesIO(render_png(c["id"]))).convert("RGBA")
        except Exception:  # noqa: BLE001 - one broken render must not break the sheet
            return None

    with cf.ThreadPoolExecutor(4) as ex:     # gentle on a single-CPU space
        imgs = list(ex.map(grab, cards))
    big_n = len(cards) > 12
    cell, label, cols = (192, 36, 6) if big_n else (256, 40, 4)
    cols = min(cols, len(cards))
    rows = -(-len(cards) // cols)
    head = 30 if title else 0
    out = Image.new("RGB", (cols * cell, head + rows * (cell + label)), "white")
    d = ImageDraw.Draw(out)
    big, small = _font(18), _font(12 if big_n else 13)
    if title:
        d.text((8, 7), title[:110], fill="black", font=small)
    for k, (c, im) in enumerate(zip(cards, imgs)):
        x, y = (k % cols) * cell, head + (k // cols) * (cell + label)
        if im is not None:
            im.thumbnail((cell, cell))
            bg = Image.new("RGBA", im.size, "white")
            bg.alpha_composite(im)
            out.paste(bg.convert("RGB"), (x + (cell - im.width) // 2, y + (cell - im.height) // 2))
        else:
            d.text((x + 50, y + cell // 2), "no render", fill="#999999", font=small)
        d.rectangle([x, y, x + cell - 1, y + cell + label - 1], outline="#cccccc")
        d.rectangle([x, y, x + 34, y + 26], fill="black")
        d.text((x + 6, y + 3), str(k + 1), fill="white", font=big)
        n = 24 if big_n else 30
        tag = f"{c['name']}"[:n] + (f"  j{c['joints']}" if c.get("joints") else "")
        d.text((x + 6, y + cell + 3), tag, fill="black", font=small)
        d.text((x + 6, y + cell + (18 if big_n else 21)), f"{c['dataset']} / {c['family']}"[:n + 6], fill="#666666", font=small)
    for quality in (82, 70, 58, 45):
        buf = io.BytesIO()
        out.save(buf, "JPEG", quality=quality, optimize=True)
        if buf.tell() <= SHEET_MAX_BYTES:
            break
    return buf.getvalue()


# ---------------------------------------------------------------- GLB parsing

def _mat(n: dict) -> list[list[float]]:
    if "matrix" in n:
        m = n["matrix"]
        return [[m[c * 4 + r] for c in range(4)] for r in range(4)]
    t, (x, y, z, w), s = n.get("translation", [0, 0, 0]), n.get("rotation", [0, 0, 0, 1]), n.get("scale", [1, 1, 1])
    rot = [[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
           [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
           [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]]
    return [[rot[r][c] * s[c] for c in range(3)] + [t[r]] for r in range(3)] + [[0, 0, 0, 1]]


def _mul(a, b):
    return [[sum(a[r][k] * b[k][c] for k in range(4)) for c in range(4)] for r in range(4)]


def glb_info(blob: bytes) -> dict:
    """Meshes, materials, joints from extras.s3d_joint and world-space bounds (meters, Y up)."""
    magic, _ver, _len = struct.unpack("<4sII", blob[:12])
    if magic != b"glTF":
        raise ApiError("downloaded file is not a GLB")
    clen, _ctype = struct.unpack("<I4s", blob[12:20])
    g = json.loads(blob[20:20 + clen])
    nodes, meshes, acc = g.get("nodes", []), g.get("meshes", []), g.get("accessors", [])
    lo, hi, tris = [float("inf")] * 3, [float("-inf")] * 3, 0
    ident = [[float(r == c) for c in range(4)] for r in range(4)]

    def walk(i: int, parent) -> None:
        nonlocal tris
        n = nodes[i]
        m = _mul(parent, _mat(n))
        if "mesh" in n:
            for p in meshes[n["mesh"]].get("primitives", []):
                a = acc[p["attributes"]["POSITION"]]
                tris += (acc[p["indices"]]["count"] if "indices" in p else a["count"]) // 3
                if "min" in a and "max" in a:
                    for cx in (a["min"][0], a["max"][0]):
                        for cy in (a["min"][1], a["max"][1]):
                            for cz in (a["min"][2], a["max"][2]):
                                for r in range(3):
                                    v = m[r][0] * cx + m[r][1] * cy + m[r][2] * cz + m[r][3]
                                    lo[r], hi[r] = min(lo[r], v), max(hi[r], v)
        for ch in n.get("children", []):
            walk(ch, m)

    for sc in g.get("scenes", [{}])[g.get("scene", 0):g.get("scene", 0) + 1]:
        for i in sc.get("nodes", []):
            walk(i, ident)
    if lo[0] == float("inf"):
        lo, hi = [0.0] * 3, [0.0] * 3
    joints = [{"node": n.get("name"), **n["extras"]["s3d_joint"]} for n in nodes
              if isinstance(n.get("extras"), dict) and "s3d_joint" in n["extras"]]
    return {"bytes": len(blob), "nodes": len(nodes), "meshes": len(meshes), "triangles": tris,
            "materials": [m.get("name") for m in g.get("materials", [])],
            "extensions": g.get("extensionsUsed", []), "animations": len(g.get("animations", [])),
            "min": lo, "max": hi, "size": [hi[k] - lo[k] for k in range(3)],
            "center": [(hi[k] + lo[k]) / 2 for k in range(3)],
            "parts": [n.get("name") for n in nodes if "mesh" in n], "joints": joints}
