/**
 * Journey of Grace — main site behavior.
 *
 * All page interactions for the static site clone (homepage hero slideshow,
 * active-nav highlighting, Church Center calendar/forms, the visit map, sermon
 * archive filters and iCal event exports) are wired up here on DOM ready.
 *
 * The site is a static export; each function guards on the presence of its
 * own markup, so a function is a no-op on pages that don't have those elements.
 */
document.addEventListener('DOMContentLoaded', function() {
  initVisitMap();
  initPlanningCenter();
  initMobileNav();
  initSermonArchive();
  initEventExports();
  initFormThanks();
  initActiveNavHighlight();
  initHomeHero();
});

/**
 * Homepage hero slideshow.
 *
 * The Squarespace universal JS (IndexGallery/HeaderOverflow) no longer runs in
 * this static clone, so the three hero images are laid out by css/style.css
 * and we just cycle an `.is-active` class every 6s. The CSS crossfades between
 * the images and applies a slow Ken Burns zoom. Counts every slide container
 * carrying a `data-url-id` (skips the legacy video `.index-main-image` slide).
 */
function initHomeHero() {
  var wrapper = document.querySelector('.index-gallery-wrapper:not(.index-item-navigation)');
  if (!wrapper) {
    return;
  }
  var slides = Array.prototype.filter.call(
    wrapper.querySelectorAll('.image-container.content-fill'),
    function(slide) {
      return slide.getAttribute('data-url-id') !== null;
    }
  );
  if (slides.length < 2) {
    return;
  }
  // Show the first image immediately; `.is-active` is what CSS uses to fade in.
  slides[0].classList.add('is-active');
  var index = 0;
  setInterval(function() {
    slides[index].classList.remove('is-active');
    index = (index + 1) % slides.length;
    slides[index].classList.add('is-active');
  }, 6000);
}

/**
 * Highlight the current page in the navigation.
 *
 * Compares the current path against every nav link (desktop header, footer and
 * mobile drawer) and adds `.active` to the matching link.
 */
function initActiveNavHighlight() {
  var path = window.location.pathname.replace(/\/$/, '');
  var links = document.querySelectorAll('.jog-global-nav a, .footer-links nav a, .jog-mobile-drawer a');
  links.forEach(function(link) {
    var href = link.getAttribute('href');
    if (!href) {
      return;
    }
    var cleanHref = href.replace(/\/$/, '');
    if (path.endsWith(cleanHref) || (cleanHref !== '' && path.includes(cleanHref))) {
      link.classList.add('active');
    }
  });
}

/**
 * Planning Center (Church Center) calendar embed.
 *
 * When a `calendarEmbedUrl` is configured (set in js/config.js) it is injected
 * either as raw HTML or as a lazy-loaded iframe. Without an embed URL a small
 * note with a link to the Church Center calendar is shown instead.
 */
function initPlanningCenter() {
  var cfg = window.JOG_CONFIG && window.JOG_CONFIG.planningCenter;
  var el = document.getElementById('church-calendar');
  if (!el) {
    return;
  }

  // Point the "full calendar" link at the configured calendar page.
  var link = document.getElementById('church-calendar-full');
  if (link && cfg && cfg.calendarLink) {
    link.href = cfg.calendarLink;
  }

  var embed = cfg && cfg.calendarEmbedUrl ? cfg.calendarEmbedUrl.trim() : '';
  if (!embed) {
    // No embed configured — show a friendly fallback link.
    var note = document.createElement('p');
    note.className = 'church-calendar-note';
    note.innerHTML = 'Our live calendar is being set up. You can view upcoming events on our ' +
      '<a href="' + (cfg && cfg.calendarLink ? cfg.calendarLink : '#') + '">Church Center calendar</a>.';
    el.appendChild(note);
    return;
  }

  // A URL starting with "<" is treated as raw embed HTML.
  if (embed.charAt(0) === '<') {
    el.insertAdjacentHTML('beforeend', embed);
    return;
  }

  // Otherwise embed the URL in a lazy iframe.
  var frame = document.createElement('iframe');
  frame.className = 'church-calendar-embed';
  frame.src = embed;
  frame.title = 'Upcoming events at Journey of Grace';
  frame.setAttribute('loading', 'lazy');
  frame.setAttribute('frameborder', '0');
  el.appendChild(frame);
}

/**
 * Visitor/contact form handling.
 *
 * If a Planning Center visitor form URL is configured, its embed replaces the
 * static self-hosted form. Otherwise the static form posts to FormSubmit so
 * submissions land in the church office inbox, and the "thanks" message is
 * revealed after a `#submitted` redirect.
 */
