const state = {
  apps: [], current: null, currentFile: 'app.js', buffers: {},
  iconDraft: '', newIconData: '', pendingIcons: { setting: null, new: null }
}
const $ = (id) => document.getElementById(id)

function iconDataUrl(base64) {
  return base64 ? `data:image/png;base64,${base64}` : ''
}

function iconMarkup(app) {
  const url = iconDataUrl(app.iconData)
  return url ? `<img src="${url}" alt="" />` : '<span class="icon-fallback">A</span>'
}

function setIconPreview(target, base64OrUrl, meta) {
  const prefix = target === 'setting' ? 'setting' : 'new'
  const preview = $(`${prefix}IconPreview`)
  const url = String(base64OrUrl || '').startsWith('data:') ? base64OrUrl : iconDataUrl(base64OrUrl)
  preview.innerHTML = url ? `<img src="${url}" alt="Icon preview" />` : '<span>PNG</span>'
  $(`${prefix}IconMeta`).textContent = meta || (url ? '40×40 PNG' : 'Select a PNG image')
}

function acceptedIcon(target) {
  return target === 'setting' ? state.iconDraft : state.newIconData
}

function setAcceptedIcon(target, base64) {
  if (target === 'setting') {
    state.iconDraft = base64
    $('editorBadge').innerHTML = iconMarkup({ iconData: base64 })
    $('saveState').textContent = 'Unsaved'
  } else {
    state.newIconData = base64
  }
  setIconPreview(target, base64, '40×40 PNG, ready to save')
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  })
  const data = await response.json()
  if (!response.ok || data.ok === false) throw new Error(data.error || `Request failed: ${response.status}`)
  return data
}

let toastTimer
function toast(title, text = '') {
  clearTimeout(toastTimer)
  $('toastTitle').textContent = title
  $('toastText').textContent = text
  $('toast').classList.add('show')
  toastTimer = setTimeout(() => $('toast').classList.remove('show'), 2600)
}

function formatTime(iso) {
  return new Intl.DateTimeFormat('zh-CN', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' }).format(new Date(iso))
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[char])
}

function renderApps() {
  const keyword = $('searchInput').value.trim().toLowerCase()
  const apps = state.apps.filter((app) => `${app.name} ${app.id}`.toLowerCase().includes(keyword))
  $('totalMetric').textContent = state.apps.length
  $('publishedMetric').textContent = state.apps.filter((app) => app.publishedVersion).length
  $('draftMetric').textContent = state.apps.filter((app) => app.status === 'draft').length
  $('listHint').textContent = `${state.apps.length} apps. Published apps are available to devices.`
  $('emptyState').hidden = apps.length !== 0
  $('appRows').innerHTML = apps.map((app) => `
    <tr>
      <td><div class="app-cell"><span class="app-icon" style="background:${escapeHtml(app.color)}">${iconMarkup(app)}</span><div><strong>${escapeHtml(app.name)}</strong><small>${escapeHtml(app.id)}</small></div></div></td>
      <td><span class="chip ${app.visibility === 'official' ? 'official' : 'private'}">${app.visibility === 'official' ? 'Official' : 'My Devices'}</span></td>
      <td>v${escapeHtml(app.draft.version)}</td>
      <td>${app.publishedVersion ? `v${escapeHtml(app.publishedVersion)}` : '—'}</td>
      <td><span class="chip ${app.status}">${app.status === 'published' ? 'Published' : 'Draft'}</span></td>
      <td>${formatTime(app.updatedAt)}</td>
      <td><div class="row-actions"><button class="text-button" data-edit="${escapeHtml(app.id)}">Develop</button><button class="text-button download" data-download="${escapeHtml(app.id)}" ${app.publishedVersion ? '' : 'disabled'}>Download</button></div></td>
    </tr>`).join('')
}

async function loadApps() {
  try {
    const data = await api('/api/apps')
    state.apps = data.items
    renderApps()
  } catch (error) {
    toast('Failed to load apps', error.message)
  }
}

function updateLines() {
  $('lineNumbers').textContent = Array.from({ length: $('codeEditor').value.split('\n').length }, (_, index) => index + 1).join('\n')
}

function saveBuffer() {
  if (!state.current) return
  state.buffers[state.currentFile] = $('codeEditor').value
}

function selectFile(file, persistCurrent = true) {
  if (persistCurrent) saveBuffer()
  state.currentFile = file
  document.querySelectorAll('[data-file]').forEach((button) => button.classList.toggle('active', button.dataset.file === file))
  $('activeFile').textContent = file
  $('codeEditor').value = state.buffers[file] || ''
  updateLines()
}

