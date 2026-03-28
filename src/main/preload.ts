import { contextBridge, ipcRenderer } from 'electron';

const SEND_CHANNELS = [
  'settings:get',
  'settings:set',
  'settings:open',
  'settings:close',
  'app:quit',
];

const RECEIVE_CHANNELS = [
  'settings:updated',
  'settings:current',
  'timer:pause',
  'timer:resume',
];

contextBridge.exposeInMainWorld('icare', {
  send: (channel: string, ...args: unknown[]) => {
    if (SEND_CHANNELS.includes(channel)) {
      ipcRenderer.send(channel, ...args);
    }
  },
  on: (channel: string, callback: (...args: unknown[]) => void): (() => void) | undefined => {
    if (RECEIVE_CHANNELS.includes(channel)) {
      const handler = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => callback(...args);
      ipcRenderer.on(channel, handler);
      return () => ipcRenderer.removeListener(channel, handler);
    }
    return undefined;
  },
});
