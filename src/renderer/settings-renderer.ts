const cdH = document.getElementById('countdown-h') as HTMLInputElement;
const cdM = document.getElementById('countdown-m') as HTMLInputElement;
const cdS = document.getElementById('countdown-s') as HTMLInputElement;
const brH = document.getElementById('break-h') as HTMLInputElement;
const brM = document.getElementById('break-m') as HTMLInputElement;
const brS = document.getElementById('break-s') as HTMLInputElement;
const waEnabledEl = document.getElementById('walkaway-enabled') as HTMLInputElement;
const waIntH = document.getElementById('walkaway-interval-h') as HTMLInputElement;
const waIntM = document.getElementById('walkaway-interval-m') as HTMLInputElement;
const waIntS = document.getElementById('walkaway-interval-s') as HTMLInputElement;
const waDurH = document.getElementById('walkaway-duration-h') as HTMLInputElement;
const waDurM = document.getElementById('walkaway-duration-m') as HTMLInputElement;
const waDurS = document.getElementById('walkaway-duration-s') as HTMLInputElement;
const loginEl = document.getElementById('launch-login') as HTMLInputElement;
const shakeEl = document.getElementById('shake-alert') as HTMLInputElement;
const soundEl = document.getElementById('sound-alert') as HTMLInputElement;
const soundBreakEndEl = document.getElementById('sound-break-end') as HTMLInputElement;
const saveBtn = document.getElementById('save-btn') as HTMLButtonElement;
const cancelBtn = document.getElementById('cancel-btn') as HTMLButtonElement;

const walkAwayInputs = [waIntH, waIntM, waIntS, waDurH, waDurM, waDurS];
const walkAwayGroups = [
  document.getElementById('walkaway-interval-group'),
  document.getElementById('walkaway-duration-group'),
];

function syncWalkAwayEnabled(): void {
  const on = waEnabledEl.checked;
  walkAwayInputs.forEach((el) => { el.disabled = !on; });
  walkAwayGroups.forEach((g) => g?.classList.toggle('disabled', !on));
}

waEnabledEl.addEventListener('change', syncWalkAwayEnabled);

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

    const waInt = secondsToHMS(settings.walkAwayInterval);
    waIntH.value = String(waInt.h);
    waIntM.value = String(waInt.m);
    waIntS.value = String(waInt.s);

    const waDur = secondsToHMS(settings.walkAwayDuration);
    waDurH.value = String(waDur.h);
    waDurM.value = String(waDur.m);
    waDurS.value = String(waDur.s);

    waEnabledEl.checked = !!settings.walkAwayEnabled;
    syncWalkAwayEnabled();

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
  const walkAwayInterval = hmsToSeconds(
    clampInt(waIntH.value, 0, 23, 1),
    clampInt(waIntM.value, 0, 59, 0),
    clampInt(waIntS.value, 0, 59, 0),
  );
  const walkAwayDuration = hmsToSeconds(
    clampInt(waDurH.value, 0, 23, 0),
    clampInt(waDurM.value, 0, 59, 5),
    clampInt(waDurS.value, 0, 59, 0),
  );

  const settings = {
    countdownDuration: Math.max(1, countdown),
    breakDuration: Math.max(1, breakDur),
    walkAwayEnabled: waEnabledEl.checked,
    walkAwayInterval: Math.max(1, walkAwayInterval),
    walkAwayDuration: Math.max(1, walkAwayDuration),
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
