"""Generator aset SVG ikonik YCS 2026 (Bali). Jalankan: python3 tools/gen-assets.py
Menulis file ke assets/svg/. Semua ilustrasi buatan sendiri (bebas hak cipta)."""
import math, os, random

OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'svg')
T950, T900, T800, T700, T600, T500 = '#082C33', '#0B3B44', '#0C4A55', '#0E5A66', '#12707E', '#1C8794'
Y, Y2, O, O2, CREAM, RED = '#FFC93C', '#FFD86B', '#FB923C', '#EA580C', '#FFFBF3', '#E11D48'

def f(n):
    return ('%.1f' % n).rstrip('0').rstrip('.')

def svg(name, vb, body, w=None, h=None, stretch=False):
    wh = f' width="{w}" height="{h}"' if w else ''
    par = ' preserveAspectRatio="none"' if stretch else ''
    open(os.path.join(OUT, name), 'w').write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}"{wh}{par}>{body}</svg>\n')

def frangipani(cx, cy, r, rot=0, petal='#FFFFFF', center=Y):
    out = []
    for i in range(5):
        a = rot + i * 72
        out.append(f'<ellipse cx="{f(cx)}" cy="{f(cy - r * .55)}" rx="{f(r * .34)}" ry="{f(r * .58)}" fill="{petal}" transform="rotate({f(a)} {f(cx)} {f(cy)})"/>')
    out.append(f'<circle cx="{f(cx)}" cy="{f(cy)}" r="{f(r * .22)}" fill="{center}"/>')
    return ''.join(out)

def palm(x, base, height, lean, color, fronds=9, size=1.0):
    tx, ty = x + lean, base - height
    trunk = f'<path d="M{f(x - 7 * size)} {f(base)} Q{f(x + lean * .2)} {f(base - height * .55)} {f(tx - 3 * size)} {f(ty)} L{f(tx + 3 * size)} {f(ty)} Q{f(x + lean * .2 + 9 * size)} {f(base - height * .55)} {f(x + 7 * size)} {f(base)}Z" fill="{color}"/>'
    leaves = []
    for i in range(fronds):
        a = math.radians(-170 + i * (160 / (fronds - 1)))
        L = (95 + (i % 3) * 18) * size
        ex, ey = tx + math.cos(a) * L, ty + math.sin(a) * L * .55 + L * .32
        mx, my = tx + math.cos(a) * L * .5, ty + math.sin(a) * L * .5 - 18 * size
        nx, ny = -math.sin(a) * 9 * size, math.cos(a) * 9 * size
        leaves.append(f'<path d="M{f(tx)} {f(ty)} Q{f(mx + nx)} {f(my + ny)} {f(ex)} {f(ey)} Q{f(mx - nx)} {f(my - ny + 10 * size)} {f(tx)} {f(ty)}Z" fill="{color}"/>')
    return trunk + ''.join(leaves) + f'<circle cx="{f(tx)}" cy="{f(ty + 4)}" r="{f(7 * size)}" fill="{color}"/>'

def candi_bentar(x, base, h, color, gap=None):
    w = h * .42; gap = gap or h * .16
    steps = 7; pts_l = []; pts_r = []
    for i in range(steps + 1):
        y = base - h * i / steps
        inset = w * .62 * i / steps
        pts_l.append((x - gap / 2 - w + inset, y))
        pts_r.append((x + gap / 2 + w - inset, y))
    def half(pts, inner, sign):
        d = f'M{f(inner)} {f(base)} L{f(pts[0][0])} {f(base)}'
        for i in range(1, len(pts)):
            d += f' L{f(pts[i - 1][0])} {f(pts[i][1] + 4)} L{f(pts[i][0])} {f(pts[i][1] + 4)} L{f(pts[i][0])} {f(pts[i][1])}'
        d += f' L{f(inner)} {f(base - h - 10)}Z'
        return f'<path d="{d}" fill="{color}"/>'
    stairs = ''.join(f'<rect x="{f(x - gap / 2 - 6 - i * 6)}" y="{f(base - 6 - i * 6 + 6 * 4)}" width="{f(gap + 12 + i * 12)}" height="6" fill="{color}"/>' for i in range(4))
    return half(pts_l, x - gap / 2, -1) + half(pts_r, x + gap / 2, 1) + stairs

