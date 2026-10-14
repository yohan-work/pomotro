/**
 * 지하철 사운드 — 전부 WebAudio 로 실시간 합성한다 (외부 음원 없음 → 라이선스 문제 없음).
 *
 * 채널 (개별 볼륨/음소거)
 * - rolling : 주행음 (바퀴 굴림 노이즈 + 가감속 시 모터 인버터음)
 * - rail    : 레일 이음매 "덜컹-덜컹"
 * - chime   : 출발/도착 안내 차임 (자체 작곡)
 * - door    : 출입문 경고음 + 공압음
 * - ambient : 객실 공조음 + 잔잔한 패드
 *
 * 브라우저 자동재생 정책: 사용자의 명시적 동작(출발하기/소리 켜기) 이후에만 `start()` 한다.
 */

export type Channel = "rolling" | "rail" | "chime" | "door" | "ambient";
export const CHANNELS: Channel[] = ["rolling", "rail", "chime", "door", "ambient"];

export interface AudioState {
  v: number;
  a: number;
  x: number;
  /** 터널 안이면 1 (울림 증가) */
  enclosed: number;
  /** 다리 위면 1 (철교 공명) */
  bridge: number;
  moving: boolean;
}

function noiseBuffer(ctx: AudioContext, seconds: number, brown: boolean): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    if (brown) {
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.5;
    } else d[i] = w;
  }
  return buf;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private ch = {} as Record<Channel, GainNode>;
  private rollGain!: GainNode;
  private rollFilter!: BiquadFilterNode;
  private motorGain!: GainNode;
  private motorOsc: OscillatorNode[] = [];
  private hissGain!: GainNode;
  private ambientGain!: GainNode;
  private white!: AudioBuffer;
  private reverb!: ConvolverNode;
  private reverbSend!: GainNode;
  private lastJoint = Number.NaN;
  private volumes: Record<Channel, number> = { rolling: 0.8, rail: 0.7, chime: 0.7, door: 0.6, ambient: 0.4 };
  private masterVol = 0.8;
  private muted = false;
  started = false;

  start() {
    if (this.started) {
      this.ctx?.resume();
      return;
    }
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    this.ctx = ctx;
    this.started = true;

    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : this.masterVol;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 3;
    this.master.connect(comp).connect(ctx.destination);

    // 터널 울림용 리버브 (지수 감쇠 노이즈 임펄스)
    this.reverb = ctx.createConvolver();
    const ir = ctx.createBuffer(2, ctx.sampleRate * 1.6, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
    }
    this.reverb.buffer = ir;
    this.reverbSend = ctx.createGain();
    this.reverbSend.gain.value = 0;
    this.reverbSend.connect(this.reverb).connect(this.master);

    for (const c of CHANNELS) {
      const g = ctx.createGain();
      g.gain.value = this.volumes[c];
      g.connect(this.master);
      this.ch[c] = g;
    }
    this.ch.rail.connect(this.reverbSend);
    this.ch.rolling.connect(this.reverbSend);

    this.white = noiseBuffer(ctx, 2, false);

    // 주행음: 브라운 노이즈 → 로우패스, 속도에 따라 음량/밝기 증가
    const brown = ctx.createBufferSource();
    brown.buffer = noiseBuffer(ctx, 4, true);
    brown.loop = true;
    this.rollFilter = ctx.createBiquadFilter();
    this.rollFilter.type = "lowpass";
    this.rollFilter.frequency.value = 180;
    this.rollGain = ctx.createGain();
    this.rollGain.gain.value = 0;
    brown.connect(this.rollFilter).connect(this.rollGain).connect(this.ch.rolling);
    brown.start();

    // 바람/공기 노이즈 (고속에서)
    const hiss = ctx.createBufferSource();
    hiss.buffer = this.white;
    hiss.loop = true;
    const hissF = ctx.createBiquadFilter();
    hissF.type = "bandpass";
    hissF.frequency.value = 900;
    hissF.Q.value = 0.5;
    this.hissGain = ctx.createGain();
    this.hissGain.gain.value = 0;
    hiss.connect(hissF).connect(this.hissGain).connect(this.ch.rolling);
    hiss.start();

    // 모터 인버터음: 가감속 때만 속도에 따라 음높이가 오르내린다
    this.motorGain = ctx.createGain();
    this.motorGain.gain.value = 0;
    const motorF = ctx.createBiquadFilter();
    motorF.type = "bandpass";
    motorF.frequency.value = 700;
    motorF.Q.value = 1.2;
    for (const type of ["sawtooth", "triangle"] as OscillatorType[]) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = 220;
      o.connect(motorF);
      o.start();
      this.motorOsc.push(o);
    }
    motorF.connect(this.motorGain).connect(this.ch.rolling);

    // 객실 공조음 + 잔잔한 패드
    this.ambientGain = ctx.createGain();
    this.ambientGain.gain.value = 0.0;
    const air = ctx.createBufferSource();
    air.buffer = this.white;
    air.loop = true;
    const airF = ctx.createBiquadFilter();
    airF.type = "lowpass";
    airF.frequency.value = 420;
    const airG = ctx.createGain();
    airG.gain.value = 0.05;
    air.connect(airF).connect(airG).connect(this.ambientGain);
    air.start();
    const padG = ctx.createGain();
    padG.gain.value = 0.018;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoG = ctx.createGain();
    lfoG.gain.value = 0.01;
    lfo.connect(lfoG).connect(padG.gain);
    lfo.start();
    for (const fq of [130.81, 196.0, 246.94, 329.63]) {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = fq;
      o.connect(padG);
      o.start();
    }
    padG.connect(this.ambientGain);
    this.ambientGain.connect(this.ch.ambient);
    this.ambientGain.gain.setTargetAtTime(1, ctx.currentTime, 1.5);
  }

  setVolume(c: Channel, v: number) {
    this.volumes[c] = v;
    if (this.ctx) this.ch[c].gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
  }

  setMaster(v: number, muted: boolean) {
    this.masterVol = v;
    this.muted = muted;
    if (this.ctx) this.master.gain.setTargetAtTime(muted ? 0 : v, this.ctx.currentTime, 0.08);
  }

  /** 일시정지 등에서 주행음을 잠시 끈다 */
  suspendMotion() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.rollGain.gain.setTargetAtTime(0, t, 0.25);
    this.hissGain.gain.setTargetAtTime(0, t, 0.25);
    this.motorGain.gain.setTargetAtTime(0, t, 0.15);
  }

  update(s: AudioState) {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== "running") return;
    const t = ctx.currentTime;
    const vn = Math.min(1, s.v / 22);
    const enclosedBoost = 1 + s.enclosed * 0.6;
    this.rollGain.gain.setTargetAtTime(vn * 0.55 * enclosedBoost, t, 0.15);
    this.rollFilter.frequency.setTargetAtTime(160 + vn * 520 + s.enclosed * 200, t, 0.2);
    this.hissGain.gain.setTargetAtTime(vn * vn * 0.05 * enclosedBoost, t, 0.2);
    this.reverbSend.gain.setTargetAtTime(s.enclosed * 0.35, t, 0.4);

    // 인버터음: 속도에 비례한 주파수, 가속도 크기에 비례한 음량
    const motorAmt = Math.min(1, Math.abs(s.a) / 0.9) * (s.v > 0.3 ? 1 : 0);
    const f0 = 180 + s.v * 38;
    this.motorOsc[0].frequency.setTargetAtTime(f0, t, 0.05);
    this.motorOsc[1].frequency.setTargetAtTime(f0 * 1.5, t, 0.05);
    this.motorGain.gain.setTargetAtTime(motorAmt * 0.06, t, 0.2);

    // 레일 이음매: 트랙 위치가 이음매를 지날 때 대차 2축 "덜컹-덜컹"
    const jointGap = s.bridge > 0.5 ? 12 : 25;
    const j = Math.floor(s.x / jointGap);
    if (!Number.isNaN(this.lastJoint) && j !== this.lastJoint && s.v > 1.5 && j - this.lastJoint < 3) {
      const axle = 2.1 / s.v;
      const bogie = 12 / s.v;
      const amp = Math.min(1, s.v / 14) * (s.bridge > 0.5 ? 1.25 : 1);
      for (const off of [0, axle, bogie, bogie + axle]) {
        if (off < 1.5) this.clack(t + 0.02 + off, amp, s.bridge);
      }
    }
    this.lastJoint = j;
  }

  private clack(when: number, amp: number, bridge: number) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.white;
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = bridge > 0.5 ? 520 : 1300;
    f.Q.value = 1.4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(0.35 * amp, when + 0.004);
    g.gain.exponentialRampToValueAtTime(0.001, when + (bridge > 0.5 ? 0.16 : 0.07));
    src.connect(f).connect(g).connect(this.ch.rail);
    src.start(when, Math.random() * 1.5, 0.2);
    // 저음 쿵
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(bridge > 0.5 ? 70 : 95, when);
    o.frequency.exponentialRampToValueAtTime(45, when + 0.08);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0, when);
    og.gain.linearRampToValueAtTime(0.25 * amp, when + 0.005);
    og.gain.exponentialRampToValueAtTime(0.001, when + 0.12);
    o.connect(og).connect(this.ch.rail);
    o.start(when);
    o.stop(when + 0.15);
  }

  private bell(when: number, freq: number, dur: number, gain: number, dest: GainNode) {
    const ctx = this.ctx!;
    for (const [mult, g] of [
      [1, 1],
      [2.01, 0.25],
      [3.98, 0.08],
    ] as const) {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = freq * mult;
      const og = ctx.createGain();
      og.gain.setValueAtTime(0, when);
      og.gain.linearRampToValueAtTime(gain * g, when + 0.01);
      og.gain.exponentialRampToValueAtTime(0.0008, when + dur);
      o.connect(og).connect(dest);
      o.start(when);
      o.stop(when + dur + 0.05);
    }
  }

  /** 도착 안내 차임 (자체 작곡: 상행 4음) */
  arrivalChime() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.05;
    [659.25, 783.99, 987.77, 1318.51].forEach((f, i) => this.bell(t + i * 0.22, f, 1.4, 0.22, this.ch.chime));
  }

  /** 출발 알림 (하행 2음) */
  departChime() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.05;
    this.bell(t, 880, 1.1, 0.2, this.ch.chime);
    this.bell(t + 0.32, 698.46, 1.4, 0.2, this.ch.chime);
  }

  /** 출입문 닫힘 경고음 + 공압음 + 닫힘 충격음 */
  doorClose() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + 0.05;
    for (let k = 0; k < 4; k++) {
      const o = ctx.createOscillator();
      o.type = "square";
      o.frequency.value = 1046;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t + k * 0.38);
      g.gain.linearRampToValueAtTime(0.045, t + k * 0.38 + 0.01);
      g.gain.setValueAtTime(0.045, t + k * 0.38 + 0.18);
      g.gain.linearRampToValueAtTime(0, t + k * 0.38 + 0.2);
      o.connect(g).connect(this.ch.door);
      o.start(t + k * 0.38);
      o.stop(t + k * 0.38 + 0.22);
    }
    this.pneumatic(t + 1.6, 0.9);
    this.thump(t + 2.4);
  }

  doorOpen() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.05;
    this.pneumatic(t, 0.7);
    this.thump(t + 0.9);
  }

  private pneumatic(when: number, dur: number) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.white;
    const f = ctx.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = 2200;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(0.12, when + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, when + dur);
    src.connect(f).connect(g).connect(this.ch.door);
    src.start(when, 0, dur + 0.1);
  }

  private thump(when: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(120, when);
    o.frequency.exponentialRampToValueAtTime(50, when + 0.1);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.3, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + 0.18);
    o.connect(g).connect(this.ch.door);
    o.start(when);
    o.stop(when + 0.2);
  }

  /** 탭이 숨겨지면 컨텍스트를 일시정지해 리소스를 아낀다 */
  setHidden(hidden: boolean) {
    if (!this.ctx) return;
    if (hidden) this.ctx.suspend();
    else this.ctx.resume();
  }

  dispose() {
    this.ctx?.close();
    this.ctx = null;
    this.started = false;
  }
}
