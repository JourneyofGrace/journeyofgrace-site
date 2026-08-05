document.addEventListener('DOMContentLoaded', function() {
  initVisitMap();
  initPlanningCenter();
  initMobileNav();
  initSermonArchive();
  initEventExports();
  initFormThanks();
  initActiveNavHighlight();
  initBannerScrollFade();
});

function initBannerScrollFade() {
  var titleCard = document.querySelector('.title-card-wrapper');
  if (!titleCard) return;

  window.addEventListener('scroll', function() {
    var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    var fadeThreshold = 180;
    
    if (scrollTop > fadeThreshold) {
      titleCard.style.opacity = '0';
      titleCard.style.transform = 'translate(-50%, -70%)';
    } else {
      var opacity = Math.max(0, 1 - (scrollTop / fadeThreshold));
      titleCard.style.opacity = opacity.toFixed(2);
      titleCard.style.transform = 'translate(-50%, calc(-50% - ' + (scrollTop * 0.2) + 'px))';
    }
  });
}

function initActiveNavHighlight() {
  var path = window.location.pathname.replace(/\/$/, '');
  var links = document.querySelectorAll('.jog-global-nav a, .footer-links nav a, .jog-mobile-drawer a');
  links.forEach(function(link) {
    var href = link.getAttribute('href');
    if (!href) return;
    var cleanHref = href.replace(/\/$/, '');
    if (path.endsWith(cleanHref) || (cleanHref !== '' && path.includes(cleanHref))) {
      link.classList.add('active');
    }
  });
}

function initPlanningCenter() {
  var cfg = window.JOG_CONFIG && window.JOG_CONFIG.planningCenter;
  var el = document.getElementById('church-calendar');
  if (!el) return;

  var link = document.getElementById('church-calendar-full');
  if (link && cfg && cfg.calendarLink) {
    link.href = cfg.calendarLink;
  }

  var embed = cfg && cfg.calendarEmbedUrl ? cfg.calendarEmbedUrl.trim() : '';
  if (!embed) {
    var note = document.createElement('p');
    note.className = 'church-calendar-note';
    note.innerHTML = 'Our live calendar is being set up. You can view upcoming events on our ' +
      '<a href="' + (cfg && cfg.calendarLink ? cfg.calendarLink : '#') + '">Church Center calendar</a>.';
    el.appendChild(note);
    return;
  }

  if (embed.charAt(0) === '<') {
    el.insertAdjacentHTML('beforeend', embed);
    return;
  }

  var frame = document.createElement('iframe');
  frame.className = 'church-calendar-embed';
  frame.src = embed;
  frame.title = 'Upcoming events at Journey of Grace';
  frame.setAttribute('loading', 'lazy');
  frame.setAttribute('frameborder', '0');
  el.appendChild(frame);
}

function initFormThanks() {
  var pcoFormUrl = window.JOG_CONFIG && window.JOG_CONFIG.planningCenter && window.JOG_CONFIG.planningCenter.visitorFormUrl;
  if (pcoFormUrl && pcoFormUrl.trim()) {
    document.querySelectorAll('.form-column .card, #block-ae72ca928664dd12dd05').forEach(function(card) {
      var form = card.querySelector('form.self-hosted-form');
      if (form) {
        // Hide duplicate static title/description when embedding Church Center widget
        var cardTitle = card.querySelector('.card-title');
        var formHeader = card.querySelector('.form-header-text');
        if (cardTitle) cardTitle.style.display = 'none';
        if (formHeader) formHeader.style.display = 'none';

        card.style.padding = '1.2rem';
        card.style.overflow = 'hidden';

        var frame = document.createElement('iframe');
        var cleanUrl = pcoFormUrl.trim();
        if (cleanUrl.indexOf('/embed') === -1) {
          cleanUrl = cleanUrl.replace('/forms/', '/forms/embed/');
        }
        frame.src = cleanUrl;
        frame.style.width = '100%';
        frame.style.height = '780px';
        frame.style.border = 'none';
        frame.style.borderRadius = '8px';
        frame.style.overflow = 'hidden';
        frame.title = 'Planning Center Visitor Registration';
        form.parentNode.replaceChild(frame, form);
      }
    });
    return;
  }

  var email = (window.JOG_CONFIG && window.JOG_CONFIG.formRecipientEmail) || 'office@journeyofgrace.church';
  document.querySelectorAll('form.self-hosted-form').forEach(function(form) {
    form.action = 'https://formsubmit.co/' + encodeURIComponent(email);
  });

  if (window.location.hash === '#submitted') {
    document.querySelectorAll('.form-thanks').forEach(function(el) {
      el.hidden = false;
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

function initVisitMap() {
  var mapEl = document.getElementById('visit-map');
  if (!mapEl) return;
  if (typeof L === 'undefined') return;
  var map = L.map('visit-map', {
    scrollWheelZoom: false,
    zoomControl: true,
    attributionControl: true
  }).setView([33.4219082, -111.8100475], 14);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19
  }).addTo(map);
  L.marker([33.4219082, -111.8100475]).addTo(map)
    .bindPopup('<strong>Journey of Grace</strong><br>955 E University Dr., Mesa, AZ 85203')
    .openPopup();
}
