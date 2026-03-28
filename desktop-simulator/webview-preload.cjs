const { ipcRenderer } = require('electron');

window.__desktopHostSend = (payload) => {
  ipcRenderer.sendToHost('desktop-message', payload);
};
