type TimerState = 'countdown' | 'alert' | 'break';

interface TimerConfig {
  countdownDuration: number; // seconds
  breakDuration: number;    // seconds
}

const DEFAULT_CONFIG: TimerConfig = {
  countdownDuration: 20,
  breakDuration: 10,
};

class BlinkTimer {
  private state: TimerState = 'countdown';
  private remaining: number = 0;
  private targetTime: number = 0;
  private tickInterval: number | null = null;
  private colonVisible: boolean = true;
  private config: TimerConfig;

  private timerEl: HTMLElement;
  private ghostEl: HTMLElement;
  private labelEl: HTMLElement;
  private widgetEl: HTMLElement;
  private breakBtn: HTMLButtonElement;
  private settingsBtn: HTMLButtonElement;

  constructor() {
    this.timerEl = document.getElementById('timer')!;
    this.ghostEl = document.getElementById('ghost')!;
    this.labelEl = document.getElementById('label')!;
    this.widgetEl = document.getElementById('widget')!;
    this.breakBtn = document.getElementById('break-btn') as HTMLButtonElement;
    this.settingsBtn = document.getElementById('settings-btn') as HTMLButtonElement;

    this.config = { ...DEFAULT_CONFIG };
    this.breakBtn.addEventListener('click', () => this.onBreakClick());
    this.settingsBtn.addEventListener('click', () => this.onSettingsClick());

    this.enterCountdown();
  }

  private formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const colon = this.colonVisible ? ':' : ' ';
    if (h > 0) {
      return `${h}${colon}${String(m).padStart(2, '0')}${colon}${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}${colon}${String(s).padStart(2, '0')}`;
  }

  private ghostText(seconds: number): string {
    if (seconds >= 3600) return '8:88:88';
    return '88:88';
  }

  private updateDisplay(): void {
    this.timerEl.textContent = this.formatTime(this.remaining);
  }

  private startTicking(duration: number, onComplete: () => void): void {
    this.stopTicking();
    this.remaining = duration;
    this.targetTime = Date.now() + duration * 1000;
    this.updateDisplay();

    this.tickInterval = window.setInterval(() => {
      const now = Date.now();
      this.remaining = Math.max(0, Math.ceil((this.targetTime - now) / 1000));

      // Toggle colon every tick
      this.colonVisible = !this.colonVisible;
      this.updateDisplay();

      if (this.remaining <= 0) {
        this.stopTicking();
        onComplete();
      }
    }, 1000);
  }

  private stopTicking(): void {
    if (this.tickInterval !== null) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  private setWidgetState(state: TimerState): void {
    this.widgetEl.classList.remove('state-countdown', 'state-alert', 'state-break');
    this.widgetEl.classList.add(`state-${state}`);
    this.state = state;
  }

  // State 1: Countdown
  private enterCountdown(): void {
    this.setWidgetState('countdown');
    this.colonVisible = true;
    this.ghostEl.textContent = this.ghostText(this.config.countdownDuration);
    this.labelEl.textContent = '';
    this.startTicking(this.config.countdownDuration, () => this.enterAlert());
  }

  // State 2: Alert — waits for user click
  private enterAlert(): void {
    this.setWidgetState('alert');
    this.remaining = 0;
    this.colonVisible = true;
    this.timerEl.textContent = 'BLINK';
    this.ghostEl.textContent = '88888';
    this.labelEl.textContent = 'rest your eyes';
  }

  // State 3: Break
  private enterBreak(): void {
    this.setWidgetState('break');
    this.ghostEl.textContent = this.ghostText(this.config.breakDuration);
    this.colonVisible = true;
    this.labelEl.textContent = 'resting';
    this.startTicking(this.config.breakDuration, () => this.enterCountdown());
  }

  private onBreakClick(): void {
    if (this.state === 'alert') {
      this.enterBreak();
    }
  }

  private onSettingsClick(): void {
    if ((window as any).icare) {
      (window as any).icare.send('settings:open');
    }
  }

  // Called externally when settings change
  public updateConfig(newConfig: Partial<TimerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    if (this.state === 'countdown') {
      this.enterCountdown();
    }
  }

  public pause(): void {
    this.stopTicking();
    this.labelEl.textContent = 'paused';
  }

  public resume(): void {
    if (this.state === 'countdown') {
      this.startTicking(this.remaining || this.config.countdownDuration, () => this.enterAlert());
    } else if (this.state === 'break') {
      this.startTicking(this.remaining || this.config.breakDuration, () => this.enterCountdown());
    }
    this.labelEl.textContent = '';
  }
}

// Extend Window for the preload bridge
interface IcareAPI {
  send: (channel: string, ...args: unknown[]) => void;
  on: (channel: string, callback: (...args: unknown[]) => void) => void;
}

interface Window {
  icare?: IcareAPI;
}

// Boot
const timer = new BlinkTimer();

// Listen for settings updates from main process
if ((window as any).icare) {
  (window as any).icare.on('settings:updated', (config: unknown) => {
    timer.updateConfig(config as Partial<TimerConfig>);
  });
  (window as any).icare.on('timer:pause', () => {
    timer.pause();
  });
  (window as any).icare.on('timer:resume', () => {
    timer.resume();
  });
}