function setEditor(app) {
  state.current = app
  state.currentFile = 'app.js'
  state.iconDraft = app.iconData || ''
  state.pendingIcons.setting = null
  state.buffers = {
    'app.js': app.draft.code,
    'manifest.json': JSON.stringify(app.draft.manifest, null, 2)
  }
  $('editorTitle').textContent = app.name
  $('editorMeta').textContent = `${app.id} · ${app.status === 'published' ? 'Published' : 'Draft'}`
  $('editorBadge').innerHTML = iconMarkup(app)
  $('editorBadge').style.background = app.color
  $('settingName').value = app.name
  $('settingId').value = app.id
  $('settingVersion').value = app.draft.version
  $('settingColor').value = app.color
  $('settingVisibility').value = app.visibility
  $('settingDescription').value = app.description
  $('settingIconFile').value = ''
  $('settingIconDecision').hidden = true
  setIconPreview('setting', app.iconData, 'Current icon: 40×40 PNG')
  $('downloadButton').disabled = !app.publishedVersion
  $('saveState').textContent = 'Saved'
  selectFile('app.js', false)
  $('listView').classList.remove('active')
  $('editorView').classList.add('active')
  $('breadcrumb').innerHTML = `Workspace / Micro Apps / <b>${escapeHtml(app.name)}</b>`
}

async function openEditor(id) {
  try {
    const data = await api(`/api/apps/${encodeURIComponent(id)}`)
    setEditor(data.app)
  } catch (error) {
    toast('Failed to open app', error.message)
  }
}

function editorPayload() {
  saveBuffer()
  if (state.pendingIcons.setting) {
    throw new Error('Crop and resize the icon, or choose another image')
  }
  let manifest
  try {
    manifest = JSON.parse(state.buffers['manifest.json'])
  } catch {
    throw new Error('manifest.json is not valid JSON')
  }
  const name = $('settingName').value.trim()
  const version = $('settingVersion').value.trim()
  if (!name || !version) throw new Error('App name and version are required')
  manifest.id = state.current.id
  manifest.name = name
  manifest.version = version
  return {
    name,
    description: $('settingDescription').value,
    visibility: $('settingVisibility').value,
    iconData: state.iconDraft,
    color: $('settingColor').value,
    draft: { version, code: state.buffers['app.js'], manifest }
  }
}

async function saveCurrent(showToast = true) {
  if (!state.current) return null
  $('saveState').textContent = 'Saving...'
  try {
    const data = await api(`/api/apps/${encodeURIComponent(state.current.id)}`, { method:'PUT', body:JSON.stringify(editorPayload()) })
    state.current = data.app
    state.iconDraft = data.app.iconData
    state.buffers['manifest.json'] = JSON.stringify(data.app.draft.manifest, null, 2)
    if (state.currentFile === 'manifest.json') $('codeEditor').value = state.buffers['manifest.json']
    $('editorTitle').textContent = data.app.name
    $('editorMeta').textContent = `${data.app.id} · Draft`
    $('saveState').textContent = 'Saved'
    if (showToast) toast('Draft saved', `${data.app.name} v${data.app.draft.version}`)
    return data.app
  } catch (error) {
    $('saveState').textContent = 'Save failed'
    toast('Save failed', error.message)
    return null
  }
}

async function publishCurrent() {
  const saved = await saveCurrent(false)
  if (!saved) return
  try {
    const data = await api(`/api/apps/${encodeURIComponent(saved.id)}/publish`, { method:'POST', body:'{}' })
    setEditor(data.app)
    toast('App published', `Devices can now download ${data.app.name} v${data.app.publishedVersion}`)
  } catch (error) {
    toast('Publish failed', error.message)
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Failed to read image'))
    reader.readAsDataURL(file)
  })
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Unable to decode PNG image'))
    image.src = url
  })
}

function base64FromDataUrl(url) {
  return String(url).split(',')[1] || ''
}

async function handleIconFile(target, file) {
  const prefix = target === 'setting' ? 'setting' : 'new'
  if (!file) return
  if (file.type !== 'image/png' && !file.name.toLowerCase().endsWith('.png')) {
    toast('Invalid icon format', 'Select a PNG image')
    $(`${prefix}IconFile`).value = ''
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    toast('Icon file is too large', 'Select a PNG image smaller than 5 MB')
    $(`${prefix}IconFile`).value = ''
    return
  }
  try {
    const url = await readFileAsDataUrl(file)
    const image = await loadImage(url)
    setIconPreview(target, url, `Original size: ${image.naturalWidth}×${image.naturalHeight}`)
    if (image.naturalWidth === 40 && image.naturalHeight === 40) {
      state.pendingIcons[target] = null
      $(`${prefix}IconDecision`).hidden = true
      setAcceptedIcon(target, base64FromDataUrl(url))
      return
    }
    state.pendingIcons[target] = { image, width:image.naturalWidth, height:image.naturalHeight }
    $(`${prefix}IconDecisionText`).textContent = `This image is ${image.naturalWidth}×${image.naturalHeight}. Icons must be 40×40. Crop from the center and resize?`
    $(`${prefix}IconDecision`).hidden = false
  } catch (error) {
    toast('Failed to read icon', error.message)
  }
}

