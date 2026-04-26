const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("cardTracker", {
  loadSnapshot: () => ipcRenderer.invoke("cardtracker:load-snapshot"),
  saveRecord: (row) => ipcRenderer.invoke("cardtracker:save-record", row),
  importRows: (rows) => ipcRenderer.invoke("cardtracker:import-rows", rows),
  deleteRecord: (appId) => ipcRenderer.invoke("cardtracker:delete-record", appId),
  openExternal: (url) => ipcRenderer.invoke("cardtracker:open-external", url)
});
