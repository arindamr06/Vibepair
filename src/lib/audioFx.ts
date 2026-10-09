/**
 * VibePair Web Audio DSP Effects & Ambient Music Engine
 * Provides real-time microphone voice transformation and generative romantic ambient soundscapes.
 */

export type VoiceEffectType = 'none' | 'cute' | 'deep' | 'robotic' | 'cosmic' | 'radio';

export class VoiceEffectProcessor {
  private ctx: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private destinationNode: MediaStreamAudioDestinationNode | null = null;
  private currentEffect: VoiceEffectType = 'none';

  // Nodes
  private filterLow: BiquadFilterNode | null = null;
  private filterHigh: BiquadFilterNode | null = null;
  private delayNode: DelayNode | null = null;
  private feedbackGain: GainNode | null = null;
  private oscMod: OscillatorNode | null = null;
  private modGain: GainNode | null = null;

  init(stream: MediaStream): MediaStream {
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();
      this.sourceNode = this.ctx.createMediaStreamSource(stream);
      this.destinationNode = this.ctx.createMediaStreamDestination();
      
      this.applyEffect('none');
      return this.destinationNode.stream;
    } catch (e) {
      console.warn('AudioContext not permitted or failed, returning raw stream:', e);
      return stream;
    }
  }

  applyEffect(effect: VoiceEffectType) {
    this.currentEffect = effect;
    if (!this.ctx || !this.sourceNode || !this.destinationNode) return;

    // Disconnect previous graph
    try {
      this.sourceNode.disconnect();
      if (this.oscMod) {
        this.oscMod.stop();
        this.oscMod.disconnect();
        this.oscMod = null;
      }
    } catch {}

    const now = this.ctx.currentTime;

    switch (effect) {
      case 'cute': {
        // High-pass filter boost + upper harmonics brightness
        const hp = this.ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.setValueAtTime(450, now);

        const peak = this.ctx.createBiquadFilter();
        peak.type = 'peaking';
        peak.frequency.setValueAtTime(3200, now);
        peak.gain.setValueAtTime(8, now);

        this.sourceNode.connect(hp);
        hp.connect(peak);
        peak.connect(this.destinationNode);
        break;
      }

      case 'deep': {
        // Low-pass warm filter + bass boost
        const lp = this.ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(950, now);

        const bass = this.ctx.createBiquadFilter();
        bass.type = 'lowshelf';
        bass.frequency.setValueAtTime(200, now);
        bass.gain.setValueAtTime(12, now);

        this.sourceNode.connect(bass);
        bass.connect(lp);
        lp.connect(this.destinationNode);
        break;
      }

      case 'robotic': {
        // Ring modulation with high-frequency oscillator
        const ring = this.ctx.createGain();
        ring.gain.value = 0;

        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(65, now);

        this.sourceNode.connect(ring);
        osc.connect(ring.gain);
        ring.connect(this.destinationNode);

        osc.start();
        this.oscMod = osc;
        break;
      }

      case 'cosmic': {
        // Echo and ethereal feedback delay
        const delay = this.ctx.createDelay();
        delay.delayTime.setValueAtTime(0.35, now);

        const feedback = this.ctx.createGain();
        feedback.gain.setValueAtTime(0.45, now);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1400, now);

        // Dry signal
        this.sourceNode.connect(this.destinationNode);

        // Wet signal
        this.sourceNode.connect(delay);
        delay.connect(filter);
        filter.connect(feedback);
        feedback.connect(delay);
        feedback.connect(this.destinationNode);
        break;
      }

      case 'radio': {
        // Narrow telephone/walkie-talkie bandpass
        const bp = this.ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(1600, now);
        bp.Q.setValueAtTime(2.5, now);

        const dist = this.ctx.createWaveShaper();
        dist.curve = makeDistortionCurve(15) as any;

        this.sourceNode.connect(bp);
        bp.connect(dist);
        dist.connect(this.destinationNode);
        break;
      }

      case 'none':
      default: {
        this.sourceNode.connect(this.destinationNode);
        break;
      }
    }
  }

  getEffect(): VoiceEffectType {
    return this.currentEffect;
  }

  destroy() {
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close();
    }
    this.ctx = null;
  }
}

function makeDistortionCurve(amount: number): Float32Array {
  const k = typeof amount === 'number' ? amount : 50;
  const n_samples = 44100;
  const curve = new Float32Array(n_samples);
  const deg = Math.PI / 180;
  for (let i = 0; i < n_samples; ++i) {
    const x = (i * 2) / n_samples - 1;
    curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

/**
 * Ambient Synthesizer for Romantic & Lo-Fi Couple Soundtracks
 * Generates warm, calming ambient pad chords and gentle binaural tones.
 */
export class AmbientSoundGenerator {
  private ctx: AudioContext | null = null;
  private isPlaying: boolean = false;
  private timer: number | null = null;
  private masterGain: GainNode | null = null;

  // Romantic chord progression (in Hz)
  private chords = [
    [130.81, 196.00, 246.94, 329.63], // Cmaj9
    [116.54, 174.61, 220.00, 293.66], // Bbmaj9
    [146.83, 220.00, 261.63, 349.23], // Dm7
    [123.47, 185.00, 233.08, 311.13], // Bm7
  ];

  start() {
    if (this.isPlaying) return;
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.06, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
      this.isPlaying = true;

      let chordIdx = 0;
      const playNextChord = () => {
        if (!this.isPlaying || !this.ctx || !this.masterGain) return;
        const currentChord = this.chords[chordIdx % this.chords.length];
        chordIdx++;

        currentChord.forEach((freq, idx) => {
          if (!this.ctx || !this.masterGain) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = idx === 0 ? 'sine' : 'triangle';
          osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

          // Subtle detune for shimmer warmth
          osc.detune.setValueAtTime((idx % 2 === 0 ? 4 : -4), this.ctx.currentTime);

          const now = this.ctx.currentTime;
          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(0.08 / currentChord.length, now + 2.5);
          gain.gain.linearRampToValueAtTime(0, now + 7.5);

          osc.connect(gain);
          gain.connect(this.masterGain);

          osc.start(now);
          osc.stop(now + 8);
        });

        this.timer = window.setTimeout(playNextChord, 6000);
      };

      playNextChord();
    } catch (e) {
      console.warn('Ambient player failed to start:', e);
    }
  }

  stop() {
    this.isPlaying = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close();
    }
    this.ctx = null;
  }

  toggle(): boolean {
    if (this.isPlaying) {
      this.stop();
      return false;
    } else {
      this.start();
      return true;
    }
  }

  getStatus(): boolean {
    return this.isPlaying;
  }
}
