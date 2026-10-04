/* Slideshow for jamotours.
   Elementor's frontend bundle does not initialise in this static copy, so its
   Slides widgets never start their swiper and every slide renders in the same
   spot at once. This drives them directly: one slide visible at a time, a
   crossfade between them, and working dots. It touches nothing else, and if
   Elementor's own JS is ever restored this stays out of its way by bailing
   out as soon as it sees swiper has taken over. */
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

		var current = 0;
		var timer = null;

		function show(n) {
			slides[current].classList.remove(ACTIVE);
			current = (n + slides.length) % slides.length;
			slides[current].classList.add(ACTIVE);
			if (dots.length) {
				for (var i = 0; i < dots.length; i++) {
					dots[i].classList.toggle('jamo-dot-on', i === current);
					dots[i].setAttribute('aria-selected', i === current ? 'true' : 'false');
				}
			}
		}

		// dots: Elementor only creates the pagination container in its own JS,
		// so on these pages there is nothing to fill and one has to be made.
		var dots = [];
		var widget = track.closest('.elementor-widget-slides');
		var pager = widget ? widget.querySelector('.swiper-pagination') : null;
		if (!pager && widget) {
			var host = widget.querySelector('.elementor-swiper') || widget;
			host.style.position = host.style.position || 'relative';
			pager = document.createElement('div');
			pager.className = 'swiper-pagination';
			pager.setAttribute('role', 'tablist');
			host.appendChild(pager);
		}
		if (pager) {
			pager.innerHTML = '';
			pager.classList.add('jamo-dots');
			slides.forEach(function (slide, i) {
				var b = document.createElement('button');
				b.type = 'button';
				b.className = 'jamo-dot';
				b.setAttribute('role', 'tab');
				b.setAttribute('aria-label', 'スライド ' + (i + 1));
				b.addEventListener('click', function () { stop(); show(i); start(); });
				pager.appendChild(b);
				dots.push(b);
			});
		}

		function start() {
			if (timer) { return; }
			if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { return; }
			timer = setInterval(function () { show(current + 1); }, INTERVAL);
		}
		function stop() {
			if (timer) { clearInterval(timer); timer = null; }
		}

		slides[0].classList.add(ACTIVE);
		show(0);

		// pause while the pointer or keyboard focus is on the banner
		var host = widget || track;
		host.addEventListener('mouseenter', stop);
		host.addEventListener('mouseleave', start);
		host.addEventListener('focusin', stop);
		host.addEventListener('focusout', start);
		document.addEventListener('visibilitychange', function () {
			if (document.hidden) { stop(); } else { start(); }
		});

		start();
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
