import React, { useEffect, useState } from 'react';
import Studio from './Studio';
import EditorTool from './EditorTool';
import WriteTool from './tools/WriteTool';
import VoiceTool from './tools/VoiceTool';
import { useI18n, TranslationKey } from '../i18n';

type ToolId = 'write' | 'design' | 'voice' | 'video';

interface ToolDef {
  id: ToolId;
  labelKey: TranslationKey;
  descKey: TranslationKey;
  accent: string;
  icon: React.ReactNode;
}

const TOOLS: ToolDef[] = [
  {
    id: 'write',
    labelKey: 'tool.write',
    descKey: 'tool.write.desc',
    accent: 'from-blue-600 to-cyan-500',
    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>,
  },
  {
    id: 'design',
    labelKey: 'tool.design',
    descKey: 'tool.design.desc',
    accent: 'from-cyan-600 to-teal-500',
    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>,
  },
  {
    id: 'voice',
    labelKey: 'tool.voice',
    descKey: 'tool.voice.desc',
    accent: 'from-purple-600 to-blue-500',
    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>,
  },
  {
    id: 'video',
    labelKey: 'tool.video',
    descKey: 'tool.video.desc',
    accent: 'from-blue-600 to-indigo-500',
    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>,
  },
];

const StudioHub: React.FC = () => {
  const { t } = useI18n();
  const [activeTool, setActiveTool] = useState<ToolId | null>(null);
  const [voiceScript, setVoiceScript] = useState<string | undefined>(undefined);

  useEffect(() => {
    const handler = (e: Event) => {
      const tool = (e as CustomEvent<string>).detail;
      if (tool === 'write' || tool === 'design' || tool === 'voice' || tool === 'video') {
        setActiveTool(tool);
      }
    };
    window.addEventListener('creativeos:studio-tool', handler);
    return () => window.removeEventListener('creativeos:studio-tool', handler);
  }, []);

  if (activeTool) {
    const tool = TOOLS.find((x) => x.id === activeTool)!;
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => { setActiveTool(null); setVoiceScript(undefined); }}
            className="p-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition"
            aria-label={t('common.back')}
          >
            <svg className="w-4 h-4 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
          </button>
          <h2 className="text-xl font-bold text-white">{t(tool.labelKey)}</h2>
          <span className="text-gray-500 text-sm">{t(tool.descKey)}</span>
        </div>
        <div className="flex-grow overflow-hidden">
          {activeTool === 'write' && (
            <WriteTool onSendToVoice={(script) => { setVoiceScript(script); setActiveTool('voice'); }} />
          )}
          {activeTool === 'design' && <EditorTool />}
          {activeTool === 'voice' && <VoiceTool initialScript={voiceScript} />}
          {activeTool === 'video' && <Studio />}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col animate-fade-in">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white tracking-tight">{t('studio.title')}</h2>
        <p className="text-gray-400 text-sm">{t('studio.subtitle')}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-3xl">
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id)}
            className="group bg-gray-800/50 border border-gray-700 hover:border-gray-500 rounded-2xl p-6 text-left rtl:text-right transition-all hover:bg-gray-800 relative overflow-hidden"
          >
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tool.accent} flex items-center justify-center text-white mb-4 shadow-lg`}>
              {tool.icon}
            </div>
            <h3 className="text-white font-bold text-lg mb-1">{t(tool.labelKey)}</h3>
            <p className="text-gray-400 text-sm">{t(tool.descKey)}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default StudioHub;
