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

import colorsys


def ramp(hex_base: str, shadow_pull=0.30, light_pull=0.26):
    """从一个基色生成三阶：暗部/基色/亮部。
    专业做法不是单纯调明度 —— **阴影色相朝紫蓝靠、高光色相朝黄靠**（模拟日光），
    走最短角度路径，所以冷色暖色都成立。"""
    h = hex_base.lstrip("#")
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    hh, ss, vv = colorsys.rgb_to_hsv(r, g, b)

    def toward(cur, target, amt):
        d = (target - cur + 0.5) % 1.0 - 0.5      # 最短路径
        return (cur + d * amt) % 1.0

    SHADOW_HUE, LIGHT_HUE = 0.72, 0.13            # 紫蓝 / 暖黄
    sh = colorsys.hsv_to_rgb(toward(hh, SHADOW_HUE, shadow_pull),
                             min(1, ss * 1.15 + 0.05), max(0, vv * 0.52))
    li = colorsys.hsv_to_rgb(toward(hh, LIGHT_HUE, light_pull),
                             max(0, ss * 0.68 - 0.04), min(1, vv * 1.20 + 0.18))
    f = lambda t: "#" + "".join(f"{int(round(c * 255)):02x}" for c in t)
    return [f(sh), "#" + h, f(li)]


def build(outline: str, *bases: str):
    """0=透明 1=描边，之后每个基色展开成三阶。"""
    out = ["#00000000", outline]
    for b in bases:
        out += ramp(b)
    return out


