type TimerState = 'countdown' | 'alert' | 'break';
type BreakKind = 'eye' | 'walkAway';

interface TimerConfig {
  countdownDuration: number;  // seconds
  breakDuration: number;      // seconds
  walkAwayEnabled: boolean;
  walkAwayInterval: number;   // seconds
  walkAwayDuration: number;   // seconds
  shakeOnAlert: boolean;
  soundOnAlert: boolean;
  soundOnBreakEnd: boolean;
}

const DEFAULT_CONFIG: TimerConfig = {
  countdownDuration: 20,
  breakDuration: 10,
  walkAwayEnabled: false,
  walkAwayInterval: 3600,
  walkAwayDuration: 300,
  shakeOnAlert: true,
  soundOnAlert: true,
  soundOnBreakEnd: true,
};

class BlinkTimer {
  private state: TimerState = 'countdown';
  private breakKind: BreakKind = 'eye';
  private remaining: number = 0;
  private targetTime: number = 0;
  private tickInterval: number | null = null;
  private colonVisible: boolean = true;
  private config: TimerConfig;
  private paused: boolean = false;
  private pingAudio: HTMLAudioElement;
  private pongAudio: HTMLAudioElement;

  // Walk-away (stretch break) schedule — runs independently of the eye break.
  private walkAwayDueAt: number | null = null;   // absolute timestamp, or null when inactive
  private walkAwayPending: boolean = false;       // due while busy; fire on return to countdown
  private walkAwayRemainingMs: number | null = null; // frozen time-to-due while paused (null = nothing frozen)
  private pongChainRemaining: number = 0;
  private pongEndedHandler: (() => void) | null = null;

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
    this.pingAudio = new Audio('../../assets/ping.wav');
    this.pongAudio = new Audio('../../assets/pong.wav');

    this.config = { ...DEFAULT_CONFIG };
    this.breakBtn.addEventListener('click', () => this.onBreakClick());
    this.settingsBtn.addEventListener('click', () => this.onSettingsClick());

    // Persistent 1s scheduler that detects when a stretch break becomes due.
    window.setInterval(() => this.checkWalkAway(), 1000);

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

  private setWidgetState(state: TimerState, kind: BreakKind): void {
    this.widgetEl.classList.remove(
      'state-countdown', 'state-alert', 'state-break', 'shake', 'kind-eye', 'kind-walkaway',
    );
    this.widgetEl.classList.add(`state-${state}`);
    this.widgetEl.classList.add(kind === 'walkAway' ? 'kind-walkaway' : 'kind-eye');
    this.state = state;
    this.breakKind = kind;
  }

  // --- Audio helpers ---

  private playPing(): void {
    this.pingAudio.currentTime = 0;
    this.pingAudio.play().catch(() => {});
  }

  // Play `count` pongs back to back using a single one-shot listener per step,
  // cancelling any chain already in flight to avoid listener build-up.
  private playPong(count: number): void {
    if (this.pongEndedHandler) {
      this.pongAudio.removeEventListener('ended', this.pongEndedHandler);
      this.pongEndedHandler = null;
    }
    this.pongChainRemaining = Math.max(0, count);
    this.playNextPong();
  }

  private playNextPong(): void {
    if (this.pongChainRemaining <= 0) return;
    this.pongChainRemaining--;
    this.pongAudio.currentTime = 0;
    this.pongAudio.play().catch(() => {});

    if (this.pongChainRemaining > 0) {
      const handler = () => {
        this.pongAudio.removeEventListener('ended', handler);
        this.pongEndedHandler = null;
        this.playNextPong();
      };
      this.pongEndedHandler = handler;
      this.pongAudio.addEventListener('ended', handler);
    }
  }

  // --- Walk-away (stretch break) scheduling ---

  private scheduleWalkAway(): void {
    this.walkAwayPending = false;
    if (!this.config.walkAwayEnabled) {
      this.walkAwayDueAt = null;
      this.walkAwayRemainingMs = null;
      return;
    }
    if (this.paused) {
      // Don't let the due-time age during a pause — freeze the full interval.
      this.walkAwayDueAt = null;
      this.walkAwayRemainingMs = this.config.walkAwayInterval * 1000;
    } else {
      this.walkAwayDueAt = Date.now() + this.config.walkAwayInterval * 1000;
      this.walkAwayRemainingMs = null;
    }
  }

  private checkWalkAway(): void {
    if (this.paused || !this.config.walkAwayEnabled || this.walkAwayDueAt === null) return;
    if (Date.now() < this.walkAwayDueAt) return;

    if (this.state === 'countdown') {
      this.stopTicking();
      this.walkAwayDueAt = null;
      this.walkAwayPending = false;
      this.enterAlert('walkAway');
    } else {
      // Busy in an eye alert/break — queue it and fire on return to countdown.
      this.walkAwayPending = true;
    }
  }

  // --- States ---

