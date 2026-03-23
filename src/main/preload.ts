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
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    if (RECEIVE_CHANNELS.includes(channel)) {
      ipcRenderer.on(channel, (_event, ...args) => callback(...args));
    }
  },
});
