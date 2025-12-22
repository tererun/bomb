let audioContext: AudioContext | null = null;
let masterGain: GainNode | null = null;
let masterVolume = 0.5;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
    masterGain = audioContext.createGain();
    masterGain.connect(audioContext.destination);
    masterGain.gain.value = masterVolume;
  }
  return audioContext;
}

function getMasterGain(): GainNode {
  getAudioContext();
  return masterGain!;
}

export function setVolume(volume: number) {
  masterVolume = Math.max(0, Math.min(1, volume));
  if (masterGain) {
    masterGain.gain.value = masterVolume;
  }
  if (typeof window !== "undefined") {
    localStorage.setItem("bombGame_volume", String(masterVolume));
  }
}

export function getVolume(): number {
  return masterVolume;
}

export function initVolume() {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("bombGame_volume");
    if (saved !== null) {
      masterVolume = parseFloat(saved);
      if (masterGain) {
        masterGain.gain.value = masterVolume;
      }
    }
  }
}

// Dice roll sound - rattling effect
export function playDiceRoll() {
  const ctx = getAudioContext();
  const dest = getMasterGain();
  const now = ctx.currentTime;

  for (let i = 0; i < 8; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(dest);
    
    osc.type = "square";
    osc.frequency.value = 200 + Math.random() * 400;
    
    const startTime = now + i * 0.05;
    gain.gain.setValueAtTime(0.1, startTime);
    gain.gain.setTargetAtTime(0.01, startTime, 0.02);
    
    osc.start(startTime);
    osc.stop(startTime + 0.05);
  }
}

// Dice result sound - triumphant ding
export function playDiceResult() {
  const ctx = getAudioContext();
  const dest = getMasterGain();
  const now = ctx.currentTime;

  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.connect(gain1);
  gain1.connect(dest);
  osc1.type = "sine";
  osc1.frequency.value = 523.25;
  gain1.gain.setValueAtTime(0.3, now);
  gain1.gain.setTargetAtTime(0.01, now, 0.1);
  osc1.start(now);
  osc1.stop(now + 0.3);

  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.connect(gain2);
  gain2.connect(dest);
  osc2.type = "sine";
  osc2.frequency.value = 659.25;
  gain2.gain.setValueAtTime(0.2, now + 0.05);
  gain2.gain.setTargetAtTime(0.01, now + 0.05, 0.1);
  osc2.start(now + 0.05);
  osc2.stop(now + 0.35);
}

// Bomb pass sound - whoosh
export function playBombPass() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(getMasterGain());

  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(150, now);
  osc.frequency.exponentialRampToValueAtTime(400, now + 0.15);
  osc.frequency.exponentialRampToValueAtTime(100, now + 0.3);

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1000, now);
  filter.frequency.exponentialRampToValueAtTime(300, now + 0.3);

  gain.gain.setValueAtTime(0.15, now);
  gain.gain.setTargetAtTime(0.01, now + 0.1, 0.1);

  osc.start(now);
  osc.stop(now + 0.4);
}

// Explosion sound - dramatic boom
export function playExplosion() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  // Low boom
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.type = "sine";
  osc1.frequency.setValueAtTime(100, now);
  osc1.frequency.exponentialRampToValueAtTime(30, now + 0.5);
  gain1.gain.setValueAtTime(0.5, now);
  gain1.gain.setTargetAtTime(0.01, now, 0.2);
  osc1.start(now);
  osc1.stop(now + 0.6);

  // Noise burst
  const bufferSize = ctx.sampleRate * 0.5;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.1));
  }
  const noise = ctx.createBufferSource();
  const noiseGain = ctx.createGain();
  const noiseFilter = ctx.createBiquadFilter();
  noise.buffer = buffer;
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(getMasterGain());
  noiseFilter.type = "lowpass";
  noiseFilter.frequency.value = 2000;
  noiseGain.gain.setValueAtTime(0.4, now);
  noiseGain.gain.setTargetAtTime(0.01, now, 0.15);
  noise.start(now);

  // Crackle
  for (let i = 0; i < 5; i++) {
    const crackle = ctx.createOscillator();
    const crackleGain = ctx.createGain();
    crackle.connect(crackleGain);
    crackleGain.connect(getMasterGain());
    crackle.type = "square";
    crackle.frequency.value = 50 + Math.random() * 100;
    const t = now + 0.1 + i * 0.08;
    crackleGain.gain.setValueAtTime(0.1, t);
    crackleGain.gain.setTargetAtTime(0.01, t, 0.02);
    crackle.start(t);
    crackle.stop(t + 0.1);
  }
}

// Turn change sound - gentle notification
export function playTurnChange() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(getMasterGain());
  osc.type = "sine";
  osc.frequency.value = 440; // A4
  gain.gain.setValueAtTime(0.15, now);
  gain.gain.setTargetAtTime(0.01, now, 0.1);
  osc.start(now);
  osc.stop(now + 0.15);
}

