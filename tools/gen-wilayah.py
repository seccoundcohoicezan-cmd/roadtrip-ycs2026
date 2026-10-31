"""Bangun assets/data/wilayah.json (38 provinsi → kabupaten/kota) dari wilayah.sql.

Sumber: https://github.com/cahyadsn/wilayah (MIT). Pakai: python3 tools/gen-wilayah.py path/ke/wilayah.sql
"""
import json
import re
import sys
from pathlib import Path

NAMA_PROV = {'Daerah Khusus Ibukota Jakarta': 'DKI Jakarta', 'Daerah Istimewa Yogyakarta': 'DI Yogyakarta'}

src = Path(sys.argv[1]).read_text(encoding='utf-8')
prov, reg = {}, {}
for kode, nama in re.findall(r"\('(\d{2}(?:\.\d{2})?)','([^']+)'\)", src):
    nama = re.sub(r'\s+', ' ', nama).strip()
    if '.' in kode:
        reg.setdefault(kode[:2], []).append(nama.replace('Kabupaten ', 'Kab. '))
    else:
        prov[kode] = NAMA_PROV.get(nama, nama)
data = {prov[k]: sorted(reg.get(k, []), key=lambda s: s.replace('Kab. ', '').replace('Kota ', '')) for k in sorted(prov, key=lambda k: prov[k])}
out = Path(__file__).resolve().parent.parent / 'assets' / 'data' / 'wilayah.json'
out.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print(out, len(data), 'provinsi,', sum(map(len, data.values())), 'kab/kota')
