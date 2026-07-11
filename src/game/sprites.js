import * as THREE from 'three';

const textureCache = new Map();

/**
 * Draw a cute pixel-ish character sprite onto a canvas texture.
 */
export function createCharacterTexture(emoji, bodyColor = '#6EC6FF', outline = '#1a3a2a') {
  const key = `char:${emoji}:${bodyColor}`;
  if (textureCache.has(key)) return textureCache.get(key);

  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // transparent bg
  ctx.clearRect(0, 0, size, size);

  // soft shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(64, 112, 28, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // body
  ctx.fillStyle = bodyColor;
  ctx.strokeStyle = outline;
  ctx.lineWidth = 4;
  roundRect(ctx, 36, 52, 56, 52, 14);
  ctx.fill();
  ctx.stroke();

  // head
  ctx.fillStyle = '#FFE0B2';
  ctx.beginPath();
  ctx.arc(64, 42, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // eyes
  ctx.fillStyle = outline;
  ctx.beginPath();
  ctx.arc(54, 40, 3.5, 0, Math.PI * 2);
  ctx.arc(74, 40, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // smile
  ctx.beginPath();
  ctx.arc(64, 46, 10, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();

  // emoji badge
  ctx.font = '28px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, 64, 78);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  textureCache.set(key, tex);
  return tex;
}

export function createLabelTexture(text, bg = 'rgba(20,40,30,0.85)') {
  const key = `label:${text}:${bg}`;
  if (textureCache.has(key)) return textureCache.get(key);

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 256, 64);

  ctx.fillStyle = bg;
  roundRect(ctx, 8, 8, 240, 48, 12);
  ctx.fill();

  ctx.fillStyle = '#f4fff8';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 32);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  textureCache.set(key, tex);
  return tex;
}

export function createEmojiTexture(emoji, size = 128) {
  const key = `emoji:${emoji}:${size}`;
  if (textureCache.has(key)) return textureCache.get(key);

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  ctx.font = `${size * 0.7}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, size / 2, size / 2 + size * 0.05);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  textureCache.set(key, tex);
  return tex;
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
