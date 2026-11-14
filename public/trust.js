(function () {
    'use strict';
    var $ = function (id) { return document.getElementById(id); };
    var DAY = 864e5, ISO = /^\d{4}-\d{2}-\d{2}$/;

    function load(url) {
        return fetch(url, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(url); return r.json(); });
    }
    // All text goes through textContent, so JSON content can never inject markup.
    function el(tag, props, kids) {
        var n = document.createElement(tag);
        Object.keys(props || {}).forEach(function (k) { if (k === 'text') n.textContent = props[k]; else n.setAttribute(k, props[k]); });
        (kids || []).forEach(function (c) { if (c) n.appendChild(c); });
        return n;
    }
    function safeUrl(u) { try { var x = new URL(u); return x.protocol === 'https:' ? x.href : ''; } catch (e) { return ''; } }
    function safePhoto(p) { return /^[\w][\w .-]*\.(png|jpe?g|webp|avif)$/i.test(p || '') ? 'assets/testimonials/' + encodeURIComponent(p) : ''; }
    function initial(name) { return el('span', { 'class': 'initials', 'aria-hidden': 'true', text: name.trim().charAt(0).toUpperCase() }); }
    function stars(value) {
        var n = Math.max(0, Math.min(5, Math.round(value))), s = el('span', { 'class': 'stars', 'aria-hidden': 'true' });
        s.appendChild(document.createTextNode('★'.repeat(n)));
        if (n < 5) s.appendChild(el('span', { 'class': 'off', text: '★'.repeat(5 - n) }));
        return s;
    }
    function todayIST() { return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); }
    function dayNum(s) { var p = s.split('-'); return Date.UTC(+p[0], +p[1] - 1, +p[2]) / DAY; }
    function fmt(s) { return new Date(s + 'T12:00:00Z').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }); }

    function trustBar(cfg) {
        var box = $('trustBar'), r = cfg.rating || {};
        if (!box) return;
        var row = box.firstElementChild;
        if (cfg.studentCount) {
            row.appendChild(el('p', { 'class': 'trust-count' }, [document.createTextNode('Trusted by '), el('b', { text: cfg.studentCount }), document.createTextNode(' Students')]));
        }
        // The rating shows when switched on; the review count is optional and only used in the screen-reader label.
        if (r.show && typeof r.value === 'number' && r.value > 0 && r.value <= 5) {
            var url = safeUrl(r.sourceUrl), parts = [el('span', { text: 'Rated ' + r.value + '/5' }), stars(r.value)];
            var inner = url ? el('a', { href: url, target: '_blank', rel: 'noopener noreferrer' }, parts) : el('span', { 'class': 'row' }, parts);
            row.appendChild(el('p', { 'class': 'trust-rating', 'aria-label': 'Rated ' + r.value + ' out of 5 stars' + (r.reviewCount > 0 ? ' from ' + r.reviewCount + ' ' + (r.source || 'reviews') : '') }, [inner]));
        }
        if (row.children.length) box.hidden = false;
    }

    function admission(cfg) {
        var a = cfg.admission, box = $('admission');
        if (!a || !box) return;
        var today = todayIST(), start = ISO.test(a.startDate || '') ? a.startDate : '', close = ISO.test(a.closeDate || '') ? a.closeDate : '';
        var key = a.status || (start && today < start ? 'upcoming' : close && today > close ? 'closed' : 'open');
        var label = { open: 'Admissions open', upcoming: start ? 'Opens ' + fmt(start) : 'Opening soon', closed: 'Admissions closed', waitlist: 'Waitlist open' }[key] || key;
        var card = el('dl', { 'class': 'admission-card' });
        function row(term, value, cls) {
            card.appendChild(el('div', {}, [el('dt', { text: term }), el('dd', {}, [cls ? el('span', { 'class': cls, text: value }) : document.createTextNode(value)])]));
        }
        row('Admission status', label, 'status' + (key === 'closed' ? ' closed' : key === 'open' ? '' : ' upcoming'));
        if (start) row(today < start ? 'Admission starts' : 'Admission started', fmt(start));
        if (close && today <= close) row('Admission closes', fmt(close)); // a past closing date is never shown
        if (a.timing) row('Timing', a.timing);
        if (close && today <= close && key !== 'closed') {
            var left = dayNum(close) - dayNum(today);
            if (left <= (a.deadlineWarningDays || 7)) {
                card.appendChild(el('p', { 'class': 'deadline', role: 'status', text: left === 0 ? 'Admissions close today.' : 'Admissions close in ' + left + (left === 1 ? ' day.' : ' days.') }));
            }
        }
        box.firstElementChild.appendChild(card);
        box.hidden = false;
    }

    // Testimonials: data/testimonials.json, photos in assets/testimonials/. Only active entries show, by "order".
    function reviews(list) {
        var box = $('reviews'), track = $('reviewGrid');
        if (!box || !track || !Array.isArray(list)) return;
        list = list.filter(function (t) { return t && t.active !== false && t.name && t.review; })
            .sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
        if (!list.length) return; // nothing approved yet: the whole section stays hidden
        list.forEach(function (t, i) {
            var photo = safePhoto(t.photo), video = safeUrl(t.video), img;
            if (photo) {
                img = el('img', { src: photo, alt: t.name, width: 220, height: 220, loading: 'lazy', decoding: 'async' });
                img.addEventListener('error', function () { img.replaceWith(initial(t.name)); });
            }
            track.appendChild(el('li', { 'class': 't-card', 'aria-roledescription': 'slide', 'aria-label': (i + 1) + ' of ' + list.length }, [
                el('div', { 'class': 't-photo' }, [img || initial(t.name)]),
                el('div', { 'class': 't-body' }, [
                    t.sample === true ? el('span', { 'class': 't-sample', text: 'Sample review' }) : null,
                    typeof t.rating === 'number' && t.rating > 0 ? el('div', { role: 'img', 'aria-label': 'Rated ' + t.rating + ' out of 5' }, [stars(t.rating)]) : null,
                    el('blockquote', { text: '“' + t.review + '”' }),
                    el('div', { 'class': 't-who' }, [el('b', { text: t.name }), t.designation ? el('span', { text: t.designation }) : null, t.course ? el('small', { text: t.course }) : null]),
                    video ? el('a', { 'class': 't-video', href: video, target: '_blank', rel: 'noopener noreferrer', text: 'Watch video review' }) : null
                ])
            ]));
        });
        box.hidden = false;
        if (list.length > 1) carousel(track, list.length);
    }

    // A native scroll-snap strip; the buttons only scroll it, so swipe and keyboard scrolling keep working.
    function carousel(track, count) {
        var status = el('span', { 'class': 't-count', 'aria-live': 'polite' });
        function step(dir) { track.scrollBy({ left: dir * track.clientWidth, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }
        function current() { return Math.min(count, Math.round(track.scrollLeft / track.clientWidth) + 1); }
        var prev = el('button', { type: 'button', 'class': 't-nav', 'aria-label': 'Previous testimonial', text: '←' });
        var next = el('button', { type: 'button', 'class': 't-nav', 'aria-label': 'Next testimonial', text: '→' });
        prev.addEventListener('click', function () { step(-1); });
        next.addEventListener('click', function () { step(1); });
        function update() { var n = current(); status.textContent = n + ' / ' + count; prev.disabled = n === 1; next.disabled = n === count; }
        var pending;
        track.addEventListener('scroll', function () { clearTimeout(pending); pending = setTimeout(update, 80); }, { passive: true });
        track.setAttribute('tabindex', '0');
        track.parentNode.appendChild(el('div', { 'class': 't-controls' }, [prev, status, next]));
        update();

        // Auto-advance every 3 seconds, looping back to the first. It waits while the visitor is hovering,
        // touching or focused on the strip, while it is off screen, and is off for reduced-motion visitors.
        var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduce) return;
        status.setAttribute('aria-live', 'off'); // do not announce every automatic slide
        var wrap = track.parentNode, held = false, visible = !('IntersectionObserver' in window), timer;
        function tick() {
            if (held || !visible || document.hidden) return;
            if (current() >= count) track.scrollTo({ left: 0, behavior: 'smooth' }); else step(1);
        }
        function restart() { clearInterval(timer); timer = setInterval(tick, 3000); }
        function hold(on) { return function () { held = on; if (!on) restart(); }; }
        wrap.addEventListener('mouseenter', hold(true));
        wrap.addEventListener('mouseleave', hold(false));
        wrap.addEventListener('focusin', hold(true));
        wrap.addEventListener('focusout', hold(false));
        wrap.addEventListener('touchstart', hold(true), { passive: true });
        ['touchend', 'touchcancel'].forEach(function (e) { wrap.addEventListener(e, hold(false), { passive: true }); });
        if (!visible) new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; if (visible) restart(); }, { threshold: 0.4 }).observe(track);
        restart();
    }

    // Trainer section: data/trainer.json, photo in assets/trainer/. Empty role/bio fields are simply not shown.
    function trainer(t) {
        var names = $('trainerNames'), intro = $('trainerIntro'), photo = $('trainerPhoto');
        if (!t || !names || !intro || !photo) return;
        if (t.intro) intro.textContent = t.intro;
        if (/^[\w][\w.-]*\.(png|jpe?g|webp|avif)$/i.test(t.photo || '')) photo.src = 'assets/trainer/' + t.photo;
        var list = (Array.isArray(t.trainers) ? t.trainers : []).filter(function (p) { return p && p.name; });
        if (!list.length) return;
        names.textContent = '';
        list.forEach(function (p) {
            names.appendChild(el('li', {}, [document.createTextNode(p.name), p.role ? el('span', { text: p.role }) : null, p.bio ? el('p', { text: p.bio }) : null]));
        });
    }

    load('data/site-config.json').then(function (c) { trustBar(c); admission(c); }).catch(function () {});
    load('data/trainer.json').then(trainer).catch(function () {});
    load('data/testimonials.json').then(reviews).catch(function () {});
})();
