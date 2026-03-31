import dxui from '../../dxmodules/dxUi.js'
import std from '../../dxmodules/dxStd.js'
import UIManager from '../UIManager.js'
import dxDriver from '../../dxmodules/dxDriver.js'

const page3 = {
  init: function () {
    const root = dxui.View.build(std.genRandomStr(10), UIManager.getRoot())
    root.setSize(dxDriver.DISPLAY.HEIGHT, dxDriver.DISPLAY.WIDTH)
    root.radius(0)
    root.borderWidth(0)
    root.padAll(0)
    root.scroll(false)
    root.bgColor(0x000000)

    const title = dxui.Label.build('page3_title', root)
    title.text('GIF Showcase')
    title.textFont(UIManager.font(24, dxui.Utils.FONT_STYLE.BOLD))
    title.textColor(0xffffff)
    title.align(dxui.Utils.ALIGN.TOP_MID, 0, 12)

    const self = this
    function mountGif(uid, parent, w, h, align, x, y, src) {
      const wrap = dxui.View.build(uid + '_wrap', parent)
      wrap.setSize(w, h)
      wrap.radius(0)
      wrap.borderWidth(0)
      wrap.padAll(0)
      wrap.scroll(false)
      wrap.bgOpa(0)
      wrap.align(align, x, y)

      // Note: GIF playback uses NativeGif and binds to wrap.obj
      const gg = new dxui.Utils.GG.NativeGif({ uid }, wrap.obj)
      gg.lvGifSetSrc(src)
      // Pause by default: avoid decoding cost when the page is hidden
      try { gg.lvGifPause() } catch (e) { }
      self._gif = gg
      return wrap
    }

    mountGif('page3_gif_iso', root, 520, 520, dxui.Utils.ALIGN.CENTER, 0, 40, '/app/code/resource/image/anim/Isopoly_05.gif')

    root.hide()
    return root
  },

  onShow: function () {
    try { this._gif && this._gif.lvGifResume && this._gif.lvGifResume() } catch (e) { }
  },

  onHide: function () {
    try { this._gif && this._gif.lvGifPause && this._gif.lvGifPause() } catch (e) { }
  }
}

export default page3
