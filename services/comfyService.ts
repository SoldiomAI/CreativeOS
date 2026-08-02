/**
 * Optional local ComfyUI client (https://github.com/Comfy-Org/ComfyUI).
 * Default API: http://127.0.0.1:8188
 */

const COMFY_URL_KEY = 'creativeos_comfy_url';
const COMFY_CKPT_KEY = 'creativeos_comfy_ckpt';

export const getComfyUrl = (): string => {
  try {
    return localStorage.getItem(COMFY_URL_KEY) || 'http://127.0.0.1:8188';
  } catch {
    return 'http://127.0.0.1:8188';
  }
};

export const setComfyUrl = (url: string) => {
  localStorage.setItem(COMFY_URL_KEY, url.trim().replace(/\/$/, ''));
};

export const getComfyCheckpoint = (): string => {
  try {
    return localStorage.getItem(COMFY_CKPT_KEY) || 'v1-5-pruned-emaonly.safetensors';
  } catch {
    return 'v1-5-pruned-emaonly.safetensors';
  }
};

export const setComfyCheckpoint = (name: string) => {
  localStorage.setItem(COMFY_CKPT_KEY, name.trim());
};

export const pingComfyUi = async (): Promise<boolean> => {
  try {
    const res = await fetch(`${getComfyUrl()}/system_stats`, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
};

const buildTxt2ImgWorkflow = (prompt: string, negative: string, ckpt: string) => {
  const seed = Math.floor(Math.random() * 1_000_000_000);
  return {
    '3': {
      class_type: 'KSampler',
      inputs: {
        seed,
        steps: 20,
        cfg: 7,
        sampler_name: 'euler',
        scheduler: 'normal',
        denoise: 1,
        model: ['4', 0],
        positive: ['6', 0],
        negative: ['7', 0],
        latent_image: ['5', 0],
      },
    },
    '4': {
      class_type: 'CheckpointLoaderSimple',
      inputs: { ckpt_name: ckpt },
    },
    '5': {
      class_type: 'EmptyLatentImage',
      inputs: { width: 576, height: 1024, batch_size: 1 },
    },
    '6': {
      class_type: 'CLIPTextEncode',
      inputs: { text: prompt, clip: ['4', 1] },
    },
    '7': {
      class_type: 'CLIPTextEncode',
      inputs: { text: negative, clip: ['4', 1] },
    },
    '8': {
      class_type: 'VAEDecode',
      inputs: { samples: ['3', 0], vae: ['4', 2] },
    },
    '9': {
      class_type: 'SaveImage',
      inputs: { filename_prefix: 'creativeos', images: ['8', 0] },
    },
  };
};

const waitForHistory = async (base: string, promptId: string, timeoutMs = 180_000) => {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const res = await fetch(`${base}/history/${promptId}`);
    if (res.ok) {
      const data = await res.json();
      if (data[promptId]) return data[promptId];
    }
    await new Promise((r) => setTimeout(r, 1200));
  }
  throw new Error('ComfyUI timed out waiting for image');
};

/**
 * Generate a still via a running local ComfyUI instance.
 */
export const generateImageWithComfy = async (
  prompt: string,
  setLoadingMessage: (m: string) => void
): Promise<string> => {
  const base = getComfyUrl();
  setLoadingMessage('Checking local ComfyUI…');
  const up = await pingComfyUi();
  if (!up) {
    throw new Error(
      'ComfyUI is not reachable. Start https://github.com/Comfy-Org/ComfyUI (default http://127.0.0.1:8188).'
    );
  }

  setLoadingMessage('Queueing ComfyUI text→image workflow…');
  const workflow = buildTxt2ImgWorkflow(
    prompt,
    'blurry, low quality, watermark, text',
    getComfyCheckpoint()
  );
  const queueRes = await fetch(`${base}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: workflow }),
  });
  if (!queueRes.ok) {
    const text = await queueRes.text();
    throw new Error(`ComfyUI rejected workflow: ${text.slice(0, 200)}`);
  }
  const { prompt_id: promptId } = await queueRes.json();
  if (!promptId) throw new Error('ComfyUI did not return a prompt_id');

  setLoadingMessage('ComfyUI rendering…');
  const history = await waitForHistory(base, promptId);
  const outputs = history.outputs || {};
  for (const node of Object.values(outputs) as Array<{ images?: Array<{ filename: string; subfolder?: string; type?: string }> }>) {
    const image = node.images?.[0];
    if (!image?.filename) continue;
    const params = new URLSearchParams({
      filename: image.filename,
      subfolder: image.subfolder || '',
      type: image.type || 'output',
    });
    const imgRes = await fetch(`${base}/view?${params}`);
    if (!imgRes.ok) continue;
    const blob = await imgRes.blob();
    return URL.createObjectURL(blob);
  }
  throw new Error('ComfyUI finished but returned no image (check checkpoint name in Settings).');
};