// Your turn sound - attention grabbing
export function playYourTurn() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(getMasterGain());
    osc.type = "sine";
    osc.frequency.value = freq;
    const t = now + i * 0.1;
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.setTargetAtTime(0.01, t, 0.15);
    osc.start(t);
    osc.stop(t + 0.2);
  });
}

// Direction reverse sound - swoosh down
export function playReverse() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(getMasterGain());
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(800, now);
  osc.frequency.exponentialRampToValueAtTime(200, now + 0.3);
  gain.gain.setValueAtTime(0.15, now);
  gain.gain.setTargetAtTime(0.01, now + 0.1, 0.1);
  osc.start(now);
  osc.stop(now + 0.4);
}

// HP halved sound - danger alert
export function playHalve() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  for (let i = 0; i < 3; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(getMasterGain());
    osc.type = "square";
    osc.frequency.value = 220;
    const t = now + i * 0.15;
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.setTargetAtTime(0.01, t, 0.05);
    osc.start(t);
    osc.stop(t + 0.1);
  }
}

// Player join sound
export function playPlayerJoin() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(getMasterGain());
  osc.type = "sine";
  osc.frequency.setValueAtTime(300, now);
  osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
  gain.gain.setValueAtTime(0.15, now);
  gain.gain.setTargetAtTime(0.01, now, 0.1);
  osc.start(now);
  osc.stop(now + 0.15);
}

// Game start sound - fanfare
export function playGameStart() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(getMasterGain());
    osc.type = "triangle";
    osc.frequency.value = freq;
    const t = now + i * 0.12;
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.setTargetAtTime(0.01, t, 0.2);
    osc.start(t);
    osc.stop(t + 0.3);
  });
}

// Win sound - victory fanfare
export function playWin() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  const melody = [
    { freq: 523.25, time: 0, dur: 0.15 },
    { freq: 659.25, time: 0.15, dur: 0.15 },
    { freq: 783.99, time: 0.3, dur: 0.15 },
    { freq: 1046.50, time: 0.45, dur: 0.4 },
  ];

  melody.forEach(({ freq, time, dur }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(getMasterGain());
    osc.type = "triangle";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.25, now + time);
    gain.gain.setTargetAtTime(0.01, now + time + dur * 0.7, 0.1);
    osc.start(now + time);
    osc.stop(now + time + dur);
  });
}

// Lose sound - sad trombone
export function playLose() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  const notes = [
    { freq: 392, time: 0, dur: 0.3 },
    { freq: 369.99, time: 0.3, dur: 0.3 },
    { freq: 349.23, time: 0.6, dur: 0.3 },
    { freq: 329.63, time: 0.9, dur: 0.6 },
  ];

  notes.forEach(({ freq, time, dur }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(getMasterGain());
    osc.type = "sawtooth";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.1, now + time);
    gain.gain.setTargetAtTime(0.01, now + time + dur * 0.8, 0.1);
    osc.start(now + time);
    osc.stop(now + time + dur);
  });
}

// Tick sound for bomb (optional, for tension)
export function playTick() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(getMasterGain());
  osc.type = "sine";
  osc.frequency.value = 1000;
  gain.gain.setValueAtTime(0.1, now);
  gain.gain.setTargetAtTime(0.01, now, 0.02);
  osc.start(now);
  osc.stop(now + 0.05);
}

// Dice shaking sound - wooden rattling
export function playDiceShake(intensity: number = 0.5) {
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  const dest = getMasterGain();

  // Number of clicks based on intensity
  const clicks = Math.floor(1 + intensity * 3);
  
  for (let i = 0; i < clicks; i++) {
    const delay = i * (0.02 + Math.random() * 0.03);
    
    // Wood knock sound - short noise burst with resonance
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    
    // Random frequency for variety
    const baseFreq = 800 + Math.random() * 600;
    osc.type = "square";
    osc.frequency.setValueAtTime(baseFreq, now + delay);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.5, now + delay + 0.02);
    
    filter.type = "bandpass";
    filter.frequency.value = 1200 + Math.random() * 800;
    filter.Q.value = 2;
    
    const vol = 0.08 * intensity;
    gain.gain.setValueAtTime(vol, now + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.03);
    
    osc.start(now + delay);
    osc.stop(now + delay + 0.04);
    
    // Add a lower thud for body
    const thud = ctx.createOscillator();
    const thudGain = ctx.createGain();
    const thudFilter = ctx.createBiquadFilter();
    
    thud.connect(thudFilter);
    thudFilter.connect(thudGain);
    thudGain.connect(dest);
    
    thud.type = "sine";
    thud.frequency.setValueAtTime(150 + Math.random() * 100, now + delay);
    thud.frequency.exponentialRampToValueAtTime(80, now + delay + 0.02);
    
    thudFilter.type = "lowpass";
    thudFilter.frequency.value = 400;
    
    thudGain.gain.setValueAtTime(vol * 0.6, now + delay);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.025);
    
    thud.start(now + delay);
    thud.stop(now + delay + 0.03);
  }
}
