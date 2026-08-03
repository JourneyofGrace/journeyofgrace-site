/* Journey of Grace — Planning Center Integration & Site Features */

(function() {
  'use strict';

  /* Planning Center Online Widget Integration */
  function initPCOCalendar() {
    var widgetContainer = document.getElementById('pco-calendar-widget');
    if (!widgetContainer) return;
    var calendarId = 'YOUR_CALENDAR_ID';
    if (calendarId === 'YOUR_CALENDAR_ID') {
      widgetContainer.innerHTML = '<p class="pco-placeholder">Planning Center calendar widget — configure YOUR_CALENDAR_ID in js/main.js</p>';
      return;
    }
    widgetContainer.innerHTML = '<iframe src="https://onlinechurch.plannedcenter.com/calendars/' + calendarId + '/embed" width="100%" height="600" frameborder="0" style="border:none;" title="Journey of Grace Events Calendar"></iframe>';
  }

  function initPCOGroups() {
    var widgetContainer = document.getElementById('pco-groups-widget');
    if (!widgetContainer) return;
    var groupsId = 'YOUR_GROUPS_ID';
    if (groupsId === 'YOUR_GROUPS_ID') {
      widgetContainer.innerHTML = '<p class="pco-placeholder">Planning Center groups widget — configure YOUR_GROUPS_ID in js/main.js</p>';
      return;
    }
    widgetContainer.innerHTML = '<iframe src="https://onlinechurch.plannedcenter.com/groups/' + groupsId + '/embed" width="100%" height="600" frameborder="0" style="border:none;" title="Journey of Grace Groups"></iframe>';
  }

  function initPCOGiving() {
    var givingContainer = document.getElementById('pco-giving-widget');
    if (!givingContainer) return;
    var givingId = 'YOUR_GIVING_ID';
    if (givingId === 'YOUR_GIVING_ID') {
      givingContainer.innerHTML = '<p class="pco-placeholder">Planning Center giving widget — configure YOUR_GIVING_ID in js/main.js</p>';
      return;
    }
    givingContainer.innerHTML = '<iframe src="https://onlinechurch.plannedcenter.com/giving/' + givingId + '/embed" width="100%" height="600" frameborder="0" style="border:none;" title="Journey of Grace Giving"></iframe>';
  }

  /* Sermon Archive Data */
  var sermons = [
    { title: 'Sunday Worship Series', date: 'Ongoing', url: '#' },
    { title: 'Past Sermons Archive', date: '2022-2026', url: '#' },
    { title: 'Special Events & Guest Speakers', date: 'Various', url: '#' }
  ];

  function initSermonArchive() {
    var list = document.getElementById('sermon-list');
    if (!list) return;
    var html = '<ul class="sermon-list">';
    sermons.forEach(function(sermon) {
      html += '<li class="sermon-item">';
      html += '<div><span class="sermon-title">' + sermon.title + '</span>';
      html += '<span class="sermon-date" style="margin-left:1rem;">' + sermon.date + '</span></div>';
      html += '<a href="' + sermon.url + '" class="sermon-link">Listen &rarr;</a>';
      html += '</li>';
    });
    html += '</ul>';
    list.innerHTML = html;
  }

  /* Event Listings */
  var events = [
    { title: 'Sunday Worship', date: 'Every Sunday', time: '9:00-10:10 am', location: '955 E University Dr, Mesa, AZ' },
    { title: 'Sunday School', date: 'Every Sunday', time: '10:30-11:30 am', location: '955 E University Dr, Mesa, AZ' },
    { title: 'Youth Group', date: 'Every Wednesday', time: '7:00-8:00 pm', location: '955 E University Dr, Mesa, AZ' },
    { title: 'Prayer & Testimony', date: 'First Wednesday', time: '6:30-8:30 pm', location: '955 E University Dr, Mesa, AZ' },
    { title: "Women's Meeting", date: 'Second Saturday', time: '2:00-5:00 pm', location: '955 E University Dr, Mesa, AZ' }
  ];

  function initEventListings() {
    var list = document.getElementById('event-list');
    if (!list) return;
    var html = '<ul class="event-list">';
    events.forEach(function(event) {
      html += '<li class="event-item">';
      html += '<div class="event-date">' + event.date + '</div>';
      html += '<div class="event-details">';
      html += '<div class="event-title">' + event.title + '</div>';
      html += '<div class="event-time">' + event.time + '</div>';
      html += '<div class="event-location">' + event.location + '</div>';
      html += '</div></li>';
    });
    html += '</ul>';
    list.innerHTML = html;
  }

  /* Mobile Navigation Toggle */
  function initMobileNav() {
    var toggle = document.querySelector('.nav-toggle');
    var nav = document.querySelector('.nav-list');
    if (!toggle || !nav) return;
    toggle.addEventListener('click', function() {
      nav.classList.toggle('open');
      var isOpen = nav.classList.contains('open');
      toggle.setAttribute('aria-expanded', isOpen);
      toggle.textContent = isOpen ? '\u2715' : '\u2630';
    });
  }

  /* Active Nav Link Highlighting */
  function initActiveNav() {
    var currentPath = window.location.pathname;
    var navLinks = document.querySelectorAll('.nav-list a');
    navLinks.forEach(function(link) {
      var href = link.getAttribute('href');
      if (href && currentPath.endsWith(href.replace(/^\//, ''))) {
        link.classList.add('active');
      }
    });
  }

  /* Formspree Form Integration */
  function initForms() {
    var forms = document.querySelectorAll('form[action*="formspree.io"]');
    forms.forEach(function(form) {
      var action = form.getAttribute('action');
      if (action && action.indexOf('YOUR_FORM_ID') !== -1) {
        var hint = form.querySelector('.form-hint');
        if (!hint) {
          hint = document.createElement('p');
          hint.className = 'form-hint';
          hint.textContent = 'Formspree form — replace YOUR_FORM_ID with your Formspree form ID';
          form.appendChild(hint);
        }
      }
    });
  }

  /* Initialize all features */
  document.addEventListener('DOMContentLoaded', function() {
    initPCOCalendar();
    initPCOGroups();
    initPCOGiving();
    initSermonArchive();
    initEventListings();
    initMobileNav();
    initActiveNav();
    initForms();
  });

})();