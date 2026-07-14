/* =========================================================
   Thalyta Maia — main.js
   Carrossel, nav, menu mobile, reveal, parallax,
   barra de progresso, voltar ao topo, intro do hero.
   Vanilla JS, sem dependências.
   ========================================================= */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- ano do rodapé ---------- */
  var yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- cortina de intro + título letra a letra ---------- */
  function buildLetters() {
    var title = $('.hero__title[data-letters]');
    if (!title) return;
    var text = title.textContent;
    title.setAttribute('aria-label', text);
    title.textContent = '';
    var base = 0.45; // atraso inicial (após intro dos blocos)
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      var span = document.createElement('span');
      span.className = 'char' + (ch === ' ' ? ' space' : '');
      span.setAttribute('aria-hidden', 'true');
      span.textContent = ch === ' ' ? ' ' : ch;
      span.style.transitionDelay = (base + i * 0.045).toFixed(3) + 's';
      title.appendChild(span);
    }
  }

  function initIntro() {
    // cortina injetada por JS (não bloqueia se JS estiver off)
    if (!reduceMotion) {
      var curtain = document.createElement('div');
      curtain.className = 'page-curtain';
      document.body.appendChild(curtain);
      window.setTimeout(function () {
        if (curtain && curtain.parentNode) curtain.parentNode.removeChild(curtain);
      }, 1400);
    }
    buildLetters();
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { document.body.classList.add('loaded'); });
    });
  }

  /* ---------- NAV: vidro fosco ao rolar ---------- */
  var nav = $('#nav');
  function onScrollNav() {
    if (!nav) return;
    if (window.scrollY > 60) nav.classList.add('nav--solid');
    else nav.classList.remove('nav--solid');
  }

  /* ---------- MENU mobile (drawer) ---------- */
  var burger = $('#burger');
  var drawer = $('#drawer');
  var overlay = $('#overlay');
  var drawerClose = $('#drawerClose');

  function openMenu() {
    document.body.classList.add('menu-open');
    if (drawer) { drawer.classList.add('is-open'); drawer.setAttribute('aria-hidden', 'false'); }
    if (overlay) { overlay.hidden = false; requestAnimationFrame(function () { overlay.classList.add('is-open'); }); }
    if (burger) burger.setAttribute('aria-expanded', 'true');
  }
  function closeMenu() {
    document.body.classList.remove('menu-open');
    if (drawer) { drawer.classList.remove('is-open'); drawer.setAttribute('aria-hidden', 'true'); }
    if (overlay) {
      overlay.classList.remove('is-open');
      window.setTimeout(function () { overlay.hidden = true; }, 420);
    }
    if (burger) burger.setAttribute('aria-expanded', 'false');
  }
  if (burger) burger.addEventListener('click', openMenu);
  if (drawerClose) drawerClose.addEventListener('click', closeMenu);
  if (overlay) overlay.addEventListener('click', closeMenu);
  $$('[data-drawerlink]').forEach(function (a) { a.addEventListener('click', closeMenu); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });

  /* ---------- REVEAL on scroll (variantes + stagger) ----------
     Baseado em posição de scroll (robusto p/ clip-path/mask, sem os
     casos de borda do IntersectionObserver). Throttled via rAF. */
  var revealItems = [];
  function checkReveals() {
    if (!revealItems.length) return;
    var vh = window.innerHeight;
    for (var i = revealItems.length - 1; i >= 0; i--) {
      var el = revealItems[i];
      if (el.getBoundingClientRect().top < vh * 0.9) {
        el.classList.add('is-in');
        revealItems.splice(i, 1);
      }
    }
  }
  function initReveal() {
    // define --i para stagger
    $$('[data-stagger]').forEach(function (group) {
      $$('[data-reveal]', group).forEach(function (el, i) { el.style.setProperty('--i', i); });
    });

    var items = $$('[data-reveal]');

    if (reduceMotion) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }

    // atraso individual (data-reveal-delay) fora de grupos stagger
    items.forEach(function (el) {
      var d = el.getAttribute('data-reveal-delay');
      if (d && !el.closest('[data-stagger]')) el.style.transitionDelay = d + 'ms';
    });

    revealItems = items.slice();
    checkReveals();
  }

  /* ---------- CARROSSEL do hero ---------- */
  function initHero() {
    var slides = $$('.hero__slide');
    var dots = $$('.hero__dot');
    if (!slides.length) return;
    var cur = 0, timer = null, INTERVAL = 5000;

    function go(i) {
      cur = (i + slides.length) % slides.length;
      slides.forEach(function (s, k) { s.classList.toggle('is-active', k === cur); });
      dots.forEach(function (d, k) { d.classList.toggle('is-active', k === cur); });
    }
    function start() {
      if (reduceMotion) return;
      stop();
      timer = window.setInterval(function () { go(cur + 1); }, INTERVAL);
    }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }

    dots.forEach(function (d) {
      d.addEventListener('click', function () { go(parseInt(d.getAttribute('data-slide'), 10)); start(); });
    });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else start();
    });
    start();
  }

  /* ---------- PARALLAX (scroll, via rAF) ---------- */
  function initParallax() {
    if (reduceMotion) return;
    var els = $$('[data-parallax]').map(function (el) {
      return { el: el, speed: parseFloat(el.getAttribute('data-parallax')) || 0.05 };
    });
    if (!els.length) return;
    var ticking = false;

    function update() {
      var vh = window.innerHeight;
      els.forEach(function (o) {
        var r = o.el.getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100) return;
        // deslocamento relativo ao centro da viewport
        var center = r.top + r.height / 2;
        var off = (center - vh / 2) * o.speed * -1;
        o.el.style.transform = 'translate3d(0,' + off.toFixed(1) + 'px,0) scale(1.06)';
      });
      ticking = false;
    }
    function onScroll() {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();
  }

  /* ---------- Parallax leve do hero (mouse) ---------- */
  function initHeroMouse() {
    if (reduceMotion) return;
    var hero = $('#hero');
    var slidesWrap = $('#heroSlides');
    if (!hero || !slidesWrap) return;
    hero.addEventListener('mousemove', function (e) {
      var x = (e.clientX / window.innerWidth - 0.5) * 14;
      var y = (e.clientY / window.innerHeight - 0.5) * 10;
      slidesWrap.style.transform = 'translate3d(' + (-x).toFixed(1) + 'px,' + (-y).toFixed(1) + 'px,0)';
    });
    hero.addEventListener('mouseleave', function () { slidesWrap.style.transform = ''; });
  }

  /* ---------- Barra de progresso + voltar ao topo ---------- */
  var progress = $('#scrollProgress');
  var toTop = $('#toTop');
  function onScrollMisc() {
    var st = window.scrollY || document.documentElement.scrollTop;
    var h = document.documentElement.scrollHeight - window.innerHeight;
    var pct = h > 0 ? (st / h) * 100 : 0;
    if (progress) progress.style.width = pct + '%';
    if (toTop) toTop.classList.toggle('is-visible', st > 600);
  }
  if (toTop) toTop.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  });

  /* ---------- scroll handler unificado ---------- */
  var rafPending = false;
  function onScroll() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(function () { onScrollNav(); onScrollMisc(); checkReveals(); rafPending = false; });
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- GALERIA / LIGHTBOX ---------- */
  function initGallery() {
    var lb = $('#lightbox');
    if (!lb) return;
    var lbImg = $('#lbImg'), lbTitle = $('#lbTitle'), lbCount = $('#lbCount'), stage = $('#lbStage');
    var btnClose = $('#lbClose'), btnPrev = $('#lbPrev'), btnNext = $('#lbNext');

    // monta uma galeria por projeto. Projeto com muitas fotos usa palco + miniaturas
    // (.project__media--destaque): a galeria vem das miniaturas e quem abre o lightbox
    // é o palco, na foto em destaque. Os outros seguem com os quadros clicáveis.
    var galleries = $$('.project__media').map(function (media) {
      var project = media.closest('.project');
      var nameEl = project ? project.querySelector('.project__name') : null;
      var title = nameEl ? nameEl.textContent.trim() : '';
      var palco = media.querySelector('.project__palco');
      var thumbs = $$('.project__thumb', media);
      var items = (palco ? thumbs : $$('.frame', media)).map(function (el) {
        var img = el.querySelector('img');
        return {
          el: el,
          src: img ? (img.getAttribute('data-full') || img.getAttribute('src')) : '',
          alt: (img && img.getAttribute('alt')) || title
        };
      });
      return { title: title, items: items, media: media, palco: palco };
    }).filter(function (g) { return g.items.length; });

    if (!galleries.length) return;

    var curG = 0, curI = 0, lastFocus = null;
    function preload(src) { if (src) { var im = new Image(); im.src = src; } }

    function render(swap) {
      var g = galleries[curG], it = g.items[curI], multi = g.items.length > 1;
      function apply() {
        lbImg.src = it.src; lbImg.alt = it.alt;
        lbTitle.textContent = g.title;
        lbCount.textContent = multi ? (curI + 1) + ' / ' + g.items.length : '';
        btnPrev.style.display = multi ? '' : 'none';
        btnNext.style.display = multi ? '' : 'none';
        lbImg.classList.remove('is-swapping');
      }
      if (swap && !reduceMotion) { lbImg.classList.add('is-swapping'); window.setTimeout(apply, 180); }
      else { apply(); }
      preload(g.items[(curI + 1) % g.items.length].src);
      preload(g.items[(curI - 1 + g.items.length) % g.items.length].src);
    }

    function open(gi, ii, origin) {
      curG = gi; curI = ii; lastFocus = origin || document.activeElement;
      render(false);
      document.body.classList.add('lb-lock');
      lb.classList.add('is-open');
      lb.setAttribute('aria-hidden', 'false');
      btnClose.focus();
    }
    function close() {
      lb.classList.remove('is-open');
      lb.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('lb-lock');
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    function go(dir) {
      var n = galleries[curG].items.length;
      curI = (curI + dir + n) % n;
      render(true);
    }

    // torna clicável: o palco (projetos com miniaturas) ou cada quadro (os demais)
    galleries.forEach(function (g, gi) {
      if (g.palco) {
        var conta = g.media.querySelector('.project__conta');
        var atual = 0;
        function destacar(i) {
          atual = i;
          var it = g.items[i];
          g.palco.querySelector('img').src = it.src;
          g.palco.querySelector('img').alt = it.alt;
          if (conta) conta.textContent = (i + 1) + ' / ' + g.items.length;
          g.items.forEach(function (o, j) { o.el.classList.toggle('is-ativa', j === i); });
        }
        g.items.forEach(function (it, ii) {
          it.el.addEventListener('click', function () { destacar(ii); });
        });
        g.palco.setAttribute('role', 'button');
        g.palco.setAttribute('tabindex', '0');
        g.palco.setAttribute('aria-label', 'Ampliar imagem — ' + g.title);
        g.palco.addEventListener('click', function () { open(gi, atual, g.palco); });
        g.palco.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(gi, atual, g.palco); }
        });
        destacar(0);
        return;
      }
      g.items.forEach(function (it, ii) {
        var f = it.el;
        f.setAttribute('role', 'button');
        f.setAttribute('tabindex', '0');
        f.setAttribute('aria-label', 'Ampliar imagem — ' + g.title + ' (' + (ii + 1) + ' de ' + g.items.length + ')');
        f.addEventListener('click', function () { open(gi, ii, f); });
        f.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(gi, ii, f); }
        });
      });
    });

    btnClose.addEventListener('click', close);
    btnPrev.addEventListener('click', function () { go(-1); });
    btnNext.addEventListener('click', function () { go(1); });
    lb.addEventListener('click', function (e) {
      if (!stage.contains(e.target) && !e.target.closest('.lightbox__btn')) close();
    });
    document.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
    });

    // swipe em telas touch
    var sx = null;
    stage.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    stage.addEventListener('touchend', function (e) {
      if (sx === null) return;
      var dx = e.changedTouches[0].clientX - sx; sx = null;
      if (Math.abs(dx) > 50 && galleries[curG].items.length > 1) go(dx < 0 ? 1 : -1);
    }, { passive: true });
  }

  /* ---------- categorias do portfólio: 3 capas + "Ver todos" ----------
     Cada categoria mostra só a primeira linha do grid; o botão revela o resto.
     Roda ANTES do initReveal: os cards escondidos já nascem com .is-in e
     aparecem na hora ao expandir, sem esperar um novo scroll. */
  function initProjectGroups() {
    var MAX_VISIVEL = 3;
    $$('.projetos__grupo').forEach(function (grupo) {
      var grid = $('.projetos__grid', grupo);
      if (!grid) return;
      var total = $$('.project', grid).length;
      if (total <= MAX_VISIVEL) return;

      grupo.classList.add('is-collapsed');

      var wrap = document.createElement('div');
      wrap.className = 'projetos__more-wrap';
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'projetos__more';
      btn.setAttribute('aria-expanded', 'false');
      var rotuloVer = 'Ver todos os projetos (' + total + ')';
      btn.textContent = rotuloVer;
      wrap.appendChild(btn);
      grupo.appendChild(wrap);

      btn.addEventListener('click', function () {
        var recolhido = grupo.classList.toggle('is-collapsed');
        btn.setAttribute('aria-expanded', String(!recolhido));
        btn.textContent = recolhido ? rotuloVer : 'Mostrar menos';
        // ao recolher, a página encurta — volta ao título pra não "cair" em outra seção
        if (recolhido) {
          var titulo = $('.projetos__group-title', grupo);
          if (titulo && titulo.getBoundingClientRect().top < 0) {
            titulo.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
          }
        }
      });
    });
  }

  /* ---------- init ---------- */
  function init() {
    initIntro();
    initProjectGroups();
    initReveal();
    initHero();
    initParallax();
    initHeroMouse();
    initGallery();
    onScrollNav();
    onScrollMisc();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