def meru(x, base, w, tiers, color, accent=None):
    out = [f'<rect x="{f(x - w * .28)}" y="{f(base - w * .5)}" width="{f(w * .56)}" height="{f(w * .5)}" fill="{color}"/>']
    y = base - w * .5; tw = w
    for i in range(tiers):
        th = w * .2 * (1 - i * .035)
        out.append(f'<path d="M{f(x - tw / 2)} {f(y)} L{f(x - tw * .32)} {f(y - th)} L{f(x + tw * .32)} {f(y - th)} L{f(x + tw / 2)} {f(y)}Z" fill="{color}"/>')
        y -= th
        out.append(f'<rect x="{f(x - tw * .2)}" y="{f(y - th * .35)}" width="{f(tw * .4)}" height="{f(th * .35)}" fill="{color}"/>')
        y -= th * .35
        tw *= .86
    out.append(f'<path d="M{f(x - 3)} {f(y)} L{f(x)} {f(y - w * .35)} L{f(x + 3)} {f(y)}Z" fill="{accent or color}"/>')
    return ''.join(out)

def penjor(x, base, h, color, orn):
    tx, ty = x + h * .45, base - h * .82
    d = f'M{f(x)} {f(base)} C{f(x - 6)} {f(base - h * .6)} {f(x + h * .12)} {f(base - h)} {f(tx)} {f(ty)}'
    out = [f'<path d="{d}" fill="none" stroke="{color}" stroke-width="6" stroke-linecap="round"/>']
    for i in range(7):
        t = .35 + i * .08
        px = x + (h * .06) * t * 3 + (tx - x) * max(0, t - .55) * 1.9
        py = base - h * t * .95
        out.append(f'<path d="M{f(px)} {f(py)} l-6 16 l6 8 l6 -8Z" fill="{orn}"/>')
    out.append(f'<path d="M{f(tx)} {f(ty)} q4 14 -2 30 q10 -6 12 6 q-6 -18 -10 -36Z" fill="{orn}"/><circle cx="{f(tx + 2)}" cy="{f(ty + 40)}" r="7" fill="{orn}"/>')
    return ''.join(out)

def mountain(x0, x1, peak_x, peak_y, base, color, op=1):
    return (f'<path d="M{f(x0)} {f(base)} C{f(x0 + (peak_x - x0) * .45)} {f(base - (base - peak_y) * .25)} {f(peak_x - 40)} {f(peak_y + 30)} {f(peak_x - 14)} {f(peak_y + 4)} '
            f'Q{f(peak_x)} {f(peak_y - 6)} {f(peak_x + 14)} {f(peak_y + 4)} C{f(peak_x + 40)} {f(peak_y + 30)} {f(x1 - (x1 - peak_x) * .45)} {f(base - (base - peak_y) * .25)} {f(x1)} {f(base)}Z" fill="{color}" opacity="{op}"/>')

def cloud(x, y, s, op=.14):
    return (f'<g fill="#FFFFFF" opacity="{op}"><ellipse cx="{f(x)}" cy="{f(y)}" rx="{f(60 * s)}" ry="{f(18 * s)}"/>'
            f'<circle cx="{f(x - 20 * s)}" cy="{f(y - 12 * s)}" r="{f(22 * s)}"/><circle cx="{f(x + 18 * s)}" cy="{f(y - 18 * s)}" r="{f(28 * s)}"/></g>')

