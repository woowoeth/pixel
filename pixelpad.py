#!/usr/bin/env python3
"""
pixelpad — 24x24 原生像素画引擎 / native 24x24 pixel-art canvas.

不生成大图再降采样：每个像素直接落一个调色板索引，出的是真像素画。
Not "big image then downscale" — every pixel is a palette index, so the art is natively low-res.

用法 / Usage:
    python3 pixelpad.py draw sprite.pxl -o out/sprite.png
    python3 pixelpad.py draw sprite.pxl -o out/sprite.png --gif        # 逐像素显影动画
    python3 pixelpad.py check out/sprite.png                           # 自检报告
    python3 pixelpad.py palettes                                       # 列出调色板

.pxl 文件就是每行一句原语调用（见 SKILL.md）。
"""
from __future__ import annotations
import argparse, json, os, sys

SIZE = 24
HERE = os.path.dirname(os.path.abspath(__file__))

DEFAULT_PALETTES = {
    "ink":     ["#00000000", "#1e1e28", "#4a4e69", "#9a8c98", "#f2e9e4"],
    "ember":   ["#00000000", "#1e1e28", "#dc3c32", "#f5be5a", "#fafaf5"],
    "forest":  ["#00000000", "#1b2a1f", "#3f7d46", "#8fbf6a", "#f0f7e4"],
    "ocean":   ["#00000000", "#12233a", "#1f6f8b", "#57c4c9", "#eafcff"],
    "grape":   ["#00000000", "#241432", "#7b2d8b", "#c86bd8", "#ffe9fb"],
    "rust":    ["#00000000", "#2b1a12", "#a4501f", "#d9924a", "#f6e3c8"],
    "mono":    ["#00000000", "#111111", "#555555", "#aaaaaa", "#ffffff"],
    "candy":   ["#00000000", "#3a1c39", "#e8517f", "#ffb3c7", "#fff7f2"],
}


def load_palettes() -> dict:
    path = os.path.join(HERE, "palettes.json")
    if os.path.exists(path):
        try:
            with open(path, encoding="utf-8") as f:
                return {**DEFAULT_PALETTES, **json.load(f)}
        except Exception:
            pass
    return dict(DEFAULT_PALETTES)


def hex_rgba(h: str):
    h = h.lstrip("#")
    if len(h) == 8:
        return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4, 6))
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (255,)


