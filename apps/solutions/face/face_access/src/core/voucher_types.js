/**
 * 凭证类型与设备 UI/WebServer 分组约定。
 * MQTT 仍使用原始 type，不在此处施加数量限制。
 */

const voucherTypes = {
    CODE: '100',
    CODE_STATIC: '101',
    CODE_DYNAMIC: '103',
    CARD: '200',
    ID_CARD: '205',
    FACE: '300',
    PASSWORD: '400',
    FINGER: '500',
};

voucherTypes.GROUPS = {
    code: [voucherTypes.CODE, voucherTypes.CODE_STATIC, voucherTypes.CODE_DYNAMIC],
    card: [voucherTypes.CARD, voucherTypes.ID_CARD],
    password: [voucherTypes.PASSWORD],
};

voucherTypes.groupOf = function (type) {
    const value = String(type || '');
    const names = Object.keys(voucherTypes.GROUPS);
    for (let i = 0; i < names.length; i++) {
        if (voucherTypes.GROUPS[names[i]].indexOf(value) >= 0) return names[i];
    }
    return '';
};

voucherTypes.isCard = function (type) {
    return voucherTypes.GROUPS.card.indexOf(String(type || '')) >= 0;
};

export default voucherTypes;
