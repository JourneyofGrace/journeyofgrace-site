document.addEventListener('DOMContentLoaded', function() {
  initPCOWidgets();
  initFormspreeForms();
  initMobileNav();
  initSermonArchive();
  initEventExports();
  initFormThanks();
});

function initFormThanks() {
  if (window.location.hash === '#submitted') {
    document.querySelectorAll('.form-thanks').forEach(function(el) {
      el.hidden = false;
    });
  }
}

function initPCOWidgets() {
  var calendarId = 'YOUR_CALENDAR_ID';
  var groupsId = 'YOUR_GROUPS_ID';
  var givingId = 'YOUR_GIVING_ID';

  if (calendarId && calendarId !== 'YOUR_CALENDAR_ID') {
    var calendarContainer = document.getElementById('pco-calendar');
    if (calendarContainer) {
      calendarContainer.innerHTML = '<iframe src="https://onlinechurch.plannedcenter.com/embed/calendar/' + calendarId + '" width="100%" height="600" frameborder="0" style="border: none;"></iframe>';
    }
  }

  if (groupsId && groupsId !== 'YOUR_GROUPS_ID') {
    var groupsContainer = document.getElementById('pco-groups');
    if (groupsContainer) {
      groupsContainer.innerHTML = '<iframe src="https://onlinechurch.plannedcenter.com/embed/groups/' + groupsId + '" width="100%" height="600" frameborder="0" style="border: none;"></iframe>';
    }
  }

  if (givingId && givingId !== 'YOUR_GIVING_ID') {
    var givingContainer = document.getElementById('pco-giving');
    if (givingContainer) {
      givingContainer.innerHTML = '<iframe src="https://onlinechurch.plannedcenter.com/embed/giving/' + givingId + '" width="100%" height="600" frameborder="0" style="border: none;"></iframe>';
    }
  }
}

function initFormspreeForms() {
  var formspreeId = 'YOUR_FORM_ID';
  if (formspreeId && formspreeId !== 'YOUR_FORM_ID') {
    var forms = document.querySelectorAll('form[data-formspree]');
    forms.forEach(function(form) {
      form.setAttribute('action', 'https://formspree.io/f/' + formspreeId);
      form.setAttribute('method', 'POST');
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        var formData = new FormData(form);
        fetch(form.action, {
          method: 'POST',
          body: formData,
          headers: { 'Accept': 'application/json' }
        }).then(function(response) {
          if (response.ok) {
            form.innerHTML = '<p>Thank you! We will be in touch soon.</p>';
          } else {
            form.innerHTML = '<p>Something went wrong. Please try again.</p>';
          }
        }).catch(function() {
          form.innerHTML = '<p>Something went wrong. Please try again.</p>';
        });
      });
    });
  }
}

function initMobileNav() {
  var navToggle = document.querySelector('.nav-toggle');
  var handledBySquarespace = document.querySelector('.overlay-nav-wrapper');
  if (navToggle && !handledBySquarespace) {
    navToggle.addEventListener('click', function() {
      document.body.classList.toggle('nav-open');
    });
  }
}

