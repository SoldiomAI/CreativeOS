import { ImageFile, CreativeConcept, SocialCampaign } from '../../types';
import { GenerationProvider, TextOptions, TtsOptions, GeneratedAudio } from './types';
import { getAspectRatio } from '../config';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const dims = (): { w: number; h: number } => {
  switch (getAspectRatio()) {
    case '16:9': return { w: 1280, h: 720 };
    case '1:1': return { w: 1024, h: 1024 };
    default: return { w: 720, h: 1280 };
  }
};

const drawPlaceholder = (ctx: CanvasRenderingContext2D, w: number, h: number, prompt: string, t = 0) => {
  const grad = ctx.createLinearGradient(0, 0, w, h);
  const shift = (t * 40) % 360;
  grad.addColorStop(0, `hsl(${(220 + shift) % 360}, 70%, 20%)`);
  grad.addColorStop(0.5, `hsl(${(265 + shift) % 360}, 65%, 30%)`);
  grad.addColorStop(1, `hsl(${(190 + shift) % 360}, 75%, 25%)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(((i * 137 + t * 60) % (w + 200)) - 100, (i * 211) % h, 80 + i * 30, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = `bold ${Math.round(w / 18)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('CreativeOS — Demo', w / 2, h / 2 - w / 20);
  ctx.font = `${Math.round(w / 30)}px sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  const words = prompt.split(' ');
  let line = '';
  let y = h / 2 + w / 30;
  for (const word of words.slice(0, 24)) {
    if ((line + word).length > 32) {
      ctx.fillText(line.trim(), w / 2, y);
      y += w / 22;
      line = '';
    }
    line += word + ' ';
  }
  if (line.trim()) ctx.fillText(line.trim(), w / 2, y);
};

const makeImage = (prompt: string): string => {
  const { w, h } = dims();
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  drawPlaceholder(ctx, w, h, prompt);
  return canvas.toDataURL('image/jpeg', 0.9);
};

const makeWavTone = (): Blob => {
  const sampleRate = 24000;
  const seconds = 2;
  const total = sampleRate * seconds;
  const pcm = new Int16Array(total);
  // Gentle two-note chime with fade in/out
  for (let i = 0; i < total; i++) {
    const t = i / sampleRate;
    const freq = t < 1 ? 440 : 554;
    const env = Math.min(1, t * 8) * Math.min(1, (seconds - t) * 4) * 0.3;
    pcm[i] = Math.round(Math.sin(2 * Math.PI * freq * t) * env * 32767);
  }
  const bytes = new Uint8Array(pcm.buffer);
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + bytes.length, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, bytes.length, true);
  return new Blob([header, bytes.buffer as ArrayBuffer], { type: 'audio/wav' });
};

const makeVideo = (prompt: string): Promise<string> =>
  new Promise((resolve, reject) => {
    if (typeof MediaRecorder === 'undefined') {
      reject(new Error('Demo video requires MediaRecorder support.'));
      return;
    }
    const { w, h } = dims();
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(w / 2);
    canvas.height = Math.round(h / 2);
    const ctx = canvas.getContext('2d')!;
    const stream = canvas.captureStream(30);
    const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
    const recorder = new MediaRecorder(stream, { mimeType: mime });
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      resolve(URL.createObjectURL(blob));
    };
    recorder.onerror = () => reject(new Error('Demo video recording failed.'));

    const start = performance.now();
    const frame = () => {
      const t = (performance.now() - start) / 1000;
      drawPlaceholder(ctx, canvas.width, canvas.height, prompt, t);
      if (t < 3) {
        requestAnimationFrame(frame);
      } else {
        recorder.stop();
      }
    };
    recorder.start();
    requestAnimationFrame(frame);
  });

/**
 * Zero-key placeholder provider: keeps the entire app navigable with no API
 * key configured. Every method returns a deterministic local artifact.
 */
export class DemoProvider implements GenerationProvider {
  readonly id = 'demo';
  readonly label = 'Demo Mode';

  async generateText(prompt: string, options?: TextOptions): Promise<string> {
    await delay(600);
    return [
      `[Demo mode — add your Gemini API key in Settings for real generations]`,
      ``,
      `HOOK: "${prompt.slice(0, 60)}" — but not the way you think.`,
      ``,
      `Here's a sample ${options?.tone || 'engaging'} script for ${options?.platform || 'social media'}:`,
      ``,
      `1. Open on a bold visual tied to "${prompt.slice(0, 40)}".`,
      `2. Deliver the hook in the first 2 seconds.`,
      `3. Build tension with three rapid-fire facts.`,
      `4. Payoff: the unexpected twist your audience shares.`,
      `5. CTA: "Follow for part 2."`,
    ].join('\n');
  }

  async generateCreativeConcepts(topic: string): Promise<CreativeConcept[]> {
    await delay(800);
    return [1, 2, 3].map((i) => ({
      title: `[Demo] ${topic} — Concept ${i}`,
      hook: `What nobody tells you about ${topic}...`,
      visualDescription: `Cinematic vertical shot exploring ${topic}, neon accents, shallow depth of field, dynamic camera push-in.`,
      viralScore: 60 + i * 10,
      rationale: 'Demo concept. Add a Gemini API key in Settings for real AI ideation.',
    }));
  }

  async generateSocialMetadata(topic: string, hook: string, _description: string): Promise<SocialCampaign> {
    await delay(700);
    const mk = (flavor: string) => ({
      caption: `[Demo] ${hook} ${flavor} #${topic.replace(/\s+/g, '')}`,
      hashtags: [topic.replace(/\s+/g, ''), 'creativeos', 'demo', flavor],
    });
    return {
      youtube: mk('shorts'),
      instagram: mk('reels'),
      tiktok: mk('fyp'),
    };
  }

  async generateImage(prompt: string): Promise<string> {
    await delay(900);
    return makeImage(prompt);
  }

  async editImage(_imageFile: ImageFile, prompt: string): Promise<string> {
    await delay(900);
    return makeImage(`Edited: ${prompt}`);
  }

  async generateSpeech(_text: string, _options?: TtsOptions): Promise<GeneratedAudio> {
    await delay(700);
    const blob = makeWavTone();
    return { url: URL.createObjectURL(blob), blob, mime: 'audio/wav' };
  }

  async generateVideo(
    _imageFile: ImageFile,
    prompt: string,
    setLoadingMessage: (message: string) => void
  ): Promise<string> {
    setLoadingMessage('Demo mode: rendering placeholder clip...');
    await delay(500);
    return makeVideo(prompt);
  }
}
