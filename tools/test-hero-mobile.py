"""Regressao do hero-bernardes no mobile: python tools/test-hero-mobile.py

Um swipe tem que avancar exatamente um slide sem a pagina rolar, e a ultima tela
tem que entregar o scroll pra pagina. Sem o touch-action do .heroB o browser entra
em modo scroll no primeiro touchmove curto (o guard de < 20px retorna sem
preventDefault), os touchmove seguintes viram nao-cancelaveis e o hero perde o gesto.

Precisa de playwright (pip install playwright && playwright install chromium).
Se nao estiver instalado, pula — o site nao depende disto em runtime.
"""
import pathlib
import sys

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    print('playwright ausente — pulando (pip install playwright)')
    raise SystemExit(0)

URL = (pathlib.Path(__file__).resolve().parent.parent / 'hero-bernardes' / 'index.html').as_uri()
DURACAO = 800
falhas = []


def swipe(cdp, x=200, y0=600, delta=1, passos=(5, 15, 30, 50, 80, 120)):
    """delta=1 sobe o dedo (avanca), delta=-1 desce (volta)."""
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart',
                                          'touchPoints': [{'x': x, 'y': y0}]})
    for d in passos:
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove',
                                              'touchPoints': [{'x': x, 'y': y0 - d * delta}]})
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})


def estado(page):
    return page.evaluate("""() => ({
        ativo: [...document.querySelectorAll('.heroB__slide')].findIndex(s => s.classList.contains('is-active')),
        total: document.querySelectorAll('.heroB__slide').length,
        isLast: document.getElementById('hero').classList.contains('is-last'),
        touchAction: getComputedStyle(document.getElementById('hero')).touchAction,
        scrollY: Math.round(window.scrollY),
    })""")


with sync_playwright() as pw:
    nav = pw.chromium.launch()

    # ---------- mobile ----------
    ctx = nav.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=3,
                          is_mobile=True, has_touch=True)
    page = ctx.new_page()
    page.goto(URL)
    page.wait_for_timeout(600)
    cdp = ctx.new_cdp_session(page)

    e = estado(page)
    total = e['total']
    print('slides: %d | touch-action inicial: %s' % (total, e['touchAction']))
    if e['touchAction'] != 'none':
        falhas.append('touch-action inicial = %s, esperado none' % e['touchAction'])

    # avanca ate a ultima: cada swipe = exatamente 1 slide, pagina parada
    for esperado in range(1, total):
        swipe(cdp)
        page.wait_for_timeout(DURACAO + 250)
        e = estado(page)
        print('  swipe -> slide %d (esperado %d), scrollY=%d' % (e['ativo'], esperado, e['scrollY']))
        if e['ativo'] != esperado:
            falhas.append('swipe %d: slide ativo %d, esperado %d' % (esperado, e['ativo'], esperado))
        if e['scrollY'] > 4:
            falhas.append('swipe %d: pagina rolou %dpx dentro do hero' % (esperado, e['scrollY']))

    e = estado(page)
    if not e['isLast']:
        falhas.append('faltou a classe is-last na ultima tela')
    if e['touchAction'] != 'pan-y':
        falhas.append('touch-action na ultima = %s, esperado pan-y' % e['touchAction'])

    # na ultima, o gesto tem que ENTREGAR o scroll pra pagina
    swipe(cdp)
    page.wait_for_timeout(600)
    e = estado(page)
    print('  swipe na ultima -> scrollY=%d (tem que sair do hero)' % e['scrollY'])
    if e['scrollY'] <= 4:
        falhas.append('na ultima tela o swipe nao entregou o scroll pra pagina (scrollY=%d)' % e['scrollY'])

    # ---------- desktop: o wheel nao pode ter regredido ----------
    ctx2 = nav.new_context(viewport={'width': 1440, 'height': 900})
    p2 = ctx2.new_page()
    p2.goto(URL)
    p2.wait_for_timeout(600)
    p2.mouse.move(700, 450)
    p2.mouse.wheel(0, 400)
    p2.wait_for_timeout(DURACAO + 250)
    e2 = estado(p2)
    print('desktop wheel -> slide %d, scrollY=%d' % (e2['ativo'], e2['scrollY']))
    if e2['ativo'] != 1:
        falhas.append('desktop: wheel deveria ir pro slide 1, foi pro %d' % e2['ativo'])
    if e2['scrollY'] > 4:
        falhas.append('desktop: pagina rolou %dpx dentro do hero' % e2['scrollY'])

    nav.close()

if falhas:
    print('\nFALHOU (%d):' % len(falhas))
    for f in falhas:
        print('  - ' + f)
    sys.exit(1)
print('\nOK — jornada mobile completa + wheel do desktop intacto')
