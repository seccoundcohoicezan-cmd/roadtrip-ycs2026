"""Generator layar desain YCS 2026 v2 -> /design/*.html (1 file = 1 frame Figma)."""
import os, json

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'design')
A = '../assets/img'
K = 'img/karakter'

# ---------- ikon (gaya Lucide, stroke 2) ----------
P = {
 'home': '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
 'spark': '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>',
 'msg': '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z"/><path d="M8.5 11h7M8.5 14h4"/>',
 'radio': '<circle cx="12" cy="12" r="2.2"/><path d="M7.8 16.2a6 6 0 0 1 0-8.4M16.2 7.8a6 6 0 0 1 0 8.4M4.9 19.1a10 10 0 0 1 0-14.2M19.1 4.9a10 10 0 0 1 0 14.2"/>',
 'users': '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.3-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><circle cx="17" cy="9" r="2.6"/><path d="M17.5 14.6c2.2.4 3.5 2 4 4.4"/>',
 'grid': '<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>',
 'key': '<circle cx="8" cy="15" r="4"/><path d="m10.8 12.2 8.7-8.7M16.5 6.5l2.5 2.5M14 9l2 2"/>',
 'gift': '<rect x="3.5" y="8" width="17" height="4" rx="1"/><path d="M5 12v8.5h14V12M12 8v12.5"/><path d="M12 8C10 4 6.5 4.5 7 6.8 7.4 8 12 8 12 8ZM12 8c2-4 5.5-3.5 5-1.2C16.6 8 12 8 12 8Z"/>',
 'ticket': '<path d="M3.5 8.5V6.5a1 1 0 0 1 1-1h15a1 1 0 0 1 1 1v2a2.5 2.5 0 0 0 0 5v2a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-2a2.5 2.5 0 0 0 0-5Z"/><path d="M14 5.5v12" stroke-dasharray="2 2.5"/>',
 'bus': '<rect x="4" y="3.5" width="16" height="14" rx="3"/><path d="M4 11h16M8 21v-3.5M16 21v-3.5"/><circle cx="8" cy="14.5" r=".6"/><circle cx="16" cy="14.5" r=".6"/>',
 'compass': '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5Z"/>',
 'cal': '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
 'clock': '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 'pin': '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>',
 'search': '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
 'share': '<circle cx="18" cy="5.5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="18.5" r="2.5"/><path d="m8.2 10.8 7.6-4M8.2 13.2l7.6 4"/>',
 'dl': '<path d="M12 4v11M7 10.5l5 5 5-5M4.5 20h15"/>',
 'chev': '<path d="m9 5.5 6.5 6.5L9 18.5"/>',
 'chevl': '<path d="M15 5.5 8.5 12l6.5 6.5"/>',
 'chevd': '<path d="m5.5 9 6.5 6.5L18.5 9"/>',
 'arrow': '<path d="M4.5 12h15M13.5 6l6 6-6 6"/>',
 'bell': '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15Z"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/>',
 'play': '<path d="M7 4.8v14.4a.8.8 0 0 0 1.2.7l11.4-7.2a.8.8 0 0 0 0-1.4L8.2 4.1a.8.8 0 0 0-1.2.7Z" fill="currentColor"/>',
 'moon': '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/>',
 'x': '<path d="M6 6l12 12M18 6 6 18"/>',
 'check': '<path d="m4.5 12.5 5 5L19.5 7"/>',
 'lock': '<rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
 'trophy': '<path d="M8 4h8v5a4 4 0 0 1-8 0Z"/><path d="M8 6H4.5a3 3 0 0 0 3.5 4M16 6h3.5a3 3 0 0 1-3.5 4M12 13v4M8 20.5h8M9.5 17h5v3.5h-5Z"/>',
 'shield': '<path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.1 7.5 9.5 4.3-1.4 7.5-4.9 7.5-9.5V6Z"/>',
 'zap': '<path d="M13 3 5 13.5h6L10.5 21 19 10.5h-6Z"/>',
 'help': '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.3a2.6 2.6 0 0 1 5 .9c0 1.8-2.5 2.3-2.5 3.8M12 17.2v.1"/>',
 'user': '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c1-4 3.9-6 7.5-6s6.5 2 7.5 6"/>',
 'mail': '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m3.5 7 8.5 6 8.5-6"/>',
 'phone': '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M10.5 18.5h3"/>',
 'school': '<path d="M2.5 9 12 4.5 21.5 9 12 13.5Z"/><path d="M6.5 11v5c1.5 1.6 3.5 2.5 5.5 2.5s4-.9 5.5-2.5v-5M21.5 9v5"/>',
 'info': '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.6v.1"/>',
 'alert': '<path d="M12 3.5 2.5 20h19Z"/><path d="M12 10v4.5M12 17.3v.1"/>',
 'eye': '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/>',
 'swords': '<path d="M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2M9.5 14.5 6 18M7 19 5 21M3 19l2 2"/>',
 'run': '<circle cx="14.5" cy="4.5" r="2"/><path d="m8 21 3-6.5 3.5 2.5V21M6 12l3-4 4 1 3 4 3 1"/>',
 'heart': '<path d="M12 20.5S3.5 15.5 3.5 9.2A4.7 4.7 0 0 1 12 6.6a4.7 4.7 0 0 1 8.5 2.6c0 6.3-8.5 11.3-8.5 11.3Z"/>',
 'map': '<path d="M9 4.5 3.5 6.5v13l5.5-2 6 2 5.5-2v-13l-5.5 2Z"/><path d="M9 4.5v13M15 6.5v13"/>',
 'qr': '<rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1"/><rect x="14" y="3.5" width="6.5" height="6.5" rx="1"/><rect x="3.5" y="14" width="6.5" height="6.5" rx="1"/><path d="M14 14h3v3h-3zM17 17h3.5v3.5M14 20.5h.1"/>',
 'filter': '<path d="M4 6h16M7 12h10M10 18h4"/>',
 'sun': '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
 'wifi': '<path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.6 16a5 5 0 0 1 6.8 0"/><circle cx="12" cy="19.3" r=".9" fill="currentColor"/>',
 'battery': '<rect x="2.5" y="7" width="17" height="10" rx="2.5"/><rect x="4.5" y="9" width="11" height="6" rx="1" fill="currentColor" stroke="none"/><path d="M21.5 10.5v3"/>',
 'signal': '<path d="M4 18v-2M9 18v-5M14 18V9.5M19 18V6"/>',
}
WA = '<path d="M20.5 11.7a8.5 8.5 0 0 1-12.6 7.4L3.5 20.5l1.4-4.3a8.5 8.5 0 1 1 15.6-4.5Z"/><path d="M9 8.5c.3-.7.9-.7 1.2-.1l.7 1.6c.1.3 0 .6-.2.8l-.5.6c.6 1.2 1.6 2.2 2.8 2.8l.6-.5c.2-.2.5-.3.8-.2l1.6.7c.6.3.6.9-.1 1.2-1.4.8-3.4.3-5.3-1.6S8.2 9.9 9 8.5Z" fill="currentColor" stroke="none"/>'
P['wa'] = WA

def ic(n, cls=''):
    return f'<svg class="i {cls}" viewBox="0 0 24 24" aria-hidden="true">{P[n]}</svg>'

LOGO = '''<svg viewBox="0 0 48 48" aria-hidden="true"><g stroke="#FFC93C" stroke-width="3" stroke-linecap="round"><path d="M24 3v5M24 40v5M3 24h5M40 24h5M9.2 9.2l3.5 3.5M35.3 35.3l3.5 3.5M9.2 38.8l3.5-3.5M35.3 12.7l3.5-3.5"/></g><circle cx="24" cy="24" r="12.5" fill="#1F5FD6"/><circle cx="24" cy="19.5" r="3.4" fill="#FFC93C"/><path d="M16.5 31c1.5-4.6 4.2-6.8 7.5-6.8s6 2.2 7.5 6.8" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/><path d="M18 24.5 24 27l6-2.5" fill="none" stroke="#FFC93C" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>'''

def brand(light=False):
    return f'<div class="brand{" light" if light else ""}">{LOGO}<div><b>Youth Character Summit</b><span>YCS 2026</span></div></div>'

def status(light=False):
    return f'''<div class="status{" light" if light else ""}"><span>9:41</span><span class="sig">{ic("signal","s16")}{ic("wifi","s16")}{ic("battery","s24")}</span></div>'''

def appbar(light=False, title=None, back=False):
    left = brand(light) if not title else f'<div class="row gap8">{"<span class=\"btn btn-icon btn-white\" style=\"box-shadow:var(--e1)\">"+ic("chevl")+"</span>" if back else ""}<span class="t-h3">{title}</span></div>'
    return f'''<div class="appbar">{left}<div class="row gap8"><span class="btn btn-sm btn-dark">{ic("key","s16")}Punya kode?</span></div></div>'''

TABS = [('home','Beranda'),('msg','Festival'),('radio','Live'),('users','Finalis'),('grid','Lainnya')]
def tabbar(on):
    t = ''
    for i,(n,l) in enumerate(TABS):
        cls = 'tab' + (' on' if l==on else '')
        t += f'<div class="{cls}"><span class="pill">{ic(n)}</span>{l}</div>'
    return f'<nav class="tabbar">{t}</nav><div class="home-ind"></div>'

def page(name, title, w, h, body, extra_css=''):
    html = f'''<!doctype html>
<html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width={w}">
<meta name="robots" content="noindex,nofollow">
<title>{title} · YCS 2026 Design v2</title>
<link rel="stylesheet" href="ds.css">
<style>body{{width:{w}px;margin:0 auto}} {extra_css}</style></head>
<body><main class="frame {'phone' if w==390 else 'desk'}" data-frame="{name}" style="height:{h}px">
{body}
</main></body></html>'''
    open(f'{OUT}/{name}.html','w').write(html)
    FRAMES.append({'file': f'{name}.html', 'title': title, 'w': w, 'h': h})

FRAMES = []

def av(k):  # avatar karakter
    return f'<span class="av" style="background-image:url({K}/k{k:02d}.png)"></span>'

def cd(d='35', h='14', m='27', s='08'):
    return f'<div class="cd"><div><b>{d}</b><span>Hari</span></div><div><b>{h}</b><span>Jam</span></div><div><b>{m}</b><span>Menit</span></div><div><b>{s}</b><span>Detik</span></div></div>'


# Panggung festival: latar SELALU utuh selebar bingkai (tidak dipotong, sama dengan situs live),
# langit diperpanjang ke atas dan plaza ke bawah dengan warna yang diambil dari tepi gambar -> tanpa garis sambungan.
LANGIT, PLAZA = '#13ACFD', '#EACDA2'   # sampel baris teratas / terbawah latar-900.webp
def panggung(top, w, h=None, img='latar-900.webp', filt='', extra=''):
    ih = round(w * 320 / 900, 1)
    return (f'<div style="position:absolute;left:0;top:0;width:{w}px;{"height:%dpx;" % h if h else "bottom:0;"}overflow:hidden;{"filter:%s;" % filt if filt else ""}">'
            f'<div style="position:absolute;left:0;right:0;top:0;height:{top+2}px;background:linear-gradient(180deg,#7CCBFF 0%,{LANGIT} 100%)"></div>'
            f'<img src="{A}/festival/{img}" alt="" style="position:absolute;left:0;top:{top}px;width:{w}px;height:{ih}px;max-width:none">'
            f'<div style="position:absolute;left:0;right:0;top:{top+ih-1}px;bottom:0;background:linear-gradient(180deg,{PLAZA} 0%,#E3C291 45%,#D6B07A 100%)"></div>{extra}</div>')

