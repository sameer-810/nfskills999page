(function () {
    'use strict';
    var section = document.getElementById('logos');
    if (!section) return;
    var PX_PER_SECOND = 45; // same speed for both rows, whatever their length

    function el(tag, attrs, text) {
        var n = document.createElement(tag);
        Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
        if (text) n.textContent = text;
        return n;
    }
    function group(items, hidden) {
        var ul = el('ul', { 'class': 'logo-group' });
        if (hidden) ul.setAttribute('aria-hidden', 'true'); // the repeat is for the loop only
        items.forEach(function (l) {
            var li = el('li', { 'class': 'logo-item' + (l.type === 'concept' ? ' concept' : '') });
            li.appendChild(el('img', { src: l.src, alt: hidden ? '' : l.alt, width: l.width, height: l.height, decoding: 'async' }));
            li.appendChild(el('span', {}, l.name));
            ul.appendChild(li);
        });
        return ul;
    }
    function row(items, rtl, label) {
        var wrap = el('div', { 'class': 'logo-row' + (rtl ? '' : ' ltr'), role: 'group', 'aria-label': label }), track = el('div', { 'class': 'logo-track' });
        track.appendChild(group(items, false));
        track.appendChild(group(items, true));
        wrap.appendChild(track);
        // touch: hold a row to pause it, release to resume (mouse hover is handled in CSS)
        wrap.addEventListener('touchstart', function () { wrap.classList.add('paused'); }, { passive: true });
        ['touchend', 'touchcancel'].forEach(function (e) { wrap.addEventListener(e, function () { wrap.classList.remove('paused'); }, { passive: true }); });
        return { wrap: wrap, track: track };
    }
    function setSpeed(r) {
        var half = r.track.scrollWidth / 2;
        if (half > 0) r.track.style.setProperty('--dur', (half / PX_PER_SECOND).toFixed(1) + 's');
    }

    function build(list) {
        var sorted = list.slice().sort(function (a, b) { return a.order - b.order; });
        var rows = [
            row(sorted.filter(function (l) { return l.row === 1; }), true, 'Brands and tools, moving right to left'),
            row(sorted.filter(function (l) { return l.row === 2; }), false, 'Technologies, moving left to right')
        ];
        var box = document.getElementById('logoRows');
        rows.forEach(function (r) { box.appendChild(r.wrap); });
        section.hidden = false;
        rows.forEach(setSpeed);
        // widths are known from the width/height attributes, but re-measure once fonts/images settle
        window.addEventListener('load', function () { rows.forEach(setSpeed); });
    }

    function start() {
        fetch('data/logos.json').then(function (r) { if (!r.ok) throw new Error(); return r.json(); }).then(build).catch(function () {});
    }
    // images are only requested when the section is about to scroll into view
    // (the section is hidden until built, so a zero-height visible probe sits just above it)
    var probe = document.getElementById('logosProbe');
    if ('IntersectionObserver' in window && probe) {
        var io = new IntersectionObserver(function (entries) { if (entries[0].isIntersecting) { io.disconnect(); start(); } }, { rootMargin: '400px' });
        io.observe(probe);
    } else { start(); }
})();
