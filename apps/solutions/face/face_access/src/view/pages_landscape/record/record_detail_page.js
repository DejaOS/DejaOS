/**
 * @layer    view
 * @module   record_detail_page
 * @fires    none
 * @listens  none
 * @depends  dxUi,BaseView,font,layout,theme,page_header,i18n,popup,router,record_store
 *
 * 通行记录详情（横屏只读）：卡片式一屏展示，无翻页。
 * 顶栏姓名/标签；有抓拍时详情两行竖排 + 右侧照片，无抓拍时类型/时间横排一行。
 */

import dxui from '../../../../dxmodules/dxUi.js';
import BaseView from '../../pages/base_view.js';
import font from '../../components/font.js';
import layout from '../../components/layout.js';
import theme from '../../components/theme.js';
import pageHeader from '../../components/page_header.js';
import popup from '../../components/popup.js';
import { t } from '../../i18n/index.js';
import router from '../../router/core.js';
import recordStore from '../../pages/record/record_store.js';
import { CONTENT_W } from '../ls_metrics.js';

/** 页面浅底 */
const PAGE_BG = 0xf5f6f8;
/** 卡片白底 */
const CARD_BG = 0xffffff;
/** 卡片描边 */
const CARD_BORDER = 0xe6e8eb;
/** 区块统一间距（设计稿 px） */
const SECTION_GAP = 12;
/** 详情标题区高度 */
const SECTION_TITLE_H = 40;
/** 信息卡高度 */
const INFO_CARD_H = 72;
/** 信息卡竖向间距 */
const INFO_CARD_GAP = 12;
/** 核验标签底/字 */
const TAG_VERIFY_BG = 0xe8f0fe;
const TAG_VERIFY_TEXT = 0x2f6fed;
/** 待上传标签 */
const TAG_PENDING_BG = 0xfff3e0;
const TAG_PENDING_TEXT = 0xd97706;

export default class RecordDetailPage extends BaseView {
    constructor() {
        super('settings_record_detail');
        this._header = null;
        this._content = null;
        this._scroll = null;
        this._innerW = 0;
        this._sectionGap = 0;

        this._nameLbl = null;
        this._idLbl = null;
        /** @type {{ root: object, label: object }[]} */
        this._tags = [];

        this._detailTitleLbl = null;
        /** @type {{ root: object, titleLbl: object, valueLbl: object }[]} */
        this._detailCards = [];

        this._verifySection = null;
        this._verifyTitleLbl = null;
        /** @type {{ root: object, indexLbl: object, roleLbl: object, nameLbl: object, credLbl: object }[]} */
        this._verifySteps = [];

        this._photoCard = null;
        this._photoTitleLbl = null;
        this._photoMedia = null;
        /** @type {object[]} */
        this._photoImgs = [];
        this._leftPanel = null;
        this._midY = 0;
        this._photoW = 0;
        this._midGap = 0;

        this._recordId = null;
        this._requestToken = 0;
    }

    onCreate() {
        this.root = dxui.View.build('page_record_detail', dxui.Utils.LAYER.MAIN);
        this.root.setSize(layout.width, layout.height);
        layout.clearStyle(this.root);
        this.root.bgColor(PAGE_BG);
        this.root.bgOpa(100);
        this.root.scroll(false);

        this._header = pageHeader.build(this.root, {
            idPrefix: 'record_detail',
            titleKey: 'record.detailTitle',
            bgOpa: 100,
        });
        this._buildBody();
    }

