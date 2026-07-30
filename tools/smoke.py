#!/usr/bin/env python3
"""Smoke check do site. Sem dependencias: python tools/smoke.py

Pega o que quebra em silencio: asset referenciado que nao existe no disco,
e elemento que o main.js procura mas o HTML nao tem (o JS faz early-return,
entao a feature some sem nenhum erro no console).
"""
import os
import re
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGINAS = ['index.html', 'hero-bernardes/index.html']

# id/classe que o main.js consulta -> o que deixa de funcionar se sumir
EXIGIDOS = {
    '#lightbox': 'lightbox da galeria',
    '.project__palco': 'palco dos projetos',
}

erros = []


def ler(pagina):
    """Sem os comentarios: o que esta comentado nao renderiza, entao nao vale
    checar (o template do antes/depois aponta para uma foto que ainda nao veio)."""
    with open(os.path.join(RAIZ, pagina), encoding='utf-8') as f:
        return re.sub(r'<!--.*?-->', '', f.read(), flags=re.S)


def checar_assets(pagina, html):
    base = os.path.dirname(os.path.join(RAIZ, pagina))
    refs = set(re.findall(r'(?:src|href)="([^"]+)"', html))
    refs |= set(re.findall(r"url\('([^']+)'\)", html))
    for ref in refs:
        if ref.startswith(('http', 'mailto:', 'tel:', '#', 'data:')):
            continue
        caminho = os.path.normpath(os.path.join(base, ref.split('?')[0]))
        if not os.path.isfile(caminho):
            erros.append('%s: asset inexistente -> %s' % (pagina, ref))


def checar_exigidos(pagina, html):
    for sel, oque in EXIGIDOS.items():
        marca = 'id="%s"' % sel[1:] if sel[0] == '#' else 'class="%s' % sel[1:]
        if marca not in html and ' %s"' % sel[1:] not in html:
            erros.append('%s: falta %s (%s)' % (pagina, sel, oque))


def checar_antes_depois(pagina, html):
    figuras = re.findall(r'<figure class="ad">(.*?)</figure>', html, re.S)
    for fig in figuras:
        if 'ad__depois' not in fig:
            erros.append('%s: figure.ad sem a img .ad__depois (nada para revelar)' % pagina)
        if 'ad__range' not in fig:
            erros.append('%s: figure.ad sem input.ad__range (o divisor nao se move)' % pagina)
        if 'aria-label' not in fig:
            erros.append('%s: input.ad__range sem aria-label' % pagina)


for pagina in PAGINAS:
    if not os.path.isfile(os.path.join(RAIZ, pagina)):
        erros.append('pagina ausente: %s' % pagina)
        continue
    html = ler(pagina)
    checar_assets(pagina, html)
    checar_exigidos(pagina, html)
    checar_antes_depois(pagina, html)

if erros:
    print('FALHOU (%d):' % len(erros))
    for e in erros:
        print('  - ' + e)
    sys.exit(1)
print('OK — %s verificadas' % ', '.join(PAGINAS))
