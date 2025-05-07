const { app, BrowserWindow, globalShortcut, ipcMain  } = require('electron');
const path = require('path');
const { fork } = require('child_process');

let mainWindow;
let serverProcess;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        // frame: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    mainWindow.setContentProtection(true);

    // Swap scrren recorder visibility (Ctrl+4)
    globalShortcut.register('CommandOrControl+4', () => {
        console.log('Global shortcut triggered: Ctrl+4' + ' Win visible to recorders?: ' + mainWindow.isVisible());
        if (mainWindow.isVisible()) {
            mainWindow.hide();
        } else {
            mainWindow.show();
        }
    });

    // Start the server as a child process
    serverProcess = fork(path.join(__dirname, 'server', 'server.js'));

    // Load the local HTML file
    mainWindow.loadFile(path.join(__dirname, 'index.html'));

    // Optional: Open DevTools
    // mainWindow.webContents.openDevTools();

    mainWindow.on('closed', () => {
        mainWindow = null;
        if (serverProcess) serverProcess.kill();
    });
}

app.whenReady().then(() => {
    createWindow();

    // Start recording shortcut (Ctrl+2)
    globalShortcut.register('CommandOrControl+2', () => {
        console.log('Global shortcut triggered: CommandOrControl+2');
        mainWindow.webContents.send('start-recording');
    });

    // Stop recording shortcut (Ctrl+3)
    globalShortcut.register('CommandOrControl+3', () => {
        console.log('Global shortcut triggered: CommandOrControl+2');
        mainWindow.webContents.send('stop-recording');
    });



    // Register global shortcut
    const ret = globalShortcut.register('CommandOrControl+Shift+X', () => {
        console.log('Global shortcut triggered: CommandOrControl+Shift+X');

        if (mainWindow) {
            mainWindow.webContents.send('toggle-recording');
        }
    });

    if (!ret) {
        console.log('Global shortcut registration failed');
    }

    console.log('Global shortcut registered:', globalShortcut.isRegistered('CommandOrControl+Shift+X'));
});

// Unregister shortcut when all windows are closed
app.on('will-quit', () => {
    globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (mainWindow === null) createWindow();
});

// Handle IPC calls for getting the window's position
ipcMain.handle('get-window-position', (event) => {
    // Get the window from which this message originated
    let currentWindow = BrowserWindow.fromWebContents(event.sender);
    return currentWindow.getPosition();
});

// Handle IPC calls to move the window
ipcMain.on('move-window', (event, newPosition) => {
    let currentWindow = BrowserWindow.fromWebContents(event.sender);
    if (currentWindow) {
        currentWindow.setPosition(newPosition.x, newPosition.y);
    }
});