# =====================================================================
# M01 BERANDA — v2.1 (MRKT-60): disamakan dengan mockup "YCS 2026 Event App Homepage"
# =====================================================================
# Ikon berwarna (isi penuh) seperti mockup. Warna = token.
ICF = {
 'trophy': '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M13 9h22v4c3.5-.6 6.6.4 6.6 4.2 0 5-4.6 8-9.4 8.4A12 12 0 0 1 26.5 31v4h5.5a2 2 0 0 1 2 2v3H14v-3a2 2 0 0 1 2-2h5.5v-4a12 12 0 0 1-5.7-5.4C11 25.2 6.4 22.2 6.4 17.2c0-3.8 3.1-4.8 6.6-4.2Zm-.2 7.5c-2-.3-3 .2-3 1.2 0 2.4 1.9 4.3 4.6 5a20 20 0 0 1-1.6-6.2Zm22.4 0a20 20 0 0 1-1.6 6.2c2.7-.7 4.6-2.6 4.6-5 0-1-1-1.5-3-1.2Z" fill="#FFC93C"/><path d="M14 37h20v3H14z" fill="#F5B400"/><path d="M19 13.5c0 6 1.6 10 4 12" fill="none" stroke="#FFE59A" stroke-width="2.4" stroke-linecap="round"/></svg>',
 'radio': '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="6" fill="#D92D20"/><g fill="none" stroke="#D92D20" stroke-width="4.2" stroke-linecap="round"><path d="M15.5 32.5a12 12 0 0 1 0-17M32.5 15.5a12 12 0 0 1 0 17M9.5 38.5a20.5 20.5 0 0 1 0-29M38.5 9.5a20.5 20.5 0 0 1 0 29"/></g></svg>',
 'gift': '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="9" y="22" width="30" height="20" rx="2.5" fill="#1F5FD6"/><rect x="6.5" y="15" width="35" height="9" rx="2.5" fill="#1A4FC0"/><rect x="21" y="15" width="6" height="27" fill="#FFC93C"/><path d="M24 15c-3.5-7-11-8-11.5-3.6C12.2 14.6 17 15 24 15Zm0 0c3.5-7 11-8 11.5-3.6.3 3.2-4.5 3.6-11.5 3.6Z" fill="none" stroke="#FFC93C" stroke-width="3.2" stroke-linejoin="round"/></svg>',
 'users': '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="13" cy="15.5" r="5.5" fill="#1F5FD6"/><circle cx="35" cy="15.5" r="5.5" fill="#1F5FD6"/><path d="M2.5 34c.6-6.8 4.6-10.5 10.5-10.5 3 0 5.4 1 7.2 2.8A14 14 0 0 0 15 36H4.5a2 2 0 0 1-2-2Zm43 0c-.6-6.8-4.6-10.5-10.5-10.5-3 0-5.4 1-7.2 2.8A14 14 0 0 1 33 36h10.5a2 2 0 0 0 2-2Z" fill="#1F5FD6"/><circle cx="24" cy="14" r="7.5" fill="#1A4FC0"/><path d="M10.5 38c.8-8.6 6-13.5 13.5-13.5S36.7 29.4 37.5 38a2 2 0 0 1-2 2.2h-23a2 2 0 0 1-2-2.2Z" fill="#1A4FC0"/></svg>',
}
PAD = '''<svg viewBox="0 0 120 80" aria-hidden="true"><defs><linearGradient id="padg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#DCE6F7"/></linearGradient></defs>
<path d="M30 14h60c14 0 22 10 25 26 3 15 3 30-8 32-8 1.5-13-6-19-13H32c-6 7-11 14.5-19 13C2 70 2 55 5 40 8 24 16 14 30 14Z" fill="url(#padg)" stroke="#C9D6EE" stroke-width="1.5"/>
<path d="M34 30v18M25 39h18" stroke="#0A2463" stroke-width="6" stroke-linecap="round"/>
<circle cx="84" cy="31" r="4.6" fill="#0A2463"/><circle cx="95" cy="40" r="4.6" fill="#0A2463"/><circle cx="73" cy="40" r="4.6" fill="#0A2463"/><circle cx="84" cy="49" r="4.6" fill="#0A2463"/></svg>'''
MENU = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true" style="width:26px;height:26px;stroke-width:2.6"><path d="M4 6.5h16M4 12h16M4 17.5h16"/></svg>'
CALF = '<svg viewBox="0 0 24 24" aria-hidden="true" style="width:19px;height:19px"><rect x="2.5" y="4" width="19" height="17.5" rx="3.5" fill="#1F5FD6"/><rect x="2.5" y="4" width="19" height="5" rx="2.5" fill="#1A4FC0"/><path d="M7.5 2.5v4M16.5 2.5v4" stroke="#1A4FC0" stroke-width="2.4" stroke-linecap="round"/><g fill="#fff"><rect x="6" y="11.5" width="2.6" height="2.4" rx=".6"/><rect x="10.7" y="11.5" width="2.6" height="2.4" rx=".6"/><rect x="15.4" y="11.5" width="2.6" height="2.4" rx=".6"/><rect x="6" y="15.8" width="2.6" height="2.4" rx=".6"/><rect x="10.7" y="15.8" width="2.6" height="2.4" rx=".6"/><rect x="15.4" y="15.8" width="2.6" height="2.4" rx=".6"/></g></svg>'
PINF = '<svg viewBox="0 0 24 24" aria-hidden="true" style="width:16px;height:16px"><path d="M12 22.5s-7.5-6.6-7.5-12.6a7.5 7.5 0 0 1 15 0c0 6-7.5 12.6-7.5 12.6Z" fill="#D92D20"/><circle cx="12" cy="9.8" r="2.9" fill="#fff"/></svg>'

def brand3(size=50, fs=15, lh=16, light=False):
    c1 = '#fff' if light else 'var(--navy-900)'; c2 = 'var(--sun-400)' if light else 'var(--blue-600)'
    return (f'<div class="row" style="gap:10px"><span style="width:{size}px;height:{size}px;display:block;flex:none">{LOGO.replace("<svg ","<svg style=\"width:100%;height:100%\" ",1)}</span>'
            f'<div style="font:800 {fs}px/{lh}px var(--font);letter-spacing:-.3px;color:{c1}">Youth Character<br>Summit<br><span style="color:{c2}">YCS 2026</span></div></div>')

# gelombang ornamen (SVG vektor, warna token)
HERO_WAVES = '''<svg viewBox="0 0 366 207" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none" aria-hidden="true">
  <path d="M326 0H366V40C356 22 344 9 326 0Z" fill="#0A2463"/>
  <path d="M302 0H328C346 9 358 22 366 38V52C354 28 332 10 302 0Z" fill="#FFC93C"/>
  <path d="M0 168C20 176 38 190 50 207H0Z" fill="#0A2463"/>
  <path d="M0 160C24 168 46 184 60 207H52C40 190 22 176 0 170Z" fill="#1F5FD6"/>
  <path d="M296 207C324 198 348 184 366 166V207Z" fill="#0A2463"/>
  <path d="M286 207C318 196 346 180 366 156V168C348 184 324 198 296 207Z" fill="#FFC93C"/>
</svg>'''

hero = f'''
<section style="position:relative;height:207px;margin:0 12px;border-radius:24px;overflow:hidden;background:linear-gradient(180deg,#EAF2FF 0%,#F7FAFF 60%,#FFFFFF 100%);box-shadow:var(--e2)">
  <div style="position:absolute;inset:0;-webkit-mask-image:linear-gradient(90deg,transparent 0%,transparent 24%,rgba(0,0,0,.6) 42%,#000 56%);mask-image:linear-gradient(90deg,transparent 0%,transparent 24%,rgba(0,0,0,.6) 42%,#000 56%)">
    <img src="{A}/bali/bg-uludanu2-1440.webp" alt="Pura Ulun Danu Beratan, Bali" style="position:absolute;left:-30px;top:-30px;width:470px;height:294px;max-width:none;object-fit:cover">
  </div>
  {HERO_WAVES}
  <div style="position:absolute;right:12px;top:22px;transform:rotate(-9deg)">
    <span class="t-script" style="display:block;color:var(--navy-900);font-size:25px;line-height:21px;text-shadow:0 0 10px rgba(255,255,255,.9),0 0 3px rgba(255,255,255,.9)">Indonesia<br>&nbsp;&nbsp;&nbsp;Juara</span>
    <svg viewBox="0 0 92 12" style="display:block;width:64px;height:9px;margin:1px 0 0 18px" aria-hidden="true"><path d="M3 9C20 2 34 2 46 6S74 10 89 3" fill="none" stroke="#FFC93C" stroke-width="5" stroke-linecap="round"/></svg>
  </div>
  <div style="position:absolute;left:22px;top:30px;width:230px">
    <div style="font:800 20.5px/24px var(--font);letter-spacing:-.5px;color:var(--navy-900)">Selamat Datang di</div>
    <div style="font:800 39px/42px var(--font);letter-spacing:-1.4px;color:var(--navy-950)">YCS 2026!</div>
    <p style="font:600 10px/13.5px var(--font);color:var(--navy-900);margin-top:6px;width:202px;text-shadow:0 0 6px rgba(255,255,255,.9)">Bersama, kita wujudkan generasi muda berkarakter, berprestasi, dan berdampak.</p>
    <span class="btn btn-sun" style="margin-top:12px;height:36px;padding:0 14px 0 18px;gap:6px;font-size:13px;font-weight:800;box-shadow:0 4px 10px rgba(245,180,0,.35)">Mulai Jelajahi {ic("chev","s16")}</span>
  </div>
</section>
<div class="row" style="justify-content:center;gap:7px;margin-top:6px"><span style="width:9px;height:9px;border-radius:50%;background:var(--navy-900)"></span><span style="width:9px;height:9px;border-radius:50%;background:#C9D3E6"></span><span style="width:9px;height:9px;border-radius:50%;background:#C9D3E6"></span></div>'''

quick = ''.join(f'''<div class="card" style="height:123px;padding:9px 2px 6px;text-align:center;border-radius:16px;box-shadow:var(--e2)">
  <span style="display:block;width:40px;height:40px;margin:0 auto">{ICF[i]}</span>
  <b style="font:800 12.5px/14px var(--font);letter-spacing:-.2px;color:var(--navy-900);margin-top:3px;height:28px;display:grid;place-items:center">{t}</b>
  <span style="display:block;font:500 9px/11px var(--font);letter-spacing:-.1px;color:var(--ink-3);margin-top:2px">{s}</span></div>'''
  for i,t,s in [('trophy','Festival<br>Satu Kata','Rangkai kata, tunjukkan semangatmu!'),('radio','Live','Saksikan langsung keseruan YCS 2026'),('gift','Dana Kaget','Dapatkan kejutan spesial dari YCS!'),('users','Finalis','Kenali para finalis terbaik YCS 2026')])

