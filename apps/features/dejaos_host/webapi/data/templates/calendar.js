(function createCalendarMiniApp() {
  let root = null;

  return {
    mount(context) {
      const ui = context.ui;
      const now = new Date();
      const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const monthText = now.toLocaleString('en', { month: 'long', year: 'numeric' });

      root = ui.view('root', context.root, 0, 0, 480, 764, ui.Theme.PAGE, 0);
      const hero = ui.card('hero', root, 20, 24, 440, 286, 24);
      ui.label('month', hero, monthText, 24, 24, 220, 26, 14, ui.Theme.RED, true);
      ui.label('day', hero, String(now.getDate()), 22, 68, 230, 102, 76, ui.Theme.INK, true);
      ui.label('week', hero, weekdays[now.getDay()], 25, 184, 260, 30, 17, ui.Theme.INK, true);
      ui.label('summary', hero, '2 events today', 25, 226, 220, 22, 11, ui.Theme.MUTED, false);

      const schedules = [
        ['10:30  Check Device Status', 'Confirm that the Host and micro apps are running'],
        ['15:00  Review Development Notes', 'Record app publishing and download results']
      ];
      schedules.forEach(function buildSchedule(item, index) {
        const card = ui.card('schedule_' + index, root, 20, 332 + index * 104, 440, 88, 14);
        ui.view('schedule_line_' + index, card, 0, 0, 5, 88, index === 0 ? ui.Theme.BRAND : ui.Theme.ORANGE, 2);
        ui.label('schedule_title_' + index, card, item[0], 20, 13, 390, 26, 13, ui.Theme.INK, true);
        ui.label('schedule_desc_' + index, card, item[1], 20, 45, 390, 24, 10, ui.Theme.MUTED, false);
      });

      context.logger.info('calendar mounted');
      return root;
    },

    show() { if (root) root.show(); },
    hide() { if (root) root.hide(); },
    unmount() { root = null; }
  };
})()
