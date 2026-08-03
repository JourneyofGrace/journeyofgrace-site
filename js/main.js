document.addEventListener('DOMContentLoaded', function() {
  initPCOWidgets();
  initFormspreeForms();
  initMobileNav();
  initSermonArchive();
});

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
  if (navToggle) {
    navToggle.addEventListener('click', function() {
      document.body.classList.toggle('nav-open');
    });
  }
}

function initSermonArchive() {
  var sermonItems = document.querySelectorAll('.sermon-item');
  sermonItems.forEach(function(item) {
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