class Canvas:
    """24x24 索引画布。索引 0 恒为透明背景。"""

    def __init__(self):
        self.g = [[0] * SIZE for _ in range(SIZE)]

    # ---- 原语 / primitives ----
    def pix(self, x, y, c):
        if 0 <= x < SIZE and 0 <= y < SIZE:
            self.g[int(y)][int(x)] = int(c)

    def rect(self, x, y, w, h, c):
        for j in range(int(y), int(y + h)):
            for i in range(int(x), int(x + w)):
                self.pix(i, j, c)

    def ellipse(self, cx, cy, rx, ry, c):
        if rx <= 0 or ry <= 0:
            return
        for j in range(SIZE):
            for i in range(SIZE):
                if ((i - cx) / rx) ** 2 + ((j - cy) / ry) ** 2 <= 1.0:
                    self.pix(i, j, c)

    def line(self, x0, y0, x1, y1, c):
        n = int(max(abs(x1 - x0), abs(y1 - y0))) or 1
        for t in range(n + 1):
            self.pix(round(x0 + (x1 - x0) * t / n), round(y0 + (y1 - y0) * t / n), c)

    def tri(self, x0, y0, x1, y1, x2, y2, c):
        """实心三角形（重心坐标填充）。"""
        pts = [(x0, y0), (x1, y1), (x2, y2)]
        minx, maxx = max(0, int(min(p[0] for p in pts))), min(SIZE - 1, int(max(p[0] for p in pts)))
        miny, maxy = max(0, int(min(p[1] for p in pts))), min(SIZE - 1, int(max(p[1] for p in pts)))
        d = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2)
        if d == 0:
            return
        for j in range(miny, maxy + 1):
            for i in range(minx, maxx + 1):
                a = ((y1 - y2) * (i - x2) + (x2 - x1) * (j - y2)) / d
                b = ((y2 - y0) * (i - x2) + (x0 - x2) * (j - y2)) / d
                if a >= -0.02 and b >= -0.02 and a + b <= 1.02:
                    self.pix(i, j, c)

    def mirror_x(self):
        """左半边镜像到右半边（画对称物体时用）。"""
        for y in range(SIZE):
            for x in range(SIZE // 2):
                self.g[y][SIZE - 1 - x] = self.g[y][x]

    def mirror_y(self):
        for y in range(SIZE // 2):
            self.g[SIZE - 1 - y] = list(self.g[y])

    def replace(self, old, new):
        for y in range(SIZE):
            for x in range(SIZE):
                if self.g[y][x] == old:
                    self.g[y][x] = new

    def shift(self, dx, dy):
        ng = [[0] * SIZE for _ in range(SIZE)]
        for y in range(SIZE):
            for x in range(SIZE):
                nx, ny = x + int(dx), y + int(dy)
                if 0 <= nx < SIZE and 0 <= ny < SIZE:
                    ng[ny][nx] = self.g[y][x]
        self.g = ng

    def outline(self, c=1):
        """给所有非空像素加一圈描边。"""
        nb = ((1, 0), (-1, 0), (0, 1), (0, -1))
        add = []
        for y in range(SIZE):
            for x in range(SIZE):
                if self.g[y][x] != 0:
                    continue
                for dx, dy in nb:
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < SIZE and 0 <= ny < SIZE and self.g[ny][nx] not in (0, c):
                        add.append((x, y))
                        break
        for x, y in add:
            self.g[y][x] = c

    def clear(self):
        self.g = [[0] * SIZE for _ in range(SIZE)]

    # ---- 输出 / output ----
    def stats(self) -> dict:
        flat = [v for row in self.g for v in row]
        filled = sum(1 for v in flat if v)
        xs = [x for y in range(SIZE) for x in range(SIZE) if self.g[y][x]]
        ys = [y for y in range(SIZE) for x in range(SIZE) if self.g[y][x]]
        stray = 0
        for y in range(SIZE):
            for x in range(SIZE):
                if not self.g[y][x]:
                    continue
                n = sum(1 for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))
                        if 0 <= x + dx < SIZE and 0 <= y + dy < SIZE and self.g[y + dy][x + dx])
                if n == 0:
                    stray += 1
        return {
            "filled": filled, "coverage": round(filled / (SIZE * SIZE), 3),
            "bbox": [min(xs), min(ys), max(xs), max(ys)] if xs else None,
            "margin": [min(xs), min(ys), SIZE - 1 - max(xs), SIZE - 1 - max(ys)] if xs else None,
            "colors_used": sorted(set(v for v in flat if v)),
            "stray_pixels": stray,
        }

    def ascii(self) -> str:
        return "\n".join("".join(str(v) for v in row) for row in self.g)


def run_script(src: str) -> Canvas:
    """执行 .pxl 脚本：每行一句原语调用。受限命名空间，不能 import。"""
    cv = Canvas()
    ns = {k: getattr(cv, k) for k in
          ("pix", "rect", "ellipse", "line", "tri", "mirror_x", "mirror_y",
           "replace", "shift", "outline", "clear")}
    errs = []
    for i, raw in enumerate(src.splitlines(), 1):
        ln = raw.strip()
        if not ln or ln.startswith("#") or ln.startswith("//") or ln.startswith("```"):
            continue
        try:
            eval(ln, {"__builtins__": {}}, ns)
        except Exception as e:
            errs.append(f"  第{i}行 `{ln[:46]}` → {type(e).__name__}: {e}")
    if errs:
        print("[pixelpad] 跳过了无法执行的语句：", file=sys.stderr)
        print("\n".join(errs), file=sys.stderr)
    return cv


def to_image(cv: Canvas, palette: list, scale: int):
    from PIL import Image
    cols = [hex_rgba(c) for c in palette]
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    px = img.load()
    for y in range(SIZE):
        for x in range(SIZE):
            px[x, y] = cols[cv.g[y][x] % len(cols)]
    return img if scale == 1 else img.resize((SIZE * scale, SIZE * scale), Image.NEAREST)


