const autoRestartDriver = {
    lastRestartCheck: new Date().getHours(),  // Initialize to current hour instead of 0
    init: function () {
        // std.setInterval(() => {        // Check if restart is needed on the hour
        //     const now = new Date()
        //     const currentHour = now.getHours()
        //     // Only execute when hour equals set value and not the last checked hour
        //     if (currentHour === 3 && currentHour !== this.lastRestartCheck && now.getMinutes() === 0) {
        //         common.systemBrief('reboot')
        //     }
        //     // Update last checked hour
        //     this.lastRestartCheck = currentHour
        // }, 60000)
    }
}

export default autoRestartDriver