    onEnter(context) {
        if (this._header) {
            this._header.refresh();
        }
        this._refreshStaticTexts();
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
        this._innerW = layout.x(CONTENT_W);
        this._sectionGap = layout.y(SECTION_GAP);
        const sidePad = Math.round((layout.width - this._innerW) / 2);

        this._content = dxui.View.build('record_detail_content', this.root);
        this._content.setSize(layout.width, contentH);
        this._content.setPos(0, top);
        layout.clearStyle(this._content);
        this._content.bgColor(PAGE_BG);
        this._content.bgOpa(100);
        this._content.scroll(false);

        this._scroll = dxui.View.build('record_detail_scroll', this._content);
        layout.clearStyle(this._scroll);
        this._scroll.setSize(this._innerW, contentH - layout.y(12));
        this._scroll.setPos(sidePad, layout.y(8));
        this._scroll.bgOpa(0);
        this._scroll.scroll(true);

        let y = 0;
        y = this._buildHero(y);
        y = this._buildMiddle(y + this._sectionGap);
        this._buildVerifySection(y + this._sectionGap);
    }

    /**
     * @param {number} y
     * @returns {number}
     */
    _buildHero(y) {
        const heroH = layout.y(108);
        const hero = this._makeCard('record_detail_hero', this._scroll, this._innerW, heroH);
        hero.setPos(0, y);

        this._nameLbl = dxui.Label.build('record_detail_name', hero);
        this._nameLbl.setSize(layout.x(520), layout.y(44));
        this._nameLbl.align(dxui.Utils.ALIGN.TOP_LEFT, layout.x(28), layout.y(22));
        this._nameLbl.textFont(font.get(layout.fontSize(34)));
        this._nameLbl.textColor(theme.textPrimary);
        this._nameLbl.longMode(dxui.Utils.LABEL_LONG_MODE.CLIP);
        this._nameLbl.text('');

        this._idLbl = dxui.Label.build('record_detail_id', hero);
        this._idLbl.setSize(layout.x(560), layout.y(32));
        this._idLbl.align(dxui.Utils.ALIGN.TOP_LEFT, layout.x(28), layout.y(68));
        this._idLbl.textFont(font.getDefault(layout.fontSize(22)));
        this._idLbl.textColor(theme.textSecondary);
        this._idLbl.longMode(dxui.Utils.LABEL_LONG_MODE.CLIP);
        this._idLbl.text('');

        this._tags = [];
        for (let i = 0; i < 3; i++) {
            this._tags.push(this._makeTag('record_detail_tag_' + i, hero));
        }
        return y + heroH;
    }

    /**
     * @param {number} y
     * @returns {number} 初始占位高度对应的下一块 y（实际位置由 _relayoutMiddle 调整）
     */
    _buildMiddle(y) {
        const gap = layout.x(16);
        const photoW = layout.x(300);
        // 有图时两行信息卡高度；无图时会缩矮
        const midH = layout.y(SECTION_TITLE_H + INFO_CARD_H * 2 + INFO_CARD_GAP);
        this._midY = y;
        this._photoW = photoW;
        this._midGap = gap;

        const leftW = this._innerW - photoW - gap;
        const left = dxui.View.build('record_detail_left', this._scroll);
        layout.clearStyle(left);
        left.setSize(leftW, midH);
        left.setPos(0, y);
        left.bgOpa(0);
        left.scroll(false);
        this._leftPanel = left;

        this._detailTitleLbl = this._makeSectionTitle('record_detail_sec_detail', left, 0);

        const cardH = layout.y(INFO_CARD_H);
        const gridTop = layout.y(SECTION_TITLE_H);
        this._detailCards = [];
        for (let i = 0; i < 2; i++) {
            const card = this._makeInfoCard('record_detail_info_' + i, left, leftW, cardH);
            card.root.setPos(0, gridTop + i * (cardH + layout.y(INFO_CARD_GAP)));
            this._detailCards.push(card);
        }

        this._photoCard = this._makeCard('record_detail_photo_card', this._scroll, photoW, midH);
        this._photoCard.setPos(leftW + gap, y);
        this._photoCard.hide();

        this._photoTitleLbl = dxui.Label.build('record_detail_photo_title', this._photoCard);
        this._photoTitleLbl.setSize(photoW - layout.x(16), layout.y(32));
        this._photoTitleLbl.align(dxui.Utils.ALIGN.TOP_MID, 0, layout.y(12));
        this._photoTitleLbl.textFont(font.get(layout.fontSize(22)));
        this._photoTitleLbl.textColor(theme.textSecondary);
        this._photoTitleLbl.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);

