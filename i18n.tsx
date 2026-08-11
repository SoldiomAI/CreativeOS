import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getLanguage, setLanguage as persistLanguage, Language } from './services/config';

const translations = {
  en: {
    // Sidebar / navigation
    'nav.dashboard': 'Command Center',
    'nav.studio': 'Creative Studio',
    'nav.library': 'Asset Library',
    'nav.settings': 'Settings',
    'brand.name': 'CreativeOS',
    'brand.tagline': 'AI Creative Studio',
    // Demo banner
    'demo.banner': 'Demo mode — add an API key in Settings for real generations.',
    'demo.openSettings': 'Open Settings',
    // Studio hub
    'studio.title': 'Creative Studio',
    'studio.subtitle': 'Four AI tools. One pipeline.',
    'tool.write': 'Write',
    'tool.write.desc': 'Scripts, hooks & captions',
    'tool.design': 'Design',
    'tool.design.desc': 'Generate & edit images',
    'tool.voice': 'Voice',
    'tool.voice.desc': 'AI voiceovers',
    'tool.video': 'Video',
    'tool.video.desc': 'Full production pipeline',
    // Write tool
    'write.prompt': 'What should I write?',
    'write.placeholder': "e.g. 'A punchy 30-second script about desert camping in Kuwait'",
    'write.tone': 'Tone',
    'write.platform': 'Platform',
    'write.generate': 'Generate',
    'write.result': 'Result',
    'write.copy': 'Copy',
    'write.copied': 'Copied!',
    'write.save': 'Save to Library',
    'write.saved': 'Saved',
    'write.useVoice': 'Voiceover this',
    // Voice tool
    'voice.script': 'Script',
    'voice.placeholder': 'Type or paste the narration script...',
    'voice.voice': 'Voice',
    'voice.generate': 'Generate Voiceover',
    'voice.result': 'Voiceover',
    'voice.save': 'Save to Library',
    'voice.saved': 'Saved',
    'voice.download': 'Download',
    // Library
    'library.title': 'Asset Library',
    'library.subtitle': 'Everything you generate, saved locally.',
    'library.empty': 'No assets yet. Generate something in the Studio.',
    'library.all': 'All',
    'library.text': 'Text',
    'library.image': 'Images',
    'library.audio': 'Audio',
    'library.video': 'Video',
    'library.download': 'Download',
    'library.delete': 'Delete',
    'library.close': 'Close',
    // Settings
    'settings.title': 'Settings',
    'settings.provider': 'AI Provider',
    'settings.provider.hint': 'Video generation (Veo) is Gemini-only. OpenAI works with any compatible endpoint.',
    'settings.openai.key': 'OpenAI API Key',
    'settings.openai.baseUrl': 'Base URL',
    'settings.openai.hint': 'Works with api.openai.com or any OpenAI-compatible endpoint (OpenRouter, LiteLLM, local).',
    'settings.voice': 'Voice Engine',
    'settings.voice.provider': 'Provider default',
    'settings.voice.hint': 'ElevenLabs handles voiceovers only; everything else keeps using the provider above.',
    'studio.recentVideos': 'Recent videos',
    'settings.apiKey': 'Gemini API Key',
    'settings.apiKey.hint': 'Stored only in this browser (localStorage). Get a key at aistudio.google.com.',
    'settings.apiKey.save': 'Save Key',
    'settings.apiKey.clear': 'Clear',
    'settings.apiKey.envActive': 'Using key from .env.local',
    'settings.apiKey.set': 'Custom key active',
    'settings.apiKey.none': 'No key — demo mode active',
    'settings.aspect': 'Default Aspect Ratio',
    'settings.language': 'Language',
    'settings.saved': 'Saved',
    // Dashboard
    'dash.title': 'Command Center',
    'dash.subtitle': 'Your creative output at a glance.',
    'dash.quickActions': 'Quick Create',
    'dash.recent': 'Recent Assets',
    'dash.viewAll': 'View all',
    'dash.empty': 'Nothing here yet — create your first asset.',
    'dash.openStudio': 'Open Studio',
    'dash.provider': 'Provider',
    'dash.demo': 'Demo',
    'dash.live': 'Live',
    'dash.total': 'Total Assets',
    // Common
    'common.loading': 'Working...',
    'common.error': 'Something went wrong. Try again.',
    'common.back': 'Back',
  },
  ar: {
    'nav.dashboard': 'مركز القيادة',
    'nav.studio': 'الاستوديو الإبداعي',
    'nav.library': 'مكتبة الأصول',
    'nav.settings': 'الإعدادات',
    'brand.name': 'CreativeOS',
    'brand.tagline': 'استوديو إبداعي بالذكاء الاصطناعي',
    'demo.banner': 'الوضع التجريبي — أضف مفتاح API في الإعدادات لتوليد حقيقي.',
    'demo.openSettings': 'افتح الإعدادات',
    'studio.title': 'الاستوديو الإبداعي',
    'studio.subtitle': 'أربع أدوات ذكاء اصطناعي. خط إنتاج واحد.',
    'tool.write': 'كتابة',
    'tool.write.desc': 'نصوص وخطافات وتعليقات',
    'tool.design': 'تصميم',
    'tool.design.desc': 'توليد وتحرير الصور',
    'tool.voice': 'صوت',
    'tool.voice.desc': 'تعليق صوتي بالذكاء الاصطناعي',
    'tool.video': 'فيديو',
    'tool.video.desc': 'خط إنتاج متكامل',
    'write.prompt': 'ماذا أكتب لك؟',
    'write.placeholder': "مثال: 'نص قصير 30 ثانية عن التخييم البري في الكويت'",
    'write.tone': 'النبرة',
    'write.platform': 'المنصة',
    'write.generate': 'توليد',
    'write.result': 'النتيجة',
    'write.copy': 'نسخ',
    'write.copied': 'تم النسخ!',
    'write.save': 'حفظ في المكتبة',
    'write.saved': 'تم الحفظ',
    'write.useVoice': 'حوّله لتعليق صوتي',
    'voice.script': 'النص',
    'voice.placeholder': 'اكتب أو الصق نص التعليق الصوتي...',
    'voice.voice': 'الصوت',
    'voice.generate': 'توليد التعليق الصوتي',
    'voice.result': 'التعليق الصوتي',
    'voice.save': 'حفظ في المكتبة',
    'voice.saved': 'تم الحفظ',
    'voice.download': 'تنزيل',
    'library.title': 'مكتبة الأصول',
    'library.subtitle': 'كل ما تولّده يُحفظ محليًا.',
    'library.empty': 'لا توجد أصول بعد. ولّد شيئًا في الاستوديو.',
    'library.all': 'الكل',
    'library.text': 'نصوص',
    'library.image': 'صور',
    'library.audio': 'صوتيات',
    'library.video': 'فيديو',
    'library.download': 'تنزيل',
    'library.delete': 'حذف',
    'library.close': 'إغلاق',
    'settings.title': 'الإعدادات',
    'settings.provider': 'مزوّد الذكاء الاصطناعي',
    'settings.provider.hint': 'توليد الفيديو (Veo) متاح عبر Gemini فقط. يعمل OpenAI مع أي نقطة نهاية متوافقة.',
    'settings.openai.key': 'مفتاح OpenAI API',
    'settings.openai.baseUrl': 'عنوان الخادم',
    'settings.openai.hint': 'يعمل مع api.openai.com أو أي نقطة نهاية متوافقة مع OpenAI.',
    'settings.voice': 'محرك الصوت',
    'settings.voice.provider': 'المزوّد الافتراضي',
    'settings.voice.hint': 'يتولى ElevenLabs التعليق الصوتي فقط؛ ويبقى كل شيء آخر على المزوّد أعلاه.',
    'studio.recentVideos': 'الفيديوهات الأخيرة',
    'settings.apiKey': 'مفتاح Gemini API',
    'settings.apiKey.hint': 'يُخزَّن في هذا المتصفح فقط. احصل على مفتاح من aistudio.google.com.',
    'settings.apiKey.save': 'حفظ المفتاح',
    'settings.apiKey.clear': 'مسح',
    'settings.apiKey.envActive': 'يُستخدم المفتاح من .env.local',
    'settings.apiKey.set': 'مفتاح مخصص فعّال',
    'settings.apiKey.none': 'لا يوجد مفتاح — الوضع التجريبي فعّال',
    'settings.aspect': 'نسبة الأبعاد الافتراضية',
    'settings.language': 'اللغة',
    'settings.saved': 'تم الحفظ',
    'dash.title': 'مركز القيادة',
    'dash.subtitle': 'إنتاجك الإبداعي في لمحة.',
    'dash.quickActions': 'إنشاء سريع',
    'dash.recent': 'أحدث الأصول',
    'dash.viewAll': 'عرض الكل',
    'dash.empty': 'لا شيء هنا بعد — أنشئ أول أصل لك.',
    'dash.openStudio': 'افتح الاستوديو',
    'dash.provider': 'المزوّد',
    'dash.demo': 'تجريبي',
    'dash.live': 'مباشر',
    'dash.total': 'إجمالي الأصول',
    'common.loading': 'جارٍ العمل...',
    'common.error': 'حدث خطأ ما. حاول مجددًا.',
    'common.back': 'رجوع',
  },
} as const;

export type TranslationKey = keyof (typeof translations)['en'];

interface I18nContextValue {
  lang: Language;
  t: (key: TranslationKey) => string;
  setLang: (lang: Language) => void;
}

const I18nContext = createContext<I18nContextValue>({
  lang: 'en',
  t: (key) => translations.en[key] ?? key,
  setLang: () => undefined,
});

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(getLanguage());

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  const setLang = useCallback((next: Language) => {
    persistLanguage(next);
    setLangState(next);
  }, []);

  const t = useCallback(
    (key: TranslationKey): string => translations[lang][key] ?? translations.en[key] ?? key,
    [lang]
  );

  return <I18nContext.Provider value={{ lang, t, setLang }}>{children}</I18nContext.Provider>;
};

export const useI18n = (): I18nContextValue => useContext(I18nContext);