DEFAULT_PALETTES = {
    # 0=透明 1=描边，之后每 3 个 = 一种材质的 暗部/基色/亮部（色相偏移生成）
    "classic": build("#1a1420", "#dc3c32", "#e8c88a", "#4e9450"),   # 红 / 奶油 / 绿
    "steel":   build("#12131c", "#7d8caa", "#b5762f", "#c33447"),   # 钢 / 皮革 / 红宝石
    "potion":  build("#141024", "#3f7fd4", "#8f7aa8", "#c9a13c"),   # 蓝液 / 玻璃 / 金
    "forest":  build("#0f1c10", "#4e9450", "#7a5233", "#e05a3a"),   # 叶 / 干 / 果
    "candy":   build("#2b0f26", "#e0517f", "#4fa8cf", "#f0cd4b"),   # 粉 / 蓝 / 黄
    "slime":   build("#0d1f14", "#35a854", "#8a5fb0", "#e0d24f"),   # 绿 / 紫 / 黄
    "dusk":    build("#191428", "#7b5ea7", "#e0794f", "#4a9bb5"),   # 紫 / 橙 / 青
    "mono":    build("#0d0d0d", "#707070", "#8f8f8f", "#606060"),
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
                # +0.35 修正：不加的话小半径会画成菱形/十字，不是像素圆
                if ((i - cx) / (rx + 0.35)) ** 2 + ((j - cy) / (ry + 0.35)) ** 2 <= 1.0:
                    self.pix(i, j, c)

    def line(self, x0, y0, x1, y1, c):
        """像素级直线：把步长**均匀**摊开（2-2-2 或 1-2-1-2），
        避免 1-3-1-1-4 那种乱步 —— 乱步在像素画里一眼就脏。"""
        x0, y0, x1, y1 = int(x0), int(y0), int(x1), int(y1)
        dx, dy = x1 - x0, y1 - y0
        sx, sy = (1 if dx >= 0 else -1), (1 if dy >= 0 else -1)
        adx, ady = abs(dx), abs(dy)
        if adx == 0 and ady == 0:
            self.pix(x0, y0, c)
            return
        if adx >= ady:                      # 以 x 为主轴
            runs = ady + 1
            base, extra = divmod(adx + 1, runs)
            x = x0
            for k in range(runs):
                n = base + (1 if k < extra else 0)
                for _ in range(n):
                    self.pix(x, y0 + sy * k, c)
                    x += sx
        else:
            runs = adx + 1
            base, extra = divmod(ady + 1, runs)
            y = y0
            for k in range(runs):
                n = base + (1 if k < extra else 0)
                for _ in range(n):
                    self.pix(x0 + sx * k, y, c)
                    y += sy

    def dot(self, x, y, size, c):
        """小特征专用（眼睛/铆钉/斑点）。size 1=单点 2=2x2 3=去角3x3 4=去角4x4。
        小半径别用 ellipse —— 那会画出十字。"""
        x, y, size = int(x), int(y), int(size)
        if size <= 1:
            self.pix(x, y, c)
        elif size == 2:
            self.rect(x, y, 2, 2, c)
        elif size == 3:
            self.rect(x, y + 1, 3, 1, c)
            self.rect(x + 1, y, 1, 3, c)
            self.pix(x, y, c) if False else None
            self.rect(x, y + 1, 3, 1, c)
        else:
            self.rect(x + 1, y, size - 2, size, c)
            self.rect(x, y + 1, size, size - 2, c)

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


    # ---- 手艺原语 / craft primitives ----
    def autoshade(self, base=3, lx=-1, ly=-1, rim=1, shade=2):
        """方向性塑形：迎光侧压一道细亮边、背光侧压一片较厚暗部，
        亮暗带**贴着轮廓弯**（球体的明暗交界本来就是弧），但只出现在对应的一侧 ——
        既不是沿轮廓糊一圈的"枕头阴影"，也不是把形体切一刀的直线条带。
        base 为该材质基色；亮部 base+1，暗部 base-1。"""
        pts = [(x, y) for y in range(SIZE) for x in range(SIZE) if self.g[y][x] == base]
        if len(pts) < 6:
            return
        cx = sum(p[0] for p in pts) / len(pts)
        cy = sum(p[1] for p in pts) / len(pts)
        n = (lx * lx + ly * ly) ** 0.5 or 1
        ux, uy = lx / n, ly / n
        S = set(pts)
        # 到形状边界的内距离（BFS 洋葱层）
        dist, frontier, d = {}, [p for p in pts if any(
            (p[0] + dx, p[1] + dy) not in S for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))], 1
        for p in frontier:
            dist[p] = 1
        while frontier:
            d += 1
            nxt = []
            for x, y in frontier:
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    q = (x + dx, y + dy)
                    if q in S and q not in dist:
                        dist[q] = d
                        nxt.append(q)
            frontier = nxt
        for (x, y) in pts:
            # 该像素在形体上偏向光源还是背光（用重心方向判断）
            vx, vy = x - cx, y - cy
            m = (vx * vx + vy * vy) ** 0.5 or 1
            t = (vx * ux + vy * uy) / m
            d = dist.get((x, y), 9)
            if t > 0.30 and d <= rim:
                self.g[y][x] = base + 1
            elif t < -0.15 and d <= shade:
                self.g[y][x] = base - 1

    def selout(self, dark=1, lx=-1, ly=-1, colored=True):
        """选择性描边（sel-out）：背光侧用最深色描边，**迎光侧改用该材质自己的暗色**，
        比一圈死黑柔和自然（Derek Yu 的做法）。colored=False 则退化为单色描边。"""
        nb = ((1, 0), (-1, 0), (0, 1), (0, -1))
        add = {}
        for y in range(SIZE):
            for x in range(SIZE):
                if self.g[y][x] != 0:
                    continue
                touch = [(dx, dy, self.g[y + dy][x + dx]) for dx, dy in nb
                         if 0 <= x + dx < SIZE and 0 <= y + dy < SIZE and self.g[y + dy][x + dx] not in (0, dark)]
                if not touch:
                    continue
                # 该描边像素在主体的迎光侧还是背光侧
                toward_light = any((dx, dy) == (-lx, -ly) for dx, dy, _ in touch)
                if toward_light and len(touch) == 1:
                    if not colored:
                        continue
                    v = touch[0][2]
                    grp = (v - 2) // 3
                    add[(x, y)] = max(2, grp * 3 + 2)      # 该材质的暗色
                else:
                    add[(x, y)] = dark
        for (x, y), c in add.items():
            self.g[y][x] = c

    def aa(self, edge=1, half=2):
        """手动抗锯齿：找出长度 >=2 的阶梯台阶，在拐角补一个半调像素。
        铁律：45°(1x1 步进)和直线不加 —— 加了只会糊。"""
        add = []
        for y in range(1, SIZE - 1):
            runs, x = [], 0
            while x < SIZE:
                if self.g[y][x] == edge:
                    x0 = x
                    while x < SIZE and self.g[y][x] == edge:
                        x += 1
                    runs.append((x0, x - 1))
                else:
                    x += 1
            for x0, x1 in runs:
                if x1 - x0 + 1 < 2:            # 1px 台阶 = 45°，跳过
                    continue
                for corner in (x0, x1):
                    for dy in (-1, 1):
                        ny = y + dy
                        if 0 <= ny < SIZE and self.g[ny][corner] == 0:
                            side = corner + (1 if corner == x1 else -1)
                            if 0 <= side < SIZE and self.g[y][side] == 0:
                                add.append((corner, ny))
        for x, y in set(add):
            if self.g[y][x] == 0:
                self.g[y][x] = half

    def silhouette(self, c=1):
        """把所有非空像素压成一个颜色 —— 剪影测试用。"""
        for y in range(SIZE):
            for x in range(SIZE):
                if self.g[y][x]:
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
        dbl = 0
        for y in range(SIZE):
            for x in range(SIZE - 1):
                if self.g[y][x] == 1 and self.g[y][x + 1] == 1:
                    up = (y > 0 and self.g[y - 1][x] not in (0, 1) and self.g[y - 1][x + 1] not in (0, 1))
                    dn = (y < SIZE - 1 and self.g[y + 1][x] not in (0, 1) and self.g[y + 1][x + 1] not in (0, 1))
                    if up and dn:
                        dbl += 1
        band = 0
        for y in range(1, SIZE - 1):
            run = 0
            for x in range(SIZE):
                v = self.g[y][x]
                same_above = self.g[y - 1][x] == v
                if v not in (0, 1) and not same_above and self.g[y - 1][x] not in (0,):
                    run += 1
                    if run >= 10:
                        band += 1
                        run = 0
                else:
                    run = 0
        return {
            "filled": filled, "double_outline": dbl, "banding": band, "coverage": round(filled / (SIZE * SIZE), 3),
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
           "replace", "shift", "outline", "selout", "autoshade", "aa", "dot", "silhouette", "clear")}
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
    used = set(st["colors_used"])
    if len(used) <= 2:
        w.append("只用了 1-2 个索引 —— 缺明暗阶梯。用 autoshade() 按光源塑形（暗部2/基色3/亮部4）")
    elif not ({2, 4} & used):
        w.append("没有暗部(2)或亮部(4) —— 形体是平的，调一次 autoshade() 就有体积")
    if st.get("banding", 0) > 3:
        w.append(f"检测到 {st['banding']} 处条带(banding)：明暗交界沿轮廓走成等宽长线，眼睛会看出假边。用 autoshade() 的形体塑形，别手工沿边描")
    if st.get("double_outline", 0) > 2:
        w.append(f"有 {st['double_outline']} 处双描边伪影（两块描边挨在一起形成黑条），挪开或改用 selout()")
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