        this._photoMedia = dxui.View.build('record_detail_photo_media', this._photoCard);
        layout.clearStyle(this._photoMedia);
        this._photoMedia.setSize(photoW - layout.x(24), midH - layout.y(52));
        this._photoMedia.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -layout.y(12));
        this._photoMedia.bgOpa(0);
        this._photoMedia.scroll(false);

        this._photoImgs = [];
        for (let i = 0; i < 2; i++) {
            const image = dxui.Image.build('record_detail_photo_' + i, this._photoMedia);
            image.hide();
            image.clickable(false);
            this._photoImgs.push(image);
        }

        return y + midH;
    }

    /**
     * @param {number} y
     */
    _buildVerifySection(y) {
        const stepH = layout.y(72);
        const sectionH = layout.y(SECTION_TITLE_H) + stepH * 2 + layout.y(10);
        this._verifySection = dxui.View.build('record_detail_verify', this._scroll);
        layout.clearStyle(this._verifySection);
        this._verifySection.setSize(this._innerW, sectionH);
        this._verifySection.setPos(0, y);
        this._verifySection.bgOpa(0);
        this._verifySection.scroll(false);

        this._verifyTitleLbl = this._makeSectionTitle('record_detail_sec_verify', this._verifySection, 0);

        this._verifySteps = [];
        for (let i = 0; i < 2; i++) {
            const step = this._makeVerifyStep(
                'record_detail_step_' + i,
                this._verifySection,
                this._innerW,
                stepH
            );
            step.root.setPos(0, layout.y(SECTION_TITLE_H) + i * (stepH + layout.y(10)));
            step.root.hide();
            this._verifySteps.push(step);
        }
    }

    /**
     * @param {string} id
     * @param {object} parent
     * @param {number} w
     * @param {number} h
     * @returns {object}
     */
    _makeCard(id, parent, w, h) {
        const card = dxui.View.build(id, parent);
        layout.clearStyle(card);
        card.setSize(w, h);
        card.bgColor(CARD_BG);
        card.bgOpa(100);
        card.radius(layout.x(14));
        card.borderWidth(layout.x(1));
        card.setBorderColor(CARD_BORDER);
        card.scroll(false);
        return card;
    }

    /**
     * @param {string} id
     * @param {object} parent
     * @returns {{ root: object, label: object }}
     */
    _makeTag(id, parent) {
        const root = dxui.View.build(id, parent);
        layout.clearStyle(root);
        root.setSize(layout.x(168), layout.y(36));
        root.radius(layout.x(18));
        root.bgOpa(100);
        root.scroll(false);
        root.hide();

        const label = dxui.Label.build(id + '_lbl', root);
        label.setSize(layout.x(156), layout.y(28));
        label.align(dxui.Utils.ALIGN.CENTER, 0, 0);
        label.textFont(font.get(layout.fontSize(20)));
        label.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);
        label.longMode(dxui.Utils.LABEL_LONG_MODE.CLIP);
        return { root: root, label: label };
    }

    /**
     * @param {string} id
     * @param {object} parent
     * @param {number} y
     * @returns {object}
     */
    _makeSectionTitle(id, parent, y) {
        const bar = dxui.View.build(id + '_bar', parent);
        layout.clearStyle(bar);
        bar.setSize(layout.x(4), layout.y(22));
        bar.setPos(0, y + layout.y(4));
        bar.bgColor(theme.accent);
        bar.bgOpa(100);
        bar.radius(layout.x(2));

        const title = dxui.Label.build(id, parent);
        title.setSize(layout.x(400), layout.y(32));
        title.setPos(layout.x(14), y);
        title.textFont(font.get(layout.fontSize(24)));
        title.textColor(theme.textPrimary);
        return title;
    }

    /**
     * @param {string} id
     * @param {object} parent
     * @param {number} w
     * @param {number} h
     * @returns {{ root: object, titleLbl: object, valueLbl: object }}
     */
    _makeInfoCard(id, parent, w, h) {
        const root = this._makeCard(id, parent, w, h);
        root.hide();

        const titleLbl = dxui.Label.build(id + '_t', root);
        titleLbl.setSize(layout.x(160), layout.y(28));
        titleLbl.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(18), 0);
        titleLbl.textFont(font.getDefault(layout.fontSize(20)));
        titleLbl.textColor(theme.textSecondary);

        const valueLbl = dxui.Label.build(id + '_v', root);
        valueLbl.setSize(Math.max(layout.x(80), w - layout.x(190)), layout.y(36));
        valueLbl.align(dxui.Utils.ALIGN.RIGHT_MID, -layout.x(16), 0);
        valueLbl.textFont(font.get(layout.fontSize(22)));
        valueLbl.textColor(theme.textPrimary);
        valueLbl.textAlign(dxui.Utils.TEXT_ALIGN.RIGHT);
        valueLbl.longMode(dxui.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR);

        return { root: root, titleLbl: titleLbl, valueLbl: valueLbl };
    }

    /**
     * @param {string} id
     * @param {object} parent
     * @param {number} w
     * @param {number} h
     * @returns {{ root: object, indexLbl: object, roleLbl: object, nameLbl: object, credLbl: object }}
     */
    _makeVerifyStep(id, parent, w, h) {
        const root = this._makeCard(id, parent, w, h);

        const badge = dxui.View.build(id + '_badge', root);
        layout.clearStyle(badge);
        badge.setSize(layout.x(36), layout.y(36));
        badge.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(20), 0);
        badge.bgColor(theme.accent);
        badge.bgOpa(100);
        badge.radius(layout.x(18));

        const indexLbl = dxui.Label.build(id + '_idx', badge);
        indexLbl.text('1');
        indexLbl.textFont(font.get(layout.fontSize(20)));
        indexLbl.textColor(theme.textOnDark);
        indexLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0);

        const roleLbl = dxui.Label.build(id + '_role', root);
        roleLbl.setSize(layout.x(200), layout.y(24));
        roleLbl.align(dxui.Utils.ALIGN.TOP_LEFT, layout.x(72), layout.y(10));
        roleLbl.textFont(font.getDefault(layout.fontSize(18)));
        roleLbl.textColor(theme.textSecondary);

        const nameLbl = dxui.Label.build(id + '_name', root);
        nameLbl.setSize(layout.x(420), layout.y(30));
        nameLbl.align(dxui.Utils.ALIGN.TOP_LEFT, layout.x(72), layout.y(34));
        nameLbl.textFont(font.get(layout.fontSize(24)));
        nameLbl.textColor(theme.textPrimary);
        nameLbl.longMode(dxui.Utils.LABEL_LONG_MODE.CLIP);

        const credLbl = dxui.Label.build(id + '_cred', root);
        credLbl.setSize(w - layout.x(520), layout.y(30));
        credLbl.align(dxui.Utils.ALIGN.RIGHT_MID, -layout.x(24), 0);
        credLbl.textFont(font.getDefault(layout.fontSize(22)));
        credLbl.textColor(theme.textSecondary);
        credLbl.textAlign(dxui.Utils.TEXT_ALIGN.RIGHT);
        credLbl.longMode(dxui.Utils.LABEL_LONG_MODE.CLIP);

        return {
            root: root,
            indexLbl: indexLbl,
            roleLbl: roleLbl,
            nameLbl: nameLbl,
            credLbl: credLbl,
        };
    }

    _refreshStaticTexts() {
        if (this._detailTitleLbl) {
            this._detailTitleLbl.text(t('record.section.detail'));
        }
        if (this._verifyTitleLbl) {
            this._verifyTitleLbl.text(t('record.section.verifyProcess'));
        }
        if (this._photoTitleLbl) {
            this._photoTitleLbl.text(t('record.field.faceCapture'));
            this._photoTitleLbl.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);
        }
    }

    _loadRecord(id) {
        const self = this;
        const token = ++this._requestToken;
        recordStore.get(id).then(function (record) {
            if (token !== self._requestToken) {
                return;
            }
            if (!record) {
                popup.showError(t('record.detailNotFound'));
                router.back();
                return;
            }
            self._fillRecord(record);
        }).catch(function () {
            if (token !== self._requestToken) {
                return;
            }
            popup.showError(t('record.detailNotFound'));
            router.back();
        });
    }

    /**
     * @param {object} record
     */
    _fillRecord(record) {
        this._recordId = record.id;
        const ok = Number(record.result) === 0;
        const stranger = recordStore.isStranger(record);
        const emptyText = t('record.valueEmpty');
        const verify = record.verify || {};
        const primary = verify.primary || {};
        const additional = Array.isArray(verify.additional) ? verify.additional : [];

        function credentialText(item) {
            const type = String(item && item.type || '');
            const typeText = t('record.type.' + recordStore.typeKey(type));
            const code = String(item && item.code || '');
            return code ? typeText + ' · ' + code : typeText;
        }

        const displayName = stranger
            ? t('record.stranger')
            : (record.name || primary.name || emptyText);
        const displayId = stranger
            ? ''
            : (record.userId || primary.userId || '');

        this._nameLbl.text(displayName);
        this._idLbl.text(
            displayId
                ? t('record.field.userId') + ': ' + displayId
                : ''
        );

        this._layoutTags([
            {
                text: t('record.verify.' + (verify.mode || 'single')),
                bg: TAG_VERIFY_BG,
                color: TAG_VERIFY_TEXT,
            },
            {
                text: ok ? t('record.result.pass') : t('record.result.deny'),
                bg: ok ? theme.successBg : theme.errorBg,
                color: ok ? theme.successText : theme.errorText,
            },
            {
                text: Number(record.uploadState) === 1
                    ? t('record.upload.uploaded')
                    : t('record.upload.pending'),
                bg: Number(record.uploadState) === 1 ? theme.successBg : TAG_PENDING_BG,
                color: Number(record.uploadState) === 1 ? theme.successText : TAG_PENDING_TEXT,
            },
        ]);

        const detailItems = [
            { key: 'passType', value: t('record.type.' + recordStore.typeKey(record.type)) },
            { key: 'passTime', value: recordStore.formatTime(record.timeStamp) || emptyText },
        ];
        for (let i = 0; i < this._detailCards.length; i++) {
            const card = this._detailCards[i];
            const item = detailItems[i];
            if (!item) {
                card.root.hide();
                continue;
            }
            card.titleLbl.text(t('record.field.' + item.key));
            card.valueLbl.text(item.value == null ? '' : String(item.value));
            card.root.show();
        }

        const steps = [{
            role: t('record.verifyStep.primary'),
            name: displayName,
            cred: credentialText(primary),
        }];
        for (let a = 0; a < additional.length && steps.length < this._verifySteps.length; a++) {
            const item = additional[a];
            const name = item.name || t('record.stranger');
            const withId = item.userId ? name + ' (' + item.userId + ')' : name;
            steps.push({
                role: t('record.verifyStep.additional'),
                name: withId,
                cred: credentialText(item),
            });
        }
        for (let s = 0; s < this._verifySteps.length; s++) {
            const slot = this._verifySteps[s];
            const step = steps[s];
            if (!step) {
                slot.root.hide();
                continue;
            }
            slot.indexLbl.text(String(s + 1));
            slot.roleLbl.text(step.role);
            slot.nameLbl.text(step.name);
            slot.credLbl.text(step.cred);
            slot.root.show();
        }

        const photoPaths = [];
        function appendPhoto(path) {
            const value = String(path || '');
            if (value.indexOf('/data/') === 0 && photoPaths.indexOf(value) < 0) {
                photoPaths.push(value);
            }
        }
        appendPhoto(primary.imagePath || record.imagePath);
        for (let i = 0; i < additional.length; i++) {
            appendPhoto(additional[i].imagePath);
        }
        this._relayoutMiddle(photoPaths);
    }

    /**
     * @param {{ text: string, bg: number, color: number }[]} items
     */
    _layoutTags(items) {
        let right = layout.x(24);
        for (let i = this._tags.length - 1; i >= 0; i--) {
            const tag = this._tags[i];
            const item = items[i];
            if (!item || !item.text) {
                tag.root.hide();
                continue;
            }
            const text = String(item.text);
            const w = Math.min(
                layout.x(220),
                Math.max(layout.x(96), layout.x(28) + text.length * layout.x(22))
            );
            tag.root.setSize(w, layout.y(36));
            tag.label.setSize(w - layout.x(8), layout.y(28));
            tag.label.text(text);
            tag.label.textColor(item.color);
            tag.root.bgColor(item.bg);
            tag.root.align(dxui.Utils.ALIGN.RIGHT_MID, -right, 0);
            tag.root.show();
            right += w + layout.x(10);
        }
    }

    /**
     * 有抓拍：详情两行竖排 + 右侧照片；无抓拍：类型/时间横排一行。
     * 中部高度随内容收缩，核验过程紧跟上一段。
     * @param {string[]} paths
     */
    _relayoutMiddle(paths) {
        const count = paths && paths.length ? paths.length : 0;
        const hasPhoto = count > 0;
        const cardH = layout.y(INFO_CARD_H);
        const cardGap = layout.x(12);
        const cardGapY = layout.y(INFO_CARD_GAP);
        const titleH = layout.y(SECTION_TITLE_H);
        const gridTop = titleH;

        const midH = hasPhoto
            ? titleH + cardH * 2 + cardGapY
            : titleH + cardH;
        const leftW = hasPhoto
            ? this._innerW - this._photoW - this._midGap
            : this._innerW;

        if (this._leftPanel) {
            this._leftPanel.setSize(leftW, midH);
            this._leftPanel.setPos(0, this._midY);
        }

        if (hasPhoto) {
            // 两行竖排
            for (let i = 0; i < this._detailCards.length; i++) {
                const card = this._detailCards[i];
                card.root.setSize(leftW, cardH);
                card.valueLbl.setSize(Math.max(layout.x(80), leftW - layout.x(190)), layout.y(36));
                card.root.setPos(0, gridTop + i * (cardH + cardGapY));
            }
            if (this._photoCard) {
                this._photoCard.setSize(this._photoW, midH);
                this._photoCard.setPos(leftW + this._midGap, this._midY);
                this._photoCard.show();
            }
            if (this._photoTitleLbl) {
                this._photoTitleLbl.setSize(this._photoW - layout.x(16), layout.y(32));
                this._photoTitleLbl.align(dxui.Utils.ALIGN.TOP_MID, 0, layout.y(12));
                this._photoTitleLbl.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);
            }
            if (this._photoMedia) {
                this._photoMedia.setSize(this._photoW - layout.x(24), midH - layout.y(52));
                this._photoMedia.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -layout.y(12));
            }
        } else {
            // 一行横排
            const cardW = Math.floor((leftW - cardGap) / 2);
            for (let i = 0; i < this._detailCards.length; i++) {
                const card = this._detailCards[i];
                card.root.setSize(cardW, cardH);
                card.valueLbl.setSize(Math.max(layout.x(80), cardW - layout.x(190)), layout.y(36));
                card.root.setPos(i * (cardW + cardGap), gridTop);
            }
            if (this._photoCard) {
                this._photoCard.hide();
            }
        }

        for (let i = 0; i < this._photoImgs.length; i++) {
            const image = this._photoImgs[i];
            if (i >= count) {
                image.hide();
                continue;
            }
            image.source(paths[i]);
            const xOff = count === 1 ? 0 : layout.x(i === 0 ? -70 : 70);
            image.align(dxui.Utils.ALIGN.CENTER, xOff, 0);
            image.show();
        }

        if (this._verifySection) {
            this._verifySection.setPos(0, this._midY + midH + this._sectionGap);
        }
    }
}
