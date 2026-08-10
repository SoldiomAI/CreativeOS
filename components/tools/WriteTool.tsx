import React, { useState } from 'react';
import { generateText } from '../../services/geminiService';
import { saveAsset } from '../../services/library';
import { getProvider } from '../../services/providers';
import Spinner from '../Spinner';
import { useI18n } from '../../i18n';

const TONES = ['Punchy', 'Cinematic', 'Funny', 'Inspirational', 'Educational', 'Dramatic'];
const PLATFORMS = ['TikTok', 'Instagram Reels', 'YouTube Shorts', 'X / Twitter', 'Blog'];

interface WriteToolProps {
  onSendToVoice?: (script: string) => void;
}

const WriteTool: React.FC<WriteToolProps> = ({ onSendToVoice }) => {
  const { t } = useI18n();
  const [prompt, setPrompt] = useState('');
  const [tone, setTone] = useState(TONES[0]);
  const [platform, setPlatform] = useState(PLATFORMS[0]);
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    setError(null);
    setSaved(false);
    try {
      const text = await generateText(prompt, { tone, platform });
      setResult(text);
    } catch (e: any) {
      setError(e.message || t('common.error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSave = async () => {
    await saveAsset({
      type: 'text',
      prompt,
      model: getProvider().id,
      data: result,
      mime: 'text/plain',
    });
    setSaved(true);
  };

  return (
    <div className="h-full flex flex-col md:flex-row gap-6 animate-fade-in overflow-y-auto">
      <div className="md:w-1/2 flex flex-col gap-4">
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-mono text-gray-500 mb-1 uppercase">{t('write.prompt')}</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={t('write.placeholder')}
              className="w-full h-28 bg-gray-900 border border-gray-600 rounded-lg p-3 text-sm text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-gray-500 mb-1 uppercase">{t('write.tone')}</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-blue-500"
              >
                {TONES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono text-gray-500 mb-1 uppercase">{t('write.platform')}</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-blue-500"
              >
                {PLATFORMS.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>
          <button
            onClick={handleGenerate}
            disabled={isLoading || !prompt.trim()}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white font-bold px-6 py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? <Spinner className="w-5 h-5" /> : t('write.generate')}
          </button>
          {error && (
            <div className="bg-red-900/20 border border-red-800 p-3 rounded text-red-400 text-sm">{error}</div>
          )}
        </div>
      </div>

      <div className="md:w-1/2 flex flex-col gap-4">
        <div className="flex-grow bg-gray-900 border border-gray-700 rounded-xl p-6 flex flex-col min-h-[300px]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-bold">{t('write.result')}</h3>
            {result && (
              <div className="flex gap-2">
                <button onClick={handleCopy} className="text-xs px-3 py-1.5 rounded border border-gray-600 text-gray-300 hover:text-white hover:border-gray-400 transition">
                  {copied ? t('write.copied') : t('write.copy')}
                </button>
                <button onClick={handleSave} disabled={saved} className="text-xs px-3 py-1.5 rounded border border-gray-600 text-gray-300 hover:text-white hover:border-gray-400 transition disabled:opacity-60">
                  {saved ? t('write.saved') : t('write.save')}
                </button>
                {onSendToVoice && (
                  <button onClick={() => onSendToVoice(result)} className="text-xs px-3 py-1.5 rounded bg-purple-600/20 border border-purple-700 text-purple-300 hover:bg-purple-600/40 transition">
                    {t('write.useVoice')}
                  </button>
                )}
              </div>
            )}
          </div>
          <pre className="flex-grow whitespace-pre-wrap text-sm text-gray-300 font-sans overflow-y-auto">
            {result || <span className="text-gray-600">—</span>}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default WriteTool;
