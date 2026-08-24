/**
 * @layer    view
 * @module   factory_menu
 * @fires    none
 * @listens  none
 * @depends  none
 *
 * 工厂测试子菜单。当前仅摄像头标定，后续可扩展。
 */

/** @type {{ id: string, labelKey: string, route: string }[]} */
export const FACTORY_MENU_ITEMS = [
    {
        id: 'calibration',
        labelKey: 'factory.section.calibration',
        route: 'settings_factory_calibration',
    },
];

export default {
    FACTORY_MENU_ITEMS: FACTORY_MENU_ITEMS,
};