def ragged(y, w, amp, seed, step=18):
    rnd = random.Random(seed); d = f'M0 {f(y)}'
    x = 0
    while x < w:
        x += step; d += f' L{f(min(x, w))} {f(y + rnd.uniform(-amp, amp))}'
    return d

# ---------- 1. Scene hero (lapisan bawah hero, nada teal) ----------
def hero_scene():
    W, H = 1440, 520; b = []
    b.append(f'<circle cx="1130" cy="200" r="150" fill="{Y}" opacity=".10"/><circle cx="1130" cy="200" r="92" fill="{Y}" opacity=".22"/><circle cx="1130" cy="200" r="58" fill="{Y2}" opacity=".55"/>')
    for i in range(12):
        a = math.radians(i * 30)
        b.append(f'<path d="M{f(1130 + math.cos(a) * 112)} {f(200 + math.sin(a) * 112)} L{f(1130 + math.cos(a) * 140)} {f(200 + math.sin(a) * 140)}" stroke="{Y}" stroke-width="6" stroke-linecap="round" opacity=".35"/>')
    b += [cloud(260, 90, 1.2), cloud(720, 60, .9), cloud(1340, 120, 1.0), cloud(940, 150, .7, .1)]
    b.append(mountain(560, 1440, 1000, 150, 430, T600, .55))
    b.append(mountain(-80, 700, 300, 250, 430, T600, .38))
    # sawah berundak
    for i, (yy, c, op) in enumerate([(330, T700, .9), (360, T700, 1), (392, T800, 1), (420, T800, 1)]):
        b.append(f'<path d="M0 {yy} C200 {yy - 26} 420 {yy + 18} 640 {yy - 6} S1040 {yy - 30} 1440 {yy - 4} V520 H0Z" fill="{c}" opacity="{op}"/>')
        b.append(f'<path d="M0 {yy + 8} C200 {yy - 18} 420 {yy + 26} 640 {yy + 2} S1040 {yy - 22} 1440 {yy + 4}" fill="none" stroke="{T500}" stroke-width="2" opacity=".5"/>')
    b.append(candi_bentar(250, 440, 190, T900))
    b.append(meru(1235, 440, 120, 7, T900, Y))
    b.append(meru(1340, 440, 80, 5, T900, Y))
    b.append(penjor(420, 470, 230, T950, Y))
    b.append(penjor(1050, 470, 210, T950, Y))
    b.append(palm(70, 470, 250, 40, T950, size=1.05))
    b.append(palm(1420, 480, 280, -50, T950, size=1.15))
    b.append(palm(640, 470, 170, 20, T900, 8, .75))
    b.append(f'<path d="{ragged(450, W, 6, 3)} V{H} H0Z" fill="{T950}"/>')
    b.append(frangipani(160, 470, 22, 10) + frangipani(1180, 480, 18, 40) + frangipani(1210, 456, 12, 0, Y2, O))
    svg('hero-scene.svg', f'0 0 {W} {H}', ''.join(b))

# ---------- 2. Pola kawung (tile) ----------
def kawung(color='#0E5A66', op=.07, name='pattern-kawung.svg'):
    s = 64; b = [f'<g fill="none" stroke="{color}" stroke-width="2" opacity="{op}">']
    for cx, cy in [(0, 0), (64, 0), (0, 64), (64, 64), (32, 32)]:
        for a in (0, 90, 180, 270):
            b.append(f'<ellipse cx="{cx}" cy="{cy - 15}" rx="9" ry="14" transform="rotate({a} {cx} {cy})"/>')
        b.append(f'<circle cx="{cx}" cy="{cy}" r="2.5" fill="{color}"/>')
    b.append('</g>')
    svg(name, f'0 0 {s} {s}', ''.join(b), s, s)

# ---------- 3. Stiker ikonik (berwarna) ----------
def sticker_frangipani():
    svg('frangipani.svg', '0 0 120 120', frangipani(60, 60, 52, 8, '#FFFFFF', Y) + '<circle cx="60" cy="60" r="5" fill="#F59E0B"/>')

