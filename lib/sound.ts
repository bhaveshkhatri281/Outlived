"use client";

import { useSyncExternalStore } from "react";

/**
 * Ambient sound, OFF by default and never autoplayed. Everything is
 * synthesised with Web Audio (no files): a low drone with slow filter
 * movement, and a short paper-fold sound for page turns and transitions.
 */
class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private drone: { stop: () => void } | null = null;
  enabled = false;
  private listeners = new Set<() => void>();

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  private emit() {
    this.listeners.forEach((fn) => fn());
  }

  /** Must be called from a user gesture. */
  async toggle() {
    if (this.enabled) this.disable();
    else await this.enable();
  }

  async enable() {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx ??= new AC();
    await this.ctx.resume();
    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(ctx.destination);
    this.master.gain.linearRampToValueAtTime(1, ctx.currentTime + 1.5);
    this.drone = this.startDrone(ctx, this.master);
    this.enabled = true;
    this.emit();
  }

  disable() {
    const ctx = this.ctx;
    if (ctx && this.master) {
      const m = this.master;
      const d = this.drone;
      m.gain.cancelScheduledValues(ctx.currentTime);
      m.gain.setValueAtTime(m.gain.value, ctx.currentTime);
      m.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
      setTimeout(() => {
        d?.stop();
        m.disconnect();
        ctx.suspend();
      }, 700);
    }
    this.master = null;
    this.drone = null;
    this.enabled = false;
    this.emit();
  }

  private startDrone(ctx: AudioContext, out: AudioNode) {
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 380;
    filter.Q.value = 0.7;
    const gain = ctx.createGain();
    gain.gain.value = 0.045;
    filter.connect(gain).connect(out);

    const oscs = [
      { type: "sine" as OscillatorType, f: 55 },
      { type: "triangle" as OscillatorType, f: 82.6 },
      { type: "sine" as OscillatorType, f: 110.4 },
    ].map(({ type, f }, i) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = [0.9, 0.35, 0.18][i];
      o.connect(g).connect(filter);
      o.start();
      return o;
    });

    // Slow movement in the filter, like air in a large room.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.06;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 140;
    lfo.connect(lfoGain).connect(filter.frequency);
    lfo.start();

    // Room tone: very quiet filtered noise.
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer(ctx, 2);
    noise.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 320;
    bp.Q.value = 0.4;
    const ng = ctx.createGain();
    ng.gain.value = 0.012;
    noise.connect(bp).connect(ng).connect(out);
    noise.start();

    return {
      stop: () => {
        oscs.forEach((o) => o.stop());
        lfo.stop();
        noise.stop();
      },
    };
  }

  private noiseBuffer(ctx: AudioContext, seconds: number) {
    const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  /** A soft paper fold: a filtered noise swish plus a low thump. */
  fold() {
    if (!this.enabled || !this.ctx || !this.master) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(ctx, 0.3);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 1.1;
    bp.frequency.setValueAtTime(2400, t);
    bp.frequency.exponentialRampToValueAtTime(700, t + 0.22);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.22, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    src.connect(bp).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + 0.3);

    const thump = ctx.createOscillator();
    thump.frequency.setValueAtTime(140, t);
    thump.frequency.exponentialRampToValueAtTime(60, t + 0.08);
    const tg = ctx.createGain();
    tg.gain.setValueAtTime(0.12, t);
    tg.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    thump.connect(tg).connect(this.master);
    thump.start(t);
    thump.stop(t + 0.12);
  }
}

export const sound = typeof window !== "undefined" ? new SoundEngine() : (null as unknown as SoundEngine);

export function playFold() {
  sound?.fold();
}

export function useSoundEnabled() {
  return useSyncExternalStore(
    (cb) => sound.subscribe(cb),
    () => sound.enabled,
    () => false,
  );
}