game = f'''
<div style="position:relative;margin:20px 14px 0;height:96px;border-radius:22px;overflow:hidden;background:linear-gradient(100deg,#0A2463 0%,#11307E 55%,#1A4FC0 100%);box-shadow:var(--e2)">
  <svg viewBox="0 0 362 96" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%" aria-hidden="true"><path d="M268 0C252 40 262 74 362 96V0Z" fill="#1F5FD6" opacity=".55"/><path d="M200 96C250 70 280 40 290 0H268C258 40 240 72 180 96Z" fill="#2F7BFF" opacity=".18"/></svg>
  <svg viewBox="0 0 30 30" style="position:absolute;left:10px;top:14px;width:22px;height:22px" aria-hidden="true"><path d="M5 12 11 8M8 3l3 7" stroke="#FFC93C" stroke-width="3" stroke-linecap="round"/></svg>
  <span style="position:absolute;left:26px;top:24px;width:72px;height:50px;filter:drop-shadow(0 6px 10px rgba(0,0,0,.35))">{PAD.replace("<svg ","<svg style=\"width:100%;height:100%\" ",1)}</span>
  <span style="position:absolute;left:112px;top:18px;bottom:18px;width:1.5px;background:rgba(255,255,255,.35)"></span>
  <div style="position:absolute;left:124px;top:11px;right:48px;transform:rotate(-1.5deg);transform-origin:left center">
    <span style="display:inline-block;background:var(--sun-400);color:var(--navy-900);font:800 10px/20px var(--font);padding:0 9px;border-radius:999px">Game Interaktif</span>
    <b style="display:block;font:800 19px/23px var(--font);letter-spacing:-.2px;color:#fff;margin-top:4px">Festival 1 Kata</b>
    <span style="display:block;font:600 9.5px/12px var(--font);color:#fff;max-width:178px">Rangkai kata terbaikmu, dan jadilah yang terhebat!</span>
  </div>
  <span style="position:absolute;right:12px;top:50%;margin-top:-16px;width:32px;height:32px;border-radius:50%;background:#fff;color:var(--navy-900);display:grid;place-items:center">{ic("chev","s16")}</span>
</div>'''

info = f'''
<div class="card" style="margin:14px 13px 0;height:139px;padding:12px 10px 12px 16px;border-radius:22px;box-shadow:var(--e2);display:grid;grid-template-columns:1fr 1.5px 186px;gap:10px;align-items:center">
  <div>
    <div class="row" style="gap:6px">{CALF}<b style="font:800 12.5px/16px var(--font);color:var(--blue-600)">Informasi Acara</b></div>
    <b style="display:block;font:800 21px/23px var(--font);letter-spacing:-.5px;color:var(--navy-900);margin-top:6px">23 Des –<br>2 Jan 2027</b>
    <div class="row" style="gap:4px;margin-top:8px">{PINF}<span style="font:600 12px/15px var(--font);color:var(--navy-900)">Bali, Indonesia</span></div>
  </div>
  <span style="align-self:stretch;background:var(--line)"></span>
  <div>
    <b style="display:block;text-align:center;font:700 12px/15px var(--font);color:var(--navy-900)">Menuju YCS 2026</b>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin-top:9px">{''.join(f'<div style="background:var(--blue-50);border-radius:10px;text-align:center;padding:9px 0 7px"><b style="display:block;font:800 18px/21px var(--font);color:var(--navy-900);font-variant-numeric:tabular-nums">{n}</b><span style="font:500 9.5px/12px var(--font);color:var(--ink-2)">{l}</span></div>' for n,l in [('35','Hari'),('14','Jam'),('27','Menit'),('18','Detik')])}</div>
  </div>
</div>'''

HOMEF = '<svg viewBox="0 0 24 24" aria-hidden="true" style="width:24px;height:24px"><path d="M2.6 11.2 12 3l9.4 8.2-1.4 1.6-1.3-1.1V21h-5.2v-6h-3v6H5.3v-9.3L4 12.8Z" fill="currentColor"/></svg>'
TABS2 = [(HOMEF,'Beranda'),(ic("trophy","s24"),'Festival'),(ic("cal","s24"),'Jadwal'),('<svg viewBox="0 0 24 24" aria-hidden="true" style="width:24px;height:24px"><circle cx="5" cy="12" r="2.2" fill="currentColor"/><circle cx="12" cy="12" r="2.2" fill="currentColor"/><circle cx="19" cy="12" r="2.2" fill="currentColor"/></svg>','Lainnya')]
tab2 = ''.join(f'<div style="display:grid;justify-items:center;gap:4px;font:{"800" if l=="Beranda" else "600"} 11.5px/1 var(--font);color:{"var(--blue-600)" if l=="Beranda" else "var(--navy-900)"};position:relative;height:100%;align-content:center;{"" if i==0 else "box-shadow:inset 1px 0 0 var(--line);"}">{g}{l}{"<span style=\"position:absolute;bottom:3px;left:14%;right:14%;height:3px;border-radius:2px;background:var(--blue-600)\"></span>" if l=="Beranda" else ""}</div>' for i,(g,l) in enumerate(TABS2))
tabbar2 = f'''<svg viewBox="0 0 390 130" preserveAspectRatio="none" style="position:absolute;left:0;right:0;bottom:0;width:100%;height:130px;z-index:19" aria-hidden="true"><path d="M0 46C70 30 130 26 200 24 280 22 340 14 390 4V130H0Z" fill="#1F5FD6"/><path d="M230 26C300 22 350 14 390 0V12C350 22 300 28 230 26Z" fill="#FFC93C"/><path d="M0 60C80 42 160 38 240 36 310 34 360 28 390 22V130H0Z" fill="#0A2463"/></svg>
<nav style="position:absolute;left:9px;right:9px;bottom:16px;height:73px;background:#fff;border-radius:28px;box-shadow:var(--e3);display:grid;grid-template-columns:repeat(4,1fr);padding:10px 4px;z-index:20">{tab2}</nav><div class="home-ind" style="background:#fff;bottom:4px"></div>'''

beranda = f'''
{status()}
<div style="display:flex;align-items:center;justify-content:space-between;height:67px;padding:0 15px 0 20px">{brand3()}<span style="width:46px;height:46px;border-radius:16px;background:#fff;box-shadow:var(--e1),var(--e2);display:grid;place-items:center;color:var(--navy-900)">{MENU}</span></div>
{hero}
<div style="margin-top:9px;padding:0 13px;display:grid;grid-template-columns:repeat(4,1fr);gap:6px">{quick}</div>
{game}
{info}
{tabbar2}
'''
page('m01-beranda', 'M01 Beranda (mobile)', 390, 844, beranda)

# =====================================================================
# M02 FESTIVAL (stage)
# =====================================================================
bubbles = [(30,300,4,'Ahmad F.','Bersinergi','Jawa Tengah'),(250,290,2,'Yunisa','Keren','Bali'),(60,420,10,'Markus','Berani','Papua'),(262,420,8,'Andi R.','Peduli','Sulsel')]
stage_people = ''
for x,y,k,n,w,p in bubbles:
    stage_people += f'''<div style="position:absolute;left:{x}px;top:{y}px;display:grid;justify-items:center">
      <div style="background:#fff;border-radius:12px;padding:5px 9px;box-shadow:var(--e2);text-align:center;margin-bottom:4px"><b style="font:800 10px/12px var(--font);color:var(--navy-900);display:block">{n}</b><b style="font:800 13px/16px var(--font);color:var(--blue-600);text-transform:uppercase">{w}</b><span style="display:block;font:600 9px/11px var(--font);color:var(--ink-3)">{p}</span></div>
      <img src="{K}/k{k:02d}.png" style="width:44px"></div>'''
me = f'''<div style="position:absolute;left:168px;top:455px;display:grid;justify-items:center">
      <span class="badge b-sun" style="margin-bottom:4px">Kamu</span><img src="{K}/k03.png" style="width:52px;filter:drop-shadow(0 0 6px rgba(255,201,60,.9))"></div>'''
festival = f'''
<div style="position:absolute;inset:0 0 auto 0;height:700px">
  {panggung(104, 390, 700)}
  {stage_people}{me}
</div>
<div style="position:relative;z-index:2">{status()}
<div class="appbar"><span class="btn btn-icon btn-white" style="box-shadow:var(--e2)">{ic("chevl")}</span>
 <div class="row gap6" style="background:rgba(255,255,255,.95);height:40px;padding:0 14px;border-radius:999px;box-shadow:var(--e2)"><span style="width:8px;height:8px;border-radius:50%;background:var(--green-600)"></span><b class="t-sm t-num" style="color:var(--navy-900);font-weight:800">2.418</b><span class="t-xs">warga online</span></div>
 <span class="btn btn-icon btn-white" style="box-shadow:var(--e2)">{ic("share")}</span></div></div>
<div class="sheet" style="z-index:5;padding-bottom:110px;border-radius:28px 28px 0 0;bottom:0;top:auto">
  <div class="grab"></div>
  <div class="row gap10"><div class="input grow" style="height:44px">{ic("search")}<span class="ph">Cari nama teman</span></div><span class="btn btn-primary" style="height:44px">Temukan</span></div>
  <div class="row gap8 mt12" style="overflow:hidden">
    <span class="chip on">Semua</span><span class="chip">Provinsiku</span><span class="chip">Teman sekolah</span><span class="chip">Kata terpopuler</span>
  </div>
  <div class="row gap8 mt12"><span class="btn btn-sm btn-ghost grow">{ic("dl","s16")}Unduh kartu</span><span class="btn btn-sm btn-sun grow">{ic("users","s16")}Ajak teman</span></div>
</div>
{tabbar('Festival')}
'''
page('m02-festival', 'M02 Festival Satu Kata · plaza', 390, 844, festival)

# =====================================================================
# M03 GABUNG FESTIVAL (form, langkah 2 dari 3)
# =====================================================================
kgrid = ''.join(f'''<div style="border-radius:14px;background:{'var(--blue-50)' if k==3 else '#fff'};box-shadow:inset 0 0 0 {'2.5px var(--blue-600)' if k==3 else '1.5px var(--line)'};height:92px;display:grid;place-items:center;position:relative">
  <img src="{K}/k{k:02d}.png" style="height:78px">{'<span style="position:absolute;top:6px;right:6px;width:20px;height:20px;border-radius:50%;background:var(--blue-600);color:#fff;display:grid;place-items:center">'+ic("check","s16")+'</span>' if k==3 else ''}</div>''' for k in [3,4,1,2,13,14,6,5])
gabung = f'''
{status()}
<div class="appbar"><span class="btn btn-icon btn-white" style="box-shadow:var(--e1)">{ic("chevl")}</span><b class="t-h3">Gabung Festival</b><span class="t-xs" style="width:44px;text-align:right">2/3</span></div>
<div class="sec">
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px"><span style="height:6px;border-radius:3px;background:var(--blue-600)"></span><span style="height:6px;border-radius:3px;background:var(--blue-600)"></span><span style="height:6px;border-radius:3px;background:var(--line)"></span></div>
  <div class="row between mt8"><span class="t-xs" style="color:var(--blue-600)">Data diri ✓</span><span class="t-xs" style="color:var(--navy-900)">Kata &amp; karakter</span><span class="t-xs">Gabung</span></div>
  <h1 class="t-h2 mt20">Satu kata buat Indonesia</h1>
  <p class="t-sm mt4">Kata ini akan muncul di atas kepala karaktermu. Pilih yang paling kamu banget.</p>
  <div class="field mt16"><label>Kata harapanmu</label>
    <div class="input focus"><b style="font:800 18px/1 var(--font);color:var(--navy-900);letter-spacing:.5px">BERANI</b><span style="width:2px;height:22px;background:var(--blue-500)"></span><span class="grow"></span><span class="t-xs">6/20</span></div>
    <span class="hint">1 kata saja, tanpa spasi. Kata kasar otomatis ditolak.</span></div>
  <div class="row gap6 mt12" style="flex-wrap:wrap"><span class="t-xs" style="width:100%">Lagi ramai:</span><span class="chip">Peduli</span><span class="chip">Jujur</span><span class="chip">Bersinergi</span><span class="chip">Tangguh</span></div>
  <div class="row between mt24"><b class="t-sm" style="color:var(--navy-900);font-weight:700">Pilih karakter adat</b><span class="t-xs">Saran untuk Jawa Tengah</span></div>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:10px">{kgrid}</div>
  <span class="t-sm" style="display:block;text-align:center;color:var(--blue-600);font-weight:700;margin-top:10px">Lihat 24 karakter {ic("chevd","s16")}</span>
</div>
<div style="position:absolute;left:0;right:0;bottom:0;padding:12px 16px 30px;background:#fff;box-shadow:0 -8px 24px rgba(10,36,99,.08)">
  <span class="btn btn-primary btn-lg btn-block">Lanjut {ic("arrow","s16")}</span><div class="home-ind" style="bottom:8px"></div>
</div>
'''
page('m03-gabung', 'M03 Gabung Festival · langkah 2/3', 390, 844, gabung)

