/* Slideshow for mongoru.
   Elementor's frontend bundle does not initialise in this static copy, so its
   Slides widgets never start their swiper and every slide renders in the same
   spot at once. This drives them directly: one slide visible at a time, a
   crossfade between them, and working dots. It stands down if it ever finds
   swiper has taken the track over, so restoring Elementor's own JS would not
   collide with it.

   The timer reschedules itself after every step rather than running off a
   single setInterval, so a missed or cleared tick cannot leave the banner
   parked on one slide. There is deliberately no pause on hover: that is what
   stalled an earlier version, since a pointer resting over the banner stopped
   it and nothing started it again until the pointer moved away. */
(function () {
	'use strict';

	var INTERVAL = 6000;
	var ACTIVE = 'jamo-slide-on';

	function setUp(track) {
		if (track.dataset.jamoSlides === 'on') { return; }

		// if Elementor's swiper did initialise, leave the track alone
		if (track.style.transform || track.classList.contains('swiper-wrapper-initialised')) { return; }

		var slides = [];
		for (var i = 0; i < track.children.length; i++) {
			if (track.children[i].classList.contains('swiper-slide')) { slides.push(track.children[i]); }
		}
		if (slides.length < 2) { return; }

		track.dataset.jamoSlides = 'on';

		var widget = track.closest('.elementor-widget-slides') || track;
		var dots = [];
		var current = 0;
		var timer = null;

		function paint() {
			for (var i = 0; i < slides.length; i++) {
				slides[i].classList.toggle(ACTIVE, i === current);
			}
			for (var j = 0; j < dots.length; j++) {
				dots[j].classList.toggle('jamo-dot-on', j === current);
				dots[j].setAttribute('aria-selected', j === current ? 'true' : 'false');
			}
		}

		function go(n) {
			current = ((n % slides.length) + slides.length) % slides.length;
			paint();
		}

		function tick() {
			go(current + 1);
			schedule();
		}

		function schedule() {
			if (timer) { clearTimeout(timer); timer = null; }
			if (document.hidden) { return; }
			if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { return; }
			timer = setTimeout(tick, INTERVAL);
		}

		// Elementor only builds the pagination container inside its own JS, so
		// on these pages there is nothing to fill and one has to be made.
		var pager = widget.querySelector('.swiper-pagination');
		if (!pager) {
			var pagerHost = widget.querySelector('.elementor-swiper') || widget;
			if (!pagerHost.style.position) { pagerHost.style.position = 'relative'; }
			pager = document.createElement('div');
			pager.className = 'swiper-pagination';
			pager.setAttribute('role', 'tablist');
			pagerHost.appendChild(pager);
		}
		pager.innerHTML = '';
		pager.classList.add('jamo-dots');
		slides.forEach(function (slide, i) {
			var b = document.createElement('button');
			b.type = 'button';
			b.className = 'jamo-dot';
			b.setAttribute('role', 'tab');
			b.setAttribute('aria-label', 'スライド ' + (i + 1));
			b.addEventListener('click', function () { go(i); schedule(); });
			pager.appendChild(b);
			dots.push(b);
		});

		// Only the tab being hidden pauses it; a browser stops firing timers
		// there anyway, and this picks the rotation back up on return.
		document.addEventListener('visibilitychange', function () {
			if (document.hidden) {
				if (timer) { clearTimeout(timer); timer = null; }
			} else {
				schedule();
			}
		});

		go(0);
		schedule();
	}

	function init() {
		var tracks = document.querySelectorAll('.elementor-widget-slides .swiper-wrapper.elementor-slides');
		for (var i = 0; i < tracks.length; i++) { setUp(tracks[i]); }
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();

/* Make each of the nine newly added horse-tour cards fully clickable. */
(function () {
	'use strict';
	var routes = [
		'/heritage-history-horse-riding-7-day/',
		'/tsagaan-suvraga-horse-riding-6-day/',
		'/gobi-sands-horse-riding-7-day/',
		'/khuvsgul-lake-horse-riding-6-day/',
		'/altai-mount-kazah-horse-riding-8-day/',
		'/east-mongolia-horse-riding-7-day/',
		'/bogd-khan-mount-flower-horse-riding-5-day/',
		'/chinggis-khaan-13-century-horse-riding-4-day/',
		'/chinggis-khaan-terelj-horse-riding-1-day/'
	];
	function init() {
		for (var i = 0; i < routes.length; i++) {
			var link = document.querySelector('.tour-card-link[href="' + routes[i] + '"]') || document.querySelector('a[href="' + routes[i] + '"]');
			if (!link || !link.parentElement || link.parentElement.dataset.cardLinkReady === 'true') { continue; }
			var card = link.parentElement;
			card.dataset.cardLinkReady = 'true';
			card.classList.add('jamo-tour-card-active');
			card.setAttribute('role', 'link');
			card.setAttribute('tabindex', '0');
			card.setAttribute('aria-label', link.textContent.trim() + 'の詳細を見る');
			card.addEventListener('click', function (event) {
				if (event.target.closest('a')) { return; }
				var target = this.querySelector('a[href]');
				if (target) { window.location.href = target.href; }
			});
			card.addEventListener('keydown', function (event) {
				if (event.key === 'Enter' || event.key === ' ') {
					event.preventDefault();
					var target = this.querySelector('a[href]');
					if (target) { window.location.href = target.href; }
				}
			});
		}
	}
	if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();

/* Three-image hero slideshows for generated horse-tour detail pages. */
(function () {
	'use strict';
	function init() {
		var heroes = document.querySelectorAll('.horse-hero--slideshow');
		for (var h = 0; h < heroes.length; h++) {
			(function (hero) {
				var slides = Array.prototype.slice.call(hero.querySelectorAll('.horse-hero-slide'));
				var dots = Array.prototype.slice.call(hero.querySelectorAll('.horse-hero-dot'));
				var caption = hero.querySelector('.horse-hero-caption');
				var current = 0, timer = null;
				function show(index) {
					current = (index + slides.length) % slides.length;
					for (var i = 0; i < slides.length; i++) { slides[i].classList.toggle('is-active', i === current); }
					for (var j = 0; j < dots.length; j++) { dots[j].setAttribute('aria-current', j === current ? 'true' : 'false'); }
					if (caption) { caption.textContent = '写真：' + (slides[current].getAttribute('data-caption') || 'モンゴル乗馬ツアー'); }
				}
				function schedule() { if (timer) { clearTimeout(timer); } timer = setTimeout(function () { show(current + 1); schedule(); }, 6000); }
				hero.querySelector('.horse-hero-control--prev').addEventListener('click', function () { show(current - 1); schedule(); });
				hero.querySelector('.horse-hero-control--next').addEventListener('click', function () { show(current + 1); schedule(); });
				for (var d = 0; d < dots.length; d++) { (function (n) { dots[n].addEventListener('click', function () { show(n); schedule(); }); })(d); }
				show(0); schedule();
			})(heroes[h]);
		}
	}
	if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();

/* Horse-tour photo galleries. Kept independent of the page's legacy inline
   scripts, so every generated itinerary page gets working thumbnails. */
(function () {
	'use strict';
	function init() {
		var galleries = document.querySelectorAll('.horse-gallery');
		for (var g = 0; g < galleries.length; g++) {
			(function (gallery) {
				var image = gallery.querySelector('.horse-gallery-main-image');
				var count = gallery.querySelector('.horse-gallery-count');
				var thumbs = Array.prototype.slice.call(gallery.querySelectorAll('.horse-gallery-thumb'));
				var current = 0;
				function show(index) {
					current = (index + thumbs.length) % thumbs.length;
					var thumb = thumbs[current];
					image.src = thumb.getAttribute('data-src');
					image.alt = thumb.getAttribute('data-alt');
					count.textContent = (current + 1) + ' / ' + thumbs.length;
					for (var i = 0; i < thumbs.length; i++) { thumbs[i].setAttribute('aria-current', i === current ? 'true' : 'false'); }
				}
				gallery.querySelector('.horse-gallery-prev').addEventListener('click', function () { show(current - 1); });
				gallery.querySelector('.horse-gallery-next').addEventListener('click', function () { show(current + 1); });
				for (var t = 0; t < thumbs.length; t++) { (function (n) { thumbs[n].addEventListener('click', function () { show(n); }); })(t); }
				show(0);
			})(galleries[g]);
		}
	}
	if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();

/* A shared, accessible return-to-top button for the static site. */
(function () {
	'use strict';

	function init() {
		if (document.getElementById('jamo-scroll-to-top')) { return; }

		var style = document.createElement('style');
		/* The AI chat button also sits bottom-right (#ai-chat-btn: bottom:20px,
		   right:20px, about 46px tall) at the same z-index, and being later in
		   the DOM it covered this one completely. The arrow now stacks above it
		   with a gap, and sits one step below it on z so that the chat panel -
		   which opens upward from bottom:80px - hides the arrow instead of
		   having it float on top of the conversation. */
		style.textContent = '#jamo-scroll-to-top{position:fixed;right:24px;bottom:84px;width:48px;height:48px;border:0;border-radius:50%;background:#f3bd09;color:#1b1b1b;box-shadow:0 4px 14px rgba(0,0,0,.22);cursor:pointer;opacity:0;visibility:hidden;transform:translateY(12px);transition:opacity .2s,transform .2s,visibility .2s;z-index:9998;font-size:25px;line-height:48px}#jamo-scroll-to-top.jamo-scroll-visible{opacity:1;visibility:visible;transform:translateY(0)}#jamo-scroll-to-top:hover{background:#e0aa00}#jamo-scroll-to-top:focus-visible{outline:3px solid #1b1b1b;outline-offset:3px}@media (max-width:767px){#jamo-scroll-to-top{right:16px;bottom:74px;width:44px;height:44px;line-height:44px}}';
		document.head.appendChild(style);

		var button = document.createElement('button');
		button.id = 'jamo-scroll-to-top';
		button.type = 'button';
		button.setAttribute('aria-label', 'ページ上部へ戻る');
		button.title = 'ページ上部へ戻る';
		button.textContent = '↑';
		document.body.appendChild(button);

		function updateVisibility() {
			button.classList.toggle('jamo-scroll-visible', window.scrollY > 400);
		}

		window.addEventListener('scroll', updateVisibility, { passive: true });
		button.addEventListener('click', function () {
			window.scrollTo({ top: 0, behavior: 'smooth' });
		});
		updateVisibility();
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();

/* Dots for the three card sliders (「モンゴルを知る」, 「モンゴル旅行の準備」,
   「選ばれる理由」).

   The sliding itself is CSS scroll-snap, so nothing here moves a strip
   by hand: a dot click is a scrollTo and the strip reports back on
   scroll. A swipe, a trackpad flick, shift-wheel and the dots therefore
   all drive the same single source of truth. The strips still scroll
   with this file blocked - they just have no dots, which is why the
   dots are built here rather than shipped in the markup.

   One dot per *page*, not per card. Four cards are on screen in 準備 at
   desktop width, so of seven only the first four can ever reach the
   left edge: seven dots would have left three unreachable and a fourth
   permanently lit. Pages are recomputed on resize, where the count
   changes with the breakpoint.

   Positions are measured once per layout rather than read during
   scroll, so the scroll handler is arithmetic only and never forces a
   reflow. */
(function () {
	'use strict';

	var ON = 'jamo-slider-dot-on';

	function setUp(root) {
		if (root.dataset.jamoSliderOn === 'on') { return; }

		// the two Elementor containers carry both attributes themselves;
		// the 理由 markup wraps its track in a parent
		var track = root.hasAttribute('data-jamo-track')
			? root
			: root.querySelector('[data-jamo-track]');
		if (!track) { return; }

		var slides = [];
		for (var i = 0; i < track.children.length; i++) {
			if (track.children[i].nodeType === 1) { slides.push(track.children[i]); }
		}
		if (slides.length < 2) { return; }

		var host = (track === root) ? track.parentNode : root;
		if (!host) { return; }

		root.dataset.jamoSliderOn = 'on';

		var pager = document.createElement('div');
		pager.className = 'jamo-slider-dots';
		pager.setAttribute('role', 'tablist');
		if (root.getAttribute('data-jamo-slider')) {
			pager.setAttribute('aria-label', root.getAttribute('data-jamo-slider'));
		}
		host.appendChild(pager);

		var stops = [];      // scrollLeft of each page
		var dots = [];
		var current = -1;

		function measure() {
			var max = track.scrollWidth - track.clientWidth;
			var step = slides.length > 1
				? (slides[1].offsetLeft - slides[0].offsetLeft)   // card + gap
				: slides[0].getBoundingClientRect().width;
			var perPage = Math.max(1, Math.round(track.clientWidth / step));

			stops = [];
			for (var i = 0; i < slides.length; i += perPage) {
				var at = Math.min(slides[i].offsetLeft - track.offsetLeft, max);
				// the clamp can land two pages on the same place at the end
				if (!stops.length || at - stops[stops.length - 1] > 1) { stops.push(at); }
			}
			if (!stops.length) { stops = [0]; }
		}

		function paint(n) {
			if (n === current) { return; }
			current = n;
			for (var i = 0; i < dots.length; i++) {
				dots[i].classList.toggle(ON, i === n);
				dots[i].setAttribute('aria-selected', i === n ? 'true' : 'false');
			}
		}

		function nearest() {
			var best = 0;
			var bestGap = Infinity;
			for (var i = 0; i < stops.length; i++) {
				var gap = Math.abs(stops[i] - track.scrollLeft);
				if (gap < bestGap) { bestGap = gap; best = i; }
			}
			return best;
		}

		function buildDots() {
			pager.innerHTML = '';
			dots = [];
			current = -1;
			if (stops.length < 2) { return; }      // nothing to page through
			for (var i = 0; i < stops.length; i++) {
				(function (n) {
					var b = document.createElement('button');
					b.type = 'button';
					b.className = 'jamo-slider-dot';
					b.setAttribute('role', 'tab');
					b.setAttribute('aria-label', (n + 1) + 'ページ目');
					b.addEventListener('click', function () {
						track.scrollTo({ left: stops[n], behavior: 'smooth' });
					});
					pager.appendChild(b);
					dots.push(b);
				})(i);
			}
		}

		function relayout() {
			var before = stops.length;
			measure();
			if (stops.length !== before) { buildDots(); }
			paint(nearest());
		}

		track.addEventListener('scroll', function () { paint(nearest()); }, { passive: true });
		window.addEventListener('resize', relayout);

		measure();
		buildDots();
		paint(nearest());
	}

	function init() {
		var roots = document.querySelectorAll('[data-jamo-slider]');
		for (var i = 0; i < roots.length; i++) { setUp(roots[i]); }
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();

/* The sticky header shrinks once the page is scrolled, so it stops eating
   a sixth of the viewport. Everything visual lives in custom.css under
   `.jamo-header-compact`; this only flips the class on <html>.

   The flag goes on <html> rather than on the header because the site has
   two header shells - the Elementor header template on most pages and a
   plain container on the home page - and one ancestor selector reaches
   both. A 12px gap between the on and off thresholds keeps the header
   from flickering when a scroll comes to rest right on the boundary. */
(function () {
	'use strict';

	var ON = 120;
	var OFF = 108;

	function init() {
		var root = document.documentElement;
		var compact = false;
		var ticking = false;

		function apply() {
			ticking = false;
			var y = window.scrollY || window.pageYOffset || 0;
			if (!compact && y > ON) {
				compact = true;
				root.classList.add('jamo-header-compact');
			} else if (compact && y < OFF) {
				compact = false;
				root.classList.remove('jamo-header-compact');
			}
		}

		window.addEventListener('scroll', function () {
			if (!ticking) {
				ticking = true;
				window.requestAnimationFrame(apply);
			}
		}, { passive: true });

		apply();
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();
