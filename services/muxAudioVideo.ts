export type MuxAudioClip = {
  blob: Blob;
  kind: 'music' | 'voice';
};

/**
 * Mux audio clips onto a video by re-recording a playing <video>
 * plus Web Audio into a new WebM with sound.
 */
export const muxVideoWithAudio = async (
  videoUrl: string,
  clips: MuxAudioClip[],
  setLoadingMessage: (m: string) => void,
  options?: {
    musicGain?: number;
    voiceGain?: number;
    keepOriginalAudio?: boolean;
  }
): Promise<string> => {
  if (!clips.length && !options?.keepOriginalAudio) return videoUrl;

  setLoadingMessage('Mixing soundtrack into movie…');

  const video = document.createElement('video');
  video.src = videoUrl;
  video.crossOrigin = 'anonymous';
  video.playsInline = true;
  video.muted = !options?.keepOriginalAudio;

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error('Failed to load video for audio mux'));
  });

  const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 6;
  const audioCtx = new AudioContext();
  const dest = audioCtx.createMediaStreamDestination();
  const master = audioCtx.createGain();
  master.gain.value = 1;
  master.connect(dest);

  const musicGain = options?.musicGain ?? 0.55;
  const voiceGain = options?.voiceGain ?? 1;
  let decodedCount = 0;

  if (options?.keepOriginalAudio) {
    try {
      video.muted = false;
      const elementSource = audioCtx.createMediaElementSource(video);
      const gain = audioCtx.createGain();
      gain.gain.value = 0.85;
      elementSource.connect(gain);
      gain.connect(master);
      decodedCount += 1;
    } catch (err) {
      console.warn('Could not tap original video audio', err);
      video.muted = true;
    }
  }

  for (const clip of clips) {
    try {
      const arrayBuffer = await clip.blob.arrayBuffer();
      const buffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      const gain = audioCtx.createGain();
      gain.gain.value = clip.kind === 'music' ? musicGain : voiceGain;
      source.connect(gain);
      gain.connect(master);
      source.start(audioCtx.currentTime + (clip.kind === 'voice' ? 0.12 : 0));
      decodedCount += 1;
    } catch (err) {
      console.warn(`Skipping undecodable ${clip.kind} audio`, err);
    }
  }

  if (decodedCount === 0) {
    await audioCtx.close();
    throw new Error('No decodable audio to mux');
  }

  const capture = (video as HTMLVideoElement & { captureStream(): MediaStream }).captureStream();
  const combined = new MediaStream([
    ...capture.getVideoTracks(),
    ...dest.stream.getAudioTracks(),
  ]);

  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
    ? 'video/webm;codecs=vp9,opus'
    : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
      ? 'video/webm;codecs=vp8,opus'
      : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : '';

  if (!mimeType) {
    await audioCtx.close();
    throw new Error('Browser cannot record video+audio WebM');
  }

  const chunks: BlobPart[] = [];
  const recorder = new MediaRecorder(combined, {
    mimeType,
    videoBitsPerSecond: 4_000_000,
    audioBitsPerSecond: 192_000,
  });
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const stopped = new Promise<string>((resolve, reject) => {
    recorder.onerror = () => reject(new Error('Audio mux recording failed'));
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      resolve(URL.createObjectURL(blob));
    };
  });

  if (audioCtx.state === 'suspended') await audioCtx.resume();
  recorder.start(100);
  try {
    await video.play();
  } catch {
    /* timed recording still proceeds */
  }

  await new Promise<void>((resolve) => {
    const timeout = window.setTimeout(() => resolve(), (duration + 0.4) * 1000);
    video.onended = () => {
      window.clearTimeout(timeout);
      resolve();
    };
  });

  // Stop recorder first and wait for onstop before tearing down tracks/context.
  if (recorder.state !== 'inactive') recorder.stop();
  const resultUrl = await stopped;

  video.pause();
  capture.getTracks().forEach((t) => t.stop());
  dest.stream.getTracks().forEach((t) => t.stop());
  await audioCtx.close();

  setLoadingMessage('Soundtrack mix complete');
  return resultUrl;
};

export const estimateVideoDuration = async (videoUrl: string, fallbackSec = 6): Promise<number> => {
  const video = document.createElement('video');
  video.src = videoUrl;
  video.preload = 'metadata';
  await new Promise<void>((resolve) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => resolve();
    window.setTimeout(() => resolve(), 4000);
  });
  if (Number.isFinite(video.duration) && video.duration > 0) return video.duration;
  return fallbackSec;
};
