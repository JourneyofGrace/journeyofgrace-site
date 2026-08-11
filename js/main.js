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
  initImageLightbox();
  initGivingLinks();
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
 * Two modes, chosen per page in js/config.js (planningCenter.pageForms /
 * planningCenter.relayForms):
 *
 * 1. Embed mode (default): a Planning Center form URL replaces every static
 *    form with a PCO iframe. There is no email-forwarding fallback: a page
 *    that renders a form without a configured PCO URL logs an explicit error
 *    telling staff to add one (js/config.js -> planningCenter.pageForms).
 *
 * 2. Relay mode (themed static forms): the page's own styled form stays in
 *    place and submits to the server-side relay at /api/forms/:id/submit,
 *    which posts to the Planning Center People API. This keeps the form's
 *    look and feel identical to the rest of the site. Opt in per page via
 *    planningCenter.relayForms = { "<page>.html": "<form id>" }.
 */
function initFormThanks() {
  var pageName = (window.location.pathname.split('/').filter(Boolean).pop() || '').toLowerCase() || 'index.html';
  if (!/\.html$/.test(pageName)) pageName += '.html';
  var pco = window.JOG_CONFIG && window.JOG_CONFIG.planningCenter;
  var pageForms = (pco && pco.pageForms) || {};
  var relayForms = (pco && pco.relayForms) || {};
  var relayFormId = (relayForms[pageName] || '').toString().trim();
  var pcoFormUrl = (pageForms[pageName] || (pco && pco.visitorFormUrl) || '').trim();

  var forms = document.querySelectorAll('form.self-hosted-form');

  // Relay mode: keep the static (themed) form, submit it through the relay.
  if (relayFormId) {
    forms.forEach(function(form) { initRelayForm(form, relayFormId); });

    // The relay mode form keeps its own heading, so do not hide it (the
    // "complete the form" hiding below is only for PCO iframe embeds).
    return;
  }

  if (!pcoFormUrl) {
    if (forms.length) {
      console.error('[jog] No Planning Center form configured for ' + pageName +
        '. Add a planningCenter.pageForms entry in js/config.js so the form can be embedded.');
    }
    return;
  }

  forms.forEach(function(form) {
    // The static form is only a placeholder; a PCO iframe replaces it, so
    // never let it submit anywhere itself.
    form.addEventListener('submit', function(e) { e.preventDefault(); });

    var card = form.closest('.card, .form-wrapper, .jog-form-card');
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

    // PCO's flexible embed mode flows the form to the iframe width (responsive
    // on every screen), and layout=embed strips the PCO page chrome. Both are
    // the documented way to embed a form at an arbitrary size.
    var suffix = pcoFormUrl.indexOf('?') === -1
      ? '?layout=embed&flexible=true'
      : '&layout=embed&flexible=true';
    var frame = document.createElement('iframe');
    frame.src = pcoFormUrl + suffix;
    frame.className = 'pco-form-embed';
    frame.title = 'Planning Center Form';
    frame.loading = 'lazy';

    // The form is drawn at its fixed canvas size, then scaled with a CSS
    // transform to fill the card width (see fitPcoForm below).
    var wrap = document.createElement('div');
    wrap.className = 'pco-form-scale-wrap';
    wrap.appendChild(frame);
    form.parentNode.replaceChild(wrap, form);

    // PCO's embed uses a fixed-width field canvas (the form column stays a
    // constant width at every iframe size - only the spacing reflows between
    // two measured layouts). So the iframe is drawn at its natural size and
    // then scaled to fill the card's content width, so the form grows with
    // the card instead of floating small in the middle of it.
    var PCO_CANVAS_W = 480; // widest canvas with no internal h-overflow (verified cliW==scrW==480) // ~20px wider than 430px form column (buffer, no h-scrollbar) // iframe canvas - a bit wider than the 430px form column (+buffer, no h-scrollbar)
    // Each PCO form embeds with a different number of fields, so the content
    // height differs per form. The canvas height must be >= that content or
    // the bottom of the form is clipped. Measured embed content heights:
    // 1284759 (visit / plan-your-visit) = 911px, others = 885px.
    var PCO_FORM_ID = (pcoFormUrl.match(/\/forms\/(\d+)/) || [])[1] || '';
    var PCO_CANVAS_H = PCO_FORM_ID === '1284759' ? 918 : 885; // content + a little air
    // A few pages embed very long/wide forms and want the iframe drawn big
    // enough that nothing scrolls inside it. Staff can override the embed
    // canvas per page in js/config.js:
    //   planningCenter.pageFormCanvas = { "connection-card.html": { w: 820, h: 3400 } }
    var override = (pco && pco.pageFormCanvas && pco.pageFormCanvas[pageName]) || {};
    if (override.w) PCO_CANVAS_W = override.w;
    if (override.h) PCO_CANVAS_H = override.h;
    var fitPcoForm = function() {
      if (!card) {
        return;
      }
      var cs = getComputedStyle(card);
      var w = card.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 30;
      if (w <= 0) {
        return;
      }
      var widthScale = w / PCO_CANVAS_W;
      // The card is wider than the canvas, so the form is scaled up. Reduce
      // the vertical size by a fixed amount (about 100px on desktop) by
      // scaling down from the pure width-fill so nothing gets clipped - the
      // whole form stays visible, just a bit shorter. Below 1:1 (mobile),
      // fall back to width-fill so it never gets smaller than the card.
      var heightScale = (PCO_CANVAS_H * widthScale - 100) / PCO_CANVAS_H;
      var scale = widthScale > 1 ? Math.min(widthScale, heightScale) : widthScale;
      wrap.style.width = Math.round(PCO_CANVAS_W * scale) + 'px';
      wrap.style.height = Math.round(PCO_CANVAS_H * scale) + 'px';
      wrap.style.margin = '0 auto';
      frame.style.width = PCO_CANVAS_W + 'px';
      frame.style.height = PCO_CANVAS_H + 'px';
      frame.style.transform = 'scale(' + scale + ')';
      frame.style.transformOrigin = 'top left';
    };
    fitPcoForm();
    var cardResize = new ResizeObserver(function() { fitPcoForm(); });
    cardResize.observe(card);
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
}

/**
 * Relay-mode form: keep the static (site-themed) form and submit its values
 * to the server-side relay at /api/forms/:id/submit. The relay forwards to
 * the Planning Center People API, so the visitor never leaves the page and
 * the form keeps the site's own look and feel.
 *
 * Values are sent label-keyed ({ data: { values: { "Name": "...", ... } } })
 * using each input's `name` attribute; the relay resolves labels to PCO form
 * fields server-side. On success the form's own hidden .form-thanks block is
 * shown; on failure a short error line appears above the submit button.
 */
function initRelayForm(form, formId) {
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    if (form.dataset.relayBusy === '1') {
      return;
    }
    form.dataset.relayBusy = '1';
    clearRelayError(form);

    var values = {};
    form.querySelectorAll('input[name], textarea[name], select[name]').forEach(function(el) {
      if (el.type === 'hidden') {
        return;
      }
      if (el.type === 'checkbox' || el.type === 'radio') {
        if (!el.checked) {
          return;
        }
        // Checkbox groups with the same name become arrays; the relay emits
        // one FormSubmissionValue per selected option.
        if (!values[el.name]) {
          values[el.name] = [];
        }
        values[el.name].push(el.value);
      } else {
        values[el.name] = el.value;
      }
    });

    var submitBtn = form.querySelector('input[type="submit"], button[type="submit"]');
    var btnText = submitBtn ? submitBtn.value : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.value = 'Sending...';
    }

    fetch('/api/forms/' + encodeURIComponent(formId) + '/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: { values: values } }),
    }).then(function(res) {
      return res.json().then(function(body) {
        return { ok: res.ok, body: body };
      });
    }).then(function(result) {
      if (result.ok) {
        var thanks = form.parentElement.querySelector('.form-thanks');
        if (!thanks) {
          thanks = document.querySelector('.form-thanks');
        }
        if (thanks) {
          thanks.hidden = false;
          var followup = thanks.querySelector('.form-thanks-followup');
          if (followup) {
            var iAmA = values['I am A:'] || [];
            var contactMe = values['Please contact me!'] || [];
            var reachOut = iAmA.indexOf('First time visitor') !== -1 || contactMe.length > 0;
            followup.hidden = !reachOut;
          }
        }
        form.style.display = 'none';
      } else {
        showRelayError(form, (result.body && result.body.error) || 'Something went wrong. Please try again.');
      }
    }).catch(function() {
      showRelayError(form, 'Could not reach the server. Please try again.');
    }).then(function() {
      form.dataset.relayBusy = '0';
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.value = btnText;
      }
    });
  });
}

