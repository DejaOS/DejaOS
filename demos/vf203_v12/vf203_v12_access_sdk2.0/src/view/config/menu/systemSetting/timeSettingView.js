import dxui from '../../../../../dxmodules/dxUi.js'
import std from '../../../../../dxmodules/dxStd.js'
import dxMap from '../../../../../dxmodules/dxMap.js'
import viewUtils from "../../../viewUtils.js"
import topView from "../../../topView.js"
import systemSettingView from '../systemSettingView.js'
import i18n from "../../../i18n.js"
import screen from '../../../../screen.js'
const timeSettingView = {}
const timezoneHelper = {
    regionList: [],
    regionCityMap: {}
}

// 一级区域名称翻译
const regionNames = {
    Pacific: { zh: "太平洋", en: "Pacific", es: "Pacífico", fr: "Pacifique", de: "Pazifik", ru: "Тихоокеанский", ar: "المحيط الهادئ", pt: "Pacífico", ko: "태평양" },
    America: { zh: "美洲", en: "America", es: "América", fr: "Amérique", de: "Amerika", ru: "Америка", ar: "الأمريكيتان", pt: "América", ko: "아메리카" },
    Atlantic: { zh: "大西洋", en: "Atlantic", es: "Atlántico", fr: "Atlantique", de: "Atlantik", ru: "Атлантический", ar: "الأطلسي", pt: "Atlântico", ko: "대서양" },
    Europe: { zh: "欧洲", en: "Europe", es: "Europa", fr: "Europe", de: "Europa", ru: "Европа", ar: "أوروبا", pt: "Europa", ko: "유럽" },
    Asia: { zh: "亚洲", en: "Asia", es: "Asia", fr: "Asie", de: "Asien", ru: "Азия", ar: "آسيا", pt: "Ásia", ko: "아시아" },
    Australia: { zh: "澳大利亚", en: "Australia", es: "Australia", fr: "Australie", de: "Australien", ru: "Австралия", ar: "أستراليا", pt: "Austrália", ko: "호주" }
}

function mapLang(code) {
    switch (code) {
        case 'CN': return 'zh'
        case 'EN': return 'en'
        case 'ES': return 'es'
        case 'FR': return 'fr'
        case 'DE': return 'de'
        case 'RU': return 'ru'
        case 'AR': return 'ar'
        case 'PT': return 'pt'
        case 'KO': return 'ko'
        default: return 'en'
    }
}

function buildTimezoneMap() {
    const regions = {}
    Object.keys(timezones).forEach(key => {
        const [region, ...rest] = key.split('/')
        if (!regions[region]) {
            regions[region] = []
        }
        regions[region].push({ key, path: rest.join('/') })
    })
    timezoneHelper.regionList = Object.keys(regions)
    timezoneHelper.regionCityMap = regions
}

function getTimezoneName(tzKey) {
    const langKey = mapLang(screen.getConfig()['base.language'])
    const nameObj = timezones[tzKey]?.name || {}
    return nameObj[langKey] || nameObj.en || tzKey
}

function getRegionLabel(region) {
    const langKey = mapLang(screen.getConfig()['base.language'])
    const obj = regionNames[region] || {}
    return obj[langKey] || region
}

function updateCityDropdown(region, targetTzKey) {
    if (!timeSettingView.cityDropdown) return
    const cities = timezoneHelper.regionCityMap[region] || []
    timeSettingView.cityList = cities
    const labels = cities.map(c => getTimezoneName(c.key))
    if (typeof timeSettingView.cityDropdown.setOptions === 'function') {
        timeSettingView.cityDropdown.setOptions(labels)
    }
    let idx = 0
    if (targetTzKey) {
        const found = cities.findIndex(c => c.key === targetTzKey)
        if (found >= 0) idx = found
    }
    if (typeof timeSettingView.cityDropdown.setSelected === 'function') {
        timeSettingView.cityDropdown.setSelected(idx)
    }
    timeSettingView.selectedTimezoneKey = cities[idx]?.key || ''

    // 选中变化时同步 key
    if (!timeSettingView.cityDropdown._binded) {
        timeSettingView.cityDropdown.on(dxui.Utils.EVENT.VALUE_CHANGED, () => {
            const i = timeSettingView.cityDropdown.getSelected()
            const list = timeSettingView.cityList || []
            timeSettingView.selectedTimezoneKey = list[i]?.key || list[0]?.key || ''
        })
        timeSettingView.cityDropdown._binded = true
    }
}