def sticker_kite():
    b = [f'<path d="M100 8 L168 80 L100 168 L32 80Z" fill="{O}"/>',
         f'<path d="M100 8 L100 168 L32 80Z" fill="{O2}"/>',
         f'<path d="M100 40 L138 80 L100 128 L62 80Z" fill="{Y}"/>',
         f'<circle cx="100" cy="80" r="12" fill="{T700}"/>',
         f'<path d="M32 80 H168 M100 8 V168" stroke="{T950}" stroke-width="3"/>',
         f'<path d="M100 168 C90 196 120 210 104 236 S96 268 112 292" fill="none" stroke="{T950}" stroke-width="3"/>']
    for i, (x, y, c) in enumerate([(96, 196, Y), (108, 228, T600), (98, 262, O), (110, 290, Y)]):
        b.append(f'<path d="M{x} {y} l-12 -8 l2 14Z M{x} {y} l12 -8 l-2 14Z" fill="{c}"/>')
    svg('kite.svg', '0 0 200 300', ''.join(b))

def sticker_canang():
    b = [f'<rect x="20" y="20" width="160" height="160" rx="18" fill="#65A30D" transform="rotate(45 100 100)"/>',
         f'<rect x="38" y="38" width="124" height="124" rx="12" fill="#84CC16" transform="rotate(45 100 100)"/>']
    for (cx, cy, c) in [(100, 52, '#FFFFFF'), (148, 100, RED), (100, 148, Y), (52, 100, '#7C3AED')]:
        for k in range(6):
            a = k * 60
            b.append(f'<ellipse cx="{cx}" cy="{cy - 13}" rx="7" ry="13" fill="{c}" transform="rotate({a} {cx} {cy})"/>')
        b.append(f'<circle cx="{cx}" cy="{cy}" r="6" fill="{O}"/>')
    b.append(frangipani(100, 100, 30, 0, '#FFFFFF', Y))
    svg('canang.svg', '0 0 200 200', ''.join(b))

def sticker_gate():
    b = [f'<circle cx="100" cy="110" r="78" fill="{Y}"/>', f'<circle cx="100" cy="110" r="78" fill="none" stroke="{T950}" stroke-width="5"/>',
         '<clipPath id="c"><circle cx="100" cy="110" r="76"/></clipPath><g clip-path="url(#c)">',
         f'<path d="M0 160 C40 150 80 170 120 158 S180 150 200 156 V220 H0Z" fill="{T600}"/>',
         candi_bentar(100, 190, 130, T950, 22), '</g>']
    svg('candi-bentar.svg', '0 0 200 200', ''.join(b))

def sticker_penjor():
    svg('penjor.svg', '0 0 200 320', penjor(24, 312, 300, T950, Y) + frangipani(30, 300, 16, 0))

def sticker_palm_leaf(name, c1, c2):
    b = [f'<path d="M20 280 C40 200 90 120 200 30 C210 120 160 220 20 280Z" fill="{c1}"/>',
         f'<path d="M20 280 C80 200 140 120 200 30" fill="none" stroke="{c2}" stroke-width="5"/>']
    for i in range(1, 9):
        t = i / 9
        x = 20 + 180 * t; y = 280 - 250 * t
        b.append(f'<path d="M{f(x)} {f(y)} q{f(-30 + t * 10)} {f(-10)} {f(-50 + t * 30)} {f(-40 + t * 10)}" fill="none" stroke="{c2}" stroke-width="3" stroke-linecap="round"/>')
        b.append(f'<path d="M{f(x)} {f(y)} q{f(30 - t * 6)} {f(8)} {f(50 - t * 20)} {f(30 - t * 10)}" fill="none" stroke="{c2}" stroke-width="3" stroke-linecap="round"/>')
    svg(name, '0 0 220 300', ''.join(b))

