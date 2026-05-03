const cdH = document.getElementById('countdown-h') as HTMLInputElement;
const cdM = document.getElementById('countdown-m') as HTMLInputElement;
const cdS = document.getElementById('countdown-s') as HTMLInputElement;
const brH = document.getElementById('break-h') as HTMLInputElement;
const brM = document.getElementById('break-m') as HTMLInputElement;
const brS = document.getElementById('break-s') as HTMLInputElement;
const loginEl = document.getElementById('launch-login') as HTMLInputElement;
const shakeEl = document.getElementById('shake-alert') as HTMLInputElement;
const soundEl = document.getElementById('sound-alert') as HTMLInputElement;
const soundBreakEndEl = document.getElementById('sound-break-end') as HTMLInputElement;
const saveBtn = document.getElementById('save-btn') as HTMLButtonElement;
const cancelBtn = document.getElementById('cancel-btn') as HTMLButtonElement;

const api = (window as any).icare;

function secondsToHMS(total: number): { h: number; m: number; s: number } {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return { h, m, s };
}

function hmsToSeconds(h: number, m: number, s: number): number {
  return h * 3600 + m * 60 + s;
}

function clampInt(val: string, min: number, max: number, fallback: number): number {
  const n = parseInt(val, 10);
  if (isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

// Load current settings
if (api) {
  api.send('settings:get');
  api.on('settings:current', (settings: any) => {
    const cd = secondsToHMS(settings.countdownDuration);
    cdH.value = String(cd.h);
    cdM.value = String(cd.m);
    cdS.value = String(cd.s);

    const br = secondsToHMS(settings.breakDuration);
    brH.value = String(br.h);
    brM.value = String(br.m);
    brS.value = String(br.s);

    loginEl.checked = !!settings.launchOnLogin;
    shakeEl.checked = settings.shakeOnAlert !== false;
    soundEl.checked = settings.soundOnAlert !== false;
    soundBreakEndEl.checked = settings.soundOnBreakEnd !== false;
  });
}

saveBtn.addEventListener('click', () => {
  const countdown = hmsToSeconds(
    clampInt(cdH.value, 0, 23, 0),
    clampInt(cdM.value, 0, 59, 0),
    clampInt(cdS.value, 0, 59, 20),
  );
  const breakDur = hmsToSeconds(
    clampInt(brH.value, 0, 23, 0),
    clampInt(brM.value, 0, 59, 0),
    clampInt(brS.value, 0, 59, 10),
  );

  const settings = {
    countdownDuration: Math.max(1, countdown),
    breakDuration: Math.max(1, breakDur),
    launchOnLogin: loginEl.checked,
    shakeOnAlert: shakeEl.checked,
    soundOnAlert: soundEl.checked,
    soundOnBreakEnd: soundBreakEndEl.checked,
  };
  if (api) {
    api.send('settings:set', settings);
  }
});

cancelBtn.addEventListener('click', () => {
  if (api) {
    api.send('settings:close');
  }
});

// Display version
const versionEl = document.getElementById('version-info');
if (api && versionEl) {
  versionEl.textContent = `v${api.getVersion()}`;
}

// Close on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (api) {
      api.send('settings:close');
    }
  }
});
