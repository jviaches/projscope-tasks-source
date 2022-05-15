import {
  app,
  dialog,
  BrowserWindow,
  Menu,
  screen,
  ipcMain,
  MenuItem,
} from "electron";
import * as path from "path";
import * as url from "url";
import { autoUpdater } from "electron-updater";

//const { autoUpdater } = require('electron-updater');

let win: BrowserWindow = null;
const args = process.argv.slice(1), serve = args.some((val) => val === "--serve");
function createWindow(): BrowserWindow {
  const size = screen.getPrimaryDisplay().workAreaSize;

  // Create the browser window.
  win = new BrowserWindow({
    x: 0,
    y: 0,
    width: size.width,
    height: size.height,
    webPreferences: {
      nodeIntegration: true,
      allowRunningInsecureContent: serve,
      contextIsolation: false, // false if you want to run 2e2 test with Spectron
      enableRemoteModule: true, // true if you want to run 2e2 test  with Spectron or use remote module in renderer context (ie. Angular)
    },
    icon: "./src/assets/icons/favicon.ico",
  });

  const menu = Menu.buildFromTemplate([
    {
      label: "File",
      submenu: [
        {
          label: "New",
          click(item, focusedWindow) {
            win.webContents.send("new-project", "");
          },
        },
        {
          label: "Open",
          click(item, focusedWindow) {
            win.webContents.send("open-project", "");
          },
        },
        { type: "separator" },
        {
          label: "Save",
          enabled: false,
          click(item, focusedWindow) {
            win.webContents.send("save-project", "");
          },
        },
        {
          label: "Save As",
          enabled: false,
          click(item, focusedWindow) {
            win.webContents.send("save-as-project", "");
          },
        },
        // {
        //   label: "Autosave",
        //   type: "checkbox",
        //   checked: false,
        //   click(item, focusedWindow) {
        //     win.webContents.send("auto-save-project", item.checked);
        //   },
        // },
        { type: "separator" },
        {
          label: "Close",
          enabled: false,
          click(item, focusedWindow) {
            win.webContents.send("close-project", item.checked);
          },
        },
        { type: "separator" },
        {
          label: "Exit",
          click(item, focusedWindow) {
            win.webContents.send("exit", item.checked);
          },
        },
      ],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "About",
          click(item, focusedWindow) {
            win.webContents.send("about", "");
          },
        },
      ],
    },
  ]);
  Menu.setApplicationMenu(menu);

  if (serve) {
    win.webContents.openDevTools();

    require("electron-reload")(__dirname, {
      electron: require(`${__dirname}/node_modules/electron`),
    });
    win.loadURL("http://localhost:4200");
  } else {
    win.loadURL(
      url.format({
        pathname: path.join(__dirname, "dist/index.html"),
        protocol: "file:",
        slashes: true,
      })
    );
  }

  // Emitted when the window is closed.
  win.on("close", e => {
    if (win) {
      e.preventDefault();
      win.webContents.send("exit", null);
    }

  });

  win.once("ready-to-show", () => {
    setInterval(() => {
      autoUpdater.checkForUpdates().catch( ()=> {

      });
    }, 10009*60*60*24) // once a day
  });

  ipcMain.on('restart_app', () => {
    app.removeAllListeners("window-all-closed");
    app.removeAllListeners("exit");
    app.removeAllListeners("close");

    autoUpdater.quitAndInstall();
    app.relaunch();
    app.exit(0);
  });


  autoUpdater.on('checking-for-update', () => {
    //Start checking for new version
    //Here you can remind users that they are looking for a new version
    //win.webContents.send("checking-for-update", "");
  });

  autoUpdater.on('update-available', (info) => {
    //New version detected
    //Remind users that a new version has been found
    //win.webContents.send("update-available", "");
  });

  autoUpdater.on('update-not-available', (info) => {
    //No new version detected
    //Remind the user that the current version is the latest version and does not need to be updated
    //win.webContents.send('update-not-available', "");
  });

  autoUpdater.on('error', (err) => {
    //Automatic upgrade encountered an error
    //Execute the original upgrade logic
    //win.webContents.send("update-error", "");
  });

  autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName) => {
    win.webContents.send("update-downloaded", releaseNotes, releaseName);
  })


  win.webContents.on("ipc-message", (event, input, args) => {
    if (input === "app-close") {
      // bypass all listeners
      app.exit(0);
    }

    if (input === "close-project-enable") {
      const closeMenu = Menu.getApplicationMenu().items[0].submenu.items.find(
        (item) => item.label === "Close"
      );
      const saveMenu = Menu.getApplicationMenu().items[0].submenu.items.find(
        (item) => item.label === "Save"
      );
      const saveAsMenu = Menu.getApplicationMenu().items[0].submenu.items.find(
        (item) => item.label === "Save As"
      );

      if (args === true) {
        closeMenu.enabled = true;
        saveMenu.enabled = true;
        saveAsMenu.enabled = true;
      } else {
        closeMenu.enabled = false;
        saveMenu.enabled = false;
        saveAsMenu.enabled = false;
      }

      Menu.setApplicationMenu(menu);

      // return dialog.showErrorBox(
      //   input,
      //   JSON.stringify(args)
      // );
    }
  });

  return win;
}

try {
  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  // Added 400 ms to fix the black background issue while using transparent window. More detais at https://github.com/electron/electron/issues/15947
  app.on("ready", () => setTimeout(createWindow, 400));
  // app.on("ready", () => {
  //   setTimeout(createWindow, 400)
  //   autoUpdater.autoDownload = false;
  //   setTimeout(autoUpdater.checkForUpdates, 1000);
  // });

  // Quit when all windows are closed.
  app.on("window-all-closed", () => {

    app.removeAllListeners();
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  app.on("activate", () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (win === null) {
      createWindow();
    }
  });
} catch (e) {
  // Catch Error
  // throw e;
}
