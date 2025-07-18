import dxMap from '../../dxmodules/dxMap.js'
import dxui from '../../dxmodules/dxUi.js'
// 语言包
import messages from '../../resource/langPack.js'

class I18n {
    constructor() {
        const i18nMap = dxMap.get("i18n")
        this.locale = i18nMap.get("language") || 'EN'
        this.fallbackLocale = 'CN'
    }

    // 获取翻译文本
    t(key) {
        const keys = key.split('.')
        let result = messages[this.locale]

        for (const k of keys) {
            if (result && result[k]) {
                result = result[k]
            } else {
                // 如果当前语言没有找到翻译，使用备用语言
                result = this._getFallbackText(key)
                break
            }
        }

        return result || key
    }

    // 获取备用语言的翻译
    _getFallbackText(key) {
        const keys = key.split('.')
        let result = messages[this.fallbackLocale]

        for (const k of keys) {
            if (result && result[k]) {
                result = result[k]
            } else {
                return key
            }
        }

        return result
    }

    // 刷新
    refresh() {
        for (const key in dxui.all) {
            const obj = dxui.all[key]
            if (obj.dataI18n) {
                obj.text(this.t(obj.dataI18n))
            }
        }
    }

    // 刷新指定对象
    refreshObj(obj) {
        if (obj.dataI18n) {
            obj.text(this.t(obj.dataI18n))
        }
    }

    // 切换语言
    setLanguage(lang) {
        if (messages[lang]) {
            this.locale = lang
            dxMap.get("i18n").put("language", lang)
            // 触发自定义事件，通知语言变化
            for (const key in dxui.all) {
                const obj = dxui.all[key]
                if (obj.dataI18n) {
                    obj.text(this.t(obj.dataI18n))
                }
            }
        }
    }
}

// 创建单例
const i18n = new I18n()
export default i18n
