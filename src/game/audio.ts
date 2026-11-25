import { DEFAULT_MUSIC_SETTINGS, MUSIC_TRACKS } from './constants';
import {
  clearAllStoredCustomTracks,
  loadAllCustomTracks,
  removeStoredCustomTrack,
  saveCustomTrackFiles,
} from './customTracks';
import type { MusicSettings, WeaponId } from './types';

function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export class NegruzinoAudio {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private droneOsc1: OscillatorNode | null = null;
  private droneOsc2: OscillatorNode | null = null;
  private droneGain: GainNode | null = null;

  private minigunOsc: OscillatorNode | null = null;
  private minigunGain: GainNode | null = null;
  private distCurve: Float32Array<ArrayBuffer> | null = null;

  private stepTimer: number | null = null;
  private stepIdx = 0;
  private settings: MusicSettings = { ...DEFAULT_MUSIC_SETTINGS };
  private isPaused = false;
  private musicActive = false;

  // Optional user-loaded real MP3/OGG/WAV/FLAC cassette playlist (persisted in IndexedDB)
  // Streams lazily with a SINGLE active Object URL (revoked immediately on switch/remove/dispose)
  private customAudioEl: HTMLAudioElement | null = null;
  private customTracks: Array<{ id: string; name: string; blob: Blob }> = [];
  private activeCustomObjectUrl: string | null = null;
  private activeCustomIdx = -1;
  private customLoadToken = 0;
  private consecutiveTrackErrors = 0;
  private onPlaylistChange?: (settings: MusicSettings) => void;

  public unlock(): void {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return;

      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.settings.muted ? 0 : 0.85;
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.settings.volume * 0.42;
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.78;
      this.sfxGain.connect(this.masterGain);

      // Shared white noise buffer for gunshots, gravel, screamer static
      const sampleRate = this.ctx.sampleRate;
      const buf = this.ctx.createBuffer(1, sampleRate * 1.5, sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buf;

      // Warm analog overdrive / fuzz curve for punk, stoner-rock & heavy metal guitars
      const curveLen = 512;
      const curve = new Float32Array(new ArrayBuffer(curveLen * 4));
      for (let i = 0; i < curveLen; i++) {
        const x = (i * 2) / curveLen - 1;
        curve[i] = Math.tanh(x * 5.2);
      }
      this.distCurve = curve;

      // Ambient midnight fog drone
      this.droneGain = this.ctx.createGain();
      this.droneGain.gain.value = 0.0;
      const droneFilter = this.ctx.createBiquadFilter();
      droneFilter.type = 'lowpass';
      droneFilter.frequency.value = 210;
      this.droneGain.connect(droneFilter);
      droneFilter.connect(this.musicGain);

      this.droneOsc1 = this.ctx.createOscillator();
      this.droneOsc1.type = 'sawtooth';
      this.droneOsc1.frequency.value = 55;
      this.droneOsc1.connect(this.droneGain);
      this.droneOsc1.start();

      this.droneOsc2 = this.ctx.createOscillator();
      this.droneOsc2.type = 'triangle';
      this.droneOsc2.frequency.value = 55.45;
      this.droneOsc2.connect(this.droneGain);
      this.droneOsc2.start();

      // Continuous rotary minigun motor whirr
      this.minigunGain = this.ctx.createGain();
      this.minigunGain.gain.value = 0;
      const mgFilter = this.ctx.createBiquadFilter();
      mgFilter.type = 'bandpass';
      mgFilter.frequency.value = 340;
      this.minigunGain.connect(mgFilter);
      mgFilter.connect(this.sfxGain);

      this.minigunOsc = this.ctx.createOscillator();
      this.minigunOsc.type = 'sawtooth';
      this.minigunOsc.frequency.value = 70;
      this.minigunOsc.connect(this.minigunGain);
      this.minigunOsc.start();

      this.startMusicLoop();
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  public setPlaylistChangeListener(cb: (settings: MusicSettings) => void): void {
    this.onPlaylistChange = cb;
  }

  public getSettings(): MusicSettings {
    return {
      ...this.settings,
      customPlaylist: this.customTracks.map((t) => ({ id: t.id, name: t.name })),
      activeCustomTrackId:
        this.activeCustomIdx >= 0 && this.activeCustomIdx < this.customTracks.length
          ? this.customTracks[this.activeCustomIdx].id
          : null,
    };
  }

  private syncPlaylistSettings(): void {
    this.settings.customPlaylist = this.customTracks.map((t) => ({
      id: t.id,
      name: t.name,
    }));
    const active =
      this.activeCustomIdx >= 0 && this.activeCustomIdx < this.customTracks.length
        ? this.customTracks[this.activeCustomIdx]
        : null;
    this.settings.activeCustomTrackId = active ? active.id : null;
    this.settings.customAudioName = active ? active.name : null;
    this.onPlaylistChange?.(this.getSettings());
  }

  private revokeActiveCustomUrl(): void {
    if (this.activeCustomObjectUrl) {
      try {
        URL.revokeObjectURL(this.activeCustomObjectUrl);
      } catch {
        // ignore
      }
      this.activeCustomObjectUrl = null;
    }
  }

  private ensureCustomAudioElement(): HTMLAudioElement {
    if (!this.customAudioEl) {
      const el = new Audio();
      el.preload = 'metadata';
      el.addEventListener('playing', () => {
        this.consecutiveTrackErrors = 0;
      });
      el.addEventListener('ended', () => {
        this.consecutiveTrackErrors = 0;
        if (this.customTracks.length > 1) {
          this.cycleCustomTrack();
        } else if (this.customAudioEl && this.settings.customAudioName && !this.isPaused) {
          this.customAudioEl.currentTime = 0;
          void this.customAudioEl.play().catch(() => {});
        }
      });
      el.addEventListener('error', () => {
        // Never hang or spin infinitely if a track fails to decode
        if (this.activeCustomIdx < 0) return;
        this.consecutiveTrackErrors += 1;
        if (this.customTracks.length > 1 && this.consecutiveTrackErrors < this.customTracks.length) {
          this.cycleCustomTrack();
        } else {
          // All custom tracks failed or single broken file -> gracefully return to built-in soundtrack
          this.stopCustomPlaybackToSynth();
        }
      });
      this.customAudioEl = el;
    }
    return this.customAudioEl;
  }

  public async hydrateCustomPlaylist(): Promise<MusicSettings> {
    try {
      const stored = await loadAllCustomTracks();
      if (stored.length === 0) return this.getSettings();
      this.revokeActiveCustomUrl();
      this.customTracks = stored.map((rec) => ({
        id: rec.id,
        name: rec.name,
        blob: rec.blob,
      }));
      // Prepare first track lazily without forcing eager decode of the whole playlist
      this.activeCustomIdx = 0;
      this.loadActiveTrackUrl(false);
      this.syncPlaylistSettings();
      this.applyGains();
    } catch {
      // Never throw on startup hydration failure
    }
    return this.getSettings();
  }

  public updateMusicSettings(partial: Partial<MusicSettings>): MusicSettings {
    this.settings = { ...this.settings, ...partial };
    this.applyGains();
    if (partial.bpm !== undefined || partial.trackId !== undefined) {
      if (this.musicActive && !this.isPaused) {
        this.restartSequencer();
      }
    }
    return this.getSettings();
  }

  public async addCustomAudioFiles(files: File[]): Promise<MusicSettings> {
    if (!files.length) return this.getSettings();
    const { saved } = await saveCustomTrackFiles(files);
    if (saved.length === 0) {
      return this.getSettings();
    }
    const startIdx = this.customTracks.length;
    for (const rec of saved) {
      this.customTracks.push({
        id: rec.id,
        name: rec.name,
        blob: rec.blob,
      });
    }
    this.consecutiveTrackErrors = 0;
    this.selectCustomTrackByIndex(startIdx);
    return this.getSettings();
  }

  public loadCustomAudioFile(file: File): void {
    void this.addCustomAudioFiles([file]);
  }

  public selectCustomTrack(id: string): MusicSettings {
    const idx = this.customTracks.findIndex((t) => t.id === id);
    if (idx >= 0) {
      this.consecutiveTrackErrors = 0;
      this.selectCustomTrackByIndex(idx);
    }
    return this.getSettings();
  }

  private loadActiveTrackUrl(autoPlay: boolean): void {
    if (this.activeCustomIdx < 0 || this.activeCustomIdx >= this.customTracks.length) return;
    const token = ++this.customLoadToken;
    const track = this.customTracks[this.activeCustomIdx];
    const el = this.ensureCustomAudioElement();

    try {
      el.pause();
    } catch {
      // ignore
    }
    this.revokeActiveCustomUrl();

    let objectUrl: string;
    try {
      objectUrl = URL.createObjectURL(track.blob);
    } catch {
      this.stopCustomPlaybackToSynth();
      return;
    }
    this.activeCustomObjectUrl = objectUrl;
    el.src = objectUrl;
    el.volume = this.settings.muted || this.isPaused ? 0 : this.settings.volume;
    // Start streaming asynchronously without blocking the main thread
    if (autoPlay && !this.isPaused) {
      void Promise.resolve().then(() => {
        if (token !== this.customLoadToken || !this.customAudioEl) return;
        const p = this.customAudioEl.play();
        if (p && typeof p.catch === 'function') {
          p.catch(() => {
            // Autoplay blocked or aborted by rapid switch — keep UI responsive
          });
        }
      });
    }
  }

  private selectCustomTrackByIndex(idx: number): void {
    if (idx < 0 || idx >= this.customTracks.length) return;
    this.activeCustomIdx = idx;
    this.loadActiveTrackUrl(true);
    this.syncPlaylistSettings();
    this.applyGains();
  }

  public cycleCustomTrack(): string | null {
    if (this.customTracks.length === 0) return null;
    const nextIdx =
      this.activeCustomIdx < 0
        ? 0
        : (this.activeCustomIdx + 1) % this.customTracks.length;
    this.selectCustomTrackByIndex(nextIdx);
    return this.customTracks[nextIdx]?.name ?? null;
  }

  public hasCustomPlaylist(): boolean {
    return this.customTracks.length > 0;
  }

  public async removeCustomTrack(id: string): Promise<MusicSettings> {
    const idx = this.customTracks.findIndex((t) => t.id === id);
    if (idx < 0) return this.getSettings();
    this.customTracks.splice(idx, 1);
    await removeStoredCustomTrack(id);

    if (this.customTracks.length === 0) {
      this.activeCustomIdx = -1;
      this.customLoadToken += 1;
      if (this.customAudioEl) {
        this.customAudioEl.pause();
        this.customAudioEl.removeAttribute('src');
        this.customAudioEl.load();
      }
      this.revokeActiveCustomUrl();
      this.syncPlaylistSettings();
      this.applyGains();
    } else if (this.activeCustomIdx === idx) {
      this.selectCustomTrackByIndex(idx % this.customTracks.length);
    } else {
      if (this.activeCustomIdx > idx) this.activeCustomIdx -= 1;
      this.syncPlaylistSettings();
    }
    return this.getSettings();
  }

  public stopCustomPlaybackToSynth(): MusicSettings {
    this.activeCustomIdx = -1;
    this.customLoadToken += 1;
    if (this.customAudioEl) {
      try {
        this.customAudioEl.pause();
        this.customAudioEl.removeAttribute('src');
        this.customAudioEl.load();
      } catch {
        // ignore
      }
    }
    this.revokeActiveCustomUrl();
    this.syncPlaylistSettings();
    this.applyGains();
    return this.getSettings();
  }

  public clearCustomAudioFile(): void {
    void this.clearAllCustomTracks();
  }

  public async clearAllCustomTracks(): Promise<MusicSettings> {
    this.customLoadToken += 1;
    if (this.customAudioEl) {
      try {
        this.customAudioEl.pause();
        this.customAudioEl.removeAttribute('src');
        this.customAudioEl.load();
      } catch {
        // ignore
      }
    }
    this.revokeActiveCustomUrl();
    this.customTracks = [];
    this.activeCustomIdx = -1;
    await clearAllStoredCustomTracks();
    this.syncPlaylistSettings();
    this.applyGains();
    return this.getSettings();
  }

  public toggleMute(): boolean {
    this.settings.muted = !this.settings.muted;
    this.applyGains();
    return this.settings.muted;
  }

  public setPaused(paused: boolean): void {
    this.isPaused = paused;
    this.setMinigunSpin(0);
    if (this.customAudioEl) {
      if (paused) this.customAudioEl.pause();
      else if (this.settings.customAudioName) {
        void this.customAudioEl.play().catch(() => {});
      }
    }
    this.applyGains();
  }

  private applyGains(): void {
    if (this.masterGain && this.ctx) {
      const target = this.settings.muted || this.isPaused ? 0 : 0.85;
      this.masterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.04);
    }
    if (this.musicGain && this.ctx) {
      const hasCustom = Boolean(this.settings.customAudioName);
      const target = hasCustom ? 0 : this.settings.volume * 0.45;
      this.musicGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.06);
    }
    if (this.droneGain && this.ctx) {
      const droneTarget =
        this.isPaused || this.settings.muted || this.settings.customAudioName
          ? 0
          : this.settings.fogDrone * 0.22;
      this.droneGain.gain.setTargetAtTime(droneTarget, this.ctx.currentTime, 0.12);
    }
    if (this.customAudioEl) {
      this.customAudioEl.volume =
        this.settings.muted || this.isPaused ? 0 : this.settings.volume;
    }
  }

  public startMusicLoop(): void {
    this.musicActive = true;
    this.applyGains();
    this.restartSequencer();
  }

  private restartSequencer(): void {
    if (this.stepTimer !== null) {
      window.clearInterval(this.stepTimer);
      this.stepTimer = null;
    }
    // 8th-note grid for tight rock/punk/metal/classical groove
    const stepMs = Math.max(95, Math.round((60 / this.settings.bpm) * 500));
    this.stepTimer = window.setInterval(() => {
      this.playMusicStep();
    }, stepMs);
  }

  private playDrumKick(now: number, vol: number): void {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.14);
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(g);
    g.connect(this.musicGain);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  private playDrumSnare(now: number, vol: number): void {
    if (!this.ctx || !this.musicGain || !this.noiseBuffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'bandpass';
    hp.frequency.setValueAtTime(1850, now);
    hp.Q.value = 0.9;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    src.connect(hp);
    hp.connect(g);
    g.connect(this.musicGain);
    src.start(now);
    src.stop(now + 0.16);

    const body = this.ctx.createOscillator();
    const bg = this.ctx.createGain();
    body.type = 'triangle';
    body.frequency.setValueAtTime(210, now);
    body.frequency.exponentialRampToValueAtTime(110, now + 0.08);
    bg.gain.setValueAtTime(vol * 0.55, now);
    bg.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    body.connect(bg);
    bg.connect(this.musicGain);
    body.start(now);
    body.stop(now + 0.1);
  }

  private playDrumHat(now: number, vol: number, open = false): void {
    if (!this.ctx || !this.musicGain || !this.noiseBuffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(6800, now);
    const g = this.ctx.createGain();
    const dur = open ? 0.14 : 0.045;
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    src.connect(hp);
    hp.connect(g);
    g.connect(this.musicGain);
    src.start(now);
    src.stop(now + dur + 0.01);
  }

  private playPowerChord(now: number, rootMidi: number, dur: number, vol: number): void {
    if (!this.ctx || !this.musicGain) return;
    const shaper = this.ctx.createWaveShaper();
    if (this.distCurve) shaper.curve = this.distCurve;
    const cab = this.ctx.createBiquadFilter();
    cab.type = 'lowpass';
    cab.frequency.setValueAtTime(2200, now);
    cab.frequency.exponentialRampToValueAtTime(1050, now + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(vol, now + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);

    // Root + fifth + octave power-chord stack
    for (const semi of [0, 7, 12]) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(midiToHz(rootMidi + semi), now);
      osc.detune.setValueAtTime((semi - 6) * 1.4, now);
      osc.connect(shaper);
      osc.start(now);
      osc.stop(now + dur + 0.02);
    }
    shaper.connect(cab);
    cab.connect(g);
    g.connect(this.musicGain);
  }

  private playMusicStep(): void {
    if (
      !this.ctx ||
      !this.musicGain ||
      this.isPaused ||
      this.settings.muted ||
      this.settings.customAudioName ||
      this.ctx.state !== 'running'
    ) {
      return;
    }

    const track =
      MUSIC_TRACKS.find((t) => t.id === this.settings.trackId) ?? MUSIC_TRACKS[0];
    const now = this.ctx.currentTime;
    const step = this.stepIdx++;
    const stepInBar = step % 8;
    const barIdx = Math.floor(step / 8);
    // Multi-section song form (Verse A -> Chorus B -> Breakdown/Bridge C) so tracks never feel flatly repetitive
    const section = barIdx % 8 < 4 ? 'A' : barIdx % 8 < 6 ? 'B' : 'C';
    const isTurnaroundFill = barIdx % 4 === 3 && stepInBar >= 6;
    const rawNote = track.notes[step % track.notes.length];
    const noteMidi =
      rawNote > 0
        ? section === 'B'
          ? rawNote + 5
          : section === 'C' && stepInBar % 2 === 1
            ? rawNote + 12
            : rawNote
        : 0;
    const rawBass = track.bassNotes[step % track.bassNotes.length];
    const bassMidi = section === 'B' && rawBass > 0 ? rawBass + 5 : rawBass;
    const rawChord =
      track.chordRoots[Math.floor(step / 4) % track.chordRoots.length];
    const chordRoot = section === 'B' ? rawChord + 5 : rawChord;
    const warbleCents =
      Math.sin(step * 0.65) * this.settings.tapeWarble * 16 +
      (Math.random() - 0.5) * this.settings.tapeWarble * 7;

    const isRockStyle =
      track.style === 'punk_rock' ||
      track.style === 'stoner_bike' ||
      track.style === 'post_punk' ||
      track.style === 'doom_baroque' ||
      track.style === 'heavy_metal' ||
      track.style === 'industrial_boss';

    // 1. Drums with dynamic 4-bar snare fills & open-hat chorus lift
    if (track.style !== 'classical' && track.style !== 'dark_synth') {
      const kickHit =
        track.style === 'heavy_metal'
          ? stepInBar % 2 === 0 || stepInBar === 5 || stepInBar === 7
          : track.style === 'punk_rock' || track.style === 'post_punk'
            ? stepInBar === 0 || stepInBar === 3 || stepInBar === 4 || stepInBar === 6
            : stepInBar === 0 || stepInBar === 4 || (track.style === 'stoner_bike' && stepInBar === 5);
      const snareHit =
        isTurnaroundFill
          ? true
          : track.style === 'doom_baroque'
            ? stepInBar === 4
            : stepInBar === 2 || stepInBar === 6;

      if (kickHit) this.playDrumKick(now, section === 'B' ? 0.34 : 0.28);
      if (snareHit) this.playDrumSnare(now, isTurnaroundFill ? 0.24 : 0.2);
      this.playDrumHat(
        now,
        stepInBar % 2 === 0 ? 0.085 : 0.045,
        stepInBar === 7 || (section === 'B' && stepInBar === 3)
      );
    }

    // 2. Overdrive rhythm power-chords (punk, stoner biker, metal, doom, industrial)
    if (isRockStyle) {
      const chugStep =
        track.style === 'heavy_metal' || track.style === 'punk_rock'
          ? step % 2 === 0
          : step % 4 === 0 || (track.style === 'stoner_bike' && stepInBar === 3);
      if (chugStep) {
        const dur =
          track.style === 'doom_baroque'
            ? 0.72
            : track.style === 'heavy_metal'
              ? 0.22
              : 0.34;
        this.playPowerChord(now, chordRoot, dur, 0.12);
      }
    } else if (track.style === 'classical' && step % 4 === 0) {
      // Warm classical string pad (root + minor third + fifth)
      for (const semi of [0, 3, 7]) {
        const pad = this.ctx.createOscillator();
        const pg = this.ctx.createGain();
        const pf = this.ctx.createBiquadFilter();
        pad.type = 'sawtooth';
        pad.frequency.setValueAtTime(midiToHz(chordRoot + semi), now);
        pf.type = 'lowpass';
        pf.frequency.setValueAtTime(920, now);
        pg.gain.setValueAtTime(0.001, now);
        pg.gain.linearRampToValueAtTime(0.045, now + 0.14);
        pg.gain.exponentialRampToValueAtTime(0.001, now + 1.15);
        pad.connect(pf);
        pf.connect(pg);
        pg.connect(this.musicGain);
        pad.start(now);
        pad.stop(now + 1.2);
      }
    }

    // 3. Lead Voice (guitar fuzz / psych synth / baroque harpsichord / piano)
    if (noteMidi > 0) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      if (track.style === 'classical') {
        osc.type = 'triangle';
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2200, now);
        filter.frequency.exponentialRampToValueAtTime(640, now + 0.55);
      } else if (track.style === 'psych_synth') {
        osc.type = 'square';
        filter.type = 'bandpass';
        filter.Q.value = 3.2;
        filter.frequency.setValueAtTime(1750, now);
        filter.frequency.exponentialRampToValueAtTime(520, now + 0.32);
      } else if (track.style === 'doom_baroque') {
        osc.type = 'sawtooth';
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(420, now);
      } else if (isRockStyle) {
        osc.type = 'sawtooth';
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2400, now);
        filter.frequency.exponentialRampToValueAtTime(860, now + 0.28);
      } else {
        osc.type = 'triangle';
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1050, now);
        filter.frequency.exponentialRampToValueAtTime(360, now + 0.42);
      }

      osc.frequency.setValueAtTime(midiToHz(noteMidi), now);
      osc.detune.setValueAtTime(warbleCents, now);

      const dur = track.style === 'classical' ? 0.62 : 0.36;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(isRockStyle ? 0.13 : 0.15, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

      if (isRockStyle && this.distCurve) {
        const leadDist = this.ctx.createWaveShaper();
        leadDist.curve = this.distCurve;
        osc.connect(leadDist);
        leadDist.connect(filter);
      } else {
        osc.connect(filter);
      }
      filter.connect(gain);
      gain.connect(this.musicGain);
      osc.start(now);
      osc.stop(now + dur + 0.03);
    }

    // 4. Driving Bassline
    if (this.settings.bassDrive > 0.05 && bassMidi > 0) {
      const bOsc = this.ctx.createOscillator();
      const bGain = this.ctx.createGain();
      const bFilter = this.ctx.createBiquadFilter();

      bOsc.type = track.style === 'classical' ? 'sine' : 'sawtooth';
      bOsc.frequency.setValueAtTime(midiToHz(bassMidi), now);
      bFilter.type = 'lowpass';
      bFilter.frequency.setValueAtTime(
        (isRockStyle ? 340 : 230) + this.settings.bassDrive * 290,
        now
      );

      const amp = (track.style === 'classical' ? 0.09 : 0.11) + this.settings.bassDrive * 0.13;
      const bDur = isRockStyle ? 0.34 : 0.55;
      bGain.gain.setValueAtTime(0.001, now);
      bGain.gain.linearRampToValueAtTime(amp, now + 0.015);
      bGain.gain.exponentialRampToValueAtTime(0.001, now + bDur);

      bOsc.connect(bFilter);
      bFilter.connect(bGain);
      bGain.connect(this.musicGain);
      bOsc.start(now);
      bOsc.stop(now + bDur + 0.03);

      if (step % 4 === 0 && this.droneOsc1 && this.droneOsc2) {
        const rootHz = midiToHz(bassMidi);
        this.droneOsc1.frequency.setTargetAtTime(rootHz, now, 0.2);
        this.droneOsc2.frequency.setTargetAtTime(rootHz * 1.007, now, 0.2);
      }
    }
  }

  public playLevelUpFanfare(): void {
    if (!this.ctx || !this.sfxGain || this.settings.muted) return;
    const now = this.ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880, 1108.73];
    notes.forEach((hz, idx) => {
      this.spawnPunchTone(now + idx * 0.065, hz, hz * 1.01, 0.28, 'triangle', 0.2);
    });
  }

  public setMinigunSpin(spin: number): void {
    if (!this.ctx || !this.minigunOsc || !this.minigunGain) return;
    const now = this.ctx.currentTime;
    const clamped = this.isPaused || this.settings.muted ? 0 : Math.max(0, Math.min(1, spin));
    this.minigunOsc.frequency.setTargetAtTime(65 + clamped * 175, now, 0.04);
    this.minigunGain.gain.setTargetAtTime(clamped * 0.15, now, 0.05);
  }

  public playWeaponFire(weaponId: WeaponId): void {
    if (!this.ctx || !this.sfxGain || !this.noiseBuffer || this.settings.muted) return;
    const now = this.ctx.currentTime;
    const pitchVar = 0.94 + Math.random() * 0.12;

    if (weaponId === 'shotgun') {
      // Heavy booming 12-gauge blast + delayed pump rack
      this.spawnNoiseBurst(now, 0.28, 1200 * pitchVar, 'lowpass', 0.65);
      this.spawnPunchTone(now, 145 * pitchVar, 36, 0.24, 'triangle', 0.55);
      // Pump rack clack
      this.spawnNoiseBurst(now + 0.26, 0.06, 2600, 'bandpass', 0.22);
      this.spawnNoiseBurst(now + 0.36, 0.06, 3200, 'bandpass', 0.24);
      return;
    }

    if (weaponId === 'awp') {
      // Iconic cannon-crack sniper report + bolt cycle
      this.spawnNoiseBurst(now, 0.42, 2200 * pitchVar, 'bandpass', 0.7);
      this.spawnPunchTone(now, 210 * pitchVar, 32, 0.38, 'sawtooth', 0.58);
      this.spawnNoiseBurst(now + 0.52, 0.07, 2900, 'highpass', 0.18);
      this.spawnNoiseBurst(now + 0.68, 0.07, 2200, 'bandpass', 0.2);
      return;
    }

    if (weaponId === 'pistol') {
      // Crisp heavy .50 caliber bark
      this.spawnNoiseBurst(now, 0.17, 1900 * pitchVar, 'bandpass', 0.48);
      this.spawnPunchTone(now, 260 * pitchVar, 55, 0.15, 'triangle', 0.42);
      return;
    }

    if (weaponId === 'minigun') {
      // Deep punchy rotary thump
      this.spawnNoiseBurst(now, 0.075, 1600 * pitchVar, 'lowpass', 0.34);
      this.spawnPunchTone(now, 160 * pitchVar, 52, 0.065, 'sawtooth', 0.26);
      return;
    }

    // P90 snappy high-RPM PDW crack
    this.spawnNoiseBurst(now, 0.065, 2900 * pitchVar, 'bandpass', 0.3);
    this.spawnPunchTone(now, 320 * pitchVar, 95, 0.055, 'triangle', 0.22);
  }

  public playReload(weaponId: WeaponId = 'shotgun', durationSec = 1.5): void {
    if (!this.ctx || !this.sfxGain || this.settings.muted) return;
    const now = this.ctx.currentTime;
    const d = Math.max(0.6, durationSec);

    if (weaponId === 'shotgun') {
      // Crisp 12-gauge shells sliding into tube + heavy final forend rack
      this.spawnNoiseBurst(now + d * 0.16, 0.055, 2200, 'bandpass', 0.22);
      this.spawnPunchTone(now + d * 0.17, 520, 320, 0.05, 'triangle', 0.14);
      this.spawnNoiseBurst(now + d * 0.42, 0.055, 2400, 'bandpass', 0.22);
      this.spawnPunchTone(now + d * 0.43, 560, 340, 0.05, 'triangle', 0.14);
      // Heavy pump-action rack clack near completion
      this.spawnNoiseBurst(now + d * 0.72, 0.085, 1650, 'bandpass', 0.3);
      this.spawnPunchTone(now + d * 0.73, 280, 170, 0.08, 'square', 0.16);
      this.spawnNoiseBurst(now + d * 0.84, 0.075, 2900, 'bandpass', 0.28);
      this.spawnPunchTone(now + d * 0.85, 440, 260, 0.06, 'triangle', 0.16);
      return;
    }

    if (weaponId === 'awp') {
      // Bolt unlock -> heavy magazine drop -> fresh mag lock -> crisp bolt slam
      this.spawnNoiseBurst(now + d * 0.08, 0.06, 3200, 'bandpass', 0.24);
      this.spawnPunchTone(now + d * 0.09, 680, 460, 0.05, 'square', 0.12);
      this.spawnNoiseBurst(now + d * 0.28, 0.08, 1300, 'bandpass', 0.24);
      this.spawnPunchTone(now + d * 0.29, 260, 140, 0.07, 'triangle', 0.18);
      this.spawnNoiseBurst(now + d * 0.56, 0.07, 1950, 'bandpass', 0.28);
      this.spawnPunchTone(now + d * 0.57, 360, 520, 0.06, 'square', 0.15);
      this.spawnNoiseBurst(now + d * 0.8, 0.09, 3400, 'bandpass', 0.32);
      this.spawnPunchTone(now + d * 0.82, 540, 290, 0.08, 'square', 0.18);
      return;
    }

    if (weaponId === 'pistol') {
      // Quick mag release -> snappy mag slap -> metallic slide rack
      this.spawnNoiseBurst(now + d * 0.12, 0.045, 2600, 'bandpass', 0.2);
      this.spawnPunchTone(now + d * 0.13, 620, 340, 0.045, 'triangle', 0.12);
      this.spawnNoiseBurst(now + d * 0.48, 0.055, 1900, 'bandpass', 0.26);
      this.spawnPunchTone(now + d * 0.49, 320, 490, 0.05, 'square', 0.15);
      this.spawnNoiseBurst(now + d * 0.78, 0.07, 3600, 'bandpass', 0.28);
      this.spawnPunchTone(now + d * 0.79, 860, 520, 0.05, 'square', 0.14);
      return;
    }

    if (weaponId === 'minigun') {
      // Heavy rotary drum unlatch -> metallic clunk -> fresh belt drum lock -> servo check
      this.spawnNoiseBurst(now + d * 0.12, 0.1, 1100, 'lowpass', 0.3);
      this.spawnPunchTone(now + d * 0.14, 190, 88, 0.12, 'sawtooth', 0.22);
      this.spawnNoiseBurst(now + d * 0.48, 0.11, 1450, 'bandpass', 0.32);
      this.spawnPunchTone(now + d * 0.5, 220, 145, 0.12, 'square', 0.22);
      this.spawnPunchTone(now + d * 0.76, 130, 310, 0.18, 'sawtooth', 0.16);
      this.spawnNoiseBurst(now + d * 0.84, 0.08, 2500, 'bandpass', 0.24);
      return;
    }

    // P90 top translucent magazine unlatch, seat slap & charging handle snap
    this.spawnNoiseBurst(now + d * 0.14, 0.05, 2400, 'bandpass', 0.22);
    this.spawnPunchTone(now + d * 0.15, 580, 380, 0.05, 'triangle', 0.13);
    this.spawnNoiseBurst(now + d * 0.54, 0.06, 1750, 'bandpass', 0.28);
    this.spawnPunchTone(now + d * 0.55, 290, 440, 0.06, 'square', 0.16);
    this.spawnNoiseBurst(now + d * 0.8, 0.065, 3300, 'bandpass', 0.26);
  }

  public playHitMarker(crit: boolean): void {
    if (!this.ctx || !this.sfxGain || this.settings.muted) return;
    const now = this.ctx.currentTime;
    this.spawnPunchTone(now, crit ? 1480 : 980, crit ? 720 : 540, 0.06, 'triangle', crit ? 0.26 : 0.17);
  }

  public playRoosterCrow(): void {
    if (!this.ctx || !this.sfxGain || this.settings.muted) return;
    const now = this.ctx.currentTime;
    // Expressive 4-syllable "Ku-ka-re-ku!" formant contour
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    filter.type = 'bandpass';
    filter.Q.value = 4.2;
    filter.frequency.setValueAtTime(1450, now);

    osc.frequency.setValueAtTime(520, now);
    osc.frequency.linearRampToValueAtTime(660, now + 0.09);
    osc.frequency.setValueAtTime(580, now + 0.12);
    osc.frequency.linearRampToValueAtTime(840, now + 0.23);
    osc.frequency.linearRampToValueAtTime(1060, now + 0.36);
    osc.frequency.exponentialRampToValueAtTime(790, now + 0.72);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.24, now + 0.05);
    gain.gain.setValueAtTime(0.2, now + 0.38);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.76);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.78);
  }

  public playRoosterPat(): void {
    if (!this.ctx || !this.sfxGain || this.settings.muted) return;
    const now = this.ctx.currentTime;
    // Happy clucking trills + soft wing flutter
    const notes = [620, 740, 860, 720];
    notes.forEach((hz, i) => {
      const t = now + i * 0.085;
      this.spawnPunchTone(t, hz, hz * 1.18, 0.065, 'triangle', 0.18);
    });
    this.spawnNoiseBurst(now + 0.05, 0.18, 900, 'bandpass', 0.14);
  }

  public playScreamer(reduced: boolean): void {
    if (!this.ctx || !this.sfxGain || this.settings.muted) return;
    const now = this.ctx.currentTime;
    const vol = reduced ? 0.26 : 0.72;
    const dur = reduced ? 0.52 : 1.05;

    // 1. Sudden visceral sub-bass chest slam + low dread rumble
    this.spawnPunchTone(now, 145, 28, dur * 0.72, 'sine', vol * 0.88);
    this.spawnPunchTone(now + 0.015, 98, 24, dur * 0.6, 'triangle', vol * 0.6);

    // 2. Terrifying distorted vocal-formant shriek (dual resonant formants sweeping erratically)
    const shriekOsc = this.ctx.createOscillator();
    const shriekMod = this.ctx.createOscillator();
    const shriekModGain = this.ctx.createGain();
    const shaper = this.ctx.createWaveShaper();
    const formant1 = this.ctx.createBiquadFilter();
    const shriekGain = this.ctx.createGain();

    shriekOsc.type = 'sawtooth';
    shriekOsc.frequency.setValueAtTime(640, now);
    shriekOsc.frequency.exponentialRampToValueAtTime(1180, now + 0.07);
    shriekOsc.frequency.linearRampToValueAtTime(920, now + 0.26);
    shriekOsc.frequency.exponentialRampToValueAtTime(340, now + dur);

    // Harsh growl FM rattle
    shriekMod.type = 'sawtooth';
    shriekMod.frequency.setValueAtTime(38, now);
    shriekMod.frequency.linearRampToValueAtTime(62, now + 0.2);
    shriekModGain.gain.setValueAtTime(185, now);
    shriekMod.connect(shriekModGain);
    shriekModGain.connect(shriekOsc.frequency);

    if (this.distCurve) {
      shaper.curve = this.distCurve;
      shaper.oversample = '2x';
    }
    formant1.type = 'bandpass';
    formant1.Q.value = 3.2;
    formant1.frequency.setValueAtTime(1650, now);
    formant1.frequency.exponentialRampToValueAtTime(2800, now + 0.12);
    formant1.frequency.exponentialRampToValueAtTime(980, now + dur);

    shriekGain.gain.setValueAtTime(0.001, now);
    shriekGain.gain.linearRampToValueAtTime(vol * 0.56, now + 0.014);
    shriekGain.gain.setValueAtTime(vol * 0.46, now + dur * 0.35);
    shriekGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    shriekOsc.connect(shaper);
    shaper.connect(formant1);
    formant1.connect(shriekGain);
    shriekGain.connect(this.sfxGain);
    shriekOsc.start(now);
    shriekMod.start(now);
    shriekOsc.stop(now + dur + 0.04);
    shriekMod.stop(now + dur + 0.04);

    // 3. Dissonant tritone metallic brass-sting chord
    const freqs = [293.66, 415.3, 622.25, 932.33, 1396.9];
    freqs.forEach((f, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const g = this.ctx.createGain();
      osc.type = idx % 2 === 0 ? 'sawtooth' : 'square';
      filter.type = 'bandpass';
      filter.Q.value = 2.8;
      filter.frequency.setValueAtTime(f * 1.45, now);
      filter.frequency.exponentialRampToValueAtTime(Math.max(210, f * 0.52), now + dur);

      osc.frequency.setValueAtTime(f * (1 + idx * 0.018), now);
      osc.frequency.linearRampToValueAtTime(f * 1.15, now + 0.06);
      osc.frequency.exponentialRampToValueAtTime(f * 0.54, now + dur);

      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(vol * 0.2, now + 0.016);
      g.gain.exponentialRampToValueAtTime(0.001, now + dur);

      osc.connect(filter);
      filter.connect(g);
      g.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + dur + 0.03);
    });

    // 4. Layered tape-rip hiss & jagged close-up breath static burst
    this.spawnNoiseBurst(now, dur * 0.42, 3600, 'highpass', vol * 0.58);
    this.spawnNoiseBurst(now + 0.03, dur * 0.78, 1280, 'bandpass', vol * 0.62);
    if (!reduced) {
      this.spawnNoiseBurst(now + 0.14, 0.14, 2400, 'bandpass', vol * 0.46);
    }
  }

  public playExeGlitch(): void {
    if (!this.ctx || !this.sfxGain || this.settings.muted) return;
    const now = this.ctx.currentTime;
    // Warped 1994 Windows critical-stop chord pitch-bent downward + digital stutter
    this.spawnPunchTone(now, 520, 370, 0.14, 'square', 0.18);
    this.spawnPunchTone(now + 0.07, 390, 210, 0.22, 'sawtooth', 0.2);
    this.spawnNoiseBurst(now + 0.02, 0.09, 3200, 'bandpass', 0.24);
  }

  public playPlayerHurt(): void {
    if (!this.ctx || !this.sfxGain || this.settings.muted) return;
    const now = this.ctx.currentTime;
    this.spawnPunchTone(now, 150, 48, 0.22, 'sawtooth', 0.4);
    this.spawnNoiseBurst(now, 0.14, 900, 'lowpass', 0.3);
  }

  public playObjectiveComplete(): void {
    if (!this.ctx || !this.sfxGain || this.settings.muted) return;
    const now = this.ctx.currentTime;
    const chord = [440, 554.37, 659.25, 880];
    chord.forEach((hz, idx) => {
      this.spawnPunchTone(now + idx * 0.08, hz, hz, 0.35, 'triangle', 0.18);
    });
  }

  public playFootstep(onRoad: boolean): void {
    if (!this.ctx || !this.sfxGain || this.settings.muted) return;
    const now = this.ctx.currentTime;
    const freq = onRoad ? 650 + Math.random() * 160 : 420 + Math.random() * 120;
    this.spawnNoiseBurst(now, 0.055, freq, 'bandpass', onRoad ? 0.12 : 0.08);
  }

  public playPickup(kind: 'ammo' | 'medkit' | 'overclock'): void {
    if (!this.ctx || !this.sfxGain || this.settings.muted) return;
    const now = this.ctx.currentTime;
    if (kind === 'overclock') {
      this.spawnPunchTone(now, 440, 880, 0.14, 'sawtooth', 0.2);
      this.spawnPunchTone(now + 0.09, 660, 1320, 0.18, 'triangle', 0.22);
      return;
    }
    const base = kind === 'medkit' ? 520 : 380;
    this.spawnPunchTone(now, base, base * 1.25, 0.09, 'triangle', 0.2);
    this.spawnPunchTone(now + 0.07, base * 1.25, base * 1.5, 0.11, 'triangle', 0.18);
  }

  public playFlashlightClick(): void {
    if (!this.ctx || !this.sfxGain || this.settings.muted) return;
    const now = this.ctx.currentTime;
    this.spawnNoiseBurst(now, 0.03, 3400, 'highpass', 0.2);
    this.spawnPunchTone(now, 920, 420, 0.03, 'square', 0.12);
  }

  public playUpgradeInstall(): void {
    if (!this.ctx || !this.sfxGain || this.settings.muted) return;
    const now = this.ctx.currentTime;
    const tones = [330, 440, 660, 880];
    tones.forEach((hz, i) => {
      this.spawnPunchTone(now + i * 0.055, hz, hz * 1.04, 0.16, 'square', 0.14);
    });
  }

  private spawnNoiseBurst(
    startTime: number,
    duration: number,
    filterFreq: number,
    filterType: BiquadFilterType,
    volume: number
  ): void {
    if (!this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(filterFreq, startTime);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    src.start(startTime);
    src.stop(startTime + duration + 0.01);
  }

  private spawnPunchTone(
    startTime: number,
    startHz: number,
    endHz: number,
    duration: number,
    type: OscillatorType,
    volume: number
  ): void {
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(startHz, startTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endHz), startTime + duration);
    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);
  }

  public dispose(): void {
    if (this.stepTimer !== null) {
      window.clearInterval(this.stepTimer);
      this.stepTimer = null;
    }
    this.customLoadToken += 1;
    if (this.customAudioEl) {
      try {
        this.customAudioEl.pause();
        this.customAudioEl.removeAttribute('src');
        this.customAudioEl.load();
      } catch {
        // ignore
      }
      this.customAudioEl = null;
    }
    this.revokeActiveCustomUrl();
    this.customTracks = [];
    this.activeCustomIdx = -1;
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}
