import React, { useEffect, useState } from 'react';
import {
  getApiKey, setApiKey, isDemoMode,
  getAspectRatio, setAspectRatio, AspectRatio,
  getProviderId, setProviderId, ProviderId,
  getOpenAiKey, setOpenAiKey, getOpenAiBaseUrl, setOpenAiBaseUrl,
  getVoiceEngine, setVoiceEngine, VoiceEngine,
  getElevenLabsKey, setElevenLabsKey,
} from '../services/config';
import { useI18n } from '../i18n';

const LS_HAS_CUSTOM = 'creativeos.apiKey';

const sectionCls = 'bg-gray-800/50 border border-gray-700 rounded-xl p-6';
const inputCls = 'flex-grow bg-gray-900 border border-gray-600 rounded-lg px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none';
const pillCls = (active: boolean) =>
  `py-3 rounded-lg border text-sm transition ${
    active
      ? 'bg-blue-600/10 text-blue-400 border-blue-800'
      : 'border-gray-600 text-gray-400 hover:text-white hover:border-gray-400'
  }`;

const Settings: React.FC = () => {
  const { t, lang, setLang } = useI18n();
  const [provider, setProvider] = useState<ProviderId>(getProviderId());
  const [keyInput, setKeyInput] = useState('');
  const [hasCustomKey, setHasCustomKey] = useState(false);
  const [openAiKeyInput, setOpenAiKeyInput] = useState('');
  const [hasOpenAiKey, setHasOpenAiKey] = useState(!!getOpenAiKey());
  const [baseUrlInput, setBaseUrlInput] = useState(getOpenAiBaseUrl());
  const [voiceEngine, setVoiceEngineState] = useState<VoiceEngine>(getVoiceEngine());
  const [elevenKeyInput, setElevenKeyInput] = useState('');
  const [hasElevenKey, setHasElevenKey] = useState(!!getElevenLabsKey());
  const [aspect, setAspect] = useState<AspectRatio>(getAspectRatio());
  const [savedFlash, setSavedFlash] = useState(false);

  const refreshKeyState = () => {
    try {
      setHasCustomKey(!!localStorage.getItem(LS_HAS_CUSTOM));
    } catch {
      setHasCustomKey(false);
    }
    setHasOpenAiKey(!!getOpenAiKey());
  };

  useEffect(() => {
    refreshKeyState();
  }, []);

  const flash = () => {
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  };

  const handleProvider = (id: ProviderId) => {
    setProvider(id);
    setProviderId(id);
    flash();
  };

  const handleSaveKey = () => {
    setApiKey(keyInput);
    setKeyInput('');
    refreshKeyState();
    flash();
  };

  const handleClearKey = () => {
    setApiKey('');
    refreshKeyState();
    flash();
  };

  const handleSaveOpenAi = () => {
    if (openAiKeyInput.trim()) setOpenAiKey(openAiKeyInput);
    setOpenAiBaseUrl(baseUrlInput);
    setOpenAiKeyInput('');
    setBaseUrlInput(getOpenAiBaseUrl());
    refreshKeyState();
    flash();
  };

  const handleClearOpenAi = () => {
    setOpenAiKey('');
    refreshKeyState();
    flash();
  };

  const handleVoiceEngine = (engine: VoiceEngine) => {
    setVoiceEngineState(engine);
    setVoiceEngine(engine);
    flash();
  };

  const handleSaveEleven = () => {
    setElevenLabsKey(elevenKeyInput);
    setElevenKeyInput('');
    setHasElevenKey(!!getElevenLabsKey());
    flash();
  };

  const handleClearEleven = () => {
    setElevenLabsKey('');
    setHasElevenKey(false);
    flash();
  };

  const handleAspect = (value: AspectRatio) => {
    setAspect(value);
    setAspectRatio(value);
    flash();
  };

  const envKeyPresent = !!(process.env.GEMINI_API_KEY || process.env.API_KEY);
  const geminiStatus = hasCustomKey
    ? t('settings.apiKey.set')
    : envKeyPresent
      ? t('settings.apiKey.envActive')
      : t('settings.apiKey.none');
  const openAiStatus = hasOpenAiKey ? t('settings.apiKey.set') : t('settings.apiKey.none');
  const statusColor = (ok: boolean) => (ok ? 'text-green-400' : 'text-amber-400');

  return (
    <div className="h-full overflow-y-auto animate-fade-in">
      <div className="max-w-2xl">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white tracking-tight">{t('settings.title')}</h2>
          {savedFlash && <span className="text-green-400 text-sm">{t('settings.saved')}</span>}
        </div>

        <div className="space-y-6">
          {/* Provider */}
          <section className={sectionCls}>
            <h3 className="text-white font-bold mb-3">{t('settings.provider')}</h3>
            <div className="grid grid-cols-2 gap-3 max-w-sm">
              <button onClick={() => handleProvider('gemini')} className={pillCls(provider === 'gemini')}>
                Google Gemini
              </button>
              <button onClick={() => handleProvider('openai')} className={pillCls(provider === 'openai')}>
                OpenAI
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-3">{t('settings.provider.hint')}</p>
          </section>

          {/* Gemini API Key */}
          {provider === 'gemini' && (
            <section className={sectionCls}>
              <h3 className="text-white font-bold mb-1">{t('settings.apiKey')}</h3>
              <p className={`text-xs font-mono mb-3 ${statusColor(!isDemoMode() || !!getApiKey())}`}>{geminiStatus}</p>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder="AIza..."
                  autoComplete="off"
                  className={inputCls}
                />
                <button
                  onClick={handleSaveKey}
                  disabled={!keyInput.trim()}
                  className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white text-sm font-bold px-4 py-2.5 rounded-lg transition"
                >
                  {t('settings.apiKey.save')}
                </button>
                {hasCustomKey && (
                  <button
                    onClick={handleClearKey}
                    className="border border-gray-600 text-gray-300 hover:text-white text-sm px-4 py-2.5 rounded-lg transition"
                  >
                    {t('settings.apiKey.clear')}
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-3">{t('settings.apiKey.hint')}</p>
            </section>
          )}

          {/* OpenAI settings */}
          {provider === 'openai' && (
            <section className={sectionCls}>
              <h3 className="text-white font-bold mb-1">{t('settings.openai.key')}</h3>
              <p className={`text-xs font-mono mb-3 ${statusColor(hasOpenAiKey)}`}>{openAiStatus}</p>
              <div className="flex gap-2 mb-3">
                <input
                  type="password"
                  value={openAiKeyInput}
                  onChange={(e) => setOpenAiKeyInput(e.target.value)}
                  placeholder="sk-..."
                  autoComplete="off"
                  className={inputCls}
                />
                {hasOpenAiKey && (
                  <button
                    onClick={handleClearOpenAi}
                    className="border border-gray-600 text-gray-300 hover:text-white text-sm px-4 py-2.5 rounded-lg transition"
                  >
                    {t('settings.apiKey.clear')}
                  </button>
                )}
              </div>
              <label className="block text-xs text-gray-400 mb-1">{t('settings.openai.baseUrl')}</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={baseUrlInput}
                  onChange={(e) => setBaseUrlInput(e.target.value)}
                  placeholder="https://api.openai.com/v1"
                  autoComplete="off"
                  className={inputCls}
                />
                <button
                  onClick={handleSaveOpenAi}
                  disabled={!openAiKeyInput.trim() && baseUrlInput === getOpenAiBaseUrl()}
                  className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white text-sm font-bold px-4 py-2.5 rounded-lg transition"
                >
                  {t('settings.apiKey.save')}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-3">{t('settings.openai.hint')}</p>
            </section>
          )}

          {/* Voice engine */}
          <section className={sectionCls}>
            <h3 className="text-white font-bold mb-3">{t('settings.voice')}</h3>
            <div className="grid grid-cols-2 gap-3 max-w-sm">
              <button onClick={() => handleVoiceEngine('provider')} className={pillCls(voiceEngine === 'provider')}>
                {t('settings.voice.provider')}
              </button>
              <button onClick={() => handleVoiceEngine('elevenlabs')} className={pillCls(voiceEngine === 'elevenlabs')}>
                ElevenLabs
              </button>
            </div>
            {voiceEngine === 'elevenlabs' && (
              <div className="mt-4">
                <p className={`text-xs font-mono mb-2 ${statusColor(hasElevenKey)}`}>
                  {hasElevenKey ? t('settings.apiKey.set') : t('settings.apiKey.none')}
                </p>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={elevenKeyInput}
                    onChange={(e) => setElevenKeyInput(e.target.value)}
                    placeholder="xi-..."
                    autoComplete="off"
                    className={inputCls}
                  />
                  <button
                    onClick={handleSaveEleven}
                    disabled={!elevenKeyInput.trim()}
                    className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white text-sm font-bold px-4 py-2.5 rounded-lg transition"
                  >
                    {t('settings.apiKey.save')}
                  </button>
                  {hasElevenKey && (
                    <button
                      onClick={handleClearEleven}
                      className="border border-gray-600 text-gray-300 hover:text-white text-sm px-4 py-2.5 rounded-lg transition"
                    >
                      {t('settings.apiKey.clear')}
                    </button>
                  )}
                </div>
              </div>
            )}
            <p className="text-xs text-gray-500 mt-3">{t('settings.voice.hint')}</p>
          </section>

          {/* Aspect ratio */}
          <section className={sectionCls}>
            <h3 className="text-white font-bold mb-3">{t('settings.aspect')}</h3>
            <div className="grid grid-cols-3 gap-3 max-w-sm">
              {(['9:16', '16:9', '1:1'] as AspectRatio[]).map((r) => (
                <button key={r} onClick={() => handleAspect(r)} className={`${pillCls(aspect === r)} font-mono`}>
                  {r}
                </button>
              ))}
            </div>
          </section>

          {/* Language */}
          <section className={sectionCls}>
            <h3 className="text-white font-bold mb-3">{t('settings.language')}</h3>
            <div className="grid grid-cols-2 gap-3 max-w-sm">
              <button onClick={() => setLang('en')} className={pillCls(lang === 'en')}>
                English
              </button>
              <button onClick={() => setLang('ar')} className={pillCls(lang === 'ar')}>
                العربية
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Settings;