  // State 1: Countdown
  private enterCountdown(fromBreakKind: BreakKind | null = null): void {
    if (fromBreakKind && this.config.soundOnBreakEnd) {
      this.playPong(fromBreakKind === 'walkAway' ? 5 : 1);
    }

    // Honour a stretch break that came due while we were busy.
    if (this.config.walkAwayEnabled && this.walkAwayPending) {
      this.walkAwayPending = false;
      this.walkAwayDueAt = null;
      this.enterAlert('walkAway');
      return;
    }

    this.setWidgetState('countdown', 'eye');
    this.colonVisible = true;
    this.ghostEl.textContent = this.ghostText(this.config.countdownDuration);
    this.labelEl.textContent = '';

    this.startTicking(this.config.countdownDuration, () => this.enterAlert('eye'));
  }

  // State 2: Alert — waits for the user to start the break
  private enterAlert(kind: BreakKind): void {
    this.setWidgetState('alert', kind);

    if (this.config.shakeOnAlert) {
      this.widgetEl.classList.add('shake');
    }

    if (this.config.soundOnAlert) {
      this.playPing();
    }

    this.remaining = 0;
    this.colonVisible = true;
    this.ghostEl.textContent = '88888';

    if (kind === 'walkAway') {
      // Seven-segment displays can't render a single-cell "W", so use a
      // double-V ("VV") which reads as a W and fills both ghost digits.
      this.timerEl.textContent = 'VVALK';
      this.labelEl.textContent = 'stand up & stretch';
      this.breakBtn.textContent = 'Start Stretch';
      this.breakBtn.title = 'Start your stretch break';
    } else {
      this.timerEl.textContent = 'BLINK';
      this.labelEl.textContent = 'look away';
      this.breakBtn.textContent = 'Start Rest';
      this.breakBtn.title = 'Start your eye break';
    }
  }

  // State 3: Break
  private enterBreak(kind: BreakKind): void {
    this.setWidgetState('break', kind);
    const duration = kind === 'walkAway' ? this.config.walkAwayDuration : this.config.breakDuration;
    this.ghostEl.textContent = this.ghostText(duration);
    this.colonVisible = true;
    this.labelEl.textContent = kind === 'walkAway' ? 'stretching' : 'resting eyes';
    this.startTicking(duration, () => this.onBreakComplete(kind));
  }

  private onBreakComplete(kind: BreakKind): void {
    if (kind === 'walkAway') {
      // A stretch break also satisfies the eye break — reset both schedules.
      this.scheduleWalkAway();
      this.enterCountdown('walkAway');
    } else {
      this.enterCountdown('eye');
    }
  }

  private onBreakClick(): void {
    if (this.state === 'alert') {
      this.enterBreak(this.breakKind);
    }
  }

  private onSettingsClick(): void {
    if ((window as any).icare) {
      (window as any).icare.send('settings:open');
    }
  }

  // Called externally when settings change
  public updateConfig(newConfig: Partial<TimerConfig>): void {
    const prev = this.config;
    this.config = { ...this.config, ...newConfig };

    const enabledChanged = prev.walkAwayEnabled !== this.config.walkAwayEnabled;
    const intervalChanged = prev.walkAwayInterval !== this.config.walkAwayInterval;

    if (!this.config.walkAwayEnabled) {
      // Suspend the stretch schedule without touching the eye cadence.
      this.walkAwayDueAt = null;
      this.walkAwayPending = false;
      this.walkAwayRemainingMs = null;
    } else if (enabledChanged || intervalChanged) {
      // Only (re)schedule when the relevant fields actually change.
      this.scheduleWalkAway();
    }

    if (this.state === 'countdown') {
      this.enterCountdown();
    }
  }

  public pause(): void {
    this.paused = true;
    this.stopTicking();
    if (this.walkAwayDueAt !== null) {
      this.walkAwayRemainingMs = Math.max(0, this.walkAwayDueAt - Date.now());
      this.walkAwayDueAt = null;
    }
    this.labelEl.textContent = 'paused';
  }

  public resume(): void {
    this.paused = false;
    if (this.config.walkAwayEnabled && this.walkAwayRemainingMs !== null) {
      // Restore the frozen due-time (remaining of 0 fires on the next tick).
      this.walkAwayDueAt = Date.now() + this.walkAwayRemainingMs;
      this.walkAwayRemainingMs = null;
    }
    if (this.state === 'countdown') {
      this.startTicking(this.remaining || this.config.countdownDuration, () => this.enterAlert('eye'));
    } else if (this.state === 'break') {
      const duration = this.breakKind === 'walkAway' ? this.config.walkAwayDuration : this.config.breakDuration;
      this.startTicking(this.remaining || duration, () => this.onBreakComplete(this.breakKind));
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

// Tag the html element with the platform so CSS can target Windows-specific
// rendering quirks (transparent window compositing differs from macOS).
if (navigator.userAgent.includes('Windows')) {
  document.documentElement.classList.add('platform-win32');
}

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
