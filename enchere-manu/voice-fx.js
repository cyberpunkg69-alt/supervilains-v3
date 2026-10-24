"use strict";
/* MANU Voice FX — effets audio locaux. Aucun enregistrement envoyé à un tiers. */
(() => {
  const OUTPUT_RATE = 16000;
  const MAX_DURATION = 15;
  const supported = () => Boolean(window.AudioContext || window.webkitAudioContext);
  const interpolate = (arr, x) => {
    if (x <= 0) return arr[0] || 0;
    if (x >= arr.length - 1) return arr[arr.length - 1] || 0;
    const i = Math.floor(x), f = x - i;
    return arr[i] * (1 - f) + arr[i + 1] * f;
  };
  function pitchPreservingTime(input, ratio) {
    // Rééchantillonnage par grains à fenêtres superposées :
    // change la hauteur de voix sans accélérer le débit des phrases.
    const grain = 1024, hop = 256, result = new Float32Array(input.length);
    const norm = new Float32Array(input.length);
    const weights = new Float32Array(grain);
    for (let i = 0; i < grain; i++)
      weights[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * (i + 0.5) / grain);
    for (let base = -grain + hop; base < input.length; base += hop) {
      for (let j = 0; j < grain; j++) {
        const at = base + j;
        if (at < 0 || at >= input.length) continue;
        const sourceAt = base + grain * 0.5 + (j - grain * 0.5) * ratio;
        const w = weights[j];
        result[at] += interpolate(input, sourceAt) * w;
        norm[at] += w;
      }
    }
    for (let i = 0; i < result.length; i++) result[i] /= Math.max(norm[i], 0.00001);
    return result;
  }
  function modify(mono, preset) {
    const n = mono.length, output = new Float32Array(n);
    let source = mono;
    if (preset === "monster") source = pitchPreservingTime(mono, 0.70);
    if (preset === "squirrel") source = pitchPreservingTime(mono, 1.48);
    if (preset === "deep") source = pitchPreservingTime(mono, 0.83);
    let prev = 0;
    for (let i = 0; i < n; i++) {
      const v = source[i];
      if (preset === "robot") {
        const t = i / OUTPUT_RATE;
        const ring = 0.35 + 0.65 * Math.sin(2 * Math.PI * 42 * t);
        output[i] = Math.tanh((v * ring + v * 0.12) * 1.65) * 0.90;
      } else if (preset === "monster") {
        prev += 0.36 * (Math.tanh(v * 1.8) - prev);
        output[i] = prev * 0.95;
      } else if (preset === "squirrel") {
        prev += 0.13 * (v - prev);
        output[i] = (v - 0.13 * prev) * 0.94;
      } else if (preset === "deep") {
        prev += 0.27 * (v - prev);
        output[i] = prev;
      } else {
        output[i] = v;
      }
    }
    let peak = 0;
    for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(output[i]));
    const gain = peak > 0.0001 ? Math.min(1.8, 0.9 / peak) : 1;
    for (let i = 0; i < n; i++) output[i] = Math.max(-1, Math.min(1, output[i] * gain));
    return output;
  }
  function wav(samples) {
    // WAV PCM 16 bits mono, largement lisible sur Chrome et Safari.
    const bytes = new ArrayBuffer(44 + samples.length * 2);
    const v = new DataView(bytes);
    const chunk = (offset, value) => { for (let i = 0; i < value.length; i++) v.setUint8(offset + i, value.charCodeAt(i)); };
    chunk(0, "RIFF"); v.setUint32(4, bytes.byteLength - 8, true); chunk(8, "WAVE");
    chunk(12, "fmt "); v.setUint32(16, 16, true);
    v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, OUTPUT_RATE, true); v.setUint32(28, OUTPUT_RATE * 2, true);
    v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    chunk(36, "data"); v.setUint32(40, samples.length * 2, true);
    for (let i = 0; i < samples.length; i++) {
      const value = Math.max(-1, Math.min(1, samples[i]));
      v.setInt16(44 + 2 * i, value < 0 ? value * 32768 : value * 32767, true);
    }
    return new Blob([bytes], { type: "audio/wav" });
  }
  async function transform(original, preset) {
    if (!["robot", "monster", "squirrel", "deep"].includes(preset))
      throw new Error("Effet vocal inconnu.");
    if (!supported()) throw new Error("Modification vocale non compatible avec ce navigateur.");
    if (!(original instanceof Blob) || original.size > 3 * 1024 * 1024)
      throw new Error("Enregistrement invalide.");
    const Context = window.AudioContext || window.webkitAudioContext;
    const ac = new Context();
    let buffer;
    try {
      const encoded = await original.arrayBuffer();
      buffer = await ac.decodeAudioData(encoded);
    } catch {
      throw new Error("Impossible de décoder le vocal sur ce navigateur. Essaie un autre navigateur.");
    } finally {
      try { await ac.close(); } catch {}
    }
    if (!buffer || !buffer.length || !buffer.sampleRate)
      throw new Error("Vocal vide.");
    const total = Math.min(Math.floor(buffer.duration * OUTPUT_RATE), MAX_DURATION * OUTPUT_RATE);
    if (total < 2000) throw new Error("Le message doit durer au moins un instant.");
    const mono = new Float32Array(total);
    const channels = Math.min(2, buffer.numberOfChannels);
    const ch = Array.from({ length: channels }, (_, i) => buffer.getChannelData(i));
    const increment = buffer.sampleRate / OUTPUT_RATE;
    for (let i = 0; i < total; i++) {
      const at = i * increment;
      let value = 0;
      for (const samples of ch) value += interpolate(samples, at);
      mono[i] = value / channels;
    }
    const altered = modify(mono, preset);
    const finished = wav(altered);
    if (finished.size > 3 * 1024 * 1024) throw new Error("Vocal transformé trop lourd.");
    return finished;
  }
  window.ManuVoiceFX = Object.freeze({ transform, supported });
})();