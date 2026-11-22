/* ========== BROWSER BAR ========== */
(function () {
  var script = document.currentScript;
  var ROOT = new URL('../', script.src).href;

  /* Browser */
  var BROWSER = {
    name: 'Cruze',
    domain: 'cruze.com',
    logo: 'media/cruze_Logotype.png'
  };

  var FONT_URL = 'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap';

  /* Sites */
   var SITES = [
    {
      name: 'Town of Brackwater',
      description: 'Official website of the Town of Brackwater',
      keywords: ['local government', 'town council', 'public works', 'public records', 'water', 'reservoir', 'roads', 'drainage', 'permits', 'harbor', 'festival', 'community', 'parks', 'history', 'mayor', 'statement', 'agreements', 'hearing', 'transcript', 'fishing'],
      address: 'brackwater.gov',
      home: 'pages/brackwater/brackwater.html',
      pages: [
        { file: 'pages/brackwater/brackwaterAbout.html',       address: 'brackwater.gov/about' },
        { file: 'pages/brackwater/brackwaterGovernment.html',  address: 'brackwater.gov/government' },
        { file: 'pages/brackwater/brackwaterRecords.html',     address: 'brackwater.gov/records' }
      ]
    },
    {
      name: 'Laguna Honda Wildlife Park',
      description: 'Brackwater, coastal wetlands and reservoir',
      keywords: ['wildlife', 'birds', 'reservoir', 'park', 'nature', 'wetlands', 'marsh', 'trails', 'keepers', 'logs', 'water', 'salinity', 'fishing', 'boat ramp', 'pelicans', 'spoonbills', 'pump house'],
      address: 'lagunahonda.brackwater.gov',
      home: 'pages/lagunaHonda/lagunaHonda.html',
      pages: [
        { file: 'pages/lagunaHonda/lagunaHondaLogs.html',  address: 'lagunahonda.brackwater.gov/logs' },
        { file: 'pages/lagunaHonda/lagunaHondaAbout.html', address: 'lagunahonda.brackwater.gov/about' }
      ]
    }, 
    {
      name: 'Salome',
      description: 'Salome is an artist-run space in Brackwater, established in 2017.',
      keywords: ['art', 'artists', 'artist-run space', 'artist collective', 'collective', 'Brackwater art', 'sound', 'moving image', 'installation', 'writing', 'fabrication', 'photography', 'projection', 'exhibitions', 'screenings', 'performances', 'workshops', 'events', 'projects', 'members', 'guest members', 'Inez', 'Joaquín', 'Joaquin', 'Mae', 'Teo', 'Harbor Festival', 'currents', 'generative', 'smoke'],
      address: 'salome.art',
      home: 'pages/salome/salome.html',
      pages: [
        { file: 'pages/salome/salomeRoom.html',     address: 'salome.art/room' },
        { file: 'pages/salome/salomeProjects.html', address: 'salome.art/projects' }
      ]
    },
    {
      name: 'Tessera Systems',
      description: 'Tessera develops AI technologies for border security, with applications in defense intelligence and commercial computing.',
      keywords: ['Tessera', 'technology', 'ai', 'artificial intelligence', 'security', 'border', 'borders', 'border security', 'boundaries', 'boundary', 'territories', 'detection', 'tracking', 'defense', 'defense intelligence', 'military intelligence', 'intelligence', 'terrestrial', 'maritime', 'land', 'sea', 'air', 'digital', 'commercial ai', 'commercial computing', 'computing', 'infrastructure', 'Brackwater', 'Brackwater facility', 'employment', 'partnerships', 'home'],
      address: 'tesserasystems.com/brackwater',
      home: 'pages/tessera/tessera.html',
      pages: [
        { file: 'pages/tessera/tesseraBorderSecurity.html', address: 'tesserasystems.com/brackwater/border-security' },
        { file: 'pages/tessera/tesseraOperations.html',     address: 'tesserasystems.com/brackwater/operations' }
      ]
    }
  ];

  /* Cruze pages */
  var BROWSER_PAGES = [
    { file: 'pages/main/about.html',            address: BROWSER.domain + '/about' },
    { file: 'pages/main/how-search-works.html', address: BROWSER.domain + '/how-search-works' },
    { file: 'pages/main/help.html',             address: BROWSER.domain + '/help' },
    { file: 'pages/main/privacy.html',          address: BROWSER.domain + '/privacy' },
    { file: 'pages/main/advertising.html',      address: BROWSER.domain + '/advertising' },
    { file: 'pages/main/search.html',           address: BROWSER.domain + '/search' }
  ];

  function pathOf(file) {
    return new URL(file, ROOT).pathname;
  }

  var addresses = Object.create(null);
  var siteOf = Object.create(null);

  BROWSER_PAGES.forEach(function (page) {
    addresses[pathOf(page.file)] = page.address;
  });

  SITES.forEach(function (site) {
    addresses[pathOf(site.home)] = site.address;
    siteOf[pathOf(site.home)] = site.name;

    (site.pages || []).forEach(function (page) {
      addresses[pathOf(page.file)] = page.address;
      siteOf[pathOf(page.file)] = site.name;
    });
  });

  /* Visited sites */

  var VISITED_KEY = 'browserVisited';

  function getVisited() {
    try {
      return JSON.parse(sessionStorage.getItem(VISITED_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function markVisited(name) {
    try {
      var seen = getVisited();
      if (seen.indexOf(name) === -1) {
        seen.push(name);
        sessionStorage.setItem(VISITED_KEY, JSON.stringify(seen));
      }
    } catch (e) {}
  }

  /* Search index */

  var WEIGHTS = { name: 10, keywords: 6, description: 4, content: 2 };

  var STOPWORDS = ('a an and are at be can do does for from how i in is it me my of on or ' +
    'that the there this to was what when where which who why with you your about any some').split(' ');

  function words(text) {
    return String(text || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  }

  function tokens(query) {
    return words(query).filter(function (w) { return STOPWORDS.indexOf(w) === -1; });
  }

  var entries = SITES.map(function (site) {
    return {
      site: site,
      name: words(site.name),
      keywords: words((site.keywords || []).join(' ')),
      description: words(site.description),
      content: []
    };
  });

  var indexState = 'idle';
  var indexWaiting = [];

  function textOf(file, body) {
    if (/\.js$/.test(file)) {
      return (body.match(/'(?:[^'\\]|\\.)*'/g) || []).join(' ');
    }
    var doc = new DOMParser().parseFromString(body, 'text/html');
    Array.prototype.forEach.call(doc.querySelectorAll('script, style, noscript'), function (n) { n.remove(); });
    return doc.body ? doc.body.textContent : '';
  }

  function loadIndex(done) {
    if (indexState === 'ready') { if (done) done(); return; }
    if (done) indexWaiting.push(done);
    if (indexState === 'loading') return;
    indexState = 'loading';

    var jobs = entries.map(function (entry) {
      var files = [entry.site.home]
        .concat((entry.site.pages || []).map(function (p) { return p.file; }))
        .concat(entry.site.extra || []);

      return Promise.all(files.map(function (file) {
        return fetch(ROOT + file)
          .then(function (r) { return r.ok ? r.text() : ''; })
          .then(function (body) { return textOf(file, body); })
          .catch(function () { return ''; });
      })).then(function (texts) {
        var seen = Object.create(null);
        words(texts.join(' ')).forEach(function (w) { seen[w] = true; });
        entry.content = Object.keys(seen);
      });
    });

    Promise.all(jobs).then(function () {
      indexState = 'ready';
      var waiting = indexWaiting;
      indexWaiting = [];
      waiting.forEach(function (fn) { fn(); });
    });
  }

  function hasPrefix(list, token) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].indexOf(token) === 0) return true;
    }
    return false;
  }

  function search(query) {
    var toks = tokens(query);
    if (!toks.length) return [];

    var scored = entries.map(function (entry, order) {
      var score = 0;
      toks.forEach(function (t) {
        if (hasPrefix(entry.name, t)) score += WEIGHTS.name;
        else if (hasPrefix(entry.keywords, t)) score += WEIGHTS.keywords;
        else if (t.length >= 2 && hasPrefix(entry.description, t)) score += WEIGHTS.description;
        else if (t.length >= 3 && hasPrefix(entry.content, t)) score += WEIGHTS.content;
      });
      return { site: entry.site, score: score, order: order };
    }).filter(function (r) { return r.score > 0; });

    if (!scored.length) return [];

    var top = Math.max.apply(null, scored.map(function (r) { return r.score; }));
    return scored
      .filter(function (r) { return r.score >= top / 5; })
      .sort(function (a, b) { return b.score - a.score || a.order - b.order; })
      .map(function (r) { return r.site; });
  }

  var OTHERS_COUNT = 3;
  var others = SITES.slice().sort(function () { return Math.random() - 0.5; }).slice(0, OTHERS_COUNT);

  function resultsUrl(query) {
    return ROOT + 'pages/main/search.html?q=' + encodeURIComponent(query.trim());
  }

  /* One result */

  function resultItem(site, className) {
    var li = document.createElement('li');
    if (className) li.className = className;
    var a = document.createElement('a');
    var name = document.createElement('span');
    var addr = document.createElement('span');

    a.href = ROOT + site.home;
    if (getVisited().indexOf(site.name) !== -1) a.classList.add('is-visited');

    name.className = 'browser-results__name';
    name.textContent = site.name;
    addr.className = 'browser-results__address';
    addr.textContent = site.address;

    a.appendChild(name);
    a.appendChild(addr);

    if (site.description) {
      var desc = document.createElement('span');
      desc.className = 'browser-results__desc';
      desc.textContent = site.description;
      a.appendChild(desc);
    }

    li.appendChild(a);
    return li;
  }

  function note(text, className) {
    var li = document.createElement('li');
    li.className = className;
    li.textContent = text;
    return li;
  }

  /* Live suggestions */

  function attach(form, input, options) {
    options = options || {};

    form.classList.add('browser-results-host');

    var list = document.createElement('ul');
    list.className = 'browser-results';
    list.setAttribute('aria-label', 'Suggestions');
    list.hidden = true;
    form.appendChild(list);

    function close() {
      list.hidden = true;
      list.innerHTML = '';
    }

    function currentValue() {
      return input.value === options.idleValue ? '' : input.value;
    }

    function render() {
      var value = currentValue();

      if (!words(value).length) {
        close();
        return;
      }

      var found = search(value);
      list.innerHTML = '';

      if (found.length) {
        found.forEach(function (site) { list.appendChild(resultItem(site)); });
      } else {
        list.appendChild(note('No matching results found.', 'browser-results__none'));
        list.appendChild(note('Other websites to explore', 'browser-results__heading'));
        others.forEach(function (site) { list.appendChild(resultItem(site)); });
      }

      list.hidden = false;
    }

    function update() {
      render();
      if (indexState !== 'ready') loadIndex(function () { if (!list.hidden || words(currentValue()).length) render(); });
    }

    input.addEventListener('input', update);
    input.addEventListener('focus', update);

    // Enter opens the full results page
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var value = currentValue();
      if (!words(value).length) return;
      location.href = resultsUrl(value);
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') {
        var first = list.querySelector('a');
        if (first) {
          e.preventDefault();
          first.focus();
        }
      } else if (e.key === 'Escape') {
        close();
        if (options.onEscape) options.onEscape();
      }
    });

    list.addEventListener('keydown', function (e) {
      var links = Array.prototype.slice.call(list.querySelectorAll('a'));
      var i = links.indexOf(document.activeElement);

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (links[i + 1]) links[i + 1].focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (i > 0) links[i - 1].focus();
        else input.focus();
      } else if (e.key === 'Escape') {
        close();
        input.focus();
      }
    });

    document.addEventListener('click', function (e) {
      if (!form.contains(e.target)) close();
    });
  }

  /* Logo glitch */

  (function () {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduce && reduce.matches) return;

    function next() {
      setTimeout(function () {
        if (!(reduce && reduce.matches)) {
          var logos = document.querySelectorAll('.cruze-logo');
          Array.prototype.forEach.call(logos, function (logo) {
            logo.classList.remove('is-glitching');
            void logo.offsetWidth;            // restart the animation
            logo.classList.add('is-glitching');
          });
          setTimeout(function () {
            Array.prototype.forEach.call(logos, function (logo) { logo.classList.remove('is-glitching'); });
          }, 600);
        }
        next();
      }, 45000 + Math.random() * 45000);
    }

    next();
  })();

  window.BrowserNav = {
    attach: attach,
    search: search,
    loadIndex: loadIndex,
    resultItem: resultItem,
    others: others,
    words: words
  };

  /* The bar */

  var here = location.pathname;

  if (here === pathOf('index.html') || here === new URL(ROOT).pathname) return;

  if (siteOf[here]) markVisited(siteOf[here]);

    var shown = document.documentElement.getAttribute('data-browser-address') || addresses[here] || '';

  if (!document.querySelector('link[href*="Atkinson"]')) {
    var font = document.createElement('link');
    font.rel = 'stylesheet';
    font.href = FONT_URL;
    document.head.appendChild(font);
  }

  var bar = document.createElement('div');
  bar.className = 'browser-bar';

  bar.innerHTML =
    '<a class="browser-home" href="' + ROOT + 'index.html">' +
      '<img class="cruze-logo" src="' + ROOT + BROWSER.logo + '" alt="" draggable="false">' +
    '</a>' +
    '<form class="browser-form" role="search" autocomplete="off">' +
      '<input class="browser-input" type="text" aria-label="Search" spellcheck="false">' +
    '</form>';

  bar.querySelector('.browser-home').setAttribute('aria-label', BROWSER.name + ' home');
  bar.querySelector('img').alt = BROWSER.name;

  document.documentElement.classList.add('has-browser-frame');
  document.body.prepend(bar);

  var form = bar.querySelector('.browser-form');
  var input = bar.querySelector('.browser-input');

  input.value = shown;

  input.addEventListener('focus', function () {
    input.select();
  });

  attach(form, input, {
    idleValue: shown,
    onEscape: function () {
      input.value = shown;
      input.blur();
    }
  });
})();

