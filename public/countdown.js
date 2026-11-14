(function () {
    'use strict';
    // Every [data-countdown] on the page counts to the one deadline in data/site-config.json.
    // The sticky banner (#stickyReg) reads the same tick, so every countdown on the page always agrees.
    var boxes = document.querySelectorAll('[data-countdown]'), bar = document.getElementById('stickyReg');
    if (!boxes.length && !bar) return;
    var UNITS = [['Days', 864e5], ['Hours', 36e5], ['Minutes', 6e4], ['Seconds', 1e3]];

    function el(tag, cls, text) {
        var n = document.createElement(tag);
        if (cls) n.className = cls;
        if (text) n.textContent = text;
        return n;
    }

    function build(box, cfg) {
        box.textContent = '';
        box.appendChild(el('p', 'cd-date', cfg.dateLabel));
        var title = box.appendChild(el('h3', 'cd-title', cfg.heading));
        // Screen readers get the fixed deadline once, not a number that changes every second.
        var tiles = box.appendChild(el('div', 'cd-tiles'));
        tiles.setAttribute('aria-hidden', 'true');
        box.appendChild(el('p', 'sr', 'Registration closes on ' + cfg.dateLabel + '.'));
        var values = UNITS.map(function (u) {
            var tile = tiles.appendChild(el('div', 'cd-tile')), v = tile.appendChild(el('b', '', '00'));
            tile.appendChild(el('span', '', u[0]));
            return v;
        });
        if (!box.hasAttribute('data-no-cta')) {
            var cta = box.appendChild(el('a', 'btn primary js-pay cd-cta', 'Pay ₹999 & Register'));
            cta.href = '#register';
        }
        box.hidden = false;
        return { box: box, title: title, values: values };
    }

    function close(views, cfg) {
        document.documentElement.setAttribute('data-registration-closed', cfg.closedText);
        views.forEach(function (v) {
            v.box.classList.add('closed');
            v.title.textContent = cfg.closedHeading;
            var cta = v.box.querySelector('.cd-cta');
            if (cta) cta.remove();
            var sr = v.box.querySelector('.sr');
            if (sr) sr.textContent = 'Registration closed on ' + cfg.dateLabel + '.';
            var note = el('p', 'cd-closed', cfg.closedText);
            note.setAttribute('role', 'status');
            v.box.appendChild(note);
        });
        if (bar) { bar.classList.add('closed'); bar.querySelector('[data-cd-label]').textContent = cfg.closedHeading; }
    }

    function showBar() {
        bar.hidden = false;
        // Pad the page by the banner's real height, so it never covers the footer or the last button.
        var pad = function () { document.documentElement.style.setProperty('--bar-h', bar.offsetHeight + 'px'); };
        pad();
        if (window.ResizeObserver) new ResizeObserver(pad).observe(bar); else window.addEventListener('resize', pad);
    }

    function start(cfg) {
        var deadline = Date.parse(cfg && cfg.deadline);
        if (isNaN(deadline)) return;
        var views = Array.prototype.map.call(boxes, function (b) { return build(b, cfg); }), timer;
        var digits = bar ? bar.querySelectorAll('[data-cd]') : [];
        if (bar) {
            var ist = function (t) { return new Date(t).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); };
            if (ist(Date.now()) === ist(deadline)) bar.querySelector('[data-cd-label]').textContent = 'Batch starts today · registration closes in';
            showBar();
        }
        function tick() {
            // Recomputed from the clock each time, so a sleeping tab never drifts.
            var left = Math.max(0, deadline - Date.now()), rest = left;
            var parts = UNITS.map(function (u) { var n = Math.floor(rest / u[1]); rest -= n * u[1]; return String(n).padStart(2, '0'); });
            views.forEach(function (v) { parts.forEach(function (p, i) { v.values[i].textContent = p; }); });
            parts.forEach(function (p, i) { if (digits[i]) digits[i].textContent = p; });
            if (!left) { clearInterval(timer); close(views, cfg); }
        }
        tick();
        if (deadline > Date.now()) timer = setInterval(tick, 1000);
    }

    fetch('data/site-config.json', { cache: 'no-cache' })
        .then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
        .then(function (c) { start(c.countdown); })
        .catch(function () {});
})();
