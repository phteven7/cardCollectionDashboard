const path = require("node:path");
const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron");
const { registerDatabaseHandlers } = require("./database.cjs");
const { startServer } = require("../launcher/server.cjs");

let mainWindow = null;
let serverHandle = null;

function createWindow(url) {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: "#f4f4f5",
    autoHideMenuBar: true,
    title: "CardTracker",
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, "preload.cjs"),
      sandbox: false
    }
  });

  mainWindow.loadURL(url);
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

async function boot() {
  try {
    registerDatabaseHandlers(app, ipcMain);
    ipcMain.handle("cardtracker:open-external", (_event, url) => shell.openExternal(url));
    serverHandle = await startServer({ open: false });
    createWindow(serverHandle.url);
  } catch (error) {
    dialog.showErrorBox(
      "CardTracker failed to start",
      error instanceof Error ? error.message : "Unknown startup error."
    );
    app.quit();
  }
}

app.whenReady().then(boot);

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0 && serverHandle) {
    createWindow(serverHandle.url);
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", async (event) => {
  if (!serverHandle) {
    return;
  }

  const handle = serverHandle;
  serverHandle = null;
  event.preventDefault();

  try {
    await handle.close();
  } finally {
    app.exit();
  }
});