/* ========== LANDING PAGE ========== */
(function () {
  'use strict';

  var form = document.getElementById('search-form');
  var input = document.getElementById('search-input');

  if (!form || !input || !window.BrowserNav) return;

  BrowserNav.attach(form, input);
})();

/* ========== SEARCH RESULTS ========== */
(function () {
  'use strict';

  var nav = window.BrowserNav;
  var host = document.getElementById('results');
  var title = document.getElementById('results-title');
  if (!nav || !host || !title) return;

  var query = (new URLSearchParams(location.search).get('q') || '').trim();

  function list(sites) {
    var ul = document.createElement('ul');
    ul.className = 'results-list';
    sites.forEach(function (site) { ul.appendChild(nav.resultItem(site, 'results-item')); });
    return ul;
  }

  function para(text, className) {
    var p = document.createElement('p');
    p.className = className;
    p.textContent = text;
    return p;
  }

  if (!nav.words(query).length) {
    title.textContent = 'Search';
    host.appendChild(para('Type in the search bar to look for something.', 'results-note'));
    return;
  }

  document.title = query + ' | Cruze';
  title.textContent = 'Results for “' + query + '”';
  host.appendChild(para('Searching…', 'results-note'));

  nav.loadIndex(function () {
    var found = nav.search(query);
    host.innerHTML = '';

    if (found.length) {
      host.appendChild(para(found.length + (found.length === 1 ? ' result' : ' results'), 'results-count'));
      host.appendChild(list(found));
      return;
    }

    host.appendChild(para('No matching results found for “' + query + '”.', 'results-none'));

    var h2 = document.createElement('h2');
    h2.className = 'results-others';
    h2.textContent = 'Other websites to explore';
    host.appendChild(h2);
    host.appendChild(list(nav.others));
  });
})();