def sticker_stamp():
    b = [f'<circle cx="100" cy="100" r="90" fill="none" stroke="{O2}" stroke-width="6" stroke-dasharray="2 8" stroke-linecap="round"/>',
         f'<circle cx="100" cy="100" r="76" fill="none" stroke="{O2}" stroke-width="4"/>',
         f'<circle cx="100" cy="100" r="54" fill="none" stroke="{O2}" stroke-width="2"/>',
         '<path id="arc" d="M36 100 A64 64 0 0 1 164 100" fill="none"/>',
         f'<text font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="19" letter-spacing="2" fill="{O2}"><textPath href="#arc" startOffset="50%" text-anchor="middle">ROAD TO BALI</textPath></text>',
         f'<text x="100" y="112" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="30" fill="{O2}">YCS</text>',
         f'<text x="100" y="140" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="16" letter-spacing="2" fill="{O2}">2026</text>',
         f'<path d="M60 74 l6 -10 l6 10 M128 74 l6 -10 l6 10" stroke="{O2}" stroke-width="3" fill="none"/>']
    svg('stamp.svg', '0 0 200 200', f'<g transform="rotate(-12 100 100)" opacity=".92">{"".join(b)}</g>')

def sticker_ticket():
    b = [f'<path d="M10 20 H290 a10 10 0 0 0 0 0 V60 a14 14 0 0 0 0 28 V130 H10 V88 a14 14 0 0 0 0 -28Z" fill="#FFFFFF" stroke="{T950}" stroke-width="4"/>',
         f'<path d="M210 26 V124" stroke="{T950}" stroke-width="3" stroke-dasharray="6 6"/>',
         f'<rect x="10" y="20" width="200" height="30" fill="{T700}"/>',
         f'<text x="24" y="41" font-family="Arial,sans-serif" font-weight="800" font-size="15" fill="#FFFFFF" letter-spacing="1">BOARDING PASS · YCS 2026</text>',
         f'<text x="24" y="84" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="26" fill="{T950}">SMG</text>',
         f'<path d="M92 76 h40 m-10 -8 l10 8 l-10 8" stroke="{O2}" stroke-width="4" fill="none" stroke-linecap="round"/>',
         f'<text x="140" y="84" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="26" fill="{T950}">DPS</text>',
         f'<text x="24" y="112" font-family="Arial,sans-serif" font-weight="700" font-size="12" fill="#4A5B62">23 DES 2026 – 2 JAN 2027</text>']
    for i in range(9):
        b.append(f'<rect x="{226 + i * 7}" y="{40 + (i % 3) * 4}" width="{3 + i % 2 * 2}" height="{70 - (i % 3) * 8}" fill="{T950}"/>')
    svg('ticket.svg', '0 0 300 150', ''.join(b))

def sticker_van():
    b = [f'<rect x="20" y="40" width="200" height="80" rx="22" fill="{O}"/>',
         f'<path d="M20 86 H220 V100 a20 20 0 0 1 -20 20 H40 a20 20 0 0 1 -20 -20Z" fill="#FFFFFF"/>',
         f'<rect x="40" y="52" width="40" height="28" rx="6" fill="{T600}"/><rect x="90" y="52" width="40" height="28" rx="6" fill="{T600}"/><rect x="140" y="52" width="40" height="28" rx="6" fill="{T600}"/>',
         f'<path d="M190 52 h14 a8 8 0 0 1 8 8 v20 h-22Z" fill="{T600}"/>',
         f'<rect x="60" y="22" width="110" height="18" rx="5" fill="{T950}"/><path d="M70 22 l6 -10 h18 l6 10Z M120 22 l6 -10 h30 l6 10Z" fill="{Y}"/>',
         f'<circle cx="64" cy="122" r="18" fill="{T950}"/><circle cx="64" cy="122" r="7" fill="#CBD5E1"/><circle cx="180" cy="122" r="18" fill="{T950}"/><circle cx="180" cy="122" r="7" fill="#CBD5E1"/>',
         f'<circle cx="214" cy="96" r="5" fill="{Y}"/>']
    svg('van.svg', '0 0 240 150', ''.join(b))