function initTimezoneDropdowns() {
    if (!timeSettingView.regionDropdown || !timeSettingView.cityDropdown) return
    const regions = timezoneHelper.regionList
    const regionLabels = regions.map(r => getRegionLabel(r))
    if (typeof timeSettingView.regionDropdown.setOptions === 'function') {
        timeSettingView.regionDropdown.setOptions(regionLabels)
    }
    if (!timeSettingView.regionDropdown._binded) {
        timeSettingView.regionDropdown.on(dxui.Utils.EVENT.VALUE_CHANGED, () => {
            const idx = timeSettingView.regionDropdown.getSelected()
            const region = regions[idx] || regions[0]
            updateCityDropdown(region)
        })
        timeSettingView.regionDropdown._binded = true
    }
    updateCityDropdown(regions[0])
}

function refreshTimezoneDropdowns() {
    // 更新区域下拉框选项（根据当前语言）
    if (!timeSettingView.regionDropdown || !timeSettingView.cityDropdown) return
    
    const regions = timezoneHelper.regionList
    const regionLabels = regions.map(r => getRegionLabel(r))
    
    if (typeof timeSettingView.regionDropdown.setOptions === 'function') {
        const currentSelected = timeSettingView.regionDropdown.getSelected()
        timeSettingView.regionDropdown.setOptions(regionLabels)
        
        // 恢复选中状态并更新城市下拉框
        if (currentSelected >= 0 && currentSelected < regions.length) {
            timeSettingView.regionDropdown.setSelected(currentSelected)
            const region = regions[currentSelected]
            if (region) {
                // 更新城市下拉框（会根据当前语言自动更新）
                updateCityDropdown(region, timeSettingView.selectedTimezoneKey)
            }
        } else if (regions.length > 0) {
            // 如果没有选中，默认选中第一个并更新城市下拉框
            timeSettingView.regionDropdown.setSelected(0)
            updateCityDropdown(regions[0])
        }
    }
}

