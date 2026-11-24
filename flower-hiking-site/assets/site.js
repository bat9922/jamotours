(function () {
  'use strict';

  // Remove malformed duplicate CSS text accidentally emitted at the top of this page.
  if (window.location.pathname.indexOf('terelj-day-flower-hiking.html') !== -1) {
    Array.prototype.forEach.call(document.body.childNodes, function (node) {
      if (node.nodeType === Node.TEXT_NODE && node.textContent.indexOf('*{box-sizing:border-box}') !== -1) {
        node.parentNode.removeChild(node);
      }
    });
  }

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

  // Khuvsgul accommodation facilities
  if (window.location.pathname.indexOf('khuvsgul-lake-hyasaa-flower-hiking-5n6d.html') !== -1) {
    var scheduleRows = document.querySelectorAll('.table-wrap tbody tr');
    var dayOne = scheduleRows[0];
    if (dayOne) {
      var dayOneCells = dayOne.querySelectorAll('td');
      if (dayOneCells.length >= 2) {
        dayOneCells[0].innerHTML = 'チンギスハーン国際空港に到着後、日本語ガイドがお迎えします。専用車でウランバートル市内ホテルへ移動します。';
        dayOneCells[1].innerHTML = '<b>ウランバートル市内ホテル</b>';
      }
    }
    var dayTwo = scheduleRows[1];
    if (dayTwo) {
      var dayTwoCells = dayTwo.querySelectorAll('td');
      if (dayTwoCells.length >= 2) {
        dayTwoCells[0].innerHTML = '<strong>ウランバートル空港 → ムルン → フブスグル湖</strong><br>朝、ウランバートル空港へ移動し、国内線でムルンへ向かいます。ムルン空港で日本語ガイドと合流後、専用車でフブスグル湖畔へ移動。到着後は湖を望むゲルキャンプにチェックインし、休息の後に湖畔をゆっくり散策します。夕食はゲルキャンプでお楽しみください。<div><span class="tag">国内線</span><span class="tag">専用車移動</span><span class="tag">湖畔散策</span><span class="tag">ゲルキャンプ泊</span><span class="tag">食事：朝／昼／夕</span></div>';
        dayTwoCells[1].innerHTML = '<b>フブスグルゲル</b><div><span class="tag">温水シャワー</span><span class="tag">トイレ</span><span class="tag">充電</span></div>';
      }
    }
    var dayThree = scheduleRows[2];
    if (dayThree) {
      var dayThreeCells = dayThree.querySelectorAll('td');
      if (dayThreeCells.length >= 2) {
        dayThreeCells[0].innerHTML = '<strong>ヒャサ山麓・花畑ハイキング</strong><br>草原から森林と山並みへ変わる景観を楽しみます。花畑を歩き、ヒャサ山のふもとのハイキングコースで高山植物を観察。夕方は夕日を眺め、晴れた夜は星空を楽しみます。<div><span class="tag">花畑ハイキング</span><span class="tag">高山植物観察</span><span class="tag">夕日・星空</span></div>';
        dayThreeCells[1].innerHTML = '<b>フブスグルゲル</b><div><span class="tag">温水シャワー</span><span class="tag">トイレ</span><span class="tag">充電</span></div>';
      }
    }
    var dayFour = scheduleRows[3];
    if (dayFour) {
      var dayFourCells = dayFour.querySelectorAll('td');
      if (dayFourCells.length >= 2) {
        dayFourCells[1].innerHTML = '<b>フブスグルゲル</b><div><span class="tag">温水シャワー</span><span class="tag">トイレ</span><span class="tag">充電</span></div>';
      }
    }
    var priceBox = document.querySelector('.price');
    if (priceBox) {
      priceBox.innerHTML = '<table><thead><tr><th style="width:30%;text-align:center;font-size:24px;white-space:nowrap">4名ご参加：￥260,000／一人</th><th style="text-align:left;font-size:20px">※ 2名または3名でツアー開催：追加料金 ￥60,000／一人<br>※ 1名開催：追加料金 ￥80,000（お一人貸切プライベート旅！）<br>※ 12歳以下のお子様料金：30％割引</th></tr></thead></table>';
    }
    var heroAccommodation = document.querySelector('.hero .pills .pill:nth-child(3)');
    if (heroAccommodation) {
      heroAccommodation.textContent = 'ホテル2泊・ゲル3泊';
    }
    var accommodationIncluded = document.querySelector('.two .panel:first-child ul li:nth-child(2)');
    if (accommodationIncluded) {
      accommodationIncluded.textContent = 'ホテル2泊、フブスグル湖畔のゲル3泊';
    }
    var excludedList = document.querySelector('.two .panel:nth-child(2) ul');
    if (excludedList && !document.querySelector('[data-single-room-surcharge]')) {
      var surcharge = document.createElement('li');
      surcharge.setAttribute('data-single-room-surcharge', '');
      surcharge.textContent = '1人部屋・ゲル貸し切り追加料金：￥45,000';
      excludedList.appendChild(surcharge);
    }
    var factLists = document.querySelectorAll('.facts ul');
    var targetList = factLists[factLists.length - 1];
    if (targetList && !document.querySelector('[data-khuvsgul-facilities]')) {
      var accommodation = document.createElement('li');
      accommodation.setAttribute('data-khuvsgul-facilities', '');
      accommodation.innerHTML = '<span class="tick">✓</span><span><b>宿泊設備：</b>フブスグル湖畔のゲル泊。シャワー・充電・洋式トイレをご利用いただけます。</span>';
      targetList.appendChild(accommodation);
    }
  }
})();
