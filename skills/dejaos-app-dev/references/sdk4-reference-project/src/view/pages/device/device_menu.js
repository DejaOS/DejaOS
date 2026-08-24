/**
 * @layer    view
 * @module   device_menu
 * @fires    none
 * @listens  none
 * @depends  none
 *
 * 设备信息子菜单：系统信息 / 数据容量 / 设备二维码。
 */

/** @type {{ id: string, labelKey: string, route: string }[]} */
export const DEVICE_MENU_ITEMS = [
    {
        id: 'system',
        labelKey: 'device.section.system',
        route: 'settings_device_system',
    },
    {
        id: 'capacity',
        labelKey: 'device.section.capacity',
        route: 'settings_device_capacity',
    },
    {
        id: 'qrcode',
        labelKey: 'device.section.qrcode',
        route: 'settings_device_qrcode',
    },
];

export default {
    DEVICE_MENU_ITEMS: DEVICE_MENU_ITEMS,
};
