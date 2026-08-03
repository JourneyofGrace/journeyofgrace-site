/* Journey of Grace - Planning Center Integration */

(function() {
  'use strict';

  /*
   * Planning Center Online Widget Integration
   *
   * Planning Center provides embeddable widgets for:
   * - Calendar (events)
   * - Groups (small groups, ministries)
   * - Giving
   * - Check-in
   *
   * To use these widgets, you need a Planning Center account
   * and the widget IDs from your Planning Center dashboard.
   *
   * Documentation: https://onlinechurch.plannedcenter.com/embed
   */

  function initPCOCalendar() {
    var widgetContainer = document.getElementById('pco-calendar-widget');
    if (!widgetContainer) return;

    /*
     * Replace YOUR_CALENDAR_ID with your actual Planning Center Calendar ID.
     * Find this in Planning Center Online > Calendar > Settings > Embed.
     */
    var calendarId = 'YOUR_CALENDAR_ID';

    if (calendarId === 'YOUR_CALENDAR_ID') {
      widgetContainer.innerHTML = '<p style="text-align:center;padding:2rem;">Planning Center calendar widget — configure YOUR_CALENDAR_ID in js/main.js</p>';
      return;
    }

    widgetContainer.innerHTML = '<iframe src="https://onlinechurch.plannedcenter.com/calendars/' + calendarId + '/embed" width="100%" height="600" frameborder="0" style="border:none;" title="Journey of Grace Events Calendar"></iframe>';
  }

  function initPCOGroups() {
    var widgetContainer = document.getElementById('pco-groups-widget');
    if (!widgetContainer) return;

    /*
     * Replace YOUR_GROUPS_ID with your actual Planning Center Groups ID.
     * Find this in Planning Center Online > Groups > Settings > Embed.
     */
    var groupsId = 'YOUR_GROUPS_ID';

    if (groupsId === 'YOUR_GROUPS_ID') {
      widgetContainer.innerHTML = '<p style="text-align:center;padding:2rem;">Planning Center groups widget — configure YOUR_GROUPS_ID in js/main.js</p>';
      return;
    }

    widgetContainer.innerHTML = '<iframe src="https://onlinechurch.plannedcenter.com/groups/' + groupsId + '/embed" width="100%" height="600" frameborder="0" style="border:none;" title="Journey of Grace Groups"></iframe>';
  }

  function initPCOGiving() {
    var givingContainer = document.getElementById('pco-giving-widget');
    if (!givingContainer) return;

    /*
     * Replace YOUR_GIVING_ID with your actual Planning Center Giving ID.
     * Find this in Planning Center Online > Giving > Settings > Embed.
     */
    var givingId = 'YOUR_GIVING_ID';

    if (givingId === 'YOUR_GIVING_ID') {
      givingContainer.innerHTML = '<p style="text-align:center;padding:2rem;">Planning Center giving widget — configure YOUR_GIVING_ID in js/main.js</p>';
      return;
    }

    givingContainer.innerHTML = '<iframe src="https://onlinechurch.plannedcenter.com/giving/' + givingId + '/embed" width="100%" height="600" frameborder="0" style="border:none;" title="Journey of Grace Giving"></iframe>';
  }

  /* Initialize widgets when DOM is ready */
  document.addEventListener('DOMContentLoaded', function() {
    initPCOCalendar();
    initPCOGroups();
    initPCOGiving();
  });

})();