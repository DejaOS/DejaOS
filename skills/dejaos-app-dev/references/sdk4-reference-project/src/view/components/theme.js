/**
 * @layer    view
 * @module   theme
 * @fires    none
 * @listens  none
 * @depends  none
 *
 * 视图层共用色板（黑白灰为主）。页面勿再散落硬编码同色。
 */

const theme = {
    /** 页面背景 */
    pageBg: 0xffffff,
    /** 主文案（标题、主区文字） */
    textPrimary: 0x222222,
    /** 次要文案 */
    textSecondary: 0x666666,
    /** 弱强调正文（未选中选项字色等） */
    textMuted: 0x333333,
    /** 深色底上的浅色字（底栏、选中态） */
    textOnDark: 0xffffff,
    /** 侧栏/选项未选中浅灰底 */
    actionBg: 0xe8e8e8,
    /** 侧栏按钮不透明度（0–100） */
    actionBgOpa: 100,
    /** 选中/强调深底 */
    activeBg: 0x222222,
    /** 禁用按钮底 */
    disabledBg: 0xb0b0b0,
    /** 遮罩不透明度（confirm / 二维码弹层） */
    maskOpa: 45,
    /** 主操作蓝（确认键） */
    accent: 0x2f6fed,
    /** 成功提示 */
    successBg: 0xe6f7e9,
    successText: 0x1f8b4d,
    /** 失败提示 */
    errorBg: 0xffecec,
    errorText: 0xcc3333,
    /** 人脸识别框：默认白 / 活体橘黄 / 成功绿 / 失败红 */
    faceBoxDetecting: 0xffffff,
    faceBoxLive: 0xff8c00,
    faceBoxMatched: 0x1f8b4d,
    faceBoxFailed: 0xcc3333,
};

export default theme;
