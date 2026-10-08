/**
 * @layer    view
 * @module   record_detail_page
 * @fires    none
 * @listens  none
 * @depends  dxUi,BaseView,font,layout,theme,page_header,assets,i18n,popup,router,record_store
 *
 * 通行记录详情（只读）：第一人员/凭证显示在主字段，组合核验的后续证据显示在扩展字段；
 * 有抓拍图片时展示小尺寸预览，避免详情页产生无意义滚动。
 */

import dxui from '../../../../dxmodules/dxUi.js';
import BaseView from '../base_view.js';
import font from '../../components/font.js';
import layout from '../../components/layout.js';
import theme from '../../components/theme.js';
import pageHeader from '../../components/page_header.js';
import popup from '../../components/popup.js';
import { asset } from '../../utils/assets.js';
import { t } from '../../i18n/index.js';
import router from '../../router/core.js';
import recordStore from './record_store.js';

const IMG_FACE_PLACEHOLDER = asset('local-user.png');

/** 信息行高 */
const ROW_H = 76;
/** 行间距 */
const ROW_GAP = 8;
/** 抓拍照片边长（设计稿） */
const PHOTO_SIZE = 160;

/** 详情文本字段 */
const DETAIL_FIELDS = ['verifyMode', 'passType', 'userId', 'name', 'passCredential',
    'additionalPerson', 'additionalCredential', 'passTime', 'passResult', 'uploadStatus'];

export default class RecordDetailPage extends BaseView {
    constructor() {
        super('settings_record_detail');
        this._header = null;
        this._content = null;
        /** @type {{ key: string, row: object, titleLbl: object, valueLbl: object }[]} */
        this._infoRows = [];
        /** @type {object|null} */
        this._photoPanel = null;
        /** @type {object|null} */
        this._photoTitleLbl = null;
        /** @type {object[]} */
        this._photoBoxes = [];
        /** @type {object[]} */
        this._photoImgs = [];
        /** @type {string|null} */
        this._recordId = null;
        this._requestToken = 0;
    }

    onCreate() {
        this.root = dxui.View.build('page_record_detail', dxui.Utils.LAYER.MAIN);
        this.root.setSize(layout.width, layout.height);
        layout.clearStyle(this.root);
        this.root.bgColor(theme.pageBg);
        this.root.bgOpa(100);
        this.root.scroll(false);

        this._header = pageHeader.build(this.root, {
            idPrefix: 'record_detail',
            titleKey: 'record.detailTitle',
        });
        this._buildBody();
    }

    onEnter(context) {
        if (this._header) {
            this._header.refresh();
        }
        this._refreshLabels();

        if (context && context.isBack) {
            return;
        }

        const id = context && context.params ? context.params.id : '';
        this._loadRecord(id);
    }

    onExit() {
        this._requestToken += 1;
    }

    _buildBody() {
        const top = pageHeader.contentTop();
        const contentH = layout.height - top;

        this._content = dxui.View.build('record_detail_content', this.root);
        this._content.setSize(layout.width, contentH);
        this._content.setPos(0, top);
        layout.clearStyle(this._content);
        this._content.bgColor(0xf5f5f5);
        this._content.bgOpa(100);
        this._content.scroll(false);
        this._content.flexFlow(dxui.Utils.FLEX_FLOW.COLUMN);
        this._content.flexAlign(
            dxui.Utils.FLEX_ALIGN.START,
            dxui.Utils.FLEX_ALIGN.CENTER,
            dxui.Utils.FLEX_ALIGN.CENTER
        );
        this._content.padTop(layout.y(16));
        this._content.padBottom(layout.y(32));
        this._content.obj.lvObjSetStylePadGap(
            layout.y(ROW_GAP),
            dxui.Utils.ENUM._LV_STYLE_STATE_CMP_SAME
        );

        this._infoRows = [];
        for (let i = 0; i < DETAIL_FIELDS.length; i++) {
            this._buildInfoRow(DETAIL_FIELDS[i]);
        }
        this._buildPhotoBlock();
    }

