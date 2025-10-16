import eid from '../../dxmodules/dxEid.js'

const eidDriver = {
    id: "eid",
    active: function (sn, version, mac, codeMsg) {
        return eid.active(sn, version, mac, codeMsg)
    },
    getVerion: function () {
        return eid.getVersion()
    }
}

export default eidDriver