def serpentine_order():
    """PixelGPT 式的蛇形 4x4 块顺序 —— 逐像素显影动画用。"""
    order = []
    for by in range(0, SIZE, 4):
        blocks = range(0, SIZE, 4)
        if (by // 4) % 2:
            blocks = reversed(list(blocks))
        for bx in blocks:
            for y in range(by, by + 4):
                for x in range(bx, bx + 4):
                    order.append((x, y))
    return order


def save_reveal_gif(cv: Canvas, palette: list, path: str, scale: int = 12, steps: int = 48):
    """逐像素显影动画：像素一格一格蹦出来。"""
    from PIL import Image
    cols = [hex_rgba(c) for c in palette]
    order = serpentine_order()
    per = max(1, len(order) // steps)
    frames, shown = [], Canvas()
    for k, (x, y) in enumerate(order, 1):
        shown.g[y][x] = cv.g[y][x]
        if k % per == 0 or k == len(order):
            img = Image.new("RGB", (SIZE, SIZE), cols[0][:3] if cols[0][3] else (250, 250, 245))
            p = img.load()
            for j in range(SIZE):
                for i in range(SIZE):
                    v = shown.g[j][i]
                    if v:
                        p[i, j] = cols[v % len(cols)][:3]
            frames.append(img.resize((SIZE * scale, SIZE * scale), Image.NEAREST))
    frames += [frames[-1]] * 8
    frames[0].save(path, save_all=True, append_images=frames[1:], duration=70, loop=0)
    return len(frames)


def cmd_draw(a):
    pals = load_palettes()
    if a.palette not in pals:
        sys.exit(f"未知调色板 {a.palette}；可用：{', '.join(pals)}")
    palette = pals[a.palette]
    src = open(a.script, encoding="utf-8").read()
    cv = run_script(src)
    out = a.out or os.path.splitext(a.script)[0] + ".png"
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    to_image(cv, palette, a.scale).save(out)
    to_image(cv, palette, 1).save(os.path.splitext(out)[0] + "@1x.png")
    st = cv.stats()
    print(f"[pixelpad] 已渲染 {out}  ({SIZE}x{SIZE} → {SIZE*a.scale}px, 调色板 {a.palette})")
    print(f"[pixelpad] 覆盖率 {st['coverage']:.0%}  边距 {st['margin']}  用色 {st['colors_used']}  孤立像素 {st['stray_pixels']}")
    for w in warnings(st):
        print("[pixelpad] ⚠ " + w)
    if a.gif:
        g = os.path.splitext(out)[0] + "-reveal.gif"
        n = save_reveal_gif(cv, palette, g)
        print(f"[pixelpad] 显影动画 {g}（{n} 帧）")
    if a.ascii:
        print(cv.ascii())


def warnings(st: dict) -> list:
    w = []
    if st["bbox"] is None:
        return ["画布是空的 —— 语句可能全部执行失败"]
    if st["coverage"] < 0.18:
        w.append(f"主体太小（覆盖率 {st['coverage']:.0%}），24x24 上应占 25%~60%，把形状放大")
    if st["coverage"] > 0.75:
        w.append(f"填得太满（覆盖率 {st['coverage']:.0%}），留 1-3px 边距会更像样")
    m = st["margin"]
    if m and max(m) - min(m) >= 6:
        w.append(f"主体偏了（四边边距 {m}），居中会更稳")
    if len(st["colors_used"]) <= 2:
        w.append("只用了 1-2 种颜色，加高光(4)和辅色(3)会立刻有层次")
    if st["stray_pixels"] > 3:
        w.append(f"有 {st['stray_pixels']} 个孤立像素，像噪点，清掉或连成形状")
    return w


def cmd_check(a):
    from PIL import Image
    img = Image.open(a.image).convert("RGBA")
    img = img.resize((SIZE, SIZE), Image.NEAREST) if img.size != (SIZE, SIZE) else img
    cv = Canvas()
    seen = {}
    px = img.load()
    for y in range(SIZE):
        for x in range(SIZE):
            r, g, b, al = px[x, y]
            if al < 8:
                continue
            key = (r, g, b)
            seen.setdefault(key, len(seen) + 1)
            cv.g[y][x] = seen[key]
    st = cv.stats()
    print(json.dumps(st, ensure_ascii=False, indent=1))
    for w in warnings(st):
        print("⚠ " + w)


def cmd_palettes(a):
    for k, v in load_palettes().items():
        print(f"{k:8s} {' '.join(v)}")


def main():
    ap = argparse.ArgumentParser(description="24x24 原生像素画引擎")
    sub = ap.add_subparsers(dest="cmd", required=True)
    d = sub.add_parser("draw", help="执行 .pxl 脚本并渲染")
    d.add_argument("script")
    d.add_argument("-o", "--out")
    d.add_argument("-p", "--palette", default="ember")
    d.add_argument("-s", "--scale", type=int, default=16)
    d.add_argument("--gif", action="store_true", help="同时导出逐像素显影动画")
    d.add_argument("--ascii", action="store_true", help="打印索引网格")
    d.set_defaults(func=cmd_draw)
    c = sub.add_parser("check", help="给一张 PNG 出自检报告")
    c.add_argument("image")
    c.set_defaults(func=cmd_check)
    p = sub.add_parser("palettes", help="列出调色板")
    p.set_defaults(func=cmd_palettes)
    a = ap.parse_args()
    a.func(a)


if __name__ == "__main__":
    try:
        main()
    except BrokenPipeError:
        try:
            sys.stdout.close()
        except Exception:
            pass