# =====================================================================
# M04 SUKSES + KARTU
# =====================================================================
sukses = f'''
<div style="position:absolute;inset:0;background:radial-gradient(120% 70% at 50% 20%,#2F7BFF 0%,#1F5FD6 35%,#0A2463 100%)"></div>
<div style="position:relative">{status(True)}
<div class="appbar"><span class="btn btn-icon" style="background:rgba(255,255,255,.15);color:#fff">{ic("x")}</span><span></span></div>
<div class="sec" style="text-align:center;color:#fff">
  <span class="badge b-sun">{ic("check","s16")} Kamu resmi jadi warga!</span>
  <h1 class="t-h1 mt12" style="color:#fff">Selamat datang di<br>Festival Satu Kata</h1>
</div>
<div style="margin:22px auto 0;width:300px;border-radius:24px;background:#fff;overflow:hidden;box-shadow:0 30px 60px rgba(0,0,0,.35);transform:rotate(-2deg)">
  <div style="height:150px;position:relative">{panggung(0, 300, 150)}</div>
  <div style="padding:0 18px 18px;position:relative">
    <img src="{K}/k03.png" style="width:82px;margin:-70px auto 0;position:relative">
    <span class="t-over" style="display:block;text-align:center">Aku bagian dari Festival 1 Kata</span>
    <b style="display:block;text-align:center;font:800 40px/44px var(--font);letter-spacing:1px;color:var(--navy-900);margin-top:6px">BERANI</b>
    <div class="row between mt12" style="border-top:1.5px dashed var(--line-2);padding-top:12px"><div><b class="t-sm" style="color:var(--navy-900);font-weight:800;display:block">Rizky A.</b><span class="t-xs">Jawa Tengah · Warga #2.419</span></div><img src="{A}/festival/qr-festival.png" style="width:52px;height:52px"></div>
  </div>
</div>
</div>
<div style="position:absolute;left:16px;right:16px;bottom:34px;display:grid;gap:10px">
  <span class="btn btn-sun btn-lg btn-block">{ic("share","s16")}Ajak 3 teman</span>
  <div class="row gap10"><span class="btn btn-white grow">{ic("dl","s16")}Unduh kartu</span><span class="btn grow" style="background:rgba(255,255,255,.14);color:#fff">Lihat plaza</span></div>
</div>
<div class="home-ind" style="background:#fff"></div>
'''
page('m04-kartu', 'M04 Sukses gabung + kartu share', 390, 844, sukses)

# =====================================================================
# M05 LAWAN MONSTER
# =====================================================================
monster = f'''
{panggung(150, 390, 844, filt='saturate(.6) brightness(.55) hue-rotate(-20deg)')}
<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(22,11,51,.55) 0%,rgba(22,11,51,0) 22%,rgba(22,11,51,0) 55%,rgba(43,31,46,.65) 100%)"></div>
<div style="position:absolute;inset:0;background:radial-gradient(70% 45% at 50% 42%,rgba(255,80,40,.25),transparent 70%)"></div>
<img src="{A}/monster/raja-potret.webp" style="position:absolute;left:50%;top:352px;width:196px;transform:translateX(-50%);filter:drop-shadow(0 20px 30px rgba(0,0,0,.6))">
{''.join(f'<img src="{K}/k{k:02d}.png" style="position:absolute;left:{x}px;top:{y}px;width:40px">' for k,x,y in [(1,30,600),(4,92,640),(6,304,606),(8,252,650)])}
<div style="position:absolute;left:170px;top:622px;display:grid;justify-items:center"><span class="badge b-sun" style="margin-bottom:4px">Kamu</span><img src="{K}/k03.png" style="width:48px"></div>
<div style="position:relative;z-index:3">{status(True)}
<div class="sec">
  <div style="background:rgba(10,6,30,.72);border-radius:18px;padding:12px 14px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.12);backdrop-filter:blur(6px)">
    <div class="row between"><div class="row gap8"><span class="badge b-live">Live</span><b style="font:800 15px/1 var(--font);color:#fff">Raja Batu · Lv 3</b></div><span class="t-xs t-num" style="color:#FFC93C">04:12</span></div>
    <div style="height:12px;border-radius:6px;background:rgba(255,255,255,.12);margin-top:10px;overflow:hidden"><div style="width:58%;height:100%;background:linear-gradient(90deg,#D92D20,#FF8A3D)"></div></div>
    <div class="row between mt8"><span class="t-xs" style="color:#E6DDFF">Nyawa monster 58%</span><span class="t-xs" style="color:#E6DDFF">Warga hidup <b style="color:#fff">1.904/2.418</b></span></div>
  </div>
</div></div>
<div style="position:absolute;left:50%;top:296px;transform:translateX(-50%);z-index:4;white-space:nowrap" class="toast"><span style="color:#FFC93C">{ic("alert")}</span>Jurus datang dalam 2 detik!</div>
<div style="position:absolute;left:16px;right:16px;bottom:34px;z-index:5;display:grid;grid-template-columns:1fr 1.25fr;gap:10px">
  <div style="background:rgba(10,6,30,.72);border-radius:18px;padding:12px;color:#fff;box-shadow:inset 0 0 0 1px rgba(255,255,255,.12)"><span class="t-xs" style="color:#C9BCFF">Tiket kamu</span><b style="display:block;font:800 26px/30px var(--font)" class="t-num">#0418</b><span class="t-xs" style="color:#C9BCFF">327 tap</span></div>
  <span class="btn" style="height:auto;border-radius:18px;background:linear-gradient(180deg,#FFD866,#F5B400);color:#2A1A00;font-size:18px;flex-direction:column;gap:2px;box-shadow:0 0 0 4px rgba(255,201,60,.35),0 10px 24px rgba(245,180,0,.45)">{ic("run","s28")}HINDAR</span>
</div>
<div class="note" style="right:10px;top:440px">Area tap = monster + warga hidup. Meleset → label "Meleset!"</div>
<div class="home-ind" style="background:#fff"></div>
'''
page('m05-monster', 'M05 Lawan Monster · saat jurus', 390, 844, monster)

# =====================================================================
# M06 LIVE
# =====================================================================
def live_item(d,m,st,judul,meta,btn):
    b = {'sel':'<span class="badge b-grey">Selesai</span>','next':'<span class="badge b-blue">Akan datang</span>','live':'<span class="badge b-live">Live</span>'}[st]
    act = {'sel':f'<span class="btn btn-sm btn-outline">{ic("play","s16")}Rekaman</span>','next':f'<span class="btn btn-sm btn-ghost">{ic("bell","s16")}Ingatkan</span>','live':f'<span class="btn btn-sm btn-danger">Tonton</span>'}[st]
    return f'''<div class="card card-pad row gap12 mt10" style="margin-top:10px"><div style="width:48px;height:56px;border-radius:12px;background:var(--blue-50);display:grid;place-items:center;flex:none;text-align:center"><div><b class="t-h3" style="display:block">{d}</b><span class="t-xs">{m}</span></div></div>
    <div class="grow">{b}<b class="t-sm" style="display:block;color:var(--navy-900);font-weight:700;margin-top:6px">{judul}</b><span class="t-xs" style="font-weight:500">{meta}</span></div>{act}</div>'''
live = f'''
{status()}
<div class="appbar"><b class="t-h2">Live</b><span class="btn btn-sm btn-outline">{ic("share","s16")}Bagikan</span></div>
<div class="sec">
  <div style="position:relative;height:210px;border-radius:22px;overflow:hidden"><img src="{A}/ycs-kayak-800.webp" style="width:100%;height:100%;object-fit:cover">
   <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(6,24,64,0) 30%,rgba(6,24,64,.9))"></div>
   <span class="badge b-live" style="position:absolute;left:14px;top:14px">Live · 1,2 rb nonton</span>
   <span style="position:absolute;left:50%;top:70px;margin-left:-28px;width:56px;height:56px;border-radius:50%;background:rgba(255,255,255,.95);display:grid;place-items:center;color:var(--coral-500)">{ic("play","s24")}</span>
   <div style="position:absolute;left:14px;right:14px;bottom:12px"><b style="font:800 18px/22px var(--font);color:#fff">Lawan Monster + Spin HP</b><div class="t-xs" style="color:#DCEBFF">YouTube · 19.00 – 20.00 WIB</div></div>
  </div>
  <div class="row gap8 mt16"><span class="chip on">Semua</span><span class="chip">Akan datang</span><span class="chip">Rekaman</span></div>
  {live_item('18','NOV','live','Lawan Monster + Spin HP','YouTube · 19.00 WIB','')}
  {live_item('25','NOV','next','Kenalan sama 100 finalis','Instagram Live · 19.00 WIB','')}
  {live_item('16','NOV','sel','Pengumuman 100 Finalis YCS 2026','YouTube · 1 j 24 m','')}
  {live_item('12','NOV','sel','Tips lolos penjurian','TikTok Live · 58 m','')}
</div>
{tabbar('Live')}
'''
page('m06-live', 'M06 Live & jadwal', 390, 844, live)

# =====================================================================
# M07 FINALIS
# =====================================================================
fin = [('Nama Finalis','Nama sekolah','Jawa Tengah','GB',3),('Nama Finalis','Nama sekolah','Bali','',2),('Nama Finalis','Nama sekolah','Papua','',10),('Nama Finalis','Nama sekolah','Sulawesi Selatan','GB',8)]
cards = ''.join(f'''<div class="card" style="overflow:hidden"><div style="height:132px;position:relative;background:linear-gradient(160deg,var(--blue-100),var(--blue-50));display:grid;place-items:end center"><img src="{K}/k{img:02d}.png" style="height:120px"><span class="badge b-grey" style="position:absolute;right:8px;bottom:8px;background:rgba(255,255,255,.85)">Foto</span>{'<span class="badge b-sun" style="position:absolute;left:8px;top:8px">Golden Buzzer</span>' if gb else ''}</div>
<div style="padding:10px 12px 12px"><b class="t-sm" style="display:block;color:var(--navy-900);font-weight:800">{n}</b><span class="t-xs" style="display:block;font-weight:500">{s}</span><span class="t-xs" style="display:flex;gap:4px;align-items:center;margin-top:4px;color:var(--blue-600)">{ic("pin","s16")}{p}</span></div></div>''' for n,s,p,gb,img in fin)
finalis = f'''
{status()}
<div class="appbar"><b class="t-h2">Finalis</b><span class="btn btn-sm btn-outline">{ic("share","s16")}Bagikan</span></div>
<div class="sec">
  <div class="card card-pad row gap12" style="background:linear-gradient(135deg,var(--sun-100),#fff)"><span class="ico sun">{ic("trophy")}</span><div class="grow"><b class="t-sm" style="color:var(--navy-900);font-weight:800;display:block">100 finalis dari 34 provinsi</b><span class="t-xs" style="font-weight:500">Diumumkan 16 Nov 2026 · Live YouTube</span></div></div>
  <div class="input mt12">{ic("search")}<span class="ph">Cari nama, sekolah, atau daerah</span></div>
  <div class="row gap8 mt12"><span class="chip on">Semua</span><span class="chip">Golden Buzzer</span><span class="chip">Seleksi umum</span><span class="chip">{ic("filter","s16")}Provinsi</span></div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px">{cards}</div>
</div>
<div style="position:absolute;left:16px;right:16px;bottom:96px;z-index:5" class="card card-pad row gap10"><span class="ico violet">{ic("ticket")}</span><div class="grow"><b class="t-sm" style="color:var(--navy-900);font-weight:800;display:block">Belum lolos?</b><span class="t-xs" style="font-weight:500">Klaim tiket wildcard dari email</span></div><span class="btn btn-sm btn-dark">Klaim</span></div>
{tabbar('Finalis')}
'''
page('m07-finalis', 'M07 Finalis', 390, 844, finalis)

