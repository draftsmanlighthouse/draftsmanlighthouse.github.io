class Draftsman {
    static taskMap = new Map();
    static loopRunning = false;

    static registerTask(f, delayInSeconds = 1) {
        const delayInMs = delayInSeconds * 1000;
        const lastRun = 0;
        Draftsman.taskMap.set(f, { delay: delayInMs, lastRun });

        if (!Draftsman.loopRunning) {
            Draftsman.startLoop();
        }
    }

    static async startLoop() {
        Draftsman.loopRunning = true;

        while (Draftsman.taskMap.size > 0) {
            const now = Date.now(); // Huidige tijd

            for (let [task, { delay, lastRun }] of Draftsman.taskMap.entries()) {
                if (now - lastRun >= delay) {
                    try {
                        await task(); // Voer de taak uit
                    } catch (error) {
                        console.error("Error in background task:", error);
                    }
                    Draftsman.taskMap.set(task, { delay, lastRun: now });
                }
            }

            await Draftsman.sleep(100);
        }

        Draftsman.loopRunning = false;
    }

    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    static uuidv4() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    static unregisterTask(f) {
        Draftsman.taskMap.delete(f);
    }
}