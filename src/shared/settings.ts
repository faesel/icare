export interface AppSettings {
  countdownDuration: number;  // seconds
  breakDuration: number;      // seconds
  walkAwayEnabled: boolean;
  walkAwayInterval: number;   // seconds — how often to take a stretch break
  walkAwayDuration: number;   // seconds — how long the stretch break lasts
  launchOnLogin: boolean;
  shakeOnAlert: boolean;
  soundOnAlert: boolean;
  soundOnBreakEnd: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  countdownDuration: 1200,
  breakDuration: 20,
  walkAwayEnabled: false,
  walkAwayInterval: 3600,
  walkAwayDuration: 600,
  launchOnLogin: false,
  shakeOnAlert: true,
  soundOnAlert: true,
  soundOnBreakEnd: true,
};