function relayErrorBox(form) {
  var box = form.querySelector('.relay-form-error');
  if (!box) {
    box = document.createElement('p');
    box.className = 'relay-form-error';
    var wrapper = form.querySelector('.form-button-wrapper') || form;
    wrapper.parentNode.insertBefore(box, wrapper);
  }
  return box;
}

function showRelayError(form, message) {
  var box = relayErrorBox(form);
  box.textContent = message;
  box.hidden = false;
}

function clearRelayError(form) {
  var box = form.querySelector('.relay-form-error');
  if (box) {
    box.hidden = true;
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
  var jogDrawer = document.getElementById('mobileNavDrawer');
  if (jogDrawer) {
    window.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        jogDrawer.classList.remove('open');
      }
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
 * Image lightbox.
 *
 * Clicking a `.jog-photo-grid` photo (the gallery pages) or an About Us
 * staff photo opens the same image at full size in an overlay. The source
 * files are large, so this shows the photo roughly 3-4x the thumbnail size.
 * Closes via the × button, clicking the backdrop, or the Escape key.
 */
function initImageLightbox() {
  var targets = document.querySelectorAll('.jog-photo-grid img, .about-staff-card img');
  if (!targets.length) {
    return;
  }

  var overlay = null;

  function buildOverlay() {
    overlay = document.createElement('div');
    overlay.className = 'jog-lightbox';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Enlarged image');
    overlay.innerHTML =
      '<img class="jog-lightbox-img" alt="" />' +
      '<button type="button" class="jog-lightbox-close" aria-label="Close">&times;</button>';
    document.body.appendChild(overlay);

    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) {
        hide();
      }
    });
    overlay.querySelector('.jog-lightbox-close').addEventListener('click', hide);

    window.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && overlay.classList.contains('jog-lightbox-open')) {
        hide();
      }
    });
  }

  function show(img) {
    if (!overlay) {
      buildOverlay();
    }
    var view = overlay.querySelector('.jog-lightbox-img');
    view.src = img.currentSrc || img.src;
    view.alt = img.alt || '';
    overlay.classList.add('jog-lightbox-open');
    document.body.classList.add('jog-lightbox-locked');
    overlay.querySelector('.jog-lightbox-close').focus();
  }

  function hide() {
    if (!overlay) {
      return;
    }
    overlay.classList.remove('jog-lightbox-open');
    overlay.querySelector('.jog-lightbox-img').src = '';
    document.body.classList.remove('jog-lightbox-locked');
  }

  targets.forEach(function(img) {
    img.style.cursor = 'zoom-in';
    img.addEventListener('click', function(e) {
      e.stopPropagation();
      show(img);
    });
  });
}