function resizePendingIcon(target) {
  const prefix = target === 'setting' ? 'setting' : 'new'
  const pending = state.pendingIcons[target]
  if (!pending) return
  const canvas = document.createElement('canvas')
  canvas.width = 40
  canvas.height = 40
  const context = canvas.getContext('2d')
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  const side = Math.min(pending.width, pending.height)
  const sourceX = Math.floor((pending.width - side) / 2)
  const sourceY = Math.floor((pending.height - side) / 2)
  context.clearRect(0, 0, 40, 40)
  context.drawImage(pending.image, sourceX, sourceY, side, side, 0, 0, 40, 40)
  const url = canvas.toDataURL('image/png')
  setAcceptedIcon(target, base64FromDataUrl(url))
  state.pendingIcons[target] = null
  $(`${prefix}IconDecision`).hidden = true
}

function cancelPendingIcon(target) {
  const prefix = target === 'setting' ? 'setting' : 'new'
  state.pendingIcons[target] = null
  $(`${prefix}IconDecision`).hidden = true
  $(`${prefix}IconFile`).value = ''
  const current = acceptedIcon(target)
  setIconPreview(target, current, current ? 'Current icon: 40×40 PNG' : 'Choose another PNG image')
}

async function refreshServerTime() {
  try {
    const data = await api('/api/time')
    $('serverTime').textContent = data.displayTime
  } catch {
    $('serverTime').textContent = '--:--'
  }
}

$('searchInput').addEventListener('input', renderApps)
$('appRows').addEventListener('click', (event) => {
  const edit = event.target.closest('[data-edit]')
  const download = event.target.closest('[data-download]')
  if (edit) openEditor(edit.dataset.edit)
  if (download && !download.disabled) window.open(`/api/apps/${encodeURIComponent(download.dataset.download)}/download`, '_blank')
})
document.querySelectorAll('[data-file]').forEach((button) => button.addEventListener('click', () => selectFile(button.dataset.file)))
$('codeEditor').addEventListener('input', () => { $('saveState').textContent = 'Unsaved'; updateLines() })
$('saveButton').addEventListener('click', () => saveCurrent())
$('publishButton').addEventListener('click', publishCurrent)
$('downloadButton').addEventListener('click', () => { if (state.current?.publishedVersion) window.open(`/api/apps/${encodeURIComponent(state.current.id)}/download`, '_blank') })
$('backButton').addEventListener('click', async () => {
  $('editorView').classList.remove('active')
  $('listView').classList.add('active')
  $('breadcrumb').innerHTML = 'Workspace / <b>Micro Apps</b>'
  await loadApps()
})
$('newAppButton').addEventListener('click', () => {
  state.newIconData = ''
  state.pendingIcons.new = null
  $('newAppForm').reset()
  $('newIconDecision').hidden = true
  setIconPreview('new', '', 'Any PNG can be cropped and resized to 40×40')
  $('newAppModal').hidden = false
  $('newName').focus()
})
$('cancelNewButton').addEventListener('click', () => { $('newAppModal').hidden = true })
$('settingColor').addEventListener('input', () => { $('editorBadge').style.background = $('settingColor').value; $('saveState').textContent = 'Unsaved' })
$('settingIconFile').addEventListener('change', (event) => handleIconFile('setting', event.target.files[0]))
$('newIconFile').addEventListener('change', (event) => handleIconFile('new', event.target.files[0]))
$('settingIconResize').addEventListener('click', () => resizePendingIcon('setting'))
$('newIconResize').addEventListener('click', () => resizePendingIcon('new'))
$('settingIconCancelResize').addEventListener('click', () => cancelPendingIcon('setting'))
$('newIconCancelResize').addEventListener('click', () => cancelPendingIcon('new'))
$('newAppForm').addEventListener('submit', async (event) => {
  event.preventDefault()
  if (state.pendingIcons.new) {
    toast('Resolve the icon size first', 'Crop and resize it, or choose another image')
    return
  }
  try {
    const payload = {
      name:$('newName').value,
      id:$('newId').value,
      visibility:$('newVisibility').value,
      iconData:state.newIconData,
      color:$('newColor').value
    }
    const data = await api('/api/apps', { method:'POST', body:JSON.stringify(payload) })
    $('newAppModal').hidden = true
    setEditor(data.app)
    toast('App created', 'You can start writing code')
  } catch (error) {
    toast('Create failed', error.message)
  }
})

await Promise.all([loadApps(), refreshServerTime()])
setInterval(refreshServerTime, 60000)
