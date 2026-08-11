import React, { useState } from 'react';
import { generateSpeech } from '../../services/geminiService';
import { saveAsset } from '../../services/library';
import { VOICES } from '../../services/providers';
import { getActiveSpeechEngineId } from '../../services/config';
import Spinner from '../Spinner';
import { useI18n } from '../../i18n';

interface VoiceToolProps {
  initialScript?: string;
}

const VoiceTool: React.FC<VoiceToolProps> = ({ initialScript }) => {
  const { t } = useI18n();
  const [script, setScript] = useState(initialScript ?? '');
  const [voice, setVoice] = useState<string>(VOICES[0]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleGenerate = async () => {
    if (!script.trim()) return;
    setIsLoading(true);
    setError(null);
    setSaved(false);
    try {
      const audio = await generateSpeech(script, { voice });
      setAudioUrl(audio.url);
      setAudioBlob(audio.blob);
    } catch (e: any) {
      setError(e.message || t('common.error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!audioBlob) return;
    await saveAsset({
      type: 'audio',
      prompt: script.slice(0, 200),
      model: getActiveSpeechEngineId(),
      data: audioBlob,
      mime: audioBlob.type || 'audio/wav',
    });
    setSaved(true);
  };

  const handleDownload = () => {
    if (!audioUrl) return;
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = 'creativeos-voiceover.wav';
    a.click();
  };

  return (
    <div className="h-full flex flex-col md:flex-row gap-6 animate-fade-in overflow-y-auto">
      <div className="md:w-1/2 flex flex-col gap-4">
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-mono text-gray-500 mb-1 uppercase">{t('voice.script')}</label>
            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder={t('voice.placeholder')}
              className="w-full h-40 bg-gray-900 border border-gray-600 rounded-lg p-3 text-sm text-gray-200 focus:ring-2 focus:ring-purple-500 outline-none resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-mono text-gray-500 mb-1 uppercase">{t('voice.voice')}</label>
            <div className="grid grid-cols-3 gap-2">
              {VOICES.map((v) => (
                <button
                  key={v}
                  onClick={() => setVoice(v)}
                  className={`py-2 rounded-lg border text-sm transition ${
                    voice === v
                      ? 'bg-purple-600/20 border-purple-600 text-purple-300'
                      : 'border-gray-600 text-gray-400 hover:text-white hover:border-gray-400'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={handleGenerate}
            disabled={isLoading || !script.trim()}
            className="bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 text-white font-bold px-6 py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? <Spinner className="w-5 h-5" /> : t('voice.generate')}
          </button>
          {error && (
            <div className="bg-red-900/20 border border-red-800 p-3 rounded text-red-400 text-sm">{error}</div>
          )}
        </div>
      </div>

      <div className="md:w-1/2 flex flex-col gap-4">
        <div className="flex-grow bg-gray-900 border border-gray-700 rounded-xl p-6 flex flex-col items-center justify-center min-h-[300px]">
          {audioUrl ? (
            <div className="w-full max-w-md flex flex-col items-center gap-6">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-900/40">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
              </div>
              <audio src={audioUrl} controls className="w-full" />
              <div className="flex gap-3">
                <button onClick={handleDownload} className="text-sm px-4 py-2 rounded border border-gray-600 text-gray-300 hover:text-white hover:border-gray-400 transition">
                  {t('voice.download')}
                </button>
                <button onClick={handleSave} disabled={saved} className="text-sm px-4 py-2 rounded bg-purple-600 hover:bg-purple-500 text-white font-medium transition disabled:opacity-60">
                  {saved ? t('voice.saved') : t('voice.save')}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-gray-600 text-sm">{t('voice.result')}: —</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceTool;
