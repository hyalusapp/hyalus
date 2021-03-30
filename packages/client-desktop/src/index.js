const {
  app,
  BrowserWindow,
  nativeTheme,
  Tray,
  Menu,
  ipcMain,
} = require("electron");
const path = require("path");
const url = require("url");
const { autoUpdater } = require("electron-updater");
const { version } = require("../package");

const lock = app.requestSingleInstanceLock();

if (!lock) {
  app.quit();
}

app.commandLine.appendSwitch("no-sandbox");
app.commandLine.appendSwitch("ignore-gpu-blacklist");
app.commandLine.appendSwitch("enable-native-gpu-memory-buffers");
app.commandLine.appendSwitch("enable-media-foundation-video-capture");
app.commandLine.appendSwitch("zero-copy-video-capture");
app.commandLine.appendSwitch("enable-accelerated-video-decode");
app.commandLine.appendSwitch("enable-accelerated-video-encode");

//prevent scary messages from flags above.
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 1;

let mainWindow;
let quitting;
let tray;

const start = () => {
  mainWindow = new BrowserWindow({
    show: false,
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      experimentalFeatures: true,
    },
    frame: false,
  });

  const entryPath = path.join(__dirname, "../build/index.html");
  const entryUrl = `${url.pathToFileURL(entryPath)}#/app`;

  mainWindow.loadURL(entryUrl);
  mainWindow.removeMenu();

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.webContents.on("before-input-event", (e, input) => {
    if (input.type !== "keyDown") {
      return;
    }

    if (input.key === "F12") {
      mainWindow.webContents.openDevTools();
    }

    if (input.key === "F5") {
      mainWindow.reload();
    }
  });

  mainWindow.on("close", (e) => {
    if (!quitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  setTimeout(() => {
    if (mainWindow) {
      mainWindow.webContents.session.flushStorageData();
    }
  }, 1000 * 5); //5s

  tray = new Tray(path.join(__dirname, "../resources/icon.png"));

  tray.setToolTip(`Hyalus ${version}`);

  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: "Open",
        click() {
          mainWindow.show();
        },
      },
      {
        label: "Restart",
        click() {
          app.relaunch();
          app.exit();
        },
      },
      {
        label: "Quit",
        click() {
          app.exit();
        },
      },
    ])
  );

  tray.on("click", () => {
    mainWindow.show();
  });
};

app.on("ready", () => {
  nativeTheme.themeSource = "dark";

  if (process.env.DEV) {
    start();
    return;
  }

  autoUpdater.checkForUpdates();
});

app.on("second-instance", () => {
  if (mainWindow) {
    mainWindow.show();
  }
});

app.on("before-quit", () => {
  quitting = true;
});

autoUpdater.on("update-available", () => {
  autoUpdater.downloadUpdate();
});

autoUpdater.on("update-downloaded", () => {
  autoUpdater.quitAndInstall();
});

autoUpdater.on("update-not-available", () => {
  start();
});

ipcMain.on("close", () => {
  mainWindow.close();
});
