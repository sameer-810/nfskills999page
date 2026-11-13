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
    function safePhoto(p) { return /^[\w][\w .-]*\.(png|jpe?g|webp|avif)$/i.test(p || '') ? 'images/testimonials/' + encodeURIComponent(p) : ''; }
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
        // The rating shows only when switched on AND backed by a real review count.
        if (r.show && typeof r.value === 'number' && r.value > 0 && r.value <= 5 && r.reviewCount > 0) {
            var url = safeUrl(r.sourceUrl), parts = [stars(r.value), el('span', { text: 'Rated ' + r.value + '/5 Stars' })];
            var inner = url ? el('a', { href: url, target: '_blank', rel: 'noopener noreferrer' }, parts) : el('span', { 'class': 'row' }, parts);
            row.appendChild(el('p', { 'class': 'trust-rating', 'aria-label': 'Rated ' + r.value + ' out of 5 stars from ' + r.reviewCount + ' ' + (r.source || 'reviews') }, [inner]));
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

    function reviews(list) {
        var box = $('reviews'), grid = $('reviewGrid');
        if (!box || !grid || !Array.isArray(list)) return;
        list = list.filter(function (t) { return t && t.name && t.feedback; })
            .sort(function (a, b) { return (b.featured ? 1 : 0) - (a.featured ? 1 : 0); });
        if (!list.length) return; // no real reviews yet: the whole section stays hidden
        list.forEach(function (t) {
            var photo = safePhoto(t.photo), g = safeUrl(t.googleReviewUrl), l = safeUrl(t.linkedinUrl), img;
            if (photo) {
                img = el('img', { src: photo, alt: t.name, width: 52, height: 52, loading: 'lazy', decoding: 'async' });
                img.addEventListener('error', function () { img.replaceWith(initial(t.name)); });
            }
            var who = el('div', { 'class': 'review-who' }, [img || initial(t.name), el('div', {}, [el('b', { text: t.name }), t.program ? el('small', { text: t.program }) : null])]);
            var links = el('div', { 'class': 'review-links' });
            if (g) {
                links.appendChild(el('a', { href: g, target: '_blank', rel: 'noopener noreferrer', 'aria-label': 'Read ' + t.name + ' Google review (opens in a new tab)', text: 'Google review' }));
                if (t.googleVerified === true) links.appendChild(el('span', { 'class': 'verified', text: '✓ Verified on Google' }));
            }
            if (l) links.appendChild(el('a', { href: l, target: '_blank', rel: 'noopener noreferrer', 'aria-label': t.name + ' on LinkedIn (opens in a new tab)', text: 'LinkedIn' }));
            grid.appendChild(el('li', { 'class': 'review' + (t.featured ? ' featured' : '') }, [
                typeof t.rating === 'number' && t.rating > 0 ? el('div', { role: 'img', 'aria-label': 'Rated ' + t.rating + ' out of 5' }, [stars(t.rating)]) : null,
                el('blockquote', { text: t.feedback }),
                who,
                links.children.length ? links : null
            ]));
        });
        box.hidden = false;
    }

    load('data/site-config.json').then(function (c) { trustBar(c); admission(c); }).catch(function () {});
    load('data/testimonials.json').then(reviews).catch(function () {});
})();
