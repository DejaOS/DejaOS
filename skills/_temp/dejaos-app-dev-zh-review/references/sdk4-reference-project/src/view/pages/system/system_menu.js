/**
 * @layer    view
 * @module   system_menu
 * @fires    none
 * @listens  none
 * @depends  none
 *
 * 系统设置子菜单：各大类子页 + 设备操作项。
 */

/** @type {{ id: string, labelKey: string, route: string }[]} */
export const CONNECTION_MENU_ITEMS = [
    { id: 'network', labelKey: 'connection.section.network', route: 'settings_network' },
    { id: 'mqtt', labelKey: 'connection.section.mqtt', route: 'settings_mqtt' },
    { id: 'webrtc', labelKey: 'connection.section.webrtc', route: 'settings_webrtc', requireIntercom: true },
    { id: 'diagnosis', labelKey: 'connection.section.diagnosis', route: 'settings_network_diag' },
];

export const RECOGNITION_MENU_ITEMS = [
    { id: 'face', labelKey: 'system.section.face', route: 'settings_system_face' },
    { id: 'light', labelKey: 'system.section.light', route: 'settings_system_light' },
    { id: 'card', labelKey: 'system.section.card', route: 'settings_system_card' },
    { id: 'passwordOpen', labelKey: 'system.section.passwordOpen', route: 'settings_system_passwordOpen' },
];

export const PRESENTATION_MENU_ITEMS = [
    { id: 'display', labelKey: 'system.section.display', route: 'settings_system_display' },
    { id: 'voice', labelKey: 'settings.menu.voice', route: 'settings_voice' },
];

export const MAINTENANCE_MENU_ITEMS = [
    { id: 'device', labelKey: 'maintenance.section.about', route: 'settings_device' },
    { id: 'systemTime', labelKey: 'system.section.systemTime', route: 'settings_system_systemTime' },
    { id: 'loginPassword', labelKey: 'system.section.loginPassword', route: 'settings_system_loginPassword' },
    { id: 'runtimeDiagnostics', labelKey: 'maintenance.section.runtimeDiagnostics', route: 'settings_runtime_diagnostics' },
    { id: 'factory', labelKey: 'maintenance.section.diagnostics', route: 'settings_factory' },
    { id: 'help', labelKey: 'settings.menu.help', route: 'settings_help' },
];

export const SYSTEM_MENU_ITEMS = MAINTENANCE_MENU_ITEMS;

/**
 * 设备操作（无子页，点击后二次确认执行）。
 * @type {{ id: string, labelKey: string, action: 'reboot'|'restoreDefaults'|'resetDevice' }[]}
 */
export const SYSTEM_ACTION_ITEMS = [
    {
        id: 'reboot',
        labelKey: 'system.action.reboot',
        action: 'reboot',
    },
    {
        id: 'restoreDefaults',
        labelKey: 'system.action.restoreDefaults',
        action: 'restoreDefaults',
    },
    {
        id: 'resetDevice',
        labelKey: 'system.action.resetDevice',
        action: 'resetDevice',
    },
];

export default {
    CONNECTION_MENU_ITEMS: CONNECTION_MENU_ITEMS,
    RECOGNITION_MENU_ITEMS: RECOGNITION_MENU_ITEMS,
    PRESENTATION_MENU_ITEMS: PRESENTATION_MENU_ITEMS,
    MAINTENANCE_MENU_ITEMS: MAINTENANCE_MENU_ITEMS,
    SYSTEM_MENU_ITEMS: SYSTEM_MENU_ITEMS,
    SYSTEM_ACTION_ITEMS: SYSTEM_ACTION_ITEMS,
};
