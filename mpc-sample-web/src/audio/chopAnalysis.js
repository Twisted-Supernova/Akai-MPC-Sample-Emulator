// Chop slicing analysis - simplified peak/RMS based, not Akai's proprietary algorithm (see README).

function getMonoData(buffer) {
  if (buffer.numberOfChannels === 1) return buffer.getChannelData(0);
  const ch0 = buffer.getChannelData(0);
  const ch1 = buffer.getChannelData(1);
  const out = new Float32Array(ch0.length);
  for (let i = 0; i < ch0.length; i++) out[i] = (ch0[i] + ch1[i]) / 2;
  return out;
}

// Threshold mode: scans for onsets where RMS energy rises sharply above `threshold` (0-100),
// after having dropped low enough beforehand. Produces up to 16 slices.
export function chopByThreshold(buffer, thresholdPercent) {
  const data = getMonoData(buffer);
  const windowSize = Math.floor(buffer.sampleRate * 0.01); // 10ms windows
  const numWindows = Math.floor(data.length / windowSize);
  const rms = new Float32Array(numWindows);
  let peak = 0;
  for (let w = 0; w < numWindows; w++) {
    let sum = 0;
    const start = w * windowSize;
    for (let i = 0; i < windowSize; i++) {
      const s = data[start + i];
      sum += s * s;
    }
    rms[w] = Math.sqrt(sum / windowSize);
    if (rms[w] > peak) peak = rms[w];
  }
  if (peak === 0) return [{ start: 0, end: 1 }];

  const normThreshold = (thresholdPercent / 100) * peak;
  const onsets = [0];
  let armed = true;
  for (let w = 1; w < numWindows; w++) {
    if (armed && rms[w] > normThreshold) {
      onsets.push(w * windowSize / data.length);
      armed = false;
    } else if (rms[w] < normThreshold * 0.3) {
      armed = true;
    }
    if (onsets.length >= 16) break;
  }

  const slices = onsets.map((start, i) => ({
    start,
    end: i + 1 < onsets.length ? onsets[i + 1] : 1,
  }));
  return slices;
}

export function chopByRegions(count) {
  const slices = [];
  for (let i = 0; i < count; i++) {
    slices.push({ start: i / count, end: (i + 1) / count });
  }
  return slices;
}