    /**
     * @param {string} fieldKey
     */
    _buildInfoRow(fieldKey) {
        const row = dxui.View.build('record_detail_row_' + fieldKey, this._content);
        layout.clearStyle(row);
        row.setSize(layout.x(720), layout.y(ROW_H));
        row.bgColor(theme.pageBg);
        row.bgOpa(100);
        row.radius(layout.x(14));
        row.scroll(false);
        row.clickable(false);

        const titleLbl = dxui.Label.build('record_detail_title_' + fieldKey, row);
        titleLbl.setSize(layout.x(280), layout.y(40));
        titleLbl.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(24), 0);
        titleLbl.textFont(font.get(layout.fontSize(26)));
        titleLbl.textColor(theme.textPrimary);
        titleLbl.textAlign(dxui.Utils.TEXT_ALIGN.LEFT);

        const valueLbl = dxui.Label.build('record_detail_val_' + fieldKey, row);
        valueLbl.setSize(layout.x(380), layout.y(40));
        valueLbl.align(dxui.Utils.ALIGN.RIGHT_MID, -layout.x(24), 0);
        valueLbl.textFont(font.get(layout.fontSize(24)));
        valueLbl.textColor(theme.textSecondary);
        valueLbl.textAlign(dxui.Utils.TEXT_ALIGN.RIGHT);

