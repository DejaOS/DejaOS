import config from '../../../dxmodules/dxConfig.js'

export const DEFAULT_LANGUAGE = "EN"

export const ACCEPTED_LANGUAGES = [DEFAULT_LANGUAGE, "RU", "CN"]

export const getCurrentLanguage = ()=>{
    const language = config.get("base.language") ?? DEFAULT_LANGUAGE
    return language
}