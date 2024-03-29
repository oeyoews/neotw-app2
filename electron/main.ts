import {
  ipcMain,
  Tray,
  dialog,
  Menu,
  nativeImage,
  BrowserView,
  app,
  BrowserWindow,
} from 'electron';

import path from 'node:path';

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.js
// │
process.env.DIST = path.join(__dirname, '../dist');
process.env.VITE_PUBLIC = app.isPackaged
  ? process.env.DIST
  : path.join(process.env.DIST, '../public');

let win: BrowserWindow;
// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
// const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
const iconpath = path.join(process.env.VITE_PUBLIC, 'vite.png');
const port = '8000';
const baseurl = `http://localhost:${port}`;
let tray = null;
const icon = nativeImage.createFromPath(iconpath);

function createTiddlyWikiWindow() {
  win = new BrowserWindow({
    // show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      spellcheck: true,
    },
    width: 1200,
    height: 800,
    // frame: true,
    icon,
    titleBarStyle: 'customButtonsOnHover',
    autoHideMenuBar: true,
    center: true,
    useContentSize: true,
    resizable: true,
    // alwaysOnTop: true,
    // fullscreen: true,
    titleBarOverlay: {
      color: '#2f3241',
      symbolColor: '#74b1be',
      height: 20,
    },
  });

  const view = new BrowserView({});
  win.setBrowserView(view);
  const { width, height } = win.getBounds();
  view.setBounds({ x: 0, y: 0, width, height });
  view.webContents.on('did-finish-load', () => {
    view.webContents.openDevTools({ mode: 'right' });
    view.webContents.focus(); // 修复光标问题
  });

  // app.commandLine.appendSwitch('--disable-web-security');
  view.webContents.loadURL(baseurl); // win.loadurl 无法使用 tiddlywiki 内的快捷键
  // view.webContents.addListener('did-create-window', () => {
  //   console.log('cre');
  // });

  // tray
  tray = new Tray(icon);

  win.addListener('focus', () => {
    view.webContents.focus();
  });

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '关闭',
      type: 'normal',
      click: () => win.destroy(),
      // icon
    },
  ]);
  tray.setToolTip('neotw');
  tray.setTitle('neotw');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    win.isVisible() ? win.hide() : win.show();
  });

  // // 监听窗口大小变化
  win.on('resize', () => {
    const bounds = win.getBounds();
    view.setBounds({ x: 0, y: 0, width: bounds.width, height: bounds.height });
  });

  win.on('close', (e) => {
    e.preventDefault();

    const res = dialog.showMessageBoxSync({
      type: 'warning',
      message: '确定要退出吗？',
      buttons: ['确定', '取消'],
      cancelId: 1,
    });

    if (res === 0) {
      win.destroy();
    }
  });
}

// app.whenReady().then(createWindow);
app.whenReady().then(createTiddlyWikiWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
    // @ts-expect-error
    win = null;
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createTiddlyWikiWindow();
  }
});

// security
// app.commandLine.appendSwitch('content', 'true');

// 拦截 确认提示框
// 使用 dialog 代替
app.on('web-contents-created', (_, contents) => {
  contents.on('before-input-event', (_, input) => {
    if (input.type === 'keyDown' && input.key === 'Enter') {
      // input.preventDefault();
    }
  });
});