function applyTimezoneSelection(tzKey) {
    if (!tzKey || !timeSettingView.regionDropdown || !timeSettingView.cityDropdown) return
    const [region] = tzKey.split('/')
    const idx = timezoneHelper.regionList.indexOf(region)
    if (idx >= 0 && typeof timeSettingView.regionDropdown.setSelected === 'function') {
        timeSettingView.regionDropdown.setSelected(idx)
        updateCityDropdown(region, tzKey)
    }
}
timeSettingView.init = function () {
    buildTimezoneMap()
    /**************************************************创建屏幕*****************************************************/
    const screenMain = dxui.View.build('timeSettingView', dxui.Utils.LAYER.MAIN)
    timeSettingView.screenMain = screenMain
    screenMain.scroll(false)
    screenMain.bgColor(0xffffff)
    screenMain.on(dxui.Utils.ENUM.LV_EVENT_SCREEN_LOADED, () => {
        topView.changeTheme(true)

        const configAll = screen.getConfig()
        // timeSettingView.info[0].input.text(configAll['ntp.gmt'] + '')
        timeSettingView.info[0].input.text(configAll['ntp.server'] + '')
        //TODO 

        // 根据当前语言刷新时区下拉框选项
        refreshTimezoneDropdowns()
        
        // 选中当前配置的时区，如果没有则默认首个
        const tzKey = configAll['ntp.timeZone'] || configAll['ntp.timezone']
        applyTimezoneSelection(tzKey)

        const syncTime = dxMap.get("NTP_SYNC").get("syncTime")
        if (syncTime) {
            msgLabel.text(new Date(syncTime).toLocaleString())
        }
    })

    const titleBox = viewUtils.title(screenMain, systemSettingView.screenMain, 'timeSettingViewTitle', 'systemSettingView.timeSetting')
    titleBox.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (70 / 1024))

    timeSettingView.info = [
        {
            title: "systemSettingView.ntpAddress",
            type: 'input',
        },
        {
            title: "timeSettingView.timezone",
            type: 'timezone',
        }
    ]

    const timeSettingBox = dxui.View.build('timeSettingBox', screenMain)
    viewUtils._clearStyle(timeSettingBox)
    timeSettingBox.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (140 / 1024))
    timeSettingBox.setSize(screen.screenSize.width * (600 / 600), screen.screenSize.height * (300 / 1024))
    timeSettingBox.bgOpa(0)
    timeSettingBox.flexFlow(dxui.Utils.FLEX_FLOW.ROW_WRAP)
    timeSettingBox.flexAlign(dxui.Utils.FLEX_ALIGN.CENTER, dxui.Utils.FLEX_ALIGN.START, dxui.Utils.FLEX_ALIGN.START)
    timeSettingBox.obj.lvObjSetStylePadGap(screen.screenSize.width * (0 / 600), dxui.Utils.ENUM._LV_STYLE_STATE_CMP_SAME)
    timeSettingBox.borderWidth(screen.screenSize.width * (1 / 600))
    timeSettingBox.setBorderColor(0xDEDEDE)
    timeSettingBox.obj.setStyleBorderSide(dxui.Utils.ENUM.LV_BORDER_SIDE_TOP, 0)

    timeSettingView.info.forEach(item => {
        const itemBox = dxui.View.build(item.title, timeSettingBox)
        viewUtils._clearStyle(itemBox)
        itemBox.setSize(screen.screenSize.width * (560 / 600), screen.screenSize.height * (76 / 1024))
        itemBox.borderWidth(screen.screenSize.width * (1 / 600))
        itemBox.setBorderColor(0xDEDEDE)
        itemBox.obj.setStyleBorderSide(dxui.Utils.ENUM.LV_BORDER_SIDE_BOTTOM, 0)

        const itemLabel = dxui.Label.build(item.title + 'Label', itemBox)
        itemLabel.dataI18n = item.title
        // 时区选择标签在第一行，正常居中，不被下拉框遮挡
        if (item.type === 'timezone') {
            itemLabel.align(dxui.Utils.ALIGN.LEFT_MID, 0, -screen.screenSize.height * (42 / 1024)) // 第一行，向上偏移到顶部
        } else {
            itemLabel.align(dxui.Utils.ALIGN.LEFT_MID, 0, 0)
        }
        itemLabel.textFont(viewUtils.font(26))

        if (item.unit) {
            const unitLabel = dxui.Label.build(item.title + 'UnitLabel', itemBox)
            unitLabel.text(item.unit)
            unitLabel.align(dxui.Utils.ALIGN.RIGHT_MID, 0, 0)
            unitLabel.textFont(viewUtils.font(26))
        }

        switch (item.type) {
            case 'input':
                const input = viewUtils.input(itemBox, item.title + 'input', undefined, undefined, undefined)
                input.align(dxui.Utils.ALIGN.RIGHT_MID, 0, 0)
                if (item.title == "systemSettingView.ntpAddress") {
                    input.setSize(screen.screenSize.width * (400 / 600), screen.screenSize.height * (55 / 1024)) // 与下拉框宽度一致
                } else {
                    input.setSize(screen.screenSize.width * (150 / 600), screen.screenSize.height * (55 / 1024))
                }
                item.input = input
                break;
            case 'timezone':
                // 时区选择改为三行布局：标签在第一行，两个下拉框依次在下方
                itemBox.setSize(screen.screenSize.width * (560 / 600), screen.screenSize.height * (220 / 1024)) // 增加高度容纳三行，避免滚动
                
                // 第二行：一级下拉（区域）- 放在标签下方，向上移动一些
                const regionDropdown = dxui.Dropdown.build(item.title + 'regionDropdown', itemBox)
                regionDropdown.align(dxui.Utils.ALIGN.RIGHT_MID, 0, screen.screenSize.height * (-42 / 1024)) // 第二行，在标签下方，整体上移
                regionDropdown.textFont(viewUtils.font(26))
                regionDropdown.getList().textFont(viewUtils.font(26))
                regionDropdown.setSize(screen.screenSize.width * (400 / 600), screen.screenSize.height * (45 / 1024)) // 加宽以容纳更长文本
                regionDropdown.padTop((screen.screenSize.height * (45 / 1024) - viewUtils.font(26).obj.lvFontGetLineHeight()) / 2)
                regionDropdown.padBottom(0)
                const regionList = regionDropdown.getList()
                regionList.setSize(screen.screenSize.width * (400 / 600), screen.screenSize.height * (260 / 1024)) // 列表高度，超出可滚动
                regionList.scroll(true) // 启用滚动功能
                regionDropdown.setSymbol(screen.dropdownSymbol)
                
                // 第三行：二级下拉（城市）- 放在区域下拉框下方，增加间隔
                const cityDropdown = dxui.Dropdown.build(item.title + 'cityDropdown', itemBox)
                cityDropdown.align(dxui.Utils.ALIGN.RIGHT_MID, 0, screen.screenSize.height * (28 / 1024)) // 第三行，在区域下拉框下方，整体上移
                cityDropdown.textFont(viewUtils.font(26))
                cityDropdown.getList().textFont(viewUtils.font(26))
                cityDropdown.setSize(screen.screenSize.width * (400 / 600), screen.screenSize.height * (45 / 1024)) // 加宽以容纳更长文本
                cityDropdown.padTop((screen.screenSize.height * (45 / 1024) - viewUtils.font(26).obj.lvFontGetLineHeight()) / 2)
                cityDropdown.padBottom(0)
                const cityList = cityDropdown.getList()
                cityList.setSize(screen.screenSize.width * (400 / 600), screen.screenSize.height * (320 / 1024)) // 列表高度，超出可滚动
                cityList.scroll(true) // 启用滚动功能
                cityDropdown.setSymbol(screen.dropdownSymbol)

                item.regionDropdown = regionDropdown
                item.cityDropdown = cityDropdown
                timeSettingView.regionDropdown = regionDropdown
                timeSettingView.cityDropdown = cityDropdown
                break;
        }
    })

    // 时区下拉初始化
    initTimezoneDropdowns()

    // 显示上次同步时间
    const msgLabel = dxui.Label.build('msgLabel', screenMain)
    msgLabel.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (662 / 1024))
    msgLabel.textFont(viewUtils.font(22))
    msgLabel.text(' ')
    msgLabel.textColor(0x888888)
    timeSettingView.msgLabel = msgLabel

    const saveBtn = viewUtils.bottomBtn(screenMain, screenMain.id + 'saveBtn', 'systemSettingView.save', () => {
        const saveConfigData = {
            ntp: {
                // gmt: parseInt(timeSettingView.info[0].input.text()),
                server: timeSettingView.info[0].input.text(),
                timeZone: timeSettingView.selectedTimezoneKey || ''
            }
        }

        const res = screen.saveConfig(saveConfigData)
        if (res === true) {
            timeSettingView.statusPanel.success()
            std.setTimeout(() => {
                // 成功返回上一层界面
                dxui.loadMain(systemSettingView.screenMain)
            }, 500)
        } else {
            timeSettingView.statusPanel.fail()
        }
    })
    saveBtn.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -screen.screenSize.height * (40 / 1024))
    timeSettingView.statusPanel = viewUtils.statusPanel(screenMain, 'systemSettingView.success', 'systemSettingView.fail')
}