# =====================================================================
# M08 DANA KAGET
# =====================================================================
dana = f'''
{status()}
<div class="appbar"><div class="row gap8"><span class="btn btn-icon btn-white" style="box-shadow:var(--e1)">{ic("chevl")}</span><b class="t-h3">Dana Kaget</b></div><span class="badge b-green">Dibuka · sisa 37</span></div>
<div class="sec">
  <div style="border-radius:22px;padding:18px;background:linear-gradient(135deg,#0F7A4F,#0B5E3E);color:#fff;position:relative;overflow:hidden">
    <span style="position:absolute;right:-14px;bottom:-18px;opacity:.14;color:#fff">{ic("gift","s28").replace('class="i s28"','class="i" style="width:110px;height:110px"')}</span>
    <span class="t-over" style="color:#BFF5DC">Satu orang, satu klaim</span>
    <h1 class="t-h2" style="color:#fff;margin-top:6px">Amankan Dana Kaget sebelum kuota habis</h1>
    <div style="height:8px;border-radius:4px;background:rgba(255,255,255,.2);margin-top:14px"><div style="width:63%;height:100%;border-radius:4px;background:var(--sun-400)"></div></div>
    <div class="row between mt8"><span class="t-xs" style="color:#DDF6EA">63 dari 100 sudah diklaim</span><span class="t-xs" style="color:#fff">Tutup 21.00</span></div>
  </div>
  <div class="field mt20"><label>Kode akses</label><div class="input ok"><b style="font:800 17px/1 var(--font);letter-spacing:2px;color:var(--navy-900)">YCS-7K2QD</b><span class="grow"></span><span style="color:var(--green-600)">{ic("check")}</span></div><span class="hint">Kode dibagikan saat live &amp; di saluran WhatsApp YCS.</span></div>
  <div class="field mt12"><label>Nama lengkap</label><div class="input">{ic("user")}<span>Rizky Aditya Pratama</span></div></div>
  <div class="field mt12"><label>Asal sekolah</label><div class="input">{ic("school")}<span>SMAN 3 Semarang</span></div></div>
  <div class="field mt12"><label>Email</label><div class="input error">{ic("mail")}<span>rizky@gmial.com</span></div><span class="err">{ic("alert","s16")}Maksudnya <u>gmail.com</u>? Ketuk untuk perbaiki.</span></div>
  <div class="row gap10 mt16" style="align-items:flex-start"><span style="width:22px;height:22px;border-radius:7px;background:var(--blue-600);color:#fff;display:grid;place-items:center;flex:none">{ic("check","s16")}</span><span class="t-xs" style="font-weight:500;color:var(--ink-2)">Saya setuju data dipakai panitia untuk menghubungi pemenang. <u>Kebijakan privasi</u></span></div>
</div>
<div style="position:absolute;left:0;right:0;bottom:0;padding:12px 16px 30px;background:#fff;box-shadow:0 -8px 24px rgba(10,36,99,.08)"><span class="btn btn-primary btn-lg btn-block">Klaim sekarang</span><div class="home-ind" style="bottom:8px"></div></div>
'''
page('m08-dana-kaget', 'M08 Dana Kaget · form + validasi', 390, 844, dana)

# =====================================================================
# M09 PUNYA KODE (bottom sheet)
# =====================================================================
kode = f'''
<div style="position:absolute;inset:0;filter:blur(1px)">{status()}{appbar()}
<div style="margin:0 12px;height:500px;border-radius:28px;overflow:hidden"><img src="{A}/bali/bg-uludanu2-m.webp" style="width:100%;height:100%;object-fit:cover"></div></div>
<div class="scrim"></div>
<div class="sheet">
  <div class="grab"></div>
  <div class="row between"><h2 class="t-h2">Punya kode?</h2><span class="btn btn-icon btn-ghost" style="width:36px;height:36px">{ic("x","s16")}</span></div>
  <p class="t-sm mt4">Ketik kode dari live, WhatsApp, atau email. Kami arahkan ke tempat yang tepat.</p>
  <div class="row gap8 mt16">{''.join(f'<span style="flex:1;height:56px;border-radius:14px;box-shadow:inset 0 0 0 {"2px var(--blue-500)" if i==4 else "1.5px var(--line-2)"};display:grid;place-items:center;font:800 22px/1 var(--font);color:var(--navy-900)">{c}</span>' for i,c in enumerate("YCS-7K"))}</div>
  <div class="card card-line mt16" style="padding:12px;display:grid;gap:10px">
    <div class="row gap10"><span class="ico green" style="width:36px;height:36px">{ic("gift","s16")}</span><div class="grow"><b class="t-sm" style="color:var(--navy-900);font-weight:700;display:block">YCS-XXXXX</b><span class="t-xs" style="font-weight:500">Kode Dana Kaget</span></div><span class="badge b-green">Cocok</span></div>
    <div class="row gap10"><span class="ico violet" style="width:36px;height:36px">{ic("ticket","s16")}</span><div class="grow"><b class="t-sm" style="color:var(--navy-900);font-weight:700;display:block">8 karakter</b><span class="t-xs" style="font-weight:500">Tiket wildcard dari email</span></div></div>
  </div>
  <span class="btn btn-primary btn-lg btn-block mt20">Lanjut ke Dana Kaget {ic("arrow","s16")}</span>
  <div class="home-ind" style="bottom:8px"></div>
</div>
'''
page('m09-punya-kode', 'M09 Punya kode? · bottom sheet', 390, 844, kode)

# =====================================================================
# M10 LAINNYA
# =====================================================================
def li(i,c,t,s,b=''):
    return f'<div class="row gap12" style="padding:12px 14px">{f"<span class=\"ico {c}\">{ic(i)}</span>"}<div class="grow"><b class="t-sm" style="color:var(--navy-900);font-weight:700;display:block">{t}</b><span class="t-xs" style="font-weight:500">{s}</span></div>{b}<span style="color:var(--ink-3)">{ic("chev","s16")}</span></div>'
lain = f'''
{status()}
<div class="appbar"><b class="t-h2">Lainnya</b><span class="btn btn-icon btn-white" style="box-shadow:var(--e1)">{ic("moon")}</span></div>
<div class="sec">
  <div class="card" style="padding:4px 0">{li('gift','green','Dana Kaget','Klaim pakai kode akses','<span class="badge b-green">Buka</span>')}{li('ticket','violet','Tiket Wildcard','Untuk yang belum lolos')}{li('bus','blue','Road to Bali','12.840 / 100.000 dukungan')}{li('compass','sun','Survei destinasi','1 menit · Ke mana YCS berikutnya?')}</div>
  <span class="t-over" style="display:block;margin:20px 4px 8px;color:var(--ink-3)">Tentang YCS</span>
  <div class="card" style="padding:4px 0">{li('map','blue','Jejak Bali 2025','Galeri perjalanan sebelumnya')}{li('help','sun','FAQ & syarat delegasi','Gratis? Siapa yang bisa ikut?')}{li('shield','green','Kebijakan privasi','Data apa yang kami simpan')}</div>
  <div class="card card-pad mt16 row gap12" style="background:#E7F8EE;box-shadow:none"><span class="ico green" style="background:#25D366;color:#fff">{ic("wa")}</span><div class="grow"><b class="t-sm" style="color:var(--navy-900);font-weight:800;display:block">Saluran WhatsApp YCS</b><span class="t-xs" style="font-weight:500">Kode Dana Kaget keluar di sini duluan</span></div><span class="btn btn-sm" style="background:#25D366;color:#fff">Ikuti</span></div>
</div>
{tabbar('Lainnya')}
'''
page('m10-lainnya', 'M10 Lainnya (menu)', 390, 844, lain)

# =====================================================================
# D01 DESKTOP BERANDA — v2.1 (MRKT-60): disamakan dengan mockup "Youth Character Summit 2026 Landing Page"
# Koordinat = mockup 1672×941 diskalakan ke 1440×900.
# =====================================================================
dlinks = ''.join(f'<a class="{"on" if i==0 else ""}">{ic(n,"s16")}{l}</a>' for i,(n,l) in enumerate([('home','Beranda'),('msg','Festival Satu Kata'),('radio','Live'),('gift','Dana Kaget'),('users','Finalis')]))
PADB = '''<svg viewBox="0 0 170 120" aria-hidden="true" style="width:100%;height:100%"><defs><linearGradient id="padb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2F7BFF"/><stop offset=".55" stop-color="#1F5FD6"/><stop offset="1" stop-color="#11307E"/></linearGradient></defs>
<path d="M42 20h86c20 0 31 14 35 37 4 21 4 43-11 46-12 2-19-9-27-19H45c-8 10-15 21-27 19C3 100 3 78 7 57c4-23 15-37 35-37Z" fill="url(#padb)"/>
<path d="M44 24h82c16 0 25 9 29 22-30-8-110-8-140 0 4-13 13-22 29-22Z" fill="#fff" opacity=".22"/>
<path d="M48 45v24M36 57h24" stroke="#FFC93C" stroke-width="9" stroke-linecap="round"/>
<circle cx="120" cy="45" r="6.5" fill="#FFC93C"/><circle cx="134" cy="57" r="6.5" fill="#fff"/><circle cx="106" cy="57" r="6.5" fill="#fff"/><circle cx="120" cy="69" r="6.5" fill="#FFC93C"/>
<circle cx="70" cy="80" r="8" fill="#0A2463"/><circle cx="100" cy="80" r="8" fill="#0A2463"/></svg>'''
TROPHY_BIG = '''<svg viewBox="0 0 120 130" aria-hidden="true" style="width:100%;height:100%"><defs><linearGradient id="trg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFE59A"/><stop offset=".45" stop-color="#FFC93C"/><stop offset="1" stop-color="#F5B400"/></linearGradient></defs>
<path d="M28 8h64v14c10-2 20 1 20 12 0 15-13 24-27 25a32 32 0 0 1-17 15v12h12a5 5 0 0 1 5 5v6H35v-6a5 5 0 0 1 5-5h12V74a32 32 0 0 1-17-15C21 58 8 49 8 34c0-11 10-14 20-12Zm-1 22c-6-1-9 .5-9 3.5 0 7 6 12 13 14a58 58 0 0 1-4-17.5Zm66 0a58 58 0 0 1-4 17.5c7-2 13-7 13-14 0-3-3-4.5-9-3.5Z" fill="url(#trg)"/>
<path d="m60 22 5 10 11 1.6-8 7.8 2 11L60 47l-10 5.4 2-11-8-7.8 11-1.6Z" fill="#FFF3CC"/>
<rect x="30" y="102" width="60" height="22" rx="4" fill="#0A2463"/><rect x="40" y="108" width="40" height="8" rx="2" fill="#FFC93C"/></svg>'''
SKYLINE = '''<svg viewBox="0 0 300 90" preserveAspectRatio="xMaxYMax meet" aria-hidden="true" style="width:100%;height:100%"><g fill="#1F5FD6" opacity=".85">
<path d="M150 90V52h4l-2-6h-3l5-8h-6l6-9h-7l7-10h-7l8-11 8 11h-7l7 10h-7l6 9h-6l5 8h-3l-2 6h4v38Z"/>
<path d="M205 90V60h3l-2-5h-3l4-7h-5l5-8h-5l6-9 6 9h-5l5 8h-5l4 7h-3l-2 5h3v30Z"/>
<path d="M95 90V66h3l-2-4h-2l3-6h-4l4-7 4 7h-4l3 6h-2l-2 4h3v24Z"/>
<path d="M250 90c1-16 2-30 6-44-6-2-14 0-19 5 4-7 12-10 19-9-5-5-13-6-19-3 6-6 15-5 21 0 1-7 6-12 13-13-5 4-8 9-8 14 6-4 14-3 18 2-6-2-12-1-16 3 6 0 12 4 13 10-5-5-11-6-16-4-4 13-5 26-5 39Z"/>
<path d="M50 90c1-12 2-22 5-32-5-1-11 0-15 4 3-6 9-8 15-7-4-4-10-5-15-2 5-5 12-4 16 0 1-6 5-9 10-10-4 3-6 7-6 11 5-3 11-2 14 2-5-2-9-1-12 2 5 0 9 3 10 8-4-4-8-5-12-3-3 10-4 19-4 27Z"/>
</g><path d="M0 90c40-10 90-14 150-12s110 4 150-4v16Z" fill="#1F5FD6"/></svg>'''

