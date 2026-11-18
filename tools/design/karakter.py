import base64, sys, os
from playwright.sync_api import sync_playwright
WT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','..')
js=open(f'{WT}/assets/js/festival.js').read()
patch="""
const _ce=document.createElement.bind(document);
document.createElement=function(t){const el=_ce(t); if(t==='canvas'){const S=4;let w=300,h=150;
 Object.defineProperty(el,'width',{get(){return w},set(v){w=v;HTMLCanvasElement.prototype.__lookupSetter__('width').call(el,v*S)}});
 Object.defineProperty(el,'height',{get(){return h},set(v){h=v;HTMLCanvasElement.prototype.__lookupSetter__('height').call(el,v*S)}});
 const g=el.getContext.bind(el); el.getContext=function(k){const c=g(k); c.setTransform(S,0,0,S,0,0); return c;};}
 return el;};
"""
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page()
    pg.set_content('<div id=x></div>')
    pg.add_script_tag(content=patch); pg.add_script_tag(content=js)
    n=pg.evaluate('YCSFestival.MODEL.length')
    for i in range(1,n+1):
        d=pg.evaluate(f"(()=>{{const e=document.getElementById('x');YCSFestival.gambarModel(e,{i});return e.querySelector('canvas').toDataURL('image/png')}})()")
        open(f'{WT}/design/img/karakter/k{i:02d}.png','wb').write(base64.b64decode(d.split(',')[1]))
    print(n, pg.evaluate('JSON.stringify(YCSFestival.MODEL)'))
    b.close()
