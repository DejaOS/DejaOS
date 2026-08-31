import dxui from '../dxmodules/dxUi.js'
import dxstd from '../dxmodules/dxStd.js'
import logger from '../dxmodules/dxLogger.js'
import pinyinDict from './pinyinDict.js'

const WIDTH = 800
const HEIGHT = 1280

const DEFAULT_CANDIDATES = ['你好', '收到', '可以', '好的', '谢谢']
const PINYIN_KEYS = Object.keys(pinyinDict)

const CONVERSATIONS = [
  { id: 'linyue', name: '林悦', icon: 'person', color: '#5CCB91', time: '10:32', preview: '下午的设备演示确认了吗？', unread: '2', incoming: '下午的设备演示确认了吗？', outgoing: '我正在检查最后一版界面。' },
  { id: 'demo_group', name: '设备演示群', icon: 'groups', color: '#5B8DEF', time: '09:48', preview: '王工：导航和视频效果都很不错', unread: '6', incoming: '大家下午三点在展厅集合。', outgoing: '好的，我会提前准备设备。' },
  { id: 'zhang', name: '张工', icon: 'person', color: '#F39A62', time: '昨天', preview: '[文件] DejaOS 演示说明.pdf', unread: '', incoming: '新版演示说明已经发给你了。', outgoing: '收到，我稍后确认。' },
  { id: 'design', name: '产品设计组', icon: 'groups', color: '#9A7BEF', time: '昨天', preview: '小周：桌面图标还可以再统一一下', unread: '3', incoming: '首页视觉稿已经更新。', outgoing: '整体效果很协调。' },
  { id: 'transfer', name: '文件传输助手', icon: 'folder', color: '#37B6B2', time: '星期一', preview: '[图片] 宣传拍摄参考图', unread: '', incoming: '宣传拍摄参考图', outgoing: '已保存到设备。' },
  { id: 'service', name: '服务通知', icon: 'notifications', color: '#4BA3FF', time: '星期一', preview: '设备服务状态：运行正常', unread: '', incoming: '设备服务状态正常。', outgoing: '查看详情' }
]

function styleContainer(view, width, height, x, y, radius, color, opacity) {
  view.setSize(width, height)
  view.setPos(x, y)
  view.padAll(0)
  view.scroll(false)
  view.borderWidth(0)
  view.radius(radius)
  view.bgColor(color)
  view.bgOpa(opacity)
}

function styleLabel(label, font, color, width, height, x, y, align) {
  label.setSize(width, height)
  label.setPos(x, y)
  label.textFont(font)
  label.textColor(color)
  label.textAlign(align)
  label.longMode(dxui.Utils.LABEL_LONG_MODE.CLIP)
}

function buildAvatar(id, parent, icon, color, x, y, size) {
  const avatar = dxui.View.build(`${id}Avatar`, parent)
  styleContainer(avatar, size, size, x, y, Math.round(size * 0.24), color, 100)
  const image = dxui.Image.build(`${id}AvatarIcon`, avatar)
  image.source(`/app/code/resource/chat/ui/avatar-${icon}.png`)
  const iconSize = Math.round(size * 0.58)
  image.setSize(iconSize, iconSize)
  image.setPos(Math.round((size - iconSize) / 2), Math.round((size - iconSize) / 2))
  return avatar
}