/**
 * Giving links (header/footer) point at
 *   https://journeyofgrace.churchcenteronline.com/giving?open-in-church-center-modal=true
 * Every device gets the same in-page popup: a centered card with the giving
 * form scaled to fit, so the visitor never leaves the page (Planning Center's
 * official modal script opens a separate tab on mobile and on http hosts,
 * which the church does not want). No third-party script is loaded.
 */
function openGivingPopup(url) {
  if (document.querySelector('.jog-giving-popup')) {
    return;
  }
  var overlay = document.createElement('div');
  overlay.className = 'jog-giving-popup';
  var card = document.createElement('div');
  card.className = 'jog-giving-popup-card';
  card.setAttribute('tabindex', '-1');
  var close = document.createElement('button');
  close.type = 'button';
  close.className = 'jog-giving-popup-close';
  close.setAttribute('aria-label', 'Close giving form');
  close.innerHTML = '&times;';
  var body = document.createElement('div');
  body.className = 'jog-giving-popup-body';
  var wrap = document.createElement('div');
  wrap.className = 'jog-giving-frame-wrap';
  var frame = document.createElement('iframe');
  frame.src = url;
  frame.setAttribute('loading', 'lazy');
  wrap.appendChild(frame);
  body.appendChild(wrap);
  card.appendChild(close);
  card.appendChild(body);
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  // Planning Center serves its forms at a fixed 480px canvas inside an
  // iframe; scale it down to fit the popup card (same approach as the
  // embedded visit forms). The frame is scaled to fit the card's width AND
  // the card's available height so the whole form is visible without
  // scrolling.
  var CANVAS_W = 480;
  var CANVAS_H = 1000;
  var fit = function() {
    var w = card.clientWidth;
    if (w <= 0) {
      return;
    }
    // The card is capped at 94vh, so use the same bound for the scaled
    // frame height; the frame then fits the card exactly, never scrolls.
    var availH = window.innerHeight * 0.94;
    var scale = Math.min(w / CANVAS_W, availH / CANVAS_H);
    wrap.style.width = Math.round(CANVAS_W * scale) + 'px';
    wrap.style.height = Math.round(CANVAS_H * scale) - 100 + 'px';
    frame.style.width = CANVAS_W + 'px';
    frame.style.height = CANVAS_H + 'px';
    frame.style.transform = 'scale(' + scale + ')';
  };
  fit();
  if (window.ResizeObserver) {
    new ResizeObserver(fit).observe(card);
  }

  var closePopup = function() {
    closeGivingPopupOverlay();
  };
  close.addEventListener('click', closePopup);
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) {
      closePopup();
    }
  });
  document.body.classList.add('jog-giving-open');
  document.documentElement.classList.add('jog-giving-open');
  // Keep focus inside the popup so Escape (and the keyboard) interact with
  // our document rather than the giving iframe. The giving page autofocuses
  // a field inside the iframe once it renders (and again after its
  // churchcenteronline.com -> churchcenter.com redirect), stealing focus and
  // with it the Escape key. Re-grab focus while the form is still loading,
  // then stop once it has settled so we never interrupt a visitor typing.
  card.focus({ preventScroll: true });
  var refocusTicks = 0;
  var refocusTimer = window.setInterval(function() {
    if (!overlay.isConnected) {
      window.clearInterval(refocusTimer);
      return;
    }
    var ae = document.activeElement;
    var stolen = ae && ae.tagName === 'IFRAME' && overlay.contains(ae);
    if (stolen && refocusTicks < 8) {
      refocusTicks++;
      card.focus({ preventScroll: true });
    } else if (stolen) {
      window.clearInterval(refocusTimer);
    }
  }, 1000);
}

function closeGivingPopupOverlay() {
  var o = document.querySelector('.jog-giving-popup');
  if (o) {
    o.remove();
  }
  document.body.classList.remove('jog-giving-open');
  document.documentElement.classList.remove('jog-giving-open');
}

function initGivingPopup() {
  document.addEventListener('click', function(e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href*="open-in-church-center-modal"]') : null;
    if (!a) {
      return;
    }
    e.preventDefault();
    e.stopImmediatePropagation();
    openGivingPopup(a.href);
  }, true);
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      closeGivingPopupOverlay();
    }
  });
}

function initGivingLinks() {
  initGivingPopup();
}
