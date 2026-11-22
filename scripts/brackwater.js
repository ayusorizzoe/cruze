(function () {
  'use strict';

  var toggle = document.querySelector('.bw-nav-toggle');
  var nav = document.getElementById('bw-nav');

  /* ========== DOCUMENTS ========== */

  var aliases = {
    'municipal-agreements': 'laguna-honda-agreement',
    'agendas-and-minutes': 'hearing-fishing-day',
    'minutes-fishing-day': 'hearing-fishing-day'
  };
  function openTarget() {
    var id = decodeURIComponent(location.hash.slice(1));
    if (!id) return;
    var el = document.getElementById(aliases[id] || id);
    if (!el) return;
    var d = el.closest('details');
    if (d) d.open = true;
    if (aliases[id]) el.scrollIntoView();
  }
  openTarget();
  window.addEventListener('hashchange', openTarget);

  /* ========== NAVIGATION ========== */

  if (!toggle || !nav) return;

  document.body.classList.add('bw-js');

  toggle.addEventListener('click', function () {
    var open = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) {
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.focus();
    }
  });
})();