function initSermonArchive() {
  var list = document.querySelector('.sermon-list');
  if (!list) return;

  var items = list.querySelectorAll('.sermon-item');
  if (!items.length) return;

  var searchInput = document.getElementById('sermon-search');
  var seriesSelect = document.getElementById('sermon-series');
  var speakerSelect = document.getElementById('sermon-speaker');

  function values(item, attr) {
    var raw = item.getAttribute(attr);
    if (!raw) return [];
    return raw.split(',').map(function(v) { return v.trim(); }).filter(Boolean);
  }

  function populate(select, attr) {
    if (!select) return;
    var seen = {};
    items.forEach(function(item) {
      values(item, attr).forEach(function(v) {
        if (!seen[v]) {
          seen[v] = true;
          var option = document.createElement('option');
          option.value = v;
          option.textContent = v;
          select.appendChild(option);
        }
      });
    });
  }

  function matches(item, text) {
    if (!text) return true;
    var haystack = (item.textContent + ' ' + item.getAttribute('data-tags') + ' ' + item.getAttribute('data-topic')).toLowerCase();
    return text.split(/\s+/).every(function(word) {
      return haystack.indexOf(word) > -1;
    });
  }

  function applyFilters() {
    var text = searchInput ? searchInput.value.toLowerCase() : '';
    var series = seriesSelect ? seriesSelect.value : '';
    var speaker = speakerSelect ? speakerSelect.value : '';
    items.forEach(function(item) {
      var seriesOk = !series || values(item, 'data-series').indexOf(series) > -1;
      var speakerOk = !speaker || values(item, 'data-speaker').indexOf(speaker) > -1;
      item.hidden = !(seriesOk && speakerOk && matches(item, text));
    });
  }

  populate(seriesSelect, 'data-series');
  populate(speakerSelect, 'data-speaker');

  if (searchInput) searchInput.addEventListener('input', applyFilters);
  if (seriesSelect) seriesSelect.addEventListener('change', applyFilters);
  if (speakerSelect) speakerSelect.addEventListener('change', applyFilters);

  items.forEach(function(item) {
    item.addEventListener('click', function() {
      var audio = item.querySelector('audio');
      if (audio) {
        if (audio.paused) {
          audio.play();
          item.classList.add('playing');
        } else {
          audio.pause();
          item.classList.remove('playing');
        }
      }
    });
  });
}

function initEventExports() {
  document.querySelectorAll('.eventlist-event').forEach(function(article) {
    var ical = article.querySelector('.eventlist-meta-export-ical');
    if (!ical || !ical.href || ical.href.indexOf('/journeyofgrace-site/events') === -1) return;

    var titleEl = article.querySelector('.eventlist-title-link');
    var dateEl = article.querySelector('.eventlist-meta-date time');
    var startTimeEl = article.querySelector('.event-time-24hr-start');
    var endTimeEl = article.querySelector('.event-time-24hr-end');
    var addressEl = article.querySelector('.eventlist-meta-address');
    var excerptEl = article.querySelector('.eventlist-excerpt');

    var title = titleEl ? titleEl.textContent.trim() : 'Journey of Grace Event';
    var date = dateEl ? dateEl.getAttribute('datetime') : '';
    var start = date && startTimeEl ? date + 'T' + startTimeEl.textContent.trim() + ':00' : '';
    var end = date && endTimeEl ? date + 'T' + endTimeEl.textContent.trim() + ':00' : '';
    if (!start) return;

    var location = '';
    if (addressEl) {
      var lines = addressEl.querySelectorAll('.eventlist-meta-address-line');
      lines.forEach(function(line) {
        var text = line.textContent.trim();
        if (text) location += (location ? ', ' : '') + text;
      });
    }
    var description = excerptEl ? excerptEl.textContent.trim() : '';

    function esc(value) {
      return String(value).replace(/[,;\\]/g, function(c) {
        return '\\' + c;
      }).replace(/\n/g, '\\n');
    }

    var stamp = new Date();
    function toIcs(dt) {
      return dt.replace(/[-:]/g, '').replace('T', 'T');
    }

    var lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Journey of Grace//Events//EN',
      'BEGIN:VEVENT',
      'UID:' + Date.now() + '@journeyofgrace.church',
      'DTSTAMP:' + toIcs(stamp.toISOString().slice(0, 19)),
      'DTSTART:' + toIcs(start),
      'DTEND:' + toIcs(end),
      'SUMMARY:' + esc(title)
    ];
    if (location) lines.push('LOCATION:' + esc(location));
    if (description) lines.push('DESCRIPTION:' + esc(description));
    lines.push('END:VEVENT', 'END:VCALENDAR');

    ical.href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(lines.join('\r\n'));
    ical.setAttribute('download', 'journey-of-grace-event.ics');
  });
}
