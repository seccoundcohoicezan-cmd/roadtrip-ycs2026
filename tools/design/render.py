import json, sys, os
from playwright.sync_api import sync_playwright
D=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','..','design'); OUT=sys.argv[1]; only=sys.argv[2:]
os.makedirs(OUT, exist_ok=True)
fr=json.load(open(f'{D}/frames.json'))
with sync_playwright() as p:
    b=p.chromium.launch()
    for f in fr:
        if only and not any(o in f['file'] for o in only): continue
        ctx=b.new_context(viewport={'width':f['w'],'height':f['h']},device_scale_factor=2 if f['w']<1000 else 1)
        pg=ctx.new_page(); errs=[]
        pg.on('requestfailed', lambda r: errs.append(r.url))
        pg.goto('file://'+D+'/'+f['file']); pg.wait_for_load_state('networkidle'); pg.evaluate('document.fonts.ready'); pg.wait_for_timeout(300)
        pg.locator('main').screenshot(path=f"{OUT}/{f['file'][:-5]}.png")
        bad=[e for e in errs if 'fonts.g' not in e]
        print(f['file'], 'MISSING' if bad else 'ok', bad[:3]); ctx.close()
    b.close()
