import { useEffect, useRef } from 'react';

function drawWaveform(ctx, buffer, w, h) {
  const data = buffer.getChannelData(0);
  const step = Math.ceil(data.length / w);
  const mid = h / 2;
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--screen-accent') || '#f2a93b';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x < w; x++) {
    let min = 1;
    let max = -1;
    const start = x * step;
    for (let i = 0; i < step; i++) {
      const v = data[start + i] || 0;
      if (v < min) min = v;
      if (v > max) max = v;
    }
    ctx.moveTo(x, mid + min * mid * 0.95);
    ctx.lineTo(x, mid + max * mid * 0.95);
  }
  ctx.stroke();
}

export default function WaveformCanvas({ buffer, start = 0, end = 1, loopStart, showLoop, sliceLines, selectedSliceIndex, height = 60 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.clientWidth || 260;
    const h = height;
    canvas.width = w * window.devicePixelRatio;
    canvas.height = h * window.devicePixelRatio;
    const ctx = canvas.getContext('2d');
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.clearRect(0, 0, w, h);

    if (!buffer) {
      ctx.fillStyle = '#3a3a3a';
      ctx.font = '9px monospace';
      ctx.fillText('NO SAMPLE LOADED', 8, h / 2);
      return;
    }

    drawWaveform(ctx, buffer, w, h);

    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, start * w, h);
    ctx.fillRect(end * w, 0, w - end * w, h);

    if (showLoop && loopStart != null) {
      ctx.strokeStyle = '#7fd3ff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(loopStart * w, 0);
      ctx.lineTo(loopStart * w, h);
      ctx.stroke();
    }

    ctx.strokeStyle = '#e8e6e0';
    ctx.lineWidth = 1.5;
    [start, end].forEach((p) => {
      ctx.beginPath();
      ctx.moveTo(p * w, 0);
      ctx.lineTo(p * w, h);
      ctx.stroke();
    });

    if (sliceLines) {
      sliceLines.forEach((s, i) => {
        ctx.strokeStyle = i === selectedSliceIndex ? '#3ddc84' : 'rgba(255,255,255,0.35)';
        ctx.lineWidth = i === selectedSliceIndex ? 2 : 1;
        ctx.beginPath();
        ctx.moveTo(s.start * w, 0);
        ctx.lineTo(s.start * w, h);
        ctx.stroke();
      });
    }
  }, [buffer, start, end, loopStart, showLoop, sliceLines, selectedSliceIndex, height]);

  return <canvas ref={canvasRef} style={{ width: '100%', height, display: 'block' }} />;
}