        this._infoRows.push({
            key: fieldKey,
            row: row,
            titleLbl: titleLbl,
            valueLbl: valueLbl,
        });
    }

    _buildPhotoBlock() {
        const photoSize = layout.x(PHOTO_SIZE);
        const pad = layout.y(28);
        const titleH = layout.y(40);
        const panelH = titleH + pad + photoSize + pad;

        this._photoPanel = dxui.View.build('record_detail_photo_panel', this._content);
        layout.clearStyle(this._photoPanel);
        this._photoPanel.setSize(layout.x(720), panelH);
        this._photoPanel.bgColor(theme.pageBg);
        this._photoPanel.bgOpa(100);
        this._photoPanel.radius(layout.x(14));
        this._photoPanel.scroll(false);
        this._photoPanel.clickable(false);
        this._photoPanel.hide();

        this._photoTitleLbl = dxui.Label.build('record_detail_photo_title', this._photoPanel);
        this._photoTitleLbl.setSize(layout.x(680), titleH);
        this._photoTitleLbl.align(dxui.Utils.ALIGN.TOP_LEFT, layout.x(24), layout.y(16));
        this._photoTitleLbl.textFont(font.get(layout.fontSize(26)));
        this._photoTitleLbl.textColor(theme.textPrimary);
        this._photoTitleLbl.textAlign(dxui.Utils.TEXT_ALIGN.LEFT);

        this._photoBoxes = [];
        this._photoImgs = [];
        for (let i = 0; i < 2; i++) {
            const photoBox = dxui.View.build('record_detail_photo_box_' + i, this._photoPanel);
            layout.clearStyle(photoBox);
            photoBox.setSize(photoSize, photoSize);
            photoBox.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -pad);
            photoBox.bgColor(0xf0f0f0);
            photoBox.bgOpa(100);
            photoBox.radius(layout.x(16));
            photoBox.borderWidth(layout.x(2));
            photoBox.setBorderColor(0xdcdcdc);
            photoBox.scroll(false);
            photoBox.hide();
            const image = dxui.Image.build('record_detail_photo_' + i, photoBox);
            image.source(IMG_FACE_PLACEHOLDER);
            image.align(dxui.Utils.ALIGN.CENTER, 0, 0);
            this._photoBoxes.push(photoBox);
            this._photoImgs.push(image);
        }
    }

    _loadRecord(id) {
        const self = this;
        const token = ++this._requestToken;
        recordStore.get(id).then(function (record) {
            if (token !== self._requestToken) return;
            if (!record) {
                popup.showError(t('record.detailNotFound'));
                router.back();
                return;
            }
            self._fillRecord(record);
        }).catch(function () {
            if (token !== self._requestToken) return;
            popup.showError(t('record.detailNotFound'));
            router.back();
        });
    }

    /** @param {object} record */
    _fillRecord(record) {
        this._recordId = record.id;
        const ok = Number(record.result) === 0;
        const stranger = recordStore.isStranger(record);
        const emptyText = t('record.valueEmpty');
        const verify = record.verify || {};
        const primary = verify.primary || {};
        const additional = Array.isArray(verify.additional) ? verify.additional : [];
        const credentialText = function (item) {
            const type = String(item && item.type || '');
            const typeText = t('record.type.' + recordStore.typeKey(type));
            const code = String(item && item.code || '');
            return code ? typeText + ' · ' + code : typeText;
        };
        const additionalPeople = additional.filter(function (item) {
            return (item.userId || item.name)
                && (item.userId !== primary.userId || item.name !== primary.name);
        }).map(function (item) {
            const name = item.name || t('record.stranger');
            return item.userId ? name + ' (' + item.userId + ')' : name;
        });
        const additionalCredentials = additional.filter(function (item) {
            return item.type || item.code || item.keyId;
        }).map(credentialText);

        const values = {
            verifyMode: t('record.verify.' + (verify.mode || 'single')),
            passType: t('record.type.' + recordStore.typeKey(record.type)),
            userId: stranger ? '' : (record.userId || emptyText),
            name: stranger ? '' : (record.name || emptyText),
            passCredential: credentialText(primary),
            additionalPerson: additionalPeople.join(' / '),
            additionalCredential: additionalCredentials.join(' / '),
            passTime: recordStore.formatTime(record.timeStamp) || emptyText,
            passResult: ok ? t('record.result.pass') : t('record.result.deny'),
            uploadStatus: Number(record.uploadState) === 1 ? t('record.upload.uploaded') : t('record.upload.pending'),
        };

        for (let i = 0; i < this._infoRows.length; i++) {
            const row = this._infoRows[i];
            // 陌生人不显示主人员字段；没有组合证据时隐藏扩展行。
            if ((stranger && (row.key === 'userId' || row.key === 'name'))
                || (row.key === 'additionalPerson' && !values.additionalPerson)
                || (row.key === 'additionalCredential' && !values.additionalCredential)) {
                row.row.hide();
                continue;
            }
            row.row.show();
            const text = values[row.key];
            row.valueLbl.text(text == null ? '' : String(text));
            if (row.key === 'uploadStatus') {
                row.valueLbl.textColor(Number(record.uploadState) === 1 ? theme.successText : theme.textSecondary);
            } else if (row.key === 'passResult') {
                row.valueLbl.textColor(ok ? theme.successText : theme.errorText);
            } else {
                row.valueLbl.textColor(theme.textSecondary);
            }
        }

        const photoPaths = [];
        function appendPhoto(path) {
            const value = String(path || '');
            if (value.indexOf('/data/') === 0 && photoPaths.indexOf(value) < 0) photoPaths.push(value);
        }
        appendPhoto(primary.imagePath || record.imagePath);
        additional.forEach(function (item) { appendPhoto(item.imagePath); });
        if (this._photoPanel) {
            if (photoPaths.length) {
                this._photoPanel.show();
                for (let i = 0; i < this._photoBoxes.length; i++) {
                    if (i < photoPaths.length) {
                        this._photoBoxes[i].show();
                        this._photoBoxes[i].align(dxui.Utils.ALIGN.BOTTOM_MID,
                            photoPaths.length === 1 ? 0 : layout.x(i === 0 ? -100 : 100), -layout.y(28));
                        this._photoImgs[i].source(photoPaths[i]);
                    } else {
                        this._photoBoxes[i].hide();
                    }
                }
            } else {
                this._photoPanel.hide();
                this._photoBoxes.forEach(function (box) { box.hide(); });
            }
        }
    }
    _refreshLabels() {
        for (let i = 0; i < this._infoRows.length; i++) {
            const row = this._infoRows[i];
            row.titleLbl.text(t('record.field.' + row.key));
        }
        if (this._photoTitleLbl) {
            this._photoTitleLbl.text(t('record.field.faceCapture'));
        }
    }
}
