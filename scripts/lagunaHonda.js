(function () {
  'use strict';

  /* ========== KEEPER LOGS ========== */

  var rests = document.querySelectorAll('.lh-log__rest');
  if (!rests.length) return;

  function describe(rest) {
    var entry = rest.closest('.lh-log');
    if (!entry) return '';
    var time = entry.querySelector('.lh-log__date time');
    var date = time ? time.textContent.replace(/,\s*\d{4}\s*$/, '').trim() : '';
    var place = '';
    var metas = entry.querySelectorAll('.lh-log__meta p');
    Array.prototype.forEach.call(metas, function (p) {
      var label = p.querySelector('.lh-label');
      if (label && /^Location/.test(label.textContent)) {
        place = p.textContent.replace(label.textContent, '').trim();
      }
    });
    return [date, place].filter(Boolean).join(', ');
  }

  function setOpen(rest, button, open) {
    var label = open ? 'Show less' : 'Read more';
    var detail = button.getAttribute('data-entry');
    rest.hidden = !open;
    button.setAttribute('aria-expanded', open ? 'true' : 'false');
    button.textContent = label;
    if (detail) button.setAttribute('aria-label', label + ', ' + detail);
  }

  var controls = {};

  Array.prototype.forEach.call(rests, function (rest) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'lh-log__toggle';
    button.setAttribute('aria-controls', rest.id);
    button.setAttribute('data-entry', describe(rest));
    rest.parentNode.insertBefore(button, rest.nextSibling);
    setOpen(rest, button, false);

    button.addEventListener('click', function () {
      var opening = rest.hidden;
      setOpen(rest, button, opening);
      if (!opening) {
        var entry = rest.closest('.lh-log');
        if (entry && entry.getBoundingClientRect().top < 0) entry.scrollIntoView();
      }
    });

    var entry = rest.closest('.lh-log');
    if (entry) controls[entry.id] = function () { setOpen(rest, button, true); };
  });

  function openFromHash() {
    var id = decodeURIComponent(location.hash.slice(1));
    if (controls[id]) {
      controls[id]();
      document.getElementById(id).scrollIntoView();
    }
  }
  openFromHash();
  window.addEventListener('hashchange', openFromHash);
})();