dl2 = ''.join(f'<a style="display:inline-flex;align-items:center;gap:9px;height:46px;padding:0 {"20px 0 18px" if i==0 else "18px"};border-radius:999px;font:{"800" if i==0 else "700"} 15px/1 var(--font);color:{"#fff" if i==0 else "var(--navy-900)"};background:{"var(--blue-600)" if i==0 else "transparent"}">{g}{l}</a>' for i,(g,l) in enumerate([(HOMEF.replace('width:24px;height:24px','width:20px;height:20px'),'Beranda'),(ic('trophy'),'Festival Satu Kata'),(ic('play').replace('fill="currentColor"','fill="none"'),'Live'),(ic('gift'),'Dana Kaget'),(ic('users'),'Finalis')]))
dq2 = ''.join(f'''<div style="background:#fff;border-radius:22px;box-shadow:var(--e2);height:108px;display:flex;align-items:center;gap:14px;padding:0 16px 0 18px">
  <span style="width:68px;height:68px;border-radius:50%;background:{bg};display:grid;place-items:center;flex:none"><span style="width:42px;height:42px;display:block">{ICF[i]}</span></span>
  <div style="flex:1"><b style="display:block;font:800 16px/21px var(--font);letter-spacing:-.3px;color:var(--navy-900);white-space:nowrap">{t}</b><span style="display:block;font:500 12.5px/17px var(--font);color:var(--ink-2);margin-top:4px">{s}</span></div>
  <span style="width:36px;height:36px;border-radius:50%;background:#fff;box-shadow:var(--e1),0 0 0 1px var(--line);display:grid;place-items:center;color:var(--navy-900);flex:none">{ic("chev","s16")}</span></div>'''
  for i,bg,t,s in [('trophy','var(--sun-100)','Festival Satu Kata','Rangkai kata, tunjukkan<br>semangatmu!'),('radio','var(--coral-100)','Live','Saksikan langsung<br>keseruan YCS 2026'),('gift','var(--sun-100)','Dana Kaget','Dapatkan kejutan<br>spesial dari YCS!'),('users','var(--blue-100)','Finalis','Kenali para finalis<br>terbaik YCS 2026')])
chips = ''.join(f'<span style="position:absolute;left:{x}px;top:{y}px;transform:rotate({r}deg);background:{bg};color:{fg};font:800 {fs}px/1 var(--font);padding:8px 14px;border-radius:12px;box-shadow:0 6px 14px rgba(10,36,99,.18)">{w}</span>' for x,y,r,bg,fg,fs,w in [(566,24,-8,'#fff','var(--navy-900)',16,'Maju'),(640,40,-10,'var(--violet-600)','#fff',11,'Satu Kata'),(584,66,-6,'var(--sun-500)','#fff',17,'Bersama'),(606,104,-6,'var(--coral-500)','#fff',17,'Indonesia'),(560,132,4,'var(--green-100)','var(--green-600)',16,'Untuk')])
d01 = f'''
<div style="position:absolute;inset:0;background:radial-gradient(60% 40% at 18% 8%,#FFFFFF 0%,rgba(255,255,255,0) 70%),radial-gradient(40% 30% at 30% 70%,#FFFFFF 0%,rgba(255,255,255,0) 70%),linear-gradient(180deg,#E3EEFF 0%,#EEF4FF 45%,#F5F8FF 70%,#EAF2FF 100%)"></div>
<div style="position:absolute;left:0;right:0;top:0;height:520px;-webkit-mask-image:linear-gradient(90deg,transparent 22%,rgba(0,0,0,.5) 36%,#000 48%),linear-gradient(180deg,#000 72%,transparent 100%);-webkit-mask-composite:source-in;mask-image:linear-gradient(90deg,transparent 22%,rgba(0,0,0,.5) 36%,#000 48%),linear-gradient(180deg,#000 72%,transparent 100%);mask-composite:intersect;overflow:hidden">
  <img src="{A}/bali/bg-uludanu2-1440.webp" alt="Pura Ulun Danu Beratan, Bali" style="position:absolute;left:330px;top:-84px;width:1240px;height:775px;max-width:none;object-fit:cover">
</div>
<svg viewBox="0 0 1440 900" preserveAspectRatio="none" style="position:absolute;inset:0;width:1440px;height:900px" aria-hidden="true">
  <path d="M0 330C60 360 120 420 150 500L0 520Z" fill="#1F5FD6" opacity=".9"/>
  <path d="M0 392C40 410 80 446 104 500H0Z" fill="#0A2463"/>
  <path d="M0 318C70 350 138 412 164 496H150C124 420 64 362 0 334Z" fill="#FFC93C"/>
  <path d="M1290 470C1350 440 1400 410 1440 380V470Z" fill="#1F5FD6"/>
  <path d="M1270 476C1340 446 1396 412 1440 366V382C1398 414 1346 448 1290 470Z" fill="#FFC93C"/>
  <path d="M0 850C200 820 420 846 720 858 1000 868 1240 846 1440 820V900H0Z" fill="#DCEBFF"/>
  <path d="M0 872C260 846 520 870 800 878 1060 884 1260 868 1440 852V900H0Z" fill="#B9D3FF" opacity=".7"/>
</svg>
<div style="position:absolute;left:39px;top:28px">{brand3(size=54, fs=18, lh=20)}</div>
<nav style="position:absolute;left:293px;top:21px;width:749px;height:60px;background:rgba(255,255,255,.95);border-radius:999px;box-shadow:var(--e2);display:flex;align-items:center;justify-content:space-between;padding:0 24px 0 7px">{dl2}</nav>
<span style="position:absolute;left:1149px;top:21px;width:170px;height:56px;border-radius:999px;background:var(--navy-900);color:#fff;display:flex;align-items:center;justify-content:center;gap:12px;font:800 17px/1 var(--font);box-shadow:0 8px 20px rgba(10,36,99,.3)"><svg viewBox="0 0 24 24" style="width:26px;height:26px" aria-hidden="true"><path d="M7 7h10c3 0 4.5 2 5 5.5.4 3.2.2 6-1.6 6.3-1.4.2-2.4-1-3.4-2.3H7c-1 1.3-2 2.5-3.4 2.3C1.8 18.5 1.6 15.7 2 12.5 2.5 9 4 7 7 7Z" fill="#fff"/><path d="M7.5 10.5v4M5.5 12.5h4" stroke="#0A2463" stroke-width="1.8" stroke-linecap="round"/><circle cx="16.5" cy="11.2" r="1.1" fill="#0A2463"/><circle cx="18.3" cy="13.4" r="1.1" fill="#0A2463"/></svg>Game {ic("arrow","s16")}</span>
<span style="position:absolute;left:1353px;top:28px;width:46px;height:46px;border-radius:50%;background:#fff;box-shadow:var(--e2);display:grid;place-items:center;color:var(--navy-900)"><svg viewBox="0 0 24 24" style="width:22px;height:22px" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" fill="currentColor"/></svg></span>

<span style="position:absolute;left:67px;top:127px;height:40px;padding:0 18px 0 16px;border-radius:999px;background:var(--sun-400);color:var(--navy-900);display:inline-flex;align-items:center;gap:9px;font:800 16.5px/1 var(--font)">{ic("trophy")}Youth Character Summit 2026</span>
<h1 style="position:absolute;left:64px;top:172px;font:800 56px/62px var(--font);letter-spacing:-1.6px;color:var(--navy-900);white-space:nowrap">Selamat Datang di</h1>
<div style="position:absolute;left:66px;top:226px;font:italic 800 84px/90px var(--font);letter-spacing:-2.6px;color:var(--blue-600);white-space:nowrap">YCS 2026!</div>
<svg viewBox="0 0 420 40" style="position:absolute;left:64px;top:296px;width:400px;height:36px" aria-hidden="true"><path d="M6 30C90 14 200 8 300 12c40 2 80 6 110 10" fill="none" stroke="#FFC93C" stroke-width="9" stroke-linecap="round"/></svg>
<svg viewBox="0 0 40 40" style="position:absolute;left:458px;top:224px;width:40px;height:40px" aria-hidden="true"><path d="M8 26 20 14M14 34l20-8M20 6l2 10" stroke="#FFC93C" stroke-width="4" stroke-linecap="round"/></svg>
<p style="position:absolute;left:72px;top:330px;width:400px;font:500 17px/23px var(--font);color:var(--navy-900)">Bersama, kita wujudkan generasi muda berkarakter, berprestasi, dan berdampak.</p>
<span style="position:absolute;left:76px;top:397px;height:46px;padding:0 20px 0 7px;border-radius:999px;background:var(--sun-400);color:var(--navy-900);display:inline-flex;align-items:center;gap:10px;font:800 15px/1 var(--font);box-shadow:0 8px 18px rgba(245,180,0,.35)"><span style="width:32px;height:32px;border-radius:50%;background:var(--navy-900);color:var(--sun-400);display:grid;place-items:center"><svg viewBox="0 0 24 24" style="width:14px;height:14px" aria-hidden="true"><path d="M7 4.8v14.4a.8.8 0 0 0 1.2.7l11.4-7.2a.8.8 0 0 0 0-1.4L8.2 4.1a.8.8 0 0 0-1.2.7Z" fill="currentColor"/></svg></span>Mulai Jelajahi {ic("arrow","s16")}</span>
<div style="position:absolute;left:1180px;top:196px;transform:rotate(-12deg)">
  <span class="t-script" style="display:block;color:#fff;font-size:74px;line-height:62px;text-shadow:0 2px 0 rgba(10,36,99,.35),0 6px 22px rgba(10,36,99,.55)">Indonesia<br>&nbsp;&nbsp;&nbsp;Juara</span>
  <svg viewBox="0 0 180 24" style="display:block;width:170px;height:22px;margin:-2px 0 0 60px" aria-hidden="true"><path d="M6 18C50 6 110 4 174 8" fill="none" stroke="#FFC93C" stroke-width="7" stroke-linecap="round"/></svg>
</div>

<div style="position:absolute;left:67px;top:466px;width:1305px;display:grid;grid-template-columns:repeat(4,1fr);gap:14px">{dq2}</div>

<div style="position:absolute;left:50px;top:600px;width:820px;height:186px;border-radius:26px;overflow:hidden;background:linear-gradient(110deg,#F5F9FF 0%,#DCEBFF 45%,#B9D3FF 100%);box-shadow:var(--e2)">
  <div style="position:absolute;inset:0;background:radial-gradient(30% 50% at 85% 30%,rgba(255,255,255,.9),rgba(255,255,255,0) 70%),radial-gradient(35% 45% at 20% 100%,rgba(255,255,255,.8),rgba(255,255,255,0) 70%)"></div>
  <svg viewBox="0 0 820 186" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%" aria-hidden="true"><path d="M520 186C600 150 700 140 820 150V186Z" fill="#2F7BFF" opacity=".55"/><path d="M560 186C650 162 740 160 820 168V186Z" fill="#1F5FD6"/><path d="M0 160C60 150 120 160 180 186H0Z" fill="#FFC93C" opacity=".85"/>
  <g fill="#FFC93C"><path d="m30 40 4 8 9 1-7 6 2 9-8-5-8 5 2-9-7-6 9-1Z"/></g><g fill="#2F7BFF"><path d="m250 30 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z"/></g><circle cx="60" cy="120" r="4" fill="#6A3DE8"/><rect x="240" y="80" width="10" height="4" rx="2" fill="#FFC93C" transform="rotate(30 245 82)"/></svg>
  <span style="position:absolute;left:30px;top:44px;width:180px;height:128px;transform:rotate(-12deg);filter:drop-shadow(0 12px 16px rgba(10,36,99,.35))">{PADB}</span>
  <div style="position:absolute;left:236px;top:18px;transform:rotate(-3deg);transform-origin:left center">
    <span style="display:inline-block;background:var(--sun-400);color:var(--navy-900);font:800 14px/30px var(--font);padding:0 14px;border-radius:999px">Game Interaktif</span>
    <b style="display:block;font:800 36px/42px var(--font);letter-spacing:-.6px;color:var(--navy-900);margin-top:4px">Festival 1 Kata</b>
    <span style="display:block;font:600 13px/17px var(--font);color:var(--navy-900)">Rangkai kata terbaikmu, dan jadilah yang terhebat!</span>
  </div>
  <span style="position:absolute;left:252px;top:131px;height:39px;padding:0 18px 0 6px;border-radius:999px;background:var(--navy-900);color:#fff;display:inline-flex;align-items:center;gap:10px;font:800 14px/1 var(--font)"><span style="width:28px;height:28px;border-radius:50%;background:var(--sun-400);color:var(--navy-900);display:grid;place-items:center"><svg viewBox="0 0 24 24" style="width:12px;height:12px" aria-hidden="true"><path d="M7 4.8v14.4a.8.8 0 0 0 1.2.7l11.4-7.2a.8.8 0 0 0 0-1.4L8.2 4.1a.8.8 0 0 0-1.2.7Z" fill="currentColor"/></svg></span>Main Sekarang {ic("arrow","s16")}</span>
  {chips}
  <span style="position:absolute;left:706px;top:16px;width:104px;height:114px;filter:drop-shadow(0 10px 14px rgba(10,36,99,.3))">{TROPHY_BIG}</span>
  <svg viewBox="0 0 60 30" style="position:absolute;left:770px;top:110px;width:46px;height:24px" aria-hidden="true"><path d="M4 20C18 4 30 26 56 8" fill="none" stroke="#D92D20" stroke-width="5" stroke-linecap="round"/></svg>
</div>

<div style="position:absolute;left:891px;top:600px;width:504px;height:193px;background:#fff;border-radius:26px;box-shadow:var(--e2);display:grid;grid-template-columns:1fr 1.5px 255px;gap:16px;padding:22px 18px 22px 24px;align-items:start">
  <div>
    <div class="row" style="gap:10px">{CALF.replace('width:19px;height:19px','width:24px;height:24px')}<b style="font:800 17px/22px var(--font);color:var(--navy-900)">Informasi Acara</b></div>
    <b style="display:block;font:800 29px/32px var(--font);letter-spacing:-.6px;color:var(--navy-900);margin-top:22px">23 Des –<br>2 Jan 2027</b>
    <div class="row" style="gap:6px;margin-top:12px">{PINF.replace('width:16px;height:16px','width:20px;height:20px')}<span style="font:600 16px/20px var(--font);color:var(--navy-900)">Bali, Indonesia</span></div>
  </div>
  <span style="align-self:stretch;margin:44px 0 6px;background:var(--line)"></span>
  <div>
    <b style="display:block;text-align:center;font:800 16px/22px var(--font);color:var(--navy-900)">Menuju YCS 2026</b>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:22px">{''.join(f'<div style="background:var(--blue-50);border-radius:14px;text-align:center;height:84px;display:grid;align-content:center"><b style="display:block;font:800 27px/31px var(--font);color:var(--navy-900);font-variant-numeric:tabular-nums">{n}</b><span style="font:500 13px/16px var(--font);color:var(--ink-2)">{l}</span></div>' for n,l in [('35','Hari'),('14','Jam'),('27','Menit'),('18','Detik')])}</div>
  </div>
</div>
<span style="position:absolute;left:1384px;top:772px;width:42px;height:42px;border-radius:50%;background:var(--blue-600);color:#fff;display:grid;place-items:center;box-shadow:0 6px 14px rgba(31,95,214,.4)"><svg class="i" viewBox="0 0 24 24" style="width:20px;height:20px;stroke-width:2.6" aria-hidden="true"><path d="M12 19V5M5.5 11.5 12 5l6.5 6.5"/></svg></span>

<div style="position:absolute;left:39px;top:818px" class="row"><span style="width:52px;height:52px;display:block">{LOGO.replace("<svg ","<svg style=\"width:100%;height:100%\" ",1)}</span><div style="margin-left:10px"><b style="display:block;font:800 18px/20px var(--font);color:var(--navy-900)">YCS 2026</b><span style="font:500 14px/18px var(--font);color:var(--navy-900)">Youth Character Summit</span></div></div>
<span style="position:absolute;left:0;right:0;top:842px;text-align:center;font:800 14px/1 var(--font);letter-spacing:5px;color:var(--navy-900)">BERKARAKTER &nbsp;•&nbsp; BERKOLABORASI &nbsp;•&nbsp; BERDAMPAK</span>
<span style="position:absolute;right:0;bottom:0;width:300px;height:90px">{SKYLINE}</span>
'''
page('d01-beranda', 'D01 Beranda (desktop)', 1440, 900, d01)