export function createChatApp(parent, fonts) {
  let opened = false
  let activeConversation = CONVERSATIONS[0]
  let replyTimer = null
  let keyboardVisible = false
  let committedText = ''
  let composition = ''

  const app = dxui.View.build('chatApp', parent)
  styleContainer(app, WIDTH, HEIGHT, 0, 0, 0, '#F3F4F6', 100)

  const listPage = dxui.View.build('chatListPage', app)
  styleContainer(listPage, WIDTH, HEIGHT, 0, 0, 0, '#F3F4F6', 100)

  const listHeader = dxui.View.build('chatListHeader', listPage)
  styleContainer(listHeader, WIDTH, 112, 0, 0, 0, '#F7F7F7', 100)

  const listBack = dxui.View.build('chatListBack', listHeader)
  styleContainer(listBack, 72, 72, 18, 20, 36, '#E8EAED', 100)
  listBack.clickable(true)
  const listBackIcon = dxui.Image.build('chatListBackIcon', listBack)
  listBackIcon.source('/app/code/resource/music/ui/back.png')
  listBackIcon.setSize(52, 52)
  listBackIcon.setPos(10, 10)

  const listTitle = dxui.Label.build('chatListTitle', listHeader)
  listTitle.text('即时通讯')
  styleLabel(listTitle, fonts.title, '#17191C', 300, 44, 112, 34, dxui.Utils.TEXT_ALIGN.LEFT)

  const headerPlus = dxui.Image.build('chatHeaderPlus', listHeader)
  headerPlus.source('/app/code/resource/chat/ui/add.png')
  headerPlus.setSize(44, 44)
  headerPlus.setPos(722, 34)

  const search = dxui.View.build('chatSearch', listPage)
  styleContainer(search, 736, 62, 32, 126, 18, '#FFFFFF', 100)
  const searchIcon = dxui.Image.build('chatSearchIcon', search)
  searchIcon.source('/app/code/resource/chat/ui/search.png')
  searchIcon.setSize(40, 40)
  searchIcon.setPos(22, 11)
  const searchText = dxui.Label.build('chatSearchText', search)
  searchText.text('搜索')
  styleLabel(searchText, fonts.body, '#A0A4AA', 580, 34, 72, 14, dxui.Utils.TEXT_ALIGN.LEFT)

  const listBody = dxui.View.build('chatListBody', listPage)
  styleContainer(listBody, WIDTH, 820, 0, 202, 0, '#FFFFFF', 100)

  function openConversation(event) {
    activeConversation = event.ud
    chatTitle.text(activeConversation.name)
    chatAvatarIcon.source(`/app/code/resource/chat/ui/avatar-${activeConversation.icon}.png`)
    replyAvatarIcon.source(`/app/code/resource/chat/ui/avatar-${activeConversation.icon}.png`)
    chatAvatar.bgColor(activeConversation.color)
    incomingText.text(activeConversation.incoming)
    outgoingText.text(activeConversation.outgoing)
    sentBubble.hide()
    replyBubble.hide()
    replyAvatar.hide()
    committedText = ''
    composition = ''
    input.text('')
    inputHint.show()
    hideKeyboard()
    if (activeConversation.id === 'linyue') {
      input.disable(false)
      inputHint.text('输入消息')
      inputStatus.text(' ')
    } else {
      input.disable(true)
      inputHint.text('演示会话')
      inputStatus.text('仅首个联系人支持输入与自动回复')
    }
    chatPage.show()
    chatPage.moveForeground()
    logger.info(`chat conversation opened: ${activeConversation.id}`)
  }

  CONVERSATIONS.forEach(function buildConversation(item, index) {
    const row = dxui.View.build(`chatRow_${item.id}`, listBody)
    styleContainer(row, WIDTH, 132, 0, index * 132, 0, '#FFFFFF', 100)
    row.clickable(true)
    row.on(dxui.Utils.EVENT.CLICK, openConversation, item)
    buildAvatar(`chatRow_${item.id}`, row, item.icon, item.color, 28, 20, 88)

    const name = dxui.Label.build(`chatRowName_${item.id}`, row)
    name.text(item.name)
    styleLabel(name, fonts.title, '#1E2125', 430, 40, 136, 22, dxui.Utils.TEXT_ALIGN.LEFT)
    const preview = dxui.Label.build(`chatRowPreview_${item.id}`, row)
    preview.text(item.preview)
    styleLabel(preview, fonts.body, '#898E96', 500, 34, 136, 72, dxui.Utils.TEXT_ALIGN.LEFT)
    const time = dxui.Label.build(`chatRowTime_${item.id}`, row)
    time.text(item.time)
    styleLabel(time, fonts.small, '#A7ABB1', 140, 28, 628, 25, dxui.Utils.TEXT_ALIGN.RIGHT)
    if (item.unread) {
      const unread = dxui.View.build(`chatRowUnread_${item.id}`, row)
      styleContainer(unread, 38, 38, 718, 69, 19, '#FA5151', 100)
      const unreadText = dxui.Label.build(`chatRowUnreadText_${item.id}`, unread)
      unreadText.text(item.unread)
      styleLabel(unreadText, fonts.small, '#FFFFFF', 38, 28, 0, 5, dxui.Utils.TEXT_ALIGN.CENTER)
    }
    if (index < CONVERSATIONS.length - 1) {
      const separator = dxui.View.build(`chatRowSeparator_${item.id}`, row)
      styleContainer(separator, 636, 1, 136, 131, 0, '#E5E7EA', 100)
    }
  })

  const nav = dxui.View.build('chatBottomNav', listPage)
  styleContainer(nav, WIDTH, 190, 0, 1090, 0, '#F8F8F8', 100)
  nav.borderWidth(1)
  nav.borderColor('#DADDE1')
  const navItems = [
    { label: '消息', icon: 'nav-chat', active: true },
    { label: '通讯录', icon: 'nav-contacts' },
    { label: '发现', icon: 'nav-explore' },
    { label: '我', icon: 'nav-person' }
  ]
  navItems.forEach(function buildNav(item, index) {
    const touch = dxui.View.build(`chatNav_${index}`, nav)
    styleContainer(touch, 180, 130, 10 + index * 198, 16, 0, '#000000', 0)
    touch.clickable(true)
    const mark = dxui.Image.build(`chatNavMark_${index}`, touch)
    mark.source(`/app/code/resource/chat/ui/${item.icon}.png`)
    mark.setSize(48, 48)
    mark.setPos(66, 8)
    const label = dxui.Label.build(`chatNavLabel_${index}`, touch)
    label.text(item.label)
    styleLabel(label, fonts.small, item.active ? '#07C160' : '#62666C', 180, 30, 0, 70, dxui.Utils.TEXT_ALIGN.CENTER)
  })
  const listGesture = dxui.View.build('chatListGesture', listPage)
  styleContainer(listGesture, 142, 6, 329, 1251, 3, '#202327', 78)

  const chatPage = dxui.View.build('chatDetailPage', app)
  styleContainer(chatPage, WIDTH, HEIGHT, 0, 0, 0, '#EDEDED', 100)

  const chatHeader = dxui.View.build('chatDetailHeader', chatPage)
  styleContainer(chatHeader, WIDTH, 112, 0, 0, 0, '#F7F7F7', 100)
  chatHeader.borderWidth(1)
  chatHeader.borderColor('#DEDFE1')
  const detailBack = dxui.View.build('chatDetailBack', chatHeader)
  styleContainer(detailBack, 72, 72, 18, 20, 36, '#E8EAED', 100)
  detailBack.clickable(true)
  const detailBackIcon = dxui.Image.build('chatDetailBackIcon', detailBack)
  detailBackIcon.source('/app/code/resource/music/ui/back.png')
  detailBackIcon.setSize(52, 52)
  detailBackIcon.setPos(10, 10)
  const chatTitle = dxui.Label.build('chatDetailTitle', chatHeader)
  chatTitle.text('林悦')
  styleLabel(chatTitle, fonts.title, '#17191C', 420, 44, 112, 34, dxui.Utils.TEXT_ALIGN.LEFT)
  const detailMore = dxui.Image.build('chatDetailMore', chatHeader)
  detailMore.source('/app/code/resource/chat/ui/more.png')
  detailMore.setSize(46, 46)
  detailMore.setPos(718, 33)

  const dateChip = dxui.View.build('chatDateChip', chatPage)
  styleContainer(dateChip, 108, 38, 346, 144, 14, '#D7D9DC', 88)
  const dateText = dxui.Label.build('chatDateText', dateChip)
  dateText.text('今天 10:28')
  styleLabel(dateText, fonts.small, '#FFFFFF', 108, 28, 0, 5, dxui.Utils.TEXT_ALIGN.CENTER)

  const chatAvatar = dxui.View.build('chatIncomingAvatar', chatPage)
  styleContainer(chatAvatar, 72, 72, 26, 220, 18, '#5CCB91', 100)
  const chatAvatarIcon = dxui.Image.build('chatIncomingAvatarIcon', chatAvatar)
  chatAvatarIcon.source('/app/code/resource/chat/ui/avatar-person.png')
  chatAvatarIcon.setSize(44, 44)
  chatAvatarIcon.setPos(14, 14)

  const incomingBubble = dxui.View.build('chatIncomingBubble', chatPage)
  styleContainer(incomingBubble, 510, 88, 116, 218, 18, '#FFFFFF', 100)
  const incomingText = dxui.Label.build('chatIncomingText', incomingBubble)
  incomingText.text(CONVERSATIONS[0].incoming)
  styleLabel(incomingText, fonts.body, '#202327', 474, 44, 18, 22, dxui.Utils.TEXT_ALIGN.LEFT)

  const outgoingBubble = dxui.View.build('chatStaticOutgoingBubble', chatPage)
  styleContainer(outgoingBubble, 440, 88, 324, 348, 18, '#95EC69', 100)
  const outgoingText = dxui.Label.build('chatStaticOutgoingText', outgoingBubble)
  outgoingText.text(CONVERSATIONS[0].outgoing)
  styleLabel(outgoingText, fonts.body, '#172016', 404, 44, 18, 22, dxui.Utils.TEXT_ALIGN.RIGHT)

  const sentBubble = dxui.View.build('chatSentBubble', chatPage)
  styleContainer(sentBubble, 500, 88, 264, 500, 18, '#95EC69', 100)
  const sentText = dxui.Label.build('chatSentText', sentBubble)
  sentText.text(' ')
  styleLabel(sentText, fonts.body, '#172016', 464, 44, 18, 22, dxui.Utils.TEXT_ALIGN.RIGHT)
  sentBubble.hide()

  const replyAvatar = dxui.View.build('chatReplyAvatar', chatPage)
  styleContainer(replyAvatar, 72, 72, 26, 630, 18, '#5CCB91', 100)
  const replyAvatarIcon = dxui.Image.build('chatReplyAvatarIcon', replyAvatar)
  replyAvatarIcon.source('/app/code/resource/chat/ui/avatar-person.png')
  replyAvatarIcon.setSize(44, 44)
  replyAvatarIcon.setPos(14, 14)
  const replyBubble = dxui.View.build('chatReplyBubble', chatPage)
  styleContainer(replyBubble, 260, 88, 116, 626, 18, '#FFFFFF', 100)
  const replyText = dxui.Label.build('chatReplyText', replyBubble)
  replyText.text('收到，你继续')
  styleLabel(replyText, fonts.body, '#202327', 224, 44, 18, 22, dxui.Utils.TEXT_ALIGN.LEFT)
  replyAvatar.hide()
  replyBubble.hide()

  const inputStatus = dxui.Label.build('chatInputStatus', chatPage)
  inputStatus.text(' ')
  styleLabel(inputStatus, fonts.small, '#888D94', 620, 30, 90, 1034, dxui.Utils.TEXT_ALIGN.CENTER)

  const inputBar = dxui.View.build('chatInputBar', chatPage)
  styleContainer(inputBar, WIDTH, 132, 0, 1054, 0, '#F6F6F6', 100)
  inputBar.borderWidth(1)
  inputBar.borderColor('#D5D7DA')

  const voiceButton = dxui.View.build('chatVoiceButton', inputBar)
  styleContainer(voiceButton, 76, 76, 18, 28, 38, '#E2E5E8', 100)
  const voiceIcon = dxui.Image.build('chatVoiceIcon', voiceButton)
  voiceIcon.source('/app/code/resource/chat/ui/mic.png')
  voiceIcon.setSize(34, 34)
  voiceIcon.setPos(21, 21)

  const inputShell = dxui.View.build('chatMessageInputShell', inputBar)
  styleContainer(inputShell, 584, 76, 108, 28, 18, '#FFFFFF', 100)
  inputShell.borderWidth(1)
  inputShell.borderColor('#DADDE0')

  const input = dxui.Textarea.build('chatMessageInput', inputShell)
  input.setSize(584, 76)
  input.setPos(0, 0)
  input.setOneLine(true)
  input.setMaxLength(24)
  input.textFont(fonts.body)
  input.textColor('#202327')
  input.bgOpa(0)
  input.borderWidth(0)
  input.padLeft(20)
  input.padRight(20)
  input.padTop(18)
  input.padBottom(18)

  const inputHint = dxui.Label.build('chatInputHint', inputShell)
  inputHint.text('输入消息')
  styleLabel(inputHint, fonts.body, '#A0A4A9', 544, 38, 20, 24, dxui.Utils.TEXT_ALIGN.LEFT)
  inputHint.clickable(true)

  const emojiButton = dxui.View.build('chatEmojiButton', inputBar)
  styleContainer(emojiButton, 76, 76, 706, 28, 38, '#E2E5E8', 100)
  const emojiIcon = dxui.Image.build('chatEmojiIcon', emojiButton)
  emojiIcon.source('/app/code/resource/chat/ui/emoji.png')
  emojiIcon.setSize(32, 32)
  emojiIcon.setPos(22, 22)

  const keyboardPanel = dxui.View.build('chatChineseKeyboard', chatPage)
  styleContainer(keyboardPanel, WIDTH, 460, 0, 820, 0, '#D2D5DA', 100)

  const candidateBar = dxui.View.build('chatCandidateBar', keyboardPanel)
  styleContainer(candidateBar, WIDTH, 70, 0, 0, 0, '#F6F7F8', 100)
  const candidateLabels = []
  for (let index = 0; index < 5; index += 1) {
    const touch = dxui.View.build(`chatCandidate_${index}`, candidateBar)
    styleContainer(touch, 140, 54, 20 + index * 152, 8, 14, '#FFFFFF', 100)
    touch.clickable(true)
    touch.on(dxui.Utils.EVENT.CLICK, handleCandidateClick, index)
    const label = dxui.Label.build(`chatCandidateLabel_${index}`, touch)
    label.text(DEFAULT_CANDIDATES[index])
    styleLabel(label, fonts.body, '#25282C', 140, 36, 0, 9, dxui.Utils.TEXT_ALIGN.CENTER)
    candidateLabels.push(label)
  }

  const keyRows = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM']
  const rowStarts = [24, 62, 138]
  keyRows.forEach(function buildKeyRow(row, rowIndex) {
    const keys = row.split('')
    keys.forEach(function buildLetterKey(letter, keyIndex) {
      const key = dxui.View.build(`chatKey_${letter}`, keyboardPanel)
      styleContainer(key, 68, 70, rowStarts[rowIndex] + keyIndex * 76, 84 + rowIndex * 88, 12, '#FFFFFF', 100)
      key.borderWidth(1)
      key.borderColor('#B8BDC4')
      key.clickable(true)
      key.on(dxui.Utils.EVENT.CLICK, handleLetterKey, letter.toLowerCase())
      const keyText = dxui.Label.build(`chatKeyText_${letter}`, key)
      keyText.text(letter)
      styleLabel(keyText, fonts.body, '#22262A', 68, 36, 0, 17, dxui.Utils.TEXT_ALIGN.CENTER)
    })
  })

  function buildActionKey(id, text, x, width, color, textColor, action) {
    const key = dxui.View.build(id, keyboardPanel)
    styleContainer(key, width, 70, x, 350, 14, color, 100)
    key.borderWidth(1)
    key.borderColor('#ADB3BA')
    key.clickable(true)
    key.on(dxui.Utils.EVENT.CLICK, handleActionKey, action)
    const label = dxui.Label.build(`${id}Text`, key)
    label.text(text)
    styleLabel(label, fonts.body, textColor, width, 36, 0, 17, dxui.Utils.TEXT_ALIGN.CENTER)
  }

  buildActionKey('chatKeyLanguage', '清空', 24, 110, '#B7BCC3', '#22262A', 'clear')
  buildActionKey('chatKeySpace', '空格', 150, 350, '#FFFFFF', '#22262A', 'space')
  buildActionKey('chatKeyDelete', '删除', 516, 110, '#B7BCC3', '#22262A', 'delete')
  buildActionKey('chatKeyConfirm', '确定', 642, 134, '#07C160', '#FFFFFF', 'confirm')
  keyboardPanel.hide()

  const chatGesture = dxui.View.build('chatDetailGesture', chatPage)
  styleContainer(chatGesture, 142, 6, 329, 1251, 3, '#202327', 78)

  function hideKeyboard() {
    if (!keyboardVisible) {
      return
    }
    keyboardPanel.hide()
    keyboardVisible = false
    inputBar.y(1054)
    inputStatus.y(1018)
    chatGesture.show()
    input.focus(false)
  }

  function showKeyboard() {
    if (activeConversation.id !== 'linyue' || keyboardVisible) {
      return
    }
    keyboardVisible = true
    inputBar.y(676)
    inputStatus.y(640)
    chatGesture.hide()
    keyboardPanel.show()
    keyboardPanel.moveForeground()
    inputBar.moveForeground()
  }

  function currentCandidates() {
    if (!composition) {
      return DEFAULT_CANDIDATES
    }
    const values = []
    const seen = {}

    function appendCharacters(characters) {
      if (!characters) {
        return
      }
      for (let index = 0; index < characters.length && values.length < 5; index += 1) {
        const character = characters[index]
        if (!seen[character]) {
          seen[character] = true
          values.push(character)
        }
      }
    }

    appendCharacters(pinyinDict[composition])
    for (let index = 0; index < PINYIN_KEYS.length && values.length < 5; index += 1) {
      const key = PINYIN_KEYS[index]
      if (key !== composition && key.indexOf(composition) === 0) {
        appendCharacters(pinyinDict[key])
      }
    }
    return values
  }

  function refreshComposition() {
    input.text(`${committedText}${composition}`)
    updateInputHint()
    const values = currentCandidates()
    candidateLabels.forEach(function updateCandidate(label, index) {
      label.text(values[index] || ' ')
    })
  }

  function handleLetterKey(event) {
    if (composition.length >= 12 || input.text().length >= 24) {
      return
    }
    composition += event.ud
    refreshComposition()
  }

  function handleCandidateClick(event) {
    const values = currentCandidates()
    const candidate = values[event.ud]
    if (!candidate) {
      return
    }
    committedText += candidate
    composition = ''
    refreshComposition()
  }

  function handleActionKey(event) {
    const action = event.ud
    if (action === 'delete') {
      if (composition.length > 0) {
        composition = composition.slice(0, -1)
      } else if (committedText.length > 0) {
        committedText = committedText.slice(0, -1)
      }
      refreshComposition()
      return
    }
    if (action === 'space') {
      committedText += `${composition} `
      composition = ''
      refreshComposition()
      return
    }
    if (action === 'clear') {
      committedText = ''
      composition = ''
      refreshComposition()
      return
    }
    if (action === 'confirm') {
      if (composition) {
        committedText += composition
        composition = ''
        refreshComposition()
      }
      sendMessage()
    }
  }

  function updateInputHint() {
    if (input.text().length > 0) {
      inputHint.hide()
    } else {
      inputHint.show()
    }
  }

  function showReply() {
    replyAvatar.show()
    replyBubble.show()
    replyBubble.x(104)
    dxui.Utils.anime(replyBubble, 104, 116, function moveReply(target, value) {
      target.x(value)
    }, 180, 0, 0, 'ease_out')
    replyTimer = null
    logger.info('chat automatic reply displayed')
  }

  function sendMessage() {
    if (activeConversation.id !== 'linyue') {
      hideKeyboard()
      return
    }
    const value = input.text().trim()
    if (!value) {
      return
    }
    if (replyTimer) {
      dxstd.clearTimeout(replyTimer)
      replyTimer = null
    }
    sentText.text(value)
    sentBubble.show()
    sentBubble.x(278)
    dxui.Utils.anime(sentBubble, 278, 264, function moveSent(target, x) {
      target.x(x)
    }, 160, 0, 0, 'ease_out')
    replyAvatar.hide()
    replyBubble.hide()
    hideKeyboard()
    committedText = ''
    composition = ''
    input.text('')
    inputHint.show()
    replyTimer = dxstd.setTimeout(showReply, 1000)
    logger.info('chat demo message sent')
  }

  function backToList() {
    if (replyTimer) {
      dxstd.clearTimeout(replyTimer)
      replyTimer = null
    }
    hideKeyboard()
    chatPage.hide()
    listPage.show()
    listPage.moveForeground()
  }

  function close() {
    if (!opened) {
      return
    }
    if (replyTimer) {
      dxstd.clearTimeout(replyTimer)
      replyTimer = null
    }
    hideKeyboard()
    chatPage.hide()
    listPage.show()
    app.hide()
    opened = false
    logger.info('chat app closed')
  }

  function open() {
    if (opened) {
      return
    }
    opened = true
    chatPage.hide()
    listPage.show()
    app.show()
    app.moveForeground()
    logger.info('chat app opened')
  }

  function destroy() {
    if (replyTimer) {
      dxstd.clearTimeout(replyTimer)
      replyTimer = null
    }
    hideKeyboard()
    opened = false
    app.hide()
  }

  function handleInputFocus() {
    if (!input.isFocus()) {
      input.focus(true)
    }
    showKeyboard()
  }

  listBack.on(dxui.Utils.EVENT.CLICK, close)
  detailBack.on(dxui.Utils.EVENT.CLICK, backToList)
  input.on(dxui.Utils.EVENT.FOCUSED, handleInputFocus)
  input.on(dxui.Utils.EVENT.CLICK, handleInputFocus)
  input.on(dxui.Utils.EVENT.VALUE_CHANGED, updateInputHint)
  inputHint.on(dxui.Utils.EVENT.CLICK, handleInputFocus)

  chatPage.hide()
  app.hide()
  return { open, close, destroy }
}
