import dxMap from '../../dxmodules/dxMap.js'
import dxUi from '../../dxmodules/dxUi.js'
// Language pack
import messages from '../../resource/langPack.js'

class I18n {
    constructor() {
        const i18nMap = dxMap.get("i18n")
        this.locale = i18nMap.get("language") || 'CN'
        this.fallbackLocale = 'CN'
    }

    // Get translated text
    t(key) {
        const keys = key.split('.')
        let result = messages[this.locale]

        for (const k of keys) {
            if (result && result[k]) {
                result = result[k]
            } else {
                // If translation not found in current language, use fallback language
                result = this._getFallbackText(key)
                break
            }
        }

        return result || key
    }

    // Get fallback language translation
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

    // Refresh
    refresh() {
        for (const key in dxUi.all) {
            const obj = dxUi.all[key]
            if (obj.dataI18n) {
                obj.text(this.t(obj.dataI18n))
            }
        }
    }

    // Refresh specified object
    refreshObj(obj) {
        if (obj.dataI18n) {
            obj.text(this.t(obj.dataI18n))
        }
    }

    // Switch language
    setLanguage(lang) {
        if (messages[lang]) {
            this.locale = lang
            dxMap.get("i18n").put("language", lang)
            // Trigger custom event to notify language change
            for (const key in dxUi.all) {
                const obj = dxUi.all[key]
                if (obj.dataI18n) {
                    obj.text(this.t(obj.dataI18n))
                }
            }
        }
    }
}

// Create singleton
const i18n = new I18n()
export default i18n
