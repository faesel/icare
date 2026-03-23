const countdownEl = document.getElementById('countdown-duration') as HTMLInputElement;
const breakEl = document.getElementById('break-duration') as HTMLInputElement;
const loginEl = document.getElementById('launch-login') as HTMLInputElement;
const saveBtn = document.getElementById('save-btn') as HTMLButtonElement;
const cancelBtn = document.getElementById('cancel-btn') as HTMLButtonElement;

const api = (window as any).icare;

// Load current settings
if (api) {
  api.send('settings:get');
  api.on('settings:current', (settings: any) => {
    countdownEl.value = String(settings.countdownDuration);
    breakEl.value = String(settings.breakDuration);
    loginEl.checked = !!settings.launchOnLogin;
  });
}

saveBtn.addEventListener('click', () => {
  const countdown = Math.max(5, Math.min(3600, parseInt(countdownEl.value, 10) || 20));
  const breakDur = Math.max(1, Math.min(300, parseInt(breakEl.value, 10) || 10));

  const settings = {
    countdownDuration: countdown,
    breakDuration: breakDur,
    launchOnLogin: loginEl.checked,
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

// Close on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (api) {
      api.send('settings:close');
    }
  }
});