# =====================================================================
# D02 DESKTOP FESTIVAL
# =====================================================================
dpeople = ''.join(f'''<div style="position:absolute;left:{x}px;top:{y}px;display:grid;justify-items:center"><div style="background:#fff;border-radius:12px;padding:6px 10px;box-shadow:var(--e2);text-align:center;margin-bottom:4px"><b style="font:800 11px/13px var(--font);color:var(--navy-900);display:block">{n}</b><b style="font:800 15px/18px var(--font);color:var(--blue-600);text-transform:uppercase">{w}</b></div><img src="{K}/k{k:02d}.png" style="width:52px"></div>''' for x,y,k,n,w in [(120,330,4,'Ahmad F.','Bersinergi'),(330,400,2,'Yunisa','Keren'),(560,350,10,'Markus','Berani'),(700,450,8,'Andi R.','Peduli'),(220,480,12,'Dimas','Jujur')])
d02 = f'''
<div class="dnav" style="background:#fff;box-shadow:0 1px 0 var(--line)">{brand()}<div class="links" style="box-shadow:inset 0 0 0 1px var(--line)">{dlinks.replace('class="on"','class=""',1).replace('<a class="">'+ic("msg","s16"),'<a class="on">'+ic("msg","s16"))}</div><span class="btn btn-dark">{ic("key","s16")}Punya kode?</span></div>
<div style="padding:28px 56px 0;display:grid;grid-template-columns:1fr 380px;gap:24px">
  <div>
    <div class="row between"><div><span class="t-over">#SatuKataUntukIndonesia</span><h1 class="t-h1 mt4">Festival Satu Kata</h1></div><div class="row gap8"><div class="input" style="width:300px;height:44px">{ic("search")}<span class="ph">Cari namamu atau temanmu</span></div><span class="btn btn-primary" style="height:44px">Temukan</span></div></div>
    <div style="position:relative;height:620px;border-radius:28px;overflow:hidden;margin-top:16px;background:#bfe0ff;box-shadow:var(--e2)">
      {panggung(0, 924, 620, img='latar-1600.webp')}
      {dpeople}
      <div style="position:absolute;left:440px;top:500px;display:grid;justify-items:center"><span class="badge b-sun" style="margin-bottom:4px">Kamu</span><img src="{K}/k03.png" style="width:60px;filter:drop-shadow(0 0 8px rgba(255,201,60,.9))"></div>
      <div style="position:absolute;left:16px;bottom:16px" class="row gap8"><span class="chip on">Semua</span><span class="chip">Provinsiku</span><span class="chip">Teman sekolah</span></div>
      <div style="position:absolute;right:16px;bottom:16px" class="row gap8"><span class="btn btn-white btn-sm">{ic("dl","s16")}Unduh kartu</span><span class="btn btn-sun btn-sm">{ic("users","s16")}Ajak teman</span></div>
    </div>
  </div>
  <div style="display:grid;gap:16px;align-content:start;padding-top:52px">
    <div class="card" style="padding:20px"><div class="row between"><b class="t-h3">Warga festival</b><span class="badge b-green">{ic("check","s16")} Kamu terdaftar</span></div><b style="font:800 48px/52px var(--font);letter-spacing:-1.5px;color:var(--navy-900);display:block;margin-top:8px" class="t-num">2.418</b><span class="t-sm">pelajar dari 34 provinsi</span></div>
    <div class="card" style="padding:20px"><b class="t-h3">Kata terpopuler</b><div class="row gap8 mt12" style="flex-wrap:wrap">{''.join(f'<span class="chip" style="height:{h}px;font-size:{f}px;{s}">{w}</span>' for w,h,f,s in [('BERANI',40,17,'background:var(--blue-600);color:#fff;box-shadow:none'),('PEDULI',36,15,'background:var(--blue-100);color:var(--blue-700);box-shadow:none'),('JUJUR',34,14,''),('TANGGUH',32,13,''),('BERSINERGI',32,13,''),('KEREN',30,12,'')])}</div></div>
    <div style="border-radius:20px;padding:20px;background:linear-gradient(135deg,#2A1460,#160B33);color:#fff"><div class="row between"><span class="badge b-violet">Pra-live</span><span class="t-xs" style="color:#C9BCFF">mulai 18.40</span></div><b class="t-h3 mt8" style="color:#fff;display:block">Lawan Monster, dapat tiket spin</b><p class="t-sm" style="color:#D7CCFF;margin-top:4px">Monster muncul 20 menit sebelum live. Tap bareng, hindari jurusnya.</p><span class="btn btn-sun btn-sm mt12">{ic("bell","s16")}Ingatkan saya</span></div>
  </div>
</div>
'''
page('d02-festival', 'D02 Festival Satu Kata (desktop)', 1440, 900, d02)

