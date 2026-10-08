/**
 * @layer    view
 * @module   restart_required
 * @depends  confirm,popup,i18n,system_store,screen_off
 *
 * 配置需重启生效时的确认框：仅本机屏幕保存 / 扫码配置使用。
 * MQTT 回包后直接重启；Web 在浏览器侧确认，不弹本机框。
 */

import confirm from './confirm.js';
import popup from './popup.js';
import screenOff from './screen_off.js';
import { t } from '../i18n/index.js';
import systemStore from '../pages/system/system_store.js';

/**
 * @param {{ onCancel?: Function }=} options 稍后重启时的回调（本地保存成功提示等）
 */
function showRestartRequired(options) {
    const opts = options || {};
    screenOff.notifyActivity();
    confirm.show({
        title: t('system.restartRequired.title'),
        message: t('system.restartRequired.message'),
        confirmText: t('system.restartRequired.now'),
        cancelText: t('system.restartRequired.later'),
        onConfirm: function () {
            systemStore.reboot().then(function (result) {
                if (!result || !result.ok) {
                    popup.showError(t('system.action.reboot.fail'));
                }
            });
        },
        onCancel: typeof opts.onCancel === 'function' ? opts.onCancel : undefined,
    });
}

export default { show: showRestartRequired };
