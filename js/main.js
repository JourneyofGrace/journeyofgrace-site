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
  initBreadcrumb();
  initHomeVideo();
});

/**
 * Homepage hero video background.
 *
 * The original Squarespace runtime (which drove the Vimeo embed) is gone in
 * this static clone, so we render a self-hosted <video> (assets/videos/) that
 * autoplays muted and loops, covering the full-screen `.jog-hero` section.
 * `data-playback-rate` on the hero is honored (defaults to 1x when absent).
 * If autoplay is blocked, playback starts on the first user interaction.
 */
function initHomeVideo() {
  var video = document.querySelector('.jog-hero-video');
  if (!video) {
    return;
  }
  var hero = video.closest('.jog-hero');
  var rate = parseFloat(hero && hero.getAttribute('data-playback-rate'));
  if (!isNaN(rate) && rate > 0 && Math.abs(rate - 1) > 0.001) {
    try {
      video.playbackRate = rate;
    } catch (e) {
      /* playbackRate is not supported everywhere — ignore. */
    }
  }

  var playPromise = video.play();
  if (playPromise && playPromise.catch) {
    // Autoplay can be blocked before the user has interacted with the page.
    // On the first interaction, start the loop so the hero never stays static.
    playPromise.catch(function() {
      var onFirst = function() {
        try { video.play(); } catch (e) {}
        document.removeEventListener('pointerdown', onFirst);
        document.removeEventListener('keydown', onFirst);
      };
      document.addEventListener('pointerdown', onFirst);
      document.addEventListener('keydown', onFirst);
    });
  }
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
    // No embed configured — events are rendered directly on the page by
    // scripts/fetch-events.mjs, so hide the embed section entirely.
    var section = el.closest('.church-calendar-section');
    if (section) {
      section.style.display = 'none';
    }
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
 * If a Planning Center form URL is configured for the current page, its embed
 * replaces every static self-hosted form on the page. Otherwise the static
 * forms post to FormSubmit so submissions land in the church office inbox, and
 * the "thanks" message is revealed after a `#submitted` redirect.
 */
function initFormThanks() {
  var pageName = (window.location.pathname.split('/').pop() || '').toLowerCase() || 'index.html';
  if (!/\.html$/.test(pageName)) pageName += '.html';
  var pco = window.JOG_CONFIG && window.JOG_CONFIG.planningCenter;
  var pageForms = (pco && pco.pageForms) || {};
  var pcoFormUrl = (pageForms[pageName] || (pco && pco.visitorFormUrl) || '').trim();

  if (pcoFormUrl) {
    document.querySelectorAll('form.self-hosted-form').forEach(function(form) {
      var card = form.closest('.card, .form-wrapper');
      if (card) {
        card.classList.add('pco-form-frame');
        var cardTitle = card.querySelector('.card-title');
        var formHeader = card.querySelector('.form-header-text');
        if (cardTitle) {
          cardTitle.style.display = 'none';
        }
        if (formHeader) {
          formHeader.style.display = 'none';
        }
      }

      var frame = document.createElement('iframe');
      frame.src = pcoFormUrl;
      frame.className = 'pco-form-embed';
      frame.title = 'Planning Center Form';

      // The PCO form page renders at a fixed 480px width even inside an
      // iframe, so on narrow screens we scale it down to fit the card
      // instead of letting it clip off the right edge.
      var wrap = document.createElement('div');
      wrap.className = 'pco-form-scale-wrap';
      wrap.appendChild(frame);
      form.parentNode.replaceChild(wrap, form);

      var fitPcoForm = function() {
        if (window.innerWidth >= 700) {
          frame.style.transform = 'none';
          wrap.style.height = '';
          return;
        }
        var scale = wrap.clientWidth / 480;
        frame.style.transform = 'scale(' + scale + ')';
        wrap.style.height = Math.round(960 * scale) + 'px';
      };
      fitPcoForm();
      window.addEventListener('resize', debounce(fitPcoForm, 150));
    });

    // The PCO form renders its own title and description, so hide the
    // redundant "Please complete the form below" heading beside the embed.
    document.querySelectorAll('h3').forEach(function(h3) {
      var text = (h3.textContent || '').toLowerCase();
      if (text.indexOf('complete the form') !== -1 || text.indexOf('complete el siguiente formulario') !== -1) {
        var block = h3.closest('.jog-block') || h3.parentElement;
        block.style.display = 'none';
      }
    });
    return;
  }

  var email = (window.JOG_CONFIG && window.JOG_CONFIG.formRecipientEmail) || 'office@journeyofgrace.church';
  document.querySelectorAll('form.self-hosted-form').forEach(function(form) {
    form.action = 'https://formsubmit.co/' + encodeURIComponent(email);

    // Send the submitter back to the exact page they came from, regardless of
    // which root (/, /journeyofgrace-site/, ...) the site is served under.
    var next = form.querySelector('input[name="_next"]');
    if (next) {
      next.value = window.location.origin + window.location.pathname + '#submitted';
    }
  });

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
    // The ICS link is a stub that always points at the events page in the same
    // directory as the current page, whatever root the site is served under.
    var icalPath = ical && ical.href ? new URL(ical.href, window.location.href).pathname : '';
    var root = window.location.pathname.replace(/[^/]+$/, '');
    if (icalPath !== root + 'events') {
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

/**
 * Journey-trail breadcrumb.
 *
 * Pages ship a static Home / <page> crumb as a no-JS fallback. Pages that
 * belong to a hub (every ministry reachable from the Connect page) get the
 * full trail inserted — Home / Connect / <page> — using relative hrefs so it
 * works at any deploy root.
 */
function initBreadcrumb() {
  var crumb = document.querySelector('.jog-breadcrumb');
  if (!crumb) {
    return;
  }
  var page = (window.location.pathname.split('/').filter(Boolean).pop() || 'index.html').replace(/\.html$/, '');
  var parents = {
    'kids-min': 'Connect',
    'youth-group': 'Connect',
    'mens-ministry': 'Connect',
    'womens-ministry': 'Connect',
    'life-groups': 'Connect',
    'journey-classes': 'Connect'
  };
  var parentLabel = parents[page];
  if (!parentLabel) {
    return;
  }
  var homeLink = crumb.querySelector('.jog-breadcrumb-home');
  var arrow = crumb.querySelector('.jog-breadcrumb-arrow');
  var currentEl = crumb.querySelector('.jog-breadcrumb-current');
  var currentLabel = currentEl ? currentEl.textContent.trim() : page;
  crumb.innerHTML =
    (homeLink ? homeLink.outerHTML : '<a class="jog-breadcrumb-home" href="./">Home</a>') +
    (arrow ? arrow.outerHTML : '<span class="jog-breadcrumb-arrow" aria-hidden="true">&rsaquo;</span>') +
    '<a class="jog-breadcrumb-parent" href="connect"><span>' + parentLabel + '</span></a>' +
    (arrow ? arrow.outerHTML : '<span class="jog-breadcrumb-arrow" aria-hidden="true">&rsaquo;</span>') +
    '<span class="jog-breadcrumb-current" aria-current="page">' + currentLabel + '</span>';
}

/**
 * Debounce helper.
 *
 * Returns a function that delays invoking `fn` until `wait` ms have passed
 * since the last call (used for resize handlers).
 */
function debounce(fn, wait) {
  var timer;
  return function() {
    var args = arguments;
    clearTimeout(timer);
    timer = setTimeout(function() {
      fn.apply(null, args);
    }, wait);
  };
}
