const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// REMOVED the old commandLine switch so it doesn't conflict with our strict secure settings

function createWindow(isIncognito = false) {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
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
  // Enforce strict, redundant DoH with multi-provider backup
  app.configureHostResolver({
    secureDnsMode: 'secure', // Keeps the "privacy kill-switch" active
    secureDnsServers: [
      'https://dns.google/dns-query{?dns}',        // 1. Primary: Google DoH
      'https://cloudflare-dns.com/dns-query',       // 2. Secondary: Cloudflare DoH
      'https://dns.quad9.net/dns-query'             // 3. Tertiary: Quad9 DoH (Redundancy)
    ]
  });

  createWindow();

  // Intercept all webview popup attempts globally and route them to tabs
  app.on('web-contents-created', (event, contents) => {
    if (contents.getType() === 'webview') {
      contents.setWindowOpenHandler((details) => {
        const parentWin = BrowserWindow.fromWebContents(contents);
        if (parentWin) {
          parentWin.webContents.send('open-link-in-tab', details.url);
        }
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