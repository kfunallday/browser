const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Force Google DNS-over-HTTPS globally before startup
app.commandLine.appendSwitch('dns-over-https-templates', 'https://dns.google/dns-query');

function createWindow(isIncognito = false) {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    // This adds your app icon to the window taskbar/dock!
    icon: path.join(__dirname, 'icon256.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true, 
      partition: isIncognito ? `incognito-${Date.now()}` : 'persist:default'
    }
  });

  win.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();

  // Intercept all webview popup attempts globally and route them to tabs
  app.on('web-contents-created', (event, contents) => {
    if (contents.getType() === 'webview') {
      contents.setWindowOpenHandler((details) => {
        // Find which window this webview belongs to
        const parentWin = BrowserWindow.fromWebContents(contents);
        if (parentWin) {
          // Send the URL straight to that specific window's tab bar
          parentWin.webContents.send('open-link-in-tab', details.url);
        }
        // Deny Electron's default behavior of spawning a new native window
        return { action: 'deny' };
      });
    }
  });

  ipcMain.on('create-new-window', (event, { incognito }) => {
    createWindow(incognito);
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});