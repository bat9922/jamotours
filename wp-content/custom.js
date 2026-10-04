/* Slideshow for jamotours.
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
