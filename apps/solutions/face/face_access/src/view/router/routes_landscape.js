/**
 * @layer    view
 * @module   routes_landscape
 * @fires    none
 * @listens  none
 * @depends  router,pages_landscape
 *
 * 横屏（VF201_V10）路由注册。路由名与竖屏保持一致，便于 domain / store 导航复用。
 */

import router from './core.js';
import InitPage from '../pages_landscape/init/init_page.js';
import HomePage from '../pages_landscape/home/home_page.js';
import SettingsPage from '../pages_landscape/settings/settings_page.js';
import LocalUserPage from '../pages_landscape/local_user/local_user_page.js';
import LocalUserAddPage, { LocalUserEditPage } from '../pages_landscape/local_user/local_user_add_page.js';
import LocalUserVerifierPage from '../pages_landscape/local_user/local_user_verifier_page.js';
import LocalUserVoucherPage from '../pages_landscape/local_user/local_user_voucher_page.js';
import LocalUserFacePage from '../pages_landscape/local_user/local_user_face_page.js';
import NetworkPage from '../pages_landscape/network/network_page.js';
import DoorPage from '../pages_landscape/door/door_page.js';
import DoorSchedulePage from '../pages_landscape/door/door_schedule_page.js';
import PlatformPage from '../pages_landscape/platform/platform_page.js';
import SystemPage from '../pages_landscape/system/system_page.js';
import DevicePage from '../pages_landscape/device/device_page.js';
import RecordPage from '../pages_landscape/record/record_page.js';
import RecordDetailPage from '../pages_landscape/record/record_detail_page.js';
import VoicePage from '../pages_landscape/voice/voice_page.js';
import FactoryPage from '../pages_landscape/factory/factory_page.js';
import DiagnosticsPage from '../pages_landscape/diagnostics/diagnostics_page.js';
import CalibrationPage from '../pages_landscape/factory/calibration_page.js';
import HelpPage from '../pages_landscape/help/help_page.js';
import AuthPage from '../pages_landscape/auth/auth_page.js';
import FirstPasswordPage from '../pages_landscape/auth/first_password_page.js';
import PasswordPage from '../pages_landscape/password/password_page.js';
import CallListPage from '../pages_landscape/call/call_list_page.js';
import CallPage from '../pages_landscape/call/call_page.js';
import WecomNetworkPage from '../pages_landscape/wecom/wecom_network_page.js';
import WecomBindPage from '../pages_landscape/wecom/wecom_bind_page.js';
import WecomCapturePage from '../pages_landscape/wecom/wecom_capture_page.js';
import {
    ACCESS_MENU_ITEMS,
    CONNECTION_MENU_ITEMS,
    RECOGNITION_MENU_ITEMS,
    PRESENTATION_MENU_ITEMS,
} from '../pages/system/system_menu.js';
import FingerprintEnrollPage from '../pages_landscape/fingerprint/fingerprint_enroll_page.js';
import FingerprintRemotePage from '../pages_landscape/fingerprint/fingerprint_remote_page.js';
import { createSystemSectionPages } from '../pages_landscape/system/system_section_page.js';
import { createDeviceSectionPages } from '../pages_landscape/device/device_section_page.js';

export default function registerLandscapeRoutes() {
    router.register(new InitPage());
    router.register(new HomePage());
    router.register(new AuthPage());
    router.register(new FirstPasswordPage());
    router.register(new PasswordPage());
    router.register(new CallListPage());
    router.register(new CallPage());
    router.register(new WecomNetworkPage());
    router.register(new WecomBindPage());
    router.register(new WecomCapturePage());
    router.register(new FingerprintEnrollPage());
    router.register(new FingerprintRemotePage());
    router.register(new SettingsPage());
    router.register(new LocalUserPage());
    router.register(new LocalUserAddPage());
    router.register(new LocalUserEditPage());
    router.register(new LocalUserVerifierPage());
    router.register(new LocalUserVoucherPage());
    router.register(new LocalUserFacePage());
    router.register(new NetworkPage());
    router.register(new SystemPage({ name: 'settings_door', titleKey: 'settings.menu.access', menuItems: ACCESS_MENU_ITEMS, actionItems: [] }));
    router.register(new DoorPage({ mode: 'accessControl' }));
    router.register(new DoorPage({ mode: 'verifyPolicy' }));
    router.register(new DoorPage({ mode: 'recordPolicy' }));
    router.register(new DoorSchedulePage());
    router.register(new DoorPage({ mode: 'mqtt' }));
    router.register(new DoorPage({ mode: 'mqttAdvanced' }));
    router.register(new PlatformPage({ mode: 'webrtc' }));
    router.register(new PlatformPage({ mode: 'diagnosis' }));
    router.register(new SystemPage({ name: 'settings_connection', titleKey: 'settings.menu.connection', menuItems: CONNECTION_MENU_ITEMS, actionItems: [] }));
    router.register(new SystemPage({ name: 'settings_recognition', titleKey: 'settings.menu.recognition', menuItems: RECOGNITION_MENU_ITEMS, actionItems: [] }));
    router.register(new SystemPage({ name: 'settings_presentation', titleKey: 'settings.menu.presentation', menuItems: PRESENTATION_MENU_ITEMS, actionItems: [] }));
    router.register(new SystemPage());
    router.register(new DevicePage());
    router.register(new RecordPage());
    router.register(new RecordDetailPage());
    router.register(new VoicePage());
    router.register(new DiagnosticsPage());
    router.register(new FactoryPage());
    router.register(new CalibrationPage());
    router.register(new HelpPage());

    const systemSections = createSystemSectionPages();
    for (let s = 0; s < systemSections.length; s++) {
        router.register(systemSections[s]);
    }

    const deviceSections = createDeviceSectionPages();
    for (let d = 0; d < deviceSections.length; d++) {
        router.register(deviceSections[d]);
    }
}
