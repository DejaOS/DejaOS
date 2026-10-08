/**
 * @layer    view
 * @module   settings_menu
 * @fires    none
 * @listens  none
 * @depends  assets
 *
 * 设置主菜单项定义：文案 key、图标、对应子页路由。
 */

import { asset } from '../../utils/assets.js';

/** @type {{ id: string, labelKey: string, icon: string, route: string }[]} */
export const SETTINGS_MENU_ITEMS = [
    { id: 'person', labelKey: 'settings.menu.person', icon: asset('local-user.png'), route: 'settings_localUser' },
    { id: 'access', labelKey: 'settings.menu.access', icon: asset('door.png'), route: 'settings_door' },
    {
        id: 'connection',
        labelKey: 'settings.menu.connection',
        icon: asset('network.png'),
        route: 'settings_connection',
    },
    {
        id: 'recognition',
        labelKey: 'settings.menu.recognition',
        icon: asset('recognition-light.png'),
        route: 'settings_recognition',
    },
    {
        id: 'presentation',
        labelKey: 'settings.menu.presentation',
        icon: asset('voice.png'),
        route: 'settings_presentation',
    },
    {
        id: 'record',
        labelKey: 'settings.menu.record',
        icon: asset('record.png'),
        route: 'settings_record',
    },
    {
        id: 'maintenance',
        labelKey: 'settings.menu.maintenance',
        icon: asset('device.png'),
        route: 'settings_maintenance',
    },
];

export default {
    SETTINGS_MENU_ITEMS: SETTINGS_MENU_ITEMS,
};