def sticker_surf():
    b = [f'<path d="M60 10 C110 60 110 230 60 290 C10 230 10 60 60 10Z" fill="{Y}" stroke="{T950}" stroke-width="4"/>',
         f'<path d="M60 14 V286" stroke="{O2}" stroke-width="8"/>', f'<path d="M30 120 C50 110 70 110 90 120" stroke="{T700}" stroke-width="6" fill="none"/>',
         frangipani(60, 210, 18, 0)]
    svg('surfboard.svg', '0 0 120 300', ''.join(b))

def brush(name, color, w=600, h=120, seed=1):
    rnd = random.Random(seed)
    top = [(x, 18 + rnd.uniform(-6, 6) + 10 * math.sin(x / 90)) for x in range(20, w - 20, 14)]
    bot = [(x, h - 18 + rnd.uniform(-8, 8) + 8 * math.sin(x / 70)) for x in range(w - 20, 20, -14)]
    d = f'M8 {f(h / 2)} ' + ' '.join(f'L{f(x)} {f(y)}' for x, y in top) + f' L{w - 6} {f(h / 2 - 10)} ' + ' '.join(f'L{f(x)} {f(y)}' for x, y in bot) + 'Z'
    streaks = ''.join(f'<path d="M{f(rnd.uniform(40, 160))} {f(y)} H{f(rnd.uniform(w - 200, w - 40))}" stroke="#FFFFFF" stroke-opacity=".18" stroke-width="{f(rnd.uniform(1.5, 3.5))}"/>' for y in range(32, h - 24, 11))
    svg(name, f'0 0 {w} {h}', f'<path d="{d}" fill="{color}"/>{streaks}', stretch=True)

def footer_skyline():
    W, H = 1440, 140; b = [mountain(700, 1440, 1060, 20, 140, T800, .35), mountain(-60, 640, 280, 50, 140, T800, .25)]
    b.append(candi_bentar(180, 140, 110, T950)); b.append(meru(1260, 140, 70, 6, T950, Y)); b.append(meru(1330, 140, 50, 4, T950, Y))
    b.append(palm(520, 140, 120, 18, T950, 8, .55)); b.append(palm(940, 140, 140, -20, T950, 8, .6))
    b.append(penjor(740, 140, 120, T950, Y))
    svg('footer-skyline.svg', f'0 0 {W} {H}', ''.join(b))

def twibbon_ornaments():
    # Ornamen siluet untuk bingkai twibbon (dipakai via Image() di canvas)
    W, H = 1080, 260; b = [candi_bentar(120, 260, 200, '#FFFFFF', 30), meru(960, 260, 120, 6, '#FFFFFF')]
    b.append(palm(1040, 260, 200, -30, '#FFFFFF', 8, .8))
    svg('twibbon-skyline.svg', f'0 0 {W} {H}', f'<g opacity=".16">{"".join(b)}</g>')

os.makedirs(OUT, exist_ok=True)
hero_scene(); kawung(); kawung('#FFFFFF', .06, 'pattern-kawung-light.svg')
sticker_frangipani(); sticker_kite(); sticker_canang(); sticker_gate(); sticker_penjor()
sticker_palm_leaf('palm-leaf.svg', '#15803D', '#166534'); sticker_palm_leaf('palm-leaf-teal.svg', T600, T800)
sticker_stamp(); sticker_ticket(); sticker_van(); sticker_surf()
brush('brush-yellow.svg', Y, seed=2); brush('brush-teal.svg', T700, seed=5); brush('brush-orange.svg', O2, seed=9)
footer_skyline(); twibbon_ornaments()
print('\n'.join(sorted(os.listdir(OUT))))