export default timeSettingView


const timezones = {
    "Pacific/Midway": {
        "utc_offset": "-11:00",
        "name": {
            "zh": "中途岛时间",
            "en": "Midway",
            "ja": "ミッドウェイ",
            "ko": "미드웨이",
            "es": "Midway",
            "fr": "Midway",
            "de": "Midway",
            "ru": "Мидуэй",
            "ar": "ميدواي",
            "pt": "Midway"
        }
    },
    "America/Adak": {
        "utc_offset": "-10:00",
        "name": {
            "zh": "阿达克时间",
            "en": "Adak",
            "ja": "アダック",
            "ko": "아닥",
            "es": "Adak",
            "fr": "Adak",
            "de": "Adak",
            "ru": "Адак",
            "ar": "أداك",
            "pt": "Adak"
        }
    },
    "Pacific/Honolulu": {
        "utc_offset": "-10:00",
        "name": {
            "zh": "夏威夷时间",
            "en": "Hawaii",
            "ja": "ハワイ",
            "ko": "하와이",
            "es": "Hawái",
            "fr": "Hawaï",
            "de": "Hawaii",
            "ru": "Гавайи",
            "ar": "هاواي",
            "pt": "Havaí"
        }
    },
    "America/Anchorage": {
        "utc_offset": "-09:00",
        "name": {
            "zh": "阿拉斯加时间",
            "en": "Alaska",
            "ja": "アラスカ",
            "ko": "알래스카",
            "es": "Alaska",
            "fr": "Alaska",
            "de": "Alaska",
            "ru": "Аляска",
            "ar": "ألاسكا",
            "pt": "Alasca"
        }
    },
    "America/Los_Angeles": {
        "utc_offset": "-08:00",
        "name": {
            "zh": "洛杉矶",
            "en": "Los Angeles",
            "ja": "ロサンゼルス",
            "ko": "로스앤젤레스",
            "es": "Los Ángeles",
            "fr": "Los Angeles",
            "de": "Los Angeles",
            "ru": "Лос-Анджелес",
            "ar": "لوس أنجلوس",
            "pt": "Los Angeles"
        }
    },
    "America/Denver": {
        "utc_offset": "-07:00",
        "name": {
            "zh": "丹佛",
            "en": "Denver",
            "ja": "デンバー",
            "ko": "덴버",
            "es": "Denver",
            "fr": "Denver",
            "de": "Denver",
            "ru": "Денвер",
            "ar": "دنفر",
            "pt": "Denver"
        }
    },
    "America/Chicago": {
        "utc_offset": "-06:00",
        "name": {
            "zh": "芝加哥",
            "en": "Chicago",
            "ja": "シカゴ",
            "ko": "시카고",
            "es": "Chicago",
            "fr": "Chicago",
            "de": "Chicago",
            "ru": "Чикаго",
            "ar": "شيكاغو",
            "pt": "Chicago"
        }
    },
    "America/New_York": {
        "utc_offset": "-05:00",
        "name": {
            "zh": "纽约",
            "en": "New York",
            "ja": "ニューヨーク",
            "ko": "뉴욕",
            "es": "Nueva York",
            "fr": "New York",
            "de": "New York",
            "ru": "Нью-Йорк",
            "ar": "نيويورك",
            "pt": "Nova York"
        }
    },
    "America/Toronto": {
        "utc_offset": "-05:00",
        "name": {
            "zh": "多伦多",
            "en": "Toronto",
            "ja": "トロント",
            "ko": "토론토",
            "es": "Toronto",
            "fr": "Toronto",
            "de": "Toronto",
            "ru": "Торонто",
            "ar": "تورونتو",
            "pt": "Toronto"
        }
    },
    "America/Mexico_City": {
        "utc_offset": "-06:00",
        "name": {
            "zh": "墨西哥城",
            "en": "Mexico City",
            "ja": "メキシコシティ",
            "ko": "멕시코시티",
            "es": "Ciudad México",
            "fr": "Mexico",
            "de": "Mexiko-Stadt",
            "ru": "Мехико",
            "ar": "مكسيكو سيتي",
            "pt": "Cidade México"
        }
    },
    "America/Bogota": {
        "utc_offset": "-05:00",
        "name": {
            "zh": "波哥大",
            "en": "Bogotá",
            "ja": "ボゴタ",
            "ko": "보고타",
            "es": "Bogotá",
            "fr": "Bogotá",
            "de": "Bogotá",
            "ru": "Богота",
            "ar": "بوغوتا",
            "pt": "Bogotá"
        }
    },
    "America/Lima": {
        "utc_offset": "-05:00",
        "name": {
            "zh": "利马",
            "en": "Lima",
            "ja": "リマ",
            "ko": "리마",
            "es": "Lima",
            "fr": "Lima",
            "de": "Lima",
            "ru": "Лима",
            "ar": "ليما",
            "pt": "Lima"
        }
    },
    "America/Santiago": {
        "utc_offset": "-04:00",
        "name": {
            "zh": "圣地亚哥",
            "en": "Santiago",
            "ja": "サンティアゴ",
            "ko": "산티아고",
            "es": "Santiago",
            "fr": "Santiago",
            "de": "Santiago",
            "ru": "Сантьяго",
            "ar": "سانتياغو",
            "pt": "Santiago"
        }
    },
    "America/Argentina/Buenos_Aires": {
        "utc_offset": "-03:00",
        "name": {
            "zh": "布宜诺斯艾利斯",
            "en": "Buenos Aires",
            "ja": "ブエノスアイレス",
            "ko": "부에노스아이레스",
            "es": "Buenos Aires",
            "fr": "Buenos Aires",
            "de": "Buenos Aires",
            "ru": "Буэнос-Айрес",
            "ar": "بوينس آيرس",
            "pt": "Buenos Aires"
        }
    },
    "America/Sao_Paulo": {
        "utc_offset": "-03:00",
        "name": {
            "zh": "圣保罗",
            "en": "São Paulo",
            "ja": "サンパウロ",
            "ko": "상파울루",
            "es": "São Paulo",
            "fr": "São Paulo",
            "de": "São Paulo",
            "ru": "Сан-Паулу",
            "ar": "ساو باولو",
            "pt": "São Paulo"
        }
    },
    "Atlantic/Azores": {
        "utc_offset": "-01:00",
        "name": {
            "zh": "亚速尔",
            "en": "Azores",
            "ja": "アゾレス",
            "ko": "아조레스",
            "es": "Azores",
            "fr": "Açores",
            "de": "Azoren",
            "ru": "Азорские о-ва",
            "ar": "الأزور",
            "pt": "Açores"
        }
    },
    "Europe/London": {
        "utc_offset": "+00:00",
        "name": {
            "zh": "伦敦",
            "en": "London",
            "ja": "ロンドン",
            "ko": "런던",
            "es": "Londres",
            "fr": "Londres",
            "de": "London",
            "ru": "Лондон",
            "ar": "لندن",
            "pt": "Londres"
        }
    },
    "Europe/Lisbon": {
        "utc_offset": "+00:00",
        "name": {
            "zh": "里斯本",
            "en": "Lisbon",
            "ja": "リスボン",
            "ko": "리스본",
            "es": "Lisboa",
            "fr": "Lisbonne",
            "de": "Lissabon",
            "ru": "Лиссабон",
            "ar": "لشبونة",
            "pt": "Lisboa"
        }
    },
    "Europe/Berlin": {
        "utc_offset": "+01:00",
        "name": {
            "zh": "柏林",
            "en": "Berlin",
            "ja": "ベルリン",
            "ko": "베를린",
            "es": "Berlín",
            "fr": "Berlin",
            "de": "Berlin",
            "ru": "Берлин",
            "ar": "برلين",
            "pt": "Berlim"
        }
    },
    "Europe/Paris": {
        "utc_offset": "+01:00",
        "name": {
            "zh": "巴黎",
            "en": "Paris",
            "ja": "パリ",
            "ko": "파리",
            "es": "París",
            "fr": "Paris",
            "de": "Paris",
            "ru": "Париж",
            "ar": "باريس",
            "pt": "Paris"
        }
    },
    "Europe/Madrid": {
        "utc_offset": "+01:00",
        "name": {
            "zh": "马德里",
            "en": "Madrid",
            "ja": "マドリード",
            "ko": "마드리드",
            "es": "Madrid",
            "fr": "Madrid",
            "de": "Madrid",
            "ru": "Мадрид",
            "ar": "مدريد",
            "pt": "Madri"
        }
    },
    "Europe/Rome": {
        "utc_offset": "+01:00",
        "name": {
            "zh": "罗马",
            "en": "Rome",
            "ja": "ローマ",
            "ko": "로마",
            "es": "Roma",
            "fr": "Rome",
            "de": "Rom",
            "ru": "Рим",
            "ar": "روما",
            "pt": "Roma"
        }
    },
    "Europe/Amsterdam": {
        "utc_offset": "+01:00",
        "name": {
            "zh": "阿姆斯特丹",
            "en": "Amsterdam",
            "ja": "アムステルダム",
            "ko": "암스테르담",
            "es": "Ámsterdam",
            "fr": "Amsterdam",
            "de": "Amsterdam",
            "ru": "Амстердам",
            "ar": "أمستردام",
            "pt": "Amsterdã"
        }
    },
    "Europe/Stockholm": {
        "utc_offset": "+01:00",
        "name": {
            "zh": "斯德哥尔摩",
            "en": "Stockholm",
            "ja": "ストックホルム",
            "ko": "스톡홀름",
            "es": "Estocolmo",
            "fr": "Stockholm",
            "de": "Stockholm",
            "ru": "Стокгольм",
            "ar": "ستوكهولم",
            "pt": "Estocolmo"
        }
    },
    "Europe/Athens": {
        "utc_offset": "+02:00",
        "name": {
            "zh": "雅典",
            "en": "Athens",
            "ja": "アテネ",
            "ko": "아테네",
            "es": "Atenas",
            "fr": "Athènes",
            "de": "Athen",
            "ru": "Афины",
            "ar": "أثينا",
            "pt": "Atenas"
        }
    },
    "Europe/Istanbul": {
        "utc_offset": "+03:00",
        "name": {
            "zh": "伊斯坦布尔",
            "en": "Istanbul",
            "ja": "イスタンブール",
            "ko": "이스탄불",
            "es": "Estambul",
            "fr": "Istanbul",
            "de": "Istanbul",
            "ru": "Стамбул",
            "ar": "إسطنبول",
            "pt": "Istambul"
        }
    },
    "Asia/Dubai": {
        "utc_offset": "+04:00",
        "name": {
            "zh": "迪拜",
            "en": "Dubai",
            "ja": "ドバイ",
            "ko": "두바이",
            "es": "Dubái",
            "fr": "Dubaï",
            "de": "Dubai",
            "ru": "Дубай",
            "ar": "دبي",
            "pt": "Dubai"
        }
    },
    "Asia/Karachi": {
        "utc_offset": "+05:00",
        "name": {
            "zh": "卡拉奇",
            "en": "Karachi",
            "ja": "カラチ",
            "ko": "카라치",
            "es": "Karachi",
            "fr": "Karachi",
            "de": "Karatschi",
            "ru": "Карачи",
            "ar": "كراتشي",
            "pt": "Carachi"
        }
    },
    "Asia/Kolkata": {
        "utc_offset": "+05:30",
        "name": {
            "zh": "加尔各答",
            "en": "Kolkata",
            "ja": "コルカタ",
            "ko": "콜카타",
            "es": "Calcuta",
            "fr": "Calcutta",
            "de": "Kolkata",
            "ru": "Калькутта",
            "ar": "كولكاتا",
            "pt": "Calcutá"
        }
    },
    "Asia/Dhaka": {
        "utc_offset": "+06:00",
        "name": {
            "zh": "达卡",
            "en": "Dhaka",
            "ja": "ダッカ",
            "ko": "다카",
            "es": "Daca",
            "fr": "Dacca",
            "de": "Dhaka",
            "ru": "Дакка",
            "ar": "دكا",
            "pt": "Daca"
        }
    },
    "Asia/Bangkok": {
        "utc_offset": "+07:00",
        "name": {
            "zh": "曼谷",
            "en": "Bangkok",
            "ja": "バンコク",
            "ko": "방콕",
            "es": "Bangkok",
            "fr": "Bangkok",
            "de": "Bangkok",
            "ru": "Бангкок",
            "ar": "بانكوك",
            "pt": "Bangcoc"
        }
    },
    "Asia/Jakarta": {
        "utc_offset": "+07:00",
        "name": {
            "zh": "雅加达",
            "en": "Jakarta",
            "ja": "ジャカルタ",
            "ko": "자카르타",
            "es": "Yakarta",
            "fr": "Jakarta",
            "de": "Jakarta",
            "ru": "Джакарта",
            "ar": "جاكرتا",
            "pt": "Jacarta"
        }
    },
    "Asia/Shanghai": {
        "utc_offset": "+08:00",
        "name": {
            "zh": "北京时间",
            "en": "Beijing",
            "ja": "北京",
            "ko": "베이징",
            "es": "Pekín",
            "fr": "Pékin",
            "de": "Peking",
            "ru": "Пекин",
            "ar": "بكين",
            "pt": "Pequim"
        }
    },
    "Asia/Taipei": {
        "utc_offset": "+08:00",
        "name": {
            "zh": "台北",
            "en": "Taipei",
            "ja": "台北",
            "ko": "타이베이",
            "es": "Taipéi",
            "fr": "Taipei",
            "de": "Taipeh",
            "ru": "Тайбэй",
            "ar": "تايبيه",
            "pt": "Taipei"
        }
    },
    "Asia/Hong_Kong": {
        "utc_offset": "+08:00",
        "name": {
            "zh": "香港",
            "en": "Hong Kong",
            "ja": "香港",
            "ko": "홍콩",
            "es": "Hong Kong",
            "fr": "Hong Kong",
            "de": "Hongkong",
            "ru": "Гонконг",
            "ar": "هونغ كونغ",
            "pt": "Hong Kong"
        }
    },
    "Asia/Singapore": {
        "utc_offset": "+08:00",
        "name": {
            "zh": "新加坡",
            "en": "Singapore",
            "ja": "シンガポール",
            "ko": "싱가포르",
            "es": "Singapur",
            "fr": "Singapour",
            "de": "Singapur",
            "ru": "Сингапур",
            "ar": "سنغافورة",
            "pt": "Singapura"
        }
    },
    "Asia/Seoul": {
        "utc_offset": "+09:00",
        "name": {
            "zh": "首尔",
            "en": "Seoul",
            "ja": "ソウル",
            "ko": "서울",
            "es": "Seúl",
            "fr": "Séoul",
            "de": "Seoul",
            "ru": "Сеул",
            "ar": "سيول",
            "pt": "Seul"
        }
    },
    "Asia/Tokyo": {
        "utc_offset": "+09:00",
        "name": {
            "zh": "东京",
            "en": "Tokyo",
            "ja": "東京",
            "ko": "도쿄",
            "es": "Tokio",
            "fr": "Tokyo",
            "de": "Tokio",
            "ru": "Токио",
            "ar": "طوكيو",
            "pt": "Tóquio"
        }
    },
    "Australia/Perth": {
        "utc_offset": "+08:00",
        "name": {
            "zh": "珀斯",
            "en": "Perth",
            "ja": "パース",
            "ko": "퍼스",
            "es": "Perth",
            "fr": "Perth",
            "de": "Perth",
            "ru": "Перт",
            "ar": "بيرث",
            "pt": "Perth"
        }
    },
    "Australia/Sydney": {
        "utc_offset": "+10:00",
        "name": {
            "zh": "悉尼",
            "en": "Sydney",
            "ja": "シドニー",
            "ko": "시드니",
            "es": "Sídney",
            "fr": "Sydney",
            "de": "Sydney",
            "ru": "Сидней",
            "ar": "سيدني",
            "pt": "Sydney"
        }
    },
    "Pacific/Guam": {
        "utc_offset": "+10:00",
        "name": {
            "zh": "关岛",
            "en": "Guam",
            "ja": "グアム",
            "ko": "괌",
            "es": "Guam",
            "fr": "Guam",
            "de": "Guam",
            "ru": "Гуам",
            "ar": "غوام",
            "pt": "Guam"
        }
    },
    "Pacific/Noumea": {
        "utc_offset": "+11:00",
        "name": {
            "zh": "努美阿",
            "en": "Noumea",
            "ja": "ヌメア",
            "ko": "누메아",
            "es": "Numea",
            "fr": "Nouméa",
            "de": "Noumea",
            "ru": "Нумеа",
            "ar": "نوميا",
            "pt": "Numeá"
        }
    },
    "Pacific/Auckland": {
        "utc_offset": "+12:00",
        "name": {
            "zh": "奥克兰",
            "en": "Auckland",
            "ja": "オークランド",
            "ko": "오클랜드",
            "es": "Auckland",
            "fr": "Auckland",
            "de": "Auckland",
            "ru": "Окленд",
            "ar": "أوكلاند",
            "pt": "Auckland"
        }
    },
    "Pacific/Fiji": {
        "utc_offset": "+12:00",
        "name": {
            "zh": "斐济",
            "en": "Fiji",
            "ja": "フィジー",
            "ko": "피지",
            "es": "Fiyi",
            "fr": "Fidji",
            "de": "Fidschi",
            "ru": "Фиджи",
            "ar": "فيجي",
            "pt": "Fiji"
        }
    },
    "Pacific/Tongatapu": {
        "utc_offset": "+13:00",
        "name": {
            "zh": "汤加塔普",
            "en": "Tongatapu",
            "ja": "トンガタプ",
            "ko": "통가타푸",
            "es": "Tongatapu",
            "fr": "Tongatapu",
            "de": "Tongatapu",
            "ru": "Тонгатапу",
            "ar": "تونغاتابو",
            "pt": "Tongatapu"
        }
    }
}