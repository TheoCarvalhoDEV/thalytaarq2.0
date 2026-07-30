#!/usr/bin/env python3
"""Converte fotos novas para webp: python tools/webp.py [pasta]

Padrao: assets/projetos. Gera o .webp ao lado do .jpg/.png e NAO apaga o
original (apague voce, depois de conferir). Requer Pillow, que ja esta
instalado na maquina — o site nao depende disto em runtime.

ponytail: 1400px/q72 foi o ponto onde 18MB viraram 3MB sem perda visivel no
palco do portfolio. Se a Thalyta reclamar de nitidez, suba a quality antes
do lado maior.
"""
import glob
import os
import sys

from PIL import Image

LADO_MAIOR = 1400
QUALIDADE = 72

pasta = sys.argv[1] if len(sys.argv) > 1 else 'assets/projetos'
arquivos = sorted(
    glob.glob(os.path.join(pasta, '**', '*.jpg'), recursive=True) +
    glob.glob(os.path.join(pasta, '**', '*.jpeg'), recursive=True) +
    glob.glob(os.path.join(pasta, '**', '*.png'), recursive=True)
)

if not arquivos:
    print('nada para converter em %s' % pasta)
    raise SystemExit(0)

antes = depois = 0
for f in arquivos:
    saida = os.path.splitext(f)[0] + '.webp'
    if os.path.exists(saida):
        continue
    im = Image.open(f)
    if im.mode in ('RGBA', 'P', 'LA'):
        im = im.convert('RGB')
    im.thumbnail((LADO_MAIOR, LADO_MAIOR))
    im.save(saida, 'WEBP', quality=QUALIDADE, method=6)
    antes += os.path.getsize(f)
    depois += os.path.getsize(saida)
    print('%s -> %s (%d KB -> %d KB)' % (f, saida, os.path.getsize(f) // 1024,
                                         os.path.getsize(saida) // 1024))

if antes:
    print('\ntotal: %d KB -> %d KB' % (antes // 1024, depois // 1024))
    print('confira as imagens e apague os originais com: git rm %s/**/*.jpg' % pasta)
else:
    print('todos os .webp ja existiam')
