const countdownEl = document.getElementById('countdown-duration') as HTMLSelectElement;
const breakEl = document.getElementById('break-duration') as HTMLSelectElement;
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
  const settings = {
    countdownDuration: parseInt(countdownEl.value, 10),
    breakDuration: parseInt(breakEl.value, 10),
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
