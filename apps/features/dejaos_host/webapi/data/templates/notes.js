(function createNotesMiniApp() {
  let root = null;
  let input = null;
  let contextRef = null;

  return {
    mount(context) {
      const ui = context.ui;
      contextRef = context;
      root = ui.view('root', context.root, 0, 0, 480, 764, ui.Theme.PAGE, 0);
      ui.label('heading', root, 'Quick Notes', 20, 22, 300, 34, 23, ui.Theme.INK, true);
      ui.label('hint', root, 'Notes are stored on this device', 20, 58, 300, 24, 11, ui.Theme.MUTED, false);

      input = ui.textarea('input', root, 20, 98, 440, 430, 1000);
      input.text(context.storage.loadText('content', 'Write a note here...'));
      function openKeyboard() { context.keyboard.open(input); }
      input.on(ui.EVENT.FOCUSED, openKeyboard);
      input.on(ui.EVENT.CLICK, openKeyboard);

      ui.button('save', root, 'Save Note', 330, 550, 130, 46, ui.Theme.BRAND, ui.Theme.WHITE, function saveNote() {
        context.storage.saveText('content', input.text());
        context.keyboard.hide();
        context.toast('Note saved');
      }, 14, 13);

      context.logger.info('notes mounted');
      return root;
    },

    show() { if (root) root.show(); },
    hide() { if (root) root.hide(); if (contextRef) contextRef.keyboard.hide(); },
    unmount() { root = null; input = null; contextRef = null; }
  };
})()
