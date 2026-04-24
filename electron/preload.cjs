const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("cardTracker", {
  loadSnapshot: () => ipcRenderer.invoke("cardtracker:load-snapshot"),
  saveRecord: (row) => ipcRenderer.invoke("cardtracker:save-record", row),
  importRows: (rows) => ipcRenderer.invoke("cardtracker:import-rows", rows)
});
