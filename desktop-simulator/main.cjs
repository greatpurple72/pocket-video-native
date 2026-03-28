const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

app.setName('Pocket Video Desktop Simulator');
app.setPath('userData', path.join(app.getPath('appData'), 'PocketVideoDesktopSimulator'));
app.commandLine.appendSwitch('disable-http-cache');

function createWindow() {
  const window = new BrowserWindow({
    width: 1480,
    height: 980,
    minWidth: 1100,
    minHeight: 760,
    backgroundColor: '#f4efe6',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      sandbox: false,
      webviewTag: true,
    },
  });

  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.loadFile(path.join(__dirname, 'renderer.html'));
  return window;
}

app.whenReady().then(() => {
  ipcMain.handle('desktop-user-data-path', () => app.getPath('userData'));
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
