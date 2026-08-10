import React, { useEffect, useState } from 'react';
import {
  getApiKey, setApiKey, isDemoMode,
  getAspectRatio, setAspectRatio, AspectRatio,
} from '../services/config';
import { useI18n } from '../i18n';

const LS_HAS_CUSTOM = 'creativeos.apiKey';

const Settings: React.FC = () => {
  const { t, lang, setLang } = useI18n();
  const [keyInput, setKeyInput] = useState('');
  const [hasCustomKey, setHasCustomKey] = useState(false);
  const [aspect, setAspect] = useState<AspectRatio>(getAspectRatio());
  const [savedFlash, setSavedFlash] = useState(false);

  const refreshKeyState = () => {
    try {
      setHasCustomKey(!!localStorage.getItem(LS_HAS_CUSTOM));
    } catch {
      setHasCustomKey(false);
    }
  };

  useEffect(() => {
    refreshKeyState();
  }, []);

  const flash = () => {
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
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

  const handleAspect = (value: AspectRatio) => {
    setAspect(value);
    setAspectRatio(value);
    flash();
  };

  const envKeyPresent = !!(process.env.GEMINI_API_KEY || process.env.API_KEY);
  const keyStatus = hasCustomKey
    ? t('settings.apiKey.set')
    : envKeyPresent
      ? t('settings.apiKey.envActive')
      : t('settings.apiKey.none');
  const statusColor = isDemoMode() && !getApiKey() ? 'text-amber-400' : 'text-green-400';

  return (
    <div className="h-full overflow-y-auto animate-fade-in">
      <div className="max-w-2xl">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white tracking-tight">{t('settings.title')}</h2>
          {savedFlash && <span className="text-green-400 text-sm">{t('settings.saved')}</span>}
        </div>

        <div className="space-y-6">
          {/* API Key */}
          <section className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <h3 className="text-white font-bold mb-1">{t('settings.apiKey')}</h3>
            <p className={`text-xs font-mono mb-3 ${statusColor}`}>{keyStatus}</p>
            <div className="flex gap-2">
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="AIza..."
                autoComplete="off"
                className="flex-grow bg-gray-900 border border-gray-600 rounded-lg px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
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

          {/* Aspect ratio */}
          <section className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <h3 className="text-white font-bold mb-3">{t('settings.aspect')}</h3>
            <div className="grid grid-cols-3 gap-3 max-w-sm">
              {(['9:16', '16:9', '1:1'] as AspectRatio[]).map((r) => (
                <button
                  key={r}
                  onClick={() => handleAspect(r)}
                  className={`py-3 rounded-lg border font-mono text-sm transition ${
                    aspect === r
                      ? 'bg-blue-600/10 text-blue-400 border-blue-800'
                      : 'border-gray-600 text-gray-400 hover:text-white hover:border-gray-400'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </section>

          {/* Language */}
          <section className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <h3 className="text-white font-bold mb-3">{t('settings.language')}</h3>
            <div className="grid grid-cols-2 gap-3 max-w-sm">
              <button
                onClick={() => setLang('en')}
                className={`py-3 rounded-lg border text-sm transition ${
                  lang === 'en'
                    ? 'bg-blue-600/10 text-blue-400 border-blue-800'
                    : 'border-gray-600 text-gray-400 hover:text-white hover:border-gray-400'
                }`}
              >
                English
              </button>
              <button
                onClick={() => setLang('ar')}
                className={`py-3 rounded-lg border text-sm transition ${
                  lang === 'ar'
                    ? 'bg-blue-600/10 text-blue-400 border-blue-800'
                    : 'border-gray-600 text-gray-400 hover:text-white hover:border-gray-400'
                }`}
              >
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
