/**
 * Browser speech-to-text for prompt dictation.
 * Inspired by Handy (https://github.com/cjpais/Handy) — offline desktop STT.
 * Uses the Web Speech API when available (Chrome/Edge).
 */

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult:
    | ((ev: {
        resultIndex: number;
        results: ArrayLike<{ isFinal?: boolean; 0: { transcript: string } }>;
      }) => void)
    | null;
  onerror: ((ev: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

const getRecognition = (): SpeechRecognitionLike | null => {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
};

export const isSpeechDictationSupported = (): boolean => Boolean(getRecognition());

export const startPromptDictation = (
  onTranscript: (text: string, isFinal: boolean) => void,
  onError?: (message: string) => void
): (() => void) => {
  const recognition = getRecognition();
  if (!recognition) {
    onError?.(
      'Speech dictation needs Chrome/Edge Web Speech API. For fully offline STT, use Handy: https://github.com/cjpais/Handy'
    );
    return () => undefined;
  }

  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';
  recognition.onresult = (ev) => {
    let interim = '';
    let finalChunk = '';
    for (let i = ev.resultIndex; i < ev.results.length; i++) {
      const result = ev.results[i];
      const piece = result[0]?.transcript || '';
      if (result.isFinal) finalChunk += piece;
      else interim += piece;
    }
    if (finalChunk) onTranscript(finalChunk, true);
    if (interim) onTranscript(interim, false);
  };
  recognition.onerror = (ev) => {
    onError?.(ev.error || 'Speech recognition error');
  };
  recognition.start();

  return () => {
    try {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.stop();
    } catch {
      /* ignore */
    }
  };
};
