/**
 * @layer view
 * @module diagnostics_page
 * @depends dxUi,BaseView,font,layout,theme,page_header,popup,i18n,diagnostics_store
 */

import dxui from '../../../../dxmodules/dxUi.js';
import BaseView from '../base_view.js';
import font from '../../components/font.js';
import layout from '../../components/layout.js';
import theme from '../../components/theme.js';
import pageHeader from '../../components/page_header.js';
import popup from '../../components/popup.js';
import { t } from '../../i18n/index.js';
import diagnosticsStore from './diagnostics_store.js';

export default class DiagnosticsPage extends BaseView {
    constructor() {
        super('settings_runtime_diagnostics');
        this._header = null;
        this._switch = null;
        this._title = null;
        this._hint = null;
        this._loading = false;
    }

    onCreate() {
        const self = this;
        this.root = dxui.View.build('page_runtime_diagnostics', dxui.Utils.LAYER.MAIN);
        this.root.setSize(layout.width, layout.height);
        layout.clearStyle(this.root);
        this.root.bgColor(0xf5f5f5);
        this.root.bgOpa(100);
        this.root.scroll(false);
        this._header = pageHeader.build(this.root, {
            idPrefix: 'runtime_diagnostics',
            titleKey: 'diagnostics.title',
        });

        const row = dxui.View.build('runtime_diagnostics_face_row', this.root);
        layout.clearStyle(row);
        row.setSize(layout.x(720), layout.y(104));
        row.setPos(layout.x(40), pageHeader.contentTop() + layout.y(24));
        row.bgColor(theme.pageBg);
        row.bgOpa(100);
        row.radius(layout.x(14));
        row.scroll(false);

        this._title = dxui.Label.build('runtime_diagnostics_face_title', row);
        this._title.setSize(layout.x(520), layout.y(42));
        this._title.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(24), 0);
        this._title.textFont(font.get(layout.fontSize(27)));
        this._title.textColor(theme.textPrimary);

        this._switch = dxui.Switch.build('runtime_diagnostics_face_switch', row);
        this._switch.setSize(layout.x(88), layout.y(48));
        this._switch.align(dxui.Utils.ALIGN.RIGHT_MID, -layout.x(28), 0);
        this._switch.on(dxui.Utils.EVENT.VALUE_CHANGED, function () {
            if (!self._loading) self._save();
        });

        this._hint = dxui.Label.build('runtime_diagnostics_face_hint', this.root);
        this._hint.setSize(layout.x(700), layout.y(110));
        this._hint.setPos(layout.x(50), pageHeader.contentTop() + layout.y(146));
        this._hint.textFont(font.get(layout.fontSize(22)));
        this._hint.textColor(theme.textSecondary);
        this._hint.longMode(dxui.Utils.LABEL_LONG_MODE.WRAP);
    }

    onEnter() {
        this._header.refresh();
        this._title.text(t('diagnostics.faceScore'));
        this._hint.text(t('diagnostics.faceScoreHint'));
        this._load();
    }

    async _load() {
        this._loading = true;
        try {
            const status = await diagnosticsStore.load();
            this._switch.select(status && status.enabled === true);
        } catch (e) {
            popup.showError(e.message || t('diagnostics.loadFailed'));
        } finally {
            this._loading = false;
        }
    }

    async _save() {
        const enabled = this._switch.isSelect() === true;
        this._loading = true;
        try {
            await diagnosticsStore.setFaceEnabled(enabled);
            popup.showSuccess(t('diagnostics.saved'));
        } catch (e) {
            this._switch.select(!enabled);
            popup.showError(e.message || t('diagnostics.saveFailed'));
        } finally {
            this._loading = false;
        }
    }
}
