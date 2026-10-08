/**
 * @layer    view
 * @module   routes_portrait
 * @fires    none
 * @listens  none
 * @depends  router,pages
 */

import router from './core.js';
import InitPage from '../pages/init/init_page.js';
import HomePage from '../pages/home/home_page.js';
import SettingsPage from '../pages/settings/settings_page.js';
import LocalUserPage from '../pages/local_user/local_user_page.js';
import LocalUserAddPage, { LocalUserEditPage } from '../pages/local_user/local_user_add_page.js';
import LocalUserVerifierPage from '../pages/local_user/local_user_verifier_page.js';
import LocalUserVoucherPage from '../pages/local_user/local_user_voucher_page.js';
import LocalUserFacePage from '../pages/local_user/local_user_face_page.js';
import NetworkPage from '../pages/network/network_page.js';
import DoorPage from '../pages/door/door_page.js';
import DoorSchedulePage from '../pages/door/door_schedule_page.js';
import PlatformPage from '../pages/platform/platform_page.js';
import SystemPage from '../pages/system/system_page.js';
import DevicePage from '../pages/device/device_page.js';
import RecordPage from '../pages/record/record_page.js';
import RecordDetailPage from '../pages/record/record_detail_page.js';
import VoicePage from '../pages/voice/voice_page.js';
import FactoryPage from '../pages/factory/factory_page.js';
import DiagnosticsPage from '../pages/diagnostics/diagnostics_page.js';
import CalibrationPage from '../pages/factory/calibration_page.js';
import HelpPage from '../pages/help/help_page.js';
import AuthPage from '../pages/auth/auth_page.js';
import FirstPasswordPage from '../pages/auth/first_password_page.js';
import PasswordPage from '../pages/password/password_page.js';
import CallListPage from '../pages/call/call_list_page.js';
import CallPage from '../pages/call/call_page.js';
import WecomNetworkPage from '../pages/wecom/wecom_network_page.js';
import WecomBindPage from '../pages/wecom/wecom_bind_page.js';
import WecomCapturePage from '../pages/wecom/wecom_capture_page.js';
import {
    ACCESS_MENU_ITEMS,
    CONNECTION_MENU_ITEMS,
    RECOGNITION_MENU_ITEMS,
    PRESENTATION_MENU_ITEMS,
} from '../pages/system/system_menu.js';
import FingerprintEnrollPage from '../pages/fingerprint/fingerprint_enroll_page.js';
import FingerprintRemotePage from '../pages/fingerprint/fingerprint_remote_page.js';
import { createSystemSectionPages } from '../pages/system/system_section_page.js';
import { createDeviceSectionPages } from '../pages/device/device_section_page.js';

export default function registerPortraitRoutes() {
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