function initFormThanks() {
  var pcoFormUrl = window.JOG_CONFIG && window.JOG_CONFIG.planningCenter && window.JOG_CONFIG.planningCenter.visitorFormUrl;
  if (pcoFormUrl && pcoFormUrl.trim()) {
    document.querySelectorAll('.form-column .card, #block-ae72ca928664dd12dd05').forEach(function(card) {
      var form = card.querySelector('form.self-hosted-form');
      if (form) {
        // Hide the static heading so it isn't duplicated by the embed widget.
        var cardTitle = card.querySelector('.card-title');
        var formHeader = card.querySelector('.form-header-text');
        if (cardTitle) {
          cardTitle.style.display = 'none';
        }
        if (formHeader) {
          formHeader.style.display = 'none';
        }

        card.style.padding = '1.2rem';
        card.style.overflow = 'hidden';

        // Request the embeddable variant of the form URL.
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

  // Default path: post submissions through FormSubmit to the church inbox.
  var email = (window.JOG_CONFIG && window.JOG_CONFIG.formRecipientEmail) || 'office@journeyofgrace.church';
  document.querySelectorAll('form.self-hosted-form').forEach(function(form) {
    form.action = 'https://formsubmit.co/' + encodeURIComponent(email);
  });

  // Show the thanks message when the user is redirected back with #submitted.
  if (window.location.hash === '#submitted') {
    document.querySelectorAll('.form-thanks').forEach(function(el) {
      el.hidden = false;
    });
  }
}

/**
 * Legacy mobile navigation toggle.
 *
 * Only wires the old `.nav-toggle` button when Squarespace's overlay nav is not
 * present (the jog header's own drawer is handled by inline onclick handlers).
 */
function initMobileNav() {
  var navToggle = document.querySelector('.nav-toggle');
  var handledBySquarespace = document.querySelector('.overlay-nav-wrapper');
  if (navToggle && !handledBySquarespace) {
    navToggle.addEventListener('click', function() {
      document.body.classList.toggle('nav-open');
    });
  }
}

/**
 * Sermon archive search/filter.
 *
 * Filters `.sermon-item` cards by series, speaker and free-text search, and
 * lets a whole card be clicked to play/pause its embedded audio.
 */
function initSermonArchive() {
  var list = document.querySelector('.sermon-list');
  if (!list) {
    return;
  }

  var items = list.querySelectorAll('.sermon-item');
  if (!items.length) {
    return;
  }

  var searchInput = document.getElementById('sermon-search');
  var seriesSelect = document.getElementById('sermon-series');
  var speakerSelect = document.getElementById('sermon-speaker');

  // Read a comma-separated attribute (e.g. data-series) as an array.
  function values(item, attr) {
    var raw = item.getAttribute(attr);
    if (!raw) {
      return [];
    }
    return raw.split(',').map(function(v) { return v.trim(); }).filter(Boolean);
  }

  // Fill a <select> with the unique values found across all items.
  function populate(select, attr) {
    if (!select) {
      return;
    }
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

  // True when every search word appears in the item text/tags/topic.
  function matches(item, text) {
    if (!text) {
      return true;
    }
    var haystack = (item.textContent + ' ' + item.getAttribute('data-tags') + ' ' + item.getAttribute('data-topic')).toLowerCase();
    return text.split(/\s+/).every(function(word) {
      return haystack.indexOf(word) > -1;
    });
  }

  // Hide/show items based on the current search and filter values.
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

  if (searchInput) {
    searchInput.addEventListener('input', applyFilters);
  }
  if (seriesSelect) {
    seriesSelect.addEventListener('change', applyFilters);
  }
  if (speakerSelect) {
    speakerSelect.addEventListener('change', applyFilters);
  }

  // Clicking a sermon card toggles its embedded audio.
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

/**
 * iCal (.ics) download for the events list.
 *
 * Replaces each events-page "ical" link with a generated calendar file built
 * from the event's title, date/time, location and excerpt.
 */
function initEventExports() {
  document.querySelectorAll('.eventlist-event').forEach(function(article) {
    var ical = article.querySelector('.eventlist-meta-export-ical');
    if (!ical || !ical.href || ical.href.indexOf('/journeyofgrace-site/events') === -1) {
      return;
    }

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
    if (!start) {
      return;
    }

    // Combine address lines into a single comma-separated location string.
    var location = '';
    if (addressEl) {
      var lines = addressEl.querySelectorAll('.eventlist-meta-address-line');
      lines.forEach(function(line) {
        var text = line.textContent.trim();
        if (text) {
          location += (location ? ', ' : '') + text;
        }
      });
    }
    var description = excerptEl ? excerptEl.textContent.trim() : '';

    // Escape characters that iCal treats specially (commas, semicolons, newlines).
    function esc(value) {
      return String(value).replace(/[,;\\]/g, function(c) {
        return '\\' + c;
      }).replace(/\n/g, '\\n');
    }

    var stamp = new Date();

    // Convert a "YYYY-MM-DDTHH:MM:SS" timestamp into iCal's "YYYYMMDDTHHMMSS".
    function toIcs(dt) {
      return dt.replace(/[-:]/g, '');
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
    if (location) {
      lines.push('LOCATION:' + esc(location));
    }
    if (description) {
      lines.push('DESCRIPTION:' + esc(description));
    }
    lines.push('END:VEVENT', 'END:VCALENDAR');

    // Point the link at a data: URL so it downloads as a .ics file.
    ical.href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(lines.join('\r\n'));
    ical.setAttribute('download', 'journey-of-grace-event.ics');
  });
}

/**
 * Visit page map.
 *
 * Initializes the Leaflet map pinned at the church address when Leaflet has
 * been loaded (guarded so other pages render regardless).
 */
function initVisitMap() {
  var mapEl = document.getElementById('visit-map');
  if (!mapEl) {
    return;
  }
  if (typeof L === 'undefined') {
    return;
  }
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