# =====================================================================
# DS DESIGN SYSTEM SHEET
# =====================================================================
def sw(name, var, hexv, dark=False):
    return f'<div><div style="height:72px;border-radius:14px;background:var({var});box-shadow:inset 0 0 0 1px rgba(0,0,0,.06)"></div><b class="t-sm" style="display:block;color:var(--navy-900);font-weight:700;margin-top:8px">{name}</b><span class="t-xs" style="font-weight:500">{var} · {hexv}</span></div>'
colors = [('Navy 900 · ink','--navy-900','#0A2463'),('Navy 950','--navy-950','#061840'),('Blue 600 · primary','--blue-600','#1F5FD6'),('Blue 500','--blue-500','#2F7BFF'),('Blue 100','--blue-100','#DCEBFF'),('Blue 50','--blue-50','#EEF4FF'),
          ('Sun 400 · accent','--sun-400','#FFC93C'),('Sun 100','--sun-100','#FFF3CC'),('Coral 500 · live','--coral-500','#D92D20'),('Green 600 · sukses','--green-600','#0F7A4F'),('Violet 600 · game','--violet-600','#6A3DE8'),('Background','--bg','#F5F8FF'),
          ('Ink','--ink','#0F1B3D'),('Ink 2 · body','--ink-2','#45506B'),('Ink 3 · meta','--ink-3','#5F6982'),('Line','--line','#E1E7F2'),('Line 2','--line-2','#CDD6E6'),('Surface','--surface','#FFFFFF')]
types = [('Display','t-display','40/44 · ExtraBold 800 · -1.2','Selamat, para finalis!'),('H1','t-h1','32/38 · 800 · -0.8','Festival Satu Kata'),('H2','t-h2','24/30 · 800 · -0.5','Jadwal live'),('H3','t-h3','18/24 · 700','Road to Bali'),('Body','t-body','16/24 · Medium 500','Satu orang, satu kata harapan untuk Indonesia.'),('Small','t-sm','14/20 · 500','Kode dibagikan saat live.'),('Caption','t-xs','12/16 · SemiBold 600','Rabu, 23 Des · 08.00 WIB'),('Overline','t-over','12/16 · 800 · +1.4 · CAPS','Kampanye utama')]
ds = f'''
<div style="padding:56px 64px">
 <div class="row between"><div class="row gap16">{LOGO.replace('<svg','<svg style="width:64px;height:64px"')}<div><span class="t-over">YCS 2026 · Design System v2.0</span><h1 style="font:800 56px/60px var(--font);letter-spacing:-1.8px;color:var(--navy-900)">Nusa Cerah</h1></div></div>
 <p class="t-body" style="max-width:520px">Cerah, ramah, dan cepat dipakai: dibuat untuk pengguna 15–35 tahun, mobile-first, kontras AA, target sentuh minimal 44 px. Semua token di sini bernama sama dengan variabel di <b>ds.css</b> dan Figma.</p></div>

 <h2 class="t-h2 mt40">01 · Warna</h2>
 <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:20px;margin-top:16px">{''.join(sw(*c) for c in colors)}</div>
 <div class="row gap12 mt16"><span class="badge b-green">AA</span><span class="t-sm">Navy 900 di atas putih 14,5:1 · Blue 600 di atas putih 5,7:1 · Navy 900 di atas Sun 400 9,5:1 · Coral 500 di atas putih 4,8:1 · Ink 3 di atas background 5,2:1 · teks putih tidak dipakai di atas Sun 400.</span></div>

 <h2 class="t-h2 mt40">02 · Tipografi</h2>
 <p class="t-sm mt4">Plus Jakarta Sans (UI, buatan desainer Indonesia) · Caveat Bold hanya untuk aksen tulisan tangan ("Indonesia Juara"), maksimal 1× per layar.</p>
 <div class="card mt16" style="padding:8px 24px">{''.join(f'<div class="row gap24" style="padding:14px 0;border-bottom:1px solid var(--line)"><div style="width:220px;flex:none"><b class="t-sm" style="color:var(--navy-900);font-weight:800;display:block">{n}</b><span class="t-xs" style="font-weight:500">{s}</span></div><span class="{c}">{e}</span></div>' for n,c,s,e in types)}<div class="row gap24" style="padding:14px 0"><div style="width:220px;flex:none"><b class="t-sm" style="color:var(--navy-900);font-weight:800;display:block">Script aksen</b><span class="t-xs" style="font-weight:500">Caveat 700 · 34–64</span></div><span class="t-script" style="font-size:44px;color:var(--blue-600)">Indonesia Juara</span></div></div>

 <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:40px">
  <div><h2 class="t-h2">03 · Tombol</h2>
   <div class="card mt16" style="padding:24px;display:grid;gap:16px">
    <div class="row gap12" style="flex-wrap:wrap"><span class="btn btn-primary">Primary</span><span class="btn btn-sun">Sun / CTA</span><span class="btn btn-dark">Dark</span><span class="btn btn-ghost">Ghost</span><span class="btn btn-outline">Outline</span></div>
    <div class="row gap12" style="flex-wrap:wrap"><span class="btn btn-danger">{ic("play","s16")}Tonton live</span><span class="btn btn-primary btn-focus">Fokus (keyboard)</span><span class="btn btn-disabled">Nonaktif</span><span class="btn btn-icon btn-ghost">{ic("share")}</span></div>
    <div class="row gap12" style="align-items:center"><span class="btn btn-primary btn-lg">Large 56</span><span class="btn btn-primary">Medium 48</span><span class="btn btn-primary btn-sm">Small 36</span></div>
    <span class="t-xs" style="font-weight:500">Aturan: 1 tombol Sun per layar = aksi utama kampanye. Primary = aksi form. Label kata kerja, maksimal 3 kata.</span>
   </div></div>
  <div><h2 class="t-h2">04 · Badge &amp; chip</h2>
   <div class="card mt16" style="padding:24px;display:grid;gap:16px">
    <div class="row gap8" style="flex-wrap:wrap"><span class="badge b-live">Live</span><span class="badge b-sun">Kampanye utama</span><span class="badge b-blue">Akan datang</span><span class="badge b-green">Dibuka</span><span class="badge b-grey">Selesai</span><span class="badge b-violet">Game</span></div>
    <div class="row gap8" style="flex-wrap:wrap"><span class="chip on">Semua</span><span class="chip">Golden Buzzer</span><span class="chip">Seleksi umum</span><span class="chip">{ic("filter","s16")}Provinsi</span></div>
    <div class="row gap12">{''.join(f'<span class="ico {c}">{ic(i)}</span>' for i,c in [('msg','sun'),('radio','coral'),('gift','green'),('ticket','violet'),('users','blue')])}<span class="t-xs" style="font-weight:500">Ikon tile 44 · warna = jenis fitur (konsisten di semua layar)</span></div>
   </div></div>
 </div>

 <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:40px">
  <div><h2 class="t-h2">05 · Input &amp; status</h2>
   <div class="card mt16" style="padding:24px;display:grid;grid-template-columns:1fr 1fr;gap:16px">
    <div class="field"><label>Default</label><div class="input">{ic("user")}<span class="ph">Nama lengkap</span></div></div>
    <div class="field"><label>Fokus</label><div class="input focus">{ic("mail")}<span>rizky@</span></div></div>
    <div class="field"><label>Valid</label><div class="input ok"><span>YCS-7K2QD</span><span class="grow"></span><span style="color:var(--green-600)">{ic("check")}</span></div></div>
    <div class="field"><label>Error</label><div class="input error"><span>rizky@gmial.com</span></div><span class="err">{ic("alert","s16")}Maksudnya gmail.com?</span></div>
   </div></div>
  <div><h2 class="t-h2">06 · Umpan balik</h2>
   <div class="card mt16" style="padding:24px;display:grid;gap:12px">
    <div class="toast"><span style="color:var(--sun-400)">{ic("check")}</span>Kartu tersimpan ke galeri</div>
    <div class="row gap12 card-line" style="border-radius:14px;padding:12px 14px;background:var(--coral-100)"><span style="color:var(--coral-500)">{ic("alert")}</span><span class="t-sm" style="color:#7A1C16;font-weight:600">Kuota habis. Pantau live berikutnya untuk kode baru.</span></div>
    <div class="row gap12" style="border-radius:14px;padding:12px 14px;background:var(--blue-50)"><span style="color:var(--blue-600)">{ic("info")}</span><span class="t-sm" style="color:var(--navy-900);font-weight:600">Form dibuka saat panitia mengumumkannya lewat live.</span></div>
    <div class="row gap12"><div style="height:14px;border-radius:7px;background:linear-gradient(90deg,#EDF1F8 25%,#F7F9FD 50%,#EDF1F8 75%);flex:1"></div><div style="height:14px;width:30%;border-radius:7px;background:#EDF1F8"></div><span class="t-xs">Skeleton</span></div>
   </div></div>
 </div>

 <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px;margin-top:40px">
  <div><h2 class="t-h2">07 · Radius &amp; elevasi</h2><div class="card mt16" style="padding:24px;display:grid;grid-template-columns:repeat(4,1fr);gap:12px;text-align:center">{''.join(f'<div><div style="height:56px;background:var(--blue-100);border-radius:{r}px"></div><span class="t-xs">{n} {r}</span></div>' for n,r in [('sm',10),('md',14),('lg',20),('xl',28)])}{''.join(f'<div><div style="height:56px;background:#fff;border-radius:14px;box-shadow:var({e})"></div><span class="t-xs">{e[2:]}</span></div>' for e in ['--e1','--e2','--e3'])}<div><div style="height:56px;background:#fff;border-radius:14px;box-shadow:var(--ring)"></div><span class="t-xs">ring</span></div></div></div>
  <div><h2 class="t-h2">08 · Spasi &amp; grid</h2><div class="card mt16" style="padding:24px"><div class="row gap8" style="align-items:flex-end">{''.join(f'<div style="text-align:center"><div style="width:{s}px;height:{s}px;background:var(--sun-400);border-radius:4px"></div><span class="t-xs">{s}</span></div>' for s in [4,8,12,16,24,32,40])}</div><p class="t-sm mt12">Basis 4 pt. Mobile 390: margin 16, gutter 10. Desktop 1440: margin 56, 12 kolom, gutter 24.</p></div></div>
  <div><h2 class="t-h2">09 · Karakter adat (24)</h2><div class="card mt16" style="padding:16px;display:grid;grid-template-columns:repeat(8,1fr);gap:4px">{''.join(f'<img src="{K}/k{k:02d}.png" style="height:52px;margin:auto">' for k in range(1,25))}</div></div>
 </div>

 <h2 class="t-h2 mt40">10 · Navigasi</h2>
 <div style="display:grid;grid-template-columns:420px 1fr;gap:24px;margin-top:16px">
  <div style="position:relative;height:110px;background:var(--bg);border-radius:20px">{tabbar('Festival').replace('<div class="home-ind"></div>','')}</div>
  <div class="card" style="padding:16px;display:flex;align-items:center;justify-content:center;background:#E8EEF9"><div class="dnav" style="padding:0;height:auto;gap:24px"><div class="links">{dlinks}</div><span class="btn btn-sun">{ic("key","s16")}Punya kode?</span></div></div>
 </div>
</div>
'''
page('ds-design-system', 'DS Design System · Nusa Cerah', 1440, 2680, ds)

json.dump(FRAMES, open(f'{OUT}/frames.json','w'), indent=1)
print(len(FRAMES), 'frames')
