const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    onStartRecording: (callback) => ipcRenderer.on('start-recording', callback),
    onStopRecording: (callback) => ipcRenderer.on('stop-recording', callback)
});
