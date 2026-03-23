export interface AppSettings {
  countdownDuration: number;  // seconds
  breakDuration: number;      // seconds
  launchOnLogin: boolean;
  shakeOnAlert: boolean;
  soundOnAlert: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  countdownDuration: 20,
  breakDuration: 10,
  launchOnLogin: false,
  shakeOnAlert: true,
  soundOnAlert: true,
};
