/* eslint global-require: 0, flowtype-errors/show-errors: 0 */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build-main`, this file is compiled to
 * `./app/main.prod.js` using webpack. This gives us some performance wins.
 *
 * @flow
 */
import { app, BrowserWindow, crashReporter, ipcMain } from 'electron';
import fs from 'fs';
import minimist from 'minimist';
import log from 'electron-log';
import { autoUpdater } from 'electron-updater';
import path from 'path';
import store from './localStore';
import { THEMES } from './constants';
import MenuBuilder from './menu';
import cli from './utils/cli';
import { DATAPATH } from './constants';

// This gets rid of this: https://github.com/electron/electron/issues/13186
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = true;

let mainWindow = null;
let splash = null;
log.log(`Config store: ${store.path}`);
const settings = store.get('settings') ? store.get('settings').theme : THEMES;
const primaryColor =
  settings && settings.primary ? settings.primary : '#2c3e50';
const secondaryColor =
  settings && settings['secondary-color-1']
    ? settings['secondary-color-1']
    : '#34495e';

if (minimist(process.argv.slice(1)).i) {
  cli(process.argv, () => app.quit());
} else {
  if (process.env.NODE_ENV === 'production') {
    const sourceMapSupport = require('source-map-support');
    sourceMapSupport.install();
  }

  if (
    process.env.NODE_ENV === 'development' ||
    process.env.DEBUG_PROD === 'true'
  ) {
    require('electron-debug')({ enabled: true });
  }

  const installExtensions = async () => {
    const installer = require('electron-devtools-installer');
    const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
    const extensions = ['REACT_DEVELOPER_TOOLS', 'REDUX_DEVTOOLS'];

    return Promise.all(
      extensions.map(name => installer.default(installer[name], forceDownload))
    ).catch(log.error);
  };

  /**
   * Add event listeners...
   */

  app.on('window-all-closed', () => {
    // Respect the OSX convention of having the application in memory even
    // after all windows have been closed
    app.quit();
  });

  app.on('ready', async () => {
    if (
      process.env.NODE_ENV === 'development' ||
      process.env.DEBUG_PROD === 'true'
    ) {
      await installExtensions();
    }

    // create a new `splash`-WindowF
    splash = new BrowserWindow({
      show: true,
      width: 850,
      height: 730,
      frame: false,
      backgroundColor: secondaryColor,
      resizable: false
    });
    splash.colors = {
      primaryColor,
      secondaryColor
    };
    splash.loadURL(`file://${__dirname}/splash.html`);

    mainWindow = new BrowserWindow({
      show: false,
      width: 850,
      height: 730,
      minHeight: 600,
      minWidth: 780,
      frame: false,
      backgroundColor: secondaryColor
    });

    mainWindow.webContents.on('new-window', (e, url) => {
      e.preventDefault();
      require('electron').shell.openExternal(url);
    });

    mainWindow.webContents.on('will-navigate', (e, url) => {
      if (
        process.env.NODE_ENV !== 'development' &&
        process.env.DEBUG_PROD !== 'true'
      ) {
        e.preventDefault();
        require('electron').shell.openExternal(url);
      }
    });

    mainWindow.loadURL(`file://${__dirname}/app.html`);

    // @TODO: Use 'ready-to-show' event
    //        https://github.com/electron/electron/blob/master/docs/api/browser-window.md#using-ready-to-show-event
    mainWindow.webContents.on('did-finish-load', () => {
      if (!mainWindow) {
        throw new Error('"mainWindow" is not defined');
      }
      splash.destroy();

      autoUpdater.logger = log;
      autoUpdater.autoDownload = false;

      // Same as for console transport
      log.transports.file.level = 'silly';
      log.transports.file.format = '{h}:{i}:{s}:{ms} {text}';

      // Set approximate maximum log size in bytes. When it exceeds,
      // the archived log will be saved as the log.old.log file
      log.transports.file.maxSize = 5 * 1024 * 1024;

      // Write to this file, must be set before first logging
      log.transports.file.file = path.join(__dirname, '/log.txt');

      // fs.createWriteStream options, must be set before first logging
      // you can find more information at
      // https://nodejs.org/api/fs.html#fs_fs_createwritestream_path_options
      log.transports.file.streamConfig = { flags: 'w' };

      // set existed file stream
      log.transports.file.stream = fs.createWriteStream(path.join(DATAPATH, 'GDLauncher_logs.txt'));

      mainWindow.show();
      mainWindow.focus();
    });

    ipcMain.on('check-for-updates', ev => {
      autoUpdater.checkForUpdates();

      autoUpdater.on('update-available', info => {
        ev.sender.send('update-available');
      });

      autoUpdater.on('update-downloaded', info => {
        ev.sender.send('update-downloaded');
      });
    });

    ipcMain.on('download-updates', () => {
      autoUpdater.downloadUpdate();
    });

    ipcMain.on('apply-updates', () => {
      autoUpdater.quitAndInstall();
    });

    ipcMain.on('open-devTools', () => {
      mainWindow.webContents.openDevTools({ mode: 'undocked' });
    });

    ipcMain.on('setProgressTaskBar', p => {
      mainWindow.setProgressBar(p);
    });

    mainWindow.on('closed', () => {
      mainWindow = null;
    });

    const menuBuilder = new MenuBuilder(mainWindow);
    menuBuilder.buildMenu();
  });
}
