(function () {
  'use strict';

  // Hero slideshow
  var slides = Array.prototype.slice.call(document.querySelectorAll('[data-hero-slide]'));
  var dots = Array.prototype.slice.call(document.querySelectorAll('[data-hero-dot]'));
  var caption = document.querySelector('[data-hero-caption]');
  var heroIndex = 0;
  var heroTimer = null;

  function showHero(i) {
    var n = slides.length;
    if (!n) return;
    heroIndex = ((i % n) + n) % n;
    slides.forEach(function (img, k) {
      img.style.opacity = k === heroIndex ? '1' : '0';
    });
    dots.forEach(function (btn, k) {
      var bar = btn.querySelector('span');
      if (!bar) return;
      bar.style.width = k === heroIndex ? '28px' : '8px';
      bar.style.background = k === heroIndex ? '#F2D16B' : 'rgba(255,255,255,0.6)';
    });
    if (caption) caption.textContent = '写真：' + (slides[heroIndex].getAttribute('data-caption') || '');
  }

  function startHero() {
    if (slides.length < 2) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    clearInterval(heroTimer);
    heroTimer = setInterval(function () { showHero(heroIndex + 1); }, 5000);
  }

  dots.forEach(function (btn, k) {
    btn.addEventListener('click', function () { showHero(k); startHero(); });
  });
  var heroPrev = document.querySelector('[data-hero-prev]');
  var heroNext = document.querySelector('[data-hero-next]');
  if (heroPrev) heroPrev.addEventListener('click', function () { showHero(heroIndex - 1); startHero(); });
  if (heroNext) heroNext.addEventListener('click', function () { showHero(heroIndex + 1); startHero(); });
  startHero();

  // FAQ accordion
  Array.prototype.forEach.call(document.querySelectorAll('[data-faq-toggle]'), function (btn) {
    btn.addEventListener('click', function () {
      var item = btn.parentElement;
      var panel = item.querySelector('[data-faq-panel]');
      var icon = btn.querySelector('svg');
      if (!panel) return;
      var open = panel.hidden;
      panel.hidden = !open;
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      item.style.borderColor = open ? '#2F5D46' : '#E3E1DA';
      if (icon) icon.style.transform = open ? 'rotate(180deg)' : 'rotate(0deg)';
    });
  });

  // Photo gallery
  var galMain = document.querySelector('[data-gal-main]');
  var galCount = document.querySelector('[data-gal-count]');
  var thumbs = Array.prototype.slice.call(document.querySelectorAll('[data-gal-thumb]'));
  var galIndex = 0;

  function showGal(i) {
    var n = thumbs.length;
    if (!n || !galMain) return;
    galIndex = ((i % n) + n) % n;
    var t = thumbs[galIndex];
    galMain.src = t.getAttribute('data-src');
    galMain.alt = t.getAttribute('data-alt') || '';
    if (galCount) galCount.textContent = (galIndex + 1) + ' / ' + n;
    thumbs.forEach(function (btn, k) {
      btn.style.borderColor = k === galIndex ? '#F2D16B' : 'transparent';
      btn.style.opacity = k === galIndex ? '1' : '0.6';
    });
  }

  thumbs.forEach(function (btn, k) {
    btn.addEventListener('click', function () { showGal(k); });
  });
  var galPrev = document.querySelector('[data-gal-prev]');
  var galNext = document.querySelector('[data-gal-next]');
  if (galPrev) galPrev.addEventListener('click', function () { showGal(galIndex - 1); });
  if (galNext) galNext.addEventListener('click', function () { showGal(galIndex + 1); });
})();
