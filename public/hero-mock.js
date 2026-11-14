(function () {
    'use strict';
    // Hero illustration: replays the deploy sequence (styles in sections.css, ".mock.play").
    // Without this script, or with reduced motion, the illustration simply shows fully drawn.
    var mock = document.querySelector('.mock');
    if (!mock || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var LOOP_MS = 14000;
    function play() {
        mock.classList.remove('play');
        void mock.offsetWidth; // restart the CSS animations
        mock.classList.add('play');
    }
    play();
    setInterval(function () { if (!document.hidden) play(); }, LOOP_MS);
})();
