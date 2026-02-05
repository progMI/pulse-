
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Message, Sentiment, VisualConfig, AestheticStyle, User, Participant } from './types';
import { analyzeMessageVibe } from './geminiService';
import PulseNode from './components/PulseNode';

const sentimentDisplay: Record<string, string> = {
  [Sentiment.JOY]: 'Радость',
  [Sentiment.MELANCHOLY]: 'Меланхолия',
  [Sentiment.ANGER]: 'Гнев',
  [Sentiment.CALM]: 'Спокойствие',
  [Sentiment.MYSTERY]: 'Тайна',
  [Sentiment.EXCITEMENT]: 'Восторг'
};

const REACTION_OPTIONS = ['✨', '🔥', '💙', '🎭', '🌌', '🧬'];

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  
  // Installation State
  const [showInstaller, setShowInstaller] = useState(false);
  const [installProgress, setInstallProgress] = useState(0);
  const [installLogs, setInstallLogs] = useState<string[]>([]);

  const [regUsername, setRegUsername] = useState('');
  const [regAesthetic, setRegAesthetic] = useState<AestheticStyle>('adaptive');

  const [visualConfig, setVisualConfig] = useState<VisualConfig>({
    aesthetic: 'adaptive',
    nodeScale: 1.0,
    flowSpeed: 1.0
  });

  // --- INSTALLER LOGIC ---
  const runInstallation = async () => {
    setShowInstaller(true);
    setInstallProgress(0);
    setInstallLogs(["[SYSTEM] Инициализация установщика...", "[CORE] Проверка аппаратных ресурсов..."]);
    
    const logs = [
      "Аллокация виртуальной памяти...",
      "Настройка эмоциональных фильтров Gemini...",
      "Установка спектральных драйверов...",
      "Создание портативного контейнера...",
      "Проверка целостности резонанса...",
      "Синхронизация с ядром системы...",
      "Установка завершена успешно."
    ];

    for (let i = 0; i < logs.length; i++) {
      await new Promise(r => setTimeout(r, 800 + Math.random() * 1200));
      setInstallLogs(prev => [...prev, `[OK] ${logs[i]}`]);
      setInstallProgress(((i + 1) / logs.length) * 100);
    }

    // Materialize actual portable file
    setTimeout(() => {
      materializePortable();
      setShowInstaller(false);
    }, 1500);
  };

  const materializePortable = () => {
    const htmlContent = document.documentElement.outerHTML;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Pulse_Portable_App.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alert("Портативная версия создана! Теперь вы можете перенести этот файл в любую папку на диске.");
  };

  // --- PWA INSTALL LOGIC ---
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);
    if (window.matchMedia('(display-mode: standalone)').matches) setIsInstalled(true);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  };

  // --- SYNC LOGIC ---
  const generateSyncUrl = () => {
    const data = { user, messages, visualConfig, theme };
    const encoded = btoa(encodeURIComponent(JSON.stringify(data)));
    const url = `${window.location.origin}${window.location.pathname}#sync=${encoded}`;
    navigator.clipboard.writeText(url);
    alert("Ссылка-ключ скопирована!");
  };

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#sync=')) {
      try {
        const encoded = hash.replace('#sync=', '');
        const decoded = JSON.parse(decodeURIComponent(atob(encoded)));
        if (decoded.user) {
          setUser(decoded.user);
          setMessages(decoded.messages || []);
          setVisualConfig(decoded.visualConfig || visualConfig);
          setTheme(decoded.theme || 'dark');
          localStorage.setItem('pulse_user', JSON.stringify(decoded.user));
          window.location.hash = '';
        }
      } catch (e) { console.error("Sync failed", e); }
    }
  }, []);

  const participants = useMemo<Participant[]>(() => {
    if (!user) return [];
    return [{ id: 'me', name: `${user.username} (Вы)`, status: 'pulsing', color: '#6366f1' }];
  }, [user]);

  useEffect(() => {
    const savedUser = localStorage.getItem('pulse_user');
    if (savedUser && !user) {
      const parsedUser = JSON.parse(savedUser) as User;
      setUser(parsedUser);
      setVisualConfig(prev => ({ ...prev, aesthetic: parsedUser.initialAesthetic }));
    }
  }, [user]);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regUsername.trim()) return;
    const newUser: User = { username: regUsername.trim(), joinedAt: Date.now(), initialAesthetic: regAesthetic };
    localStorage.setItem('pulse_user', JSON.stringify(newUser));
    setUser(newUser);
    setVisualConfig(prev => ({ ...prev, aesthetic: regAesthetic }));
  };

  const handleLogout = () => {
    localStorage.removeItem('pulse_user');
    setUser(null);
    setMessages([]);
  };

  const handleMoveMessage = useCallback((id: string, x: number, y: number) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, position: { x, y } } : m));
  }, []);

  const handleAddReaction = (messageId: string, emoji: string) => {
    setMessages(prev => prev.map(m => {
      if (m.id === messageId) {
        const reactions = { ...(m.reactions || {}) };
        reactions[emoji] = (reactions[emoji] || 0) + 1;
        return { ...m, reactions };
      }
      return m;
    }));
  };

  const handleCloseMessage = (id: string) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, isClosed: true } : m));
    if (selectedId === id) setSelectedId(null);
  };

  const handleUnarchiveMessage = (id: string) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, isClosed: false } : m));
  };

  const handleDeleteMessage = (id: string) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, isDeleted: true } : m));
    if (selectedId === id) setSelectedId(null);
  };

  const handleRestoreMessage = (id: string) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, isDeleted: false, isClosed: false } : m));
    setSelectedId(id);
  };

  const handleSelectMessage = (msg: Message) => {
    if (msg.isDeleted) { handleRestoreMessage(msg.id); return; }
    setSelectedId(msg.id);
  };

  const styles = useMemo(() => {
    const isDark = theme === 'dark';
    const aesthetic = visualConfig.aesthetic;
    const themes: Record<AestheticStyle, any> = {
      adaptive: { bg: isDark ? 'bg-[#050505]' : 'bg-slate-50', glass: isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10', textPrimary: isDark ? 'text-white/90' : 'text-slate-900', textSecondary: isDark ? 'text-white/40' : 'text-slate-400', accent1: isDark ? 'bg-blue-500/20' : 'bg-blue-200/40', accent2: isDark ? 'bg-purple-500/20' : 'bg-purple-200/40', input: isDark ? 'focus-within:ring-white/20' : 'focus-within:ring-black/10' },
      vibrant: { bg: isDark ? 'bg-[#0a0015]' : 'bg-rose-50', glass: isDark ? 'bg-fuchsia-500/10 border-fuchsia-500/20' : 'bg-rose-500/10 border-rose-200', textPrimary: isDark ? 'text-fuchsia-50' : 'text-rose-900', textSecondary: isDark ? 'text-fuchsia-300/50' : 'text-rose-400', accent1: isDark ? 'bg-fuchsia-600/30' : 'bg-yellow-400/40', accent2: isDark ? 'bg-cyan-400/20' : 'bg-orange-400/30', input: 'focus-within:ring-fuchsia-500/30' },
      minimalist: { bg: isDark ? 'bg-[#121212]' : 'bg-[#fcfcfc]', glass: isDark ? 'bg-white/[0.02] border-white/[0.05]' : 'bg-black/[0.02] border-black/[0.05]', textPrimary: isDark ? 'text-zinc-200' : 'text-zinc-800', textSecondary: isDark ? 'text-zinc-600' : 'text-zinc-400', accent1: isDark ? 'bg-zinc-500/10' : 'bg-zinc-200/50', accent2: isDark ? 'bg-zinc-700/10' : 'bg-zinc-100/50', input: 'focus-within:ring-zinc-500/20' },
      monochrome: { bg: isDark ? 'bg-black' : 'bg-white', glass: isDark ? 'bg-white/5 border-white/20' : 'bg-black/5 border-black/20', textPrimary: isDark ? 'text-white' : 'text-black', textSecondary: isDark ? 'text-white/30' : 'text-black/30', accent1: 'bg-transparent', accent2: 'bg-transparent', input: isDark ? 'focus-within:ring-white/40' : 'focus-within:ring-black/40' },
      cybernetic: { bg: isDark ? 'bg-[#000808]' : 'bg-[#e0f7f7]', glass: isDark ? 'bg-cyan-950/40 border-cyan-500/30' : 'bg-cyan-100/40 border-cyan-300', textPrimary: isDark ? 'text-cyan-400' : 'text-cyan-900', textSecondary: isDark ? 'text-cyan-800' : 'text-cyan-600', accent1: isDark ? 'bg-cyan-500/10' : 'bg-cyan-400/20', accent2: isDark ? 'bg-lime-500/10' : 'bg-lime-400/20', input: 'focus-within:ring-cyan-500/50' }
    };
    return themes[aesthetic];
  }, [theme, visualConfig.aesthetic]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || isAnalyzing) return;
    const text = inputText; setInputText(''); setIsAnalyzing(true);
    try {
      const vibe = await analyzeMessageVibe(text, visualConfig);
      const newMessage: Message = { id: Math.random().toString(36).substr(2, 9), text, sender: 'user', timestamp: Date.now(), vibe, position: { x: 15 + Math.random() * 70, y: 20 + Math.random() * 60 }, reactions: {}, isClosed: false, isDeleted: false };
      setMessages(prev => [...prev, newMessage]); setSelectedId(newMessage.id);
    } catch (error) { console.error("Analysis error:", error); } finally { setIsAnalyzing(false); }
  };

  const selectedMessage = useMemo(() => messages.find(m => m.id === selectedId), [messages, selectedId]);

  if (showInstaller) {
    return (
      <div className="fixed inset-0 z-[100] bg-black text-emerald-500 font-mono p-10 flex flex-col items-center justify-center overflow-hidden">
        <div className="w-full max-w-2xl">
          <div className="mb-10 text-center">
            <h2 className="text-2xl tracking-[0.5em] uppercase mb-4 animate-pulse">УСТАНОВКА СИСТЕМЫ</h2>
            <div className="h-1 w-full bg-emerald-900/30 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${installProgress}%` }} />
            </div>
            <div className="flex justify-between mt-2 text-[10px] uppercase opacity-60">
              <span>Загрузка данных...</span>
              <span>{Math.round(installProgress)}%</span>
            </div>
          </div>
          <div className="bg-black/80 border border-emerald-900/50 p-6 rounded-xl h-64 overflow-y-auto custom-scrollbar font-mono text-xs space-y-2">
            {installLogs.map((log, i) => (
              <div key={i} className="animate-in slide-in-from-left-2 duration-300">
                <span className="opacity-40 mr-3">[{new Date().toLocaleTimeString()}]</span>
                <span>{log}</span>
              </div>
            ))}
            <div className="animate-pulse">_</div>
          </div>
          <p className="mt-8 text-center text-[10px] opacity-40 uppercase tracking-widest italic animate-bounce">Пожалуйста, не закрывайте окно до завершения материализации</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`relative h-screen w-screen flex items-center justify-center overflow-hidden transition-all duration-1000 ${styles.bg}`}>
        <div className="absolute inset-0 pointer-events-none">
           <div className={`pulse-orb absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[100px] transition-all duration-1000 ${styles.accent1}`} />
        </div>
        <form onSubmit={handleRegister} className={`z-10 glass p-10 rounded-[3rem] border w-full max-w-md animate-in fade-in zoom-in duration-1000 ${styles.glass}`}>
          <div className="text-center mb-10">
            <h1 className="text-4xl font-light tracking-[0.4em] uppercase mb-2 text-white">Пульс</h1>
            <p className={`text-[10px] uppercase tracking-widest ${styles.textSecondary}`}>Настройка резонанса личности</p>
          </div>
          <div className="space-y-6">
            <div>
              <label className={`text-[10px] uppercase tracking-widest block mb-2 opacity-60 ${styles.textPrimary}`}>Имя в потоке</label>
              <input autoFocus type="text" placeholder="..." value={regUsername} onChange={(e) => setRegUsername(e.target.value)} className={`w-full bg-white/5 border-none outline-none px-6 py-4 rounded-2xl text-lg font-light transition-all focus:ring-1 ${styles.input} ${styles.textPrimary}`} />
            </div>
            <div>
              <label className={`text-[10px] uppercase tracking-widest block mb-4 opacity-60 ${styles.textPrimary}`}>Эстетика</label>
              <div className="grid grid-cols-2 gap-2">
                {(['adaptive', 'cybernetic', 'minimalist', 'vibrant'] as AestheticStyle[]).map(style => (
                  <button key={style} type="button" onClick={() => setRegAesthetic(style)} className={`px-3 py-3 rounded-xl text-[9px] uppercase tracking-widest border transition-all ${regAesthetic === style ? (theme === 'dark' ? 'bg-white text-black border-white' : 'bg-black text-white border-black') : 'border-white/10 opacity-60 hover:opacity-100 text-white'}`}>
                    {style}
                  </button>
                ))}
              </div>
            </div>
            <button type="submit" disabled={!regUsername.trim()} className={`w-full py-5 rounded-2xl text-sm uppercase tracking-[0.3em] font-medium transition-all duration-500 mt-4 text-white ${!regUsername.trim() ? 'opacity-20 grayscale' : `bg-white/10 hover:bg-white hover:text-black`}`}>Начать Синхронизацию</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className={`relative h-screen w-screen overflow-hidden flex flex-col transition-all duration-1000 ${styles.bg} ${styles.textPrimary}`}>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: ${theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}; border-radius: 10px; }
        .clip-path-star { clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%); }
        .clip-path-blob { border-radius: 40% 60% 70% 30% / 40% 50% 60% 40%; }
        @keyframes pulse-node { from { transform: scale(1); opacity: 0.1; } to { transform: scale(1.4); opacity: 0.4; } }
        @keyframes float-gentle { 0% { transform: translate(-50%, -50%) translateY(0); } 50% { transform: translate(-50%, -50%) translateY(-10px); } 100% { transform: translate(-50%, -50%) translateY(0); } }
        @keyframes status-pulse { 0% { transform: scale(1); opacity: 0.4; } 50% { transform: scale(1.5); opacity: 0.8; } 100% { transform: scale(1); opacity: 0.4; } }
        @keyframes terminal-pulse { 0% { opacity: 0.5; box-shadow: 0 0 10px currentColor; } 50% { opacity: 1; box-shadow: 0 0 25px currentColor; } 100% { opacity: 0.5; box-shadow: 0 0 10px currentColor; } }
      `}</style>

      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className={`pulse-orb absolute top-[-10%] left-[20%] w-[500px] h-[500px] rounded-full transition-all duration-1000 ${styles.accent1}`} />
        <div className={`pulse-orb absolute bottom-[-10%] right-[10%] w-[600px] h-[600px] rounded-full transition-all duration-1000 ${styles.accent2}`} style={{ animationDelay: '-3s' }} />
      </div>

      <header className={`z-50 p-6 flex justify-between items-center glass m-4 rounded-3xl border transition-all duration-500 ${styles.glass}`}>
        <div className="flex items-center gap-6">
          <button onClick={() => { setIsSidebarOpen(!isSidebarOpen); setIsSettingsOpen(false); }} className={`p-3 rounded-full transition-colors ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}>
            <svg className={`w-6 h-6 transition-transform duration-500 ${isSidebarOpen ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div className="cursor-pointer" onClick={() => setSelectedId(null)}>
            <h1 className="text-2xl font-light tracking-widest uppercase">Пульс</h1>
            <p className={`text-[9px] uppercase tracking-[0.3em] transition-colors ${styles.textSecondary}`}>Эхо: {user.username}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setIsSettingsOpen(!isSettingsOpen); setIsSidebarOpen(false); }} className={`p-3 rounded-full transition-all border ${styles.glass} ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/5'}`} title="Установка и Настройки"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg></button>
          <button onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')} className={`p-3 rounded-full transition-all border ${styles.glass} ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}>{theme === 'dark' ? (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 5a7 7 0 100 14 7 7 0 000-14z" /></svg>) : (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>)}</button>
        </div>
      </header>

      <div className="flex flex-grow relative overflow-hidden">
        <aside className={`absolute left-0 top-0 h-full z-40 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${isSidebarOpen ? 'translate-x-0 w-80' : '-translate-x-full w-0 opacity-0'}`}>
          <div className={`h-full glass m-4 mt-0 rounded-3xl p-6 flex flex-col border border-r-0 overflow-hidden transition-all duration-500 ${styles.glass}`}>
             <h2 className={`text-[10px] font-semibold uppercase tracking-[0.3em] mb-6 transition-colors opacity-60 ${styles.textPrimary}`}>Палата Эха</h2>
            <div className="flex-grow overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-40 text-center"><p className="text-xs uppercase tracking-widest">Поток пуст...</p></div>
              ) : (
                messages.slice().reverse().map(msg => (
                  <div key={msg.id} onClick={() => handleSelectMessage(msg)} className={`group relative cursor-pointer p-4 rounded-2xl transition-all duration-300 border ${selectedId === msg.id ? (theme === 'dark' ? 'bg-white/10 border-white/20' : 'bg-black/10 border-black/20') : (theme === 'dark' ? 'bg-white/5 border-transparent hover:border-white/10' : 'bg-black/5 border-transparent hover:border-black/10')}`}>
                    <p className="text-sm font-light line-clamp-2 leading-relaxed">{msg.text}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>

        <aside className={`absolute right-0 top-0 h-full z-40 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${isSettingsOpen ? 'translate-x-0 w-80' : '-translate-x-full w-0 opacity-0'}`}>
          <div className={`h-full glass m-4 mt-0 rounded-3xl p-6 flex flex-col border border-l-0 overflow-hidden transition-all duration-500 ${styles.glass}`}>
            <div className="flex justify-between items-center mb-6"><h2 className={`text-sm font-semibold uppercase tracking-[0.2em] transition-colors ${styles.textSecondary}`}>Системный Блок</h2><button onClick={() => setIsSettingsOpen(false)} className={`opacity-40 hover:opacity-100 transition-opacity ${styles.textPrimary}`}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button></div>
            <div className="space-y-8 overflow-y-auto pr-2 custom-scrollbar">
              
              <section className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <label className={`text-[10px] uppercase tracking-[0.2em] block mb-4 transition-colors ${styles.textSecondary}`}>Деплой Программы</label>
                <button onClick={runInstallation} className={`w-full py-4 rounded-xl text-[10px] uppercase tracking-[0.2em] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all mb-3`}>
                  Материализовать папку (Портативно)
                </button>
                {deferredPrompt && (
                   <button onClick={handleInstallClick} className={`w-full py-4 rounded-xl text-[10px] uppercase tracking-[0.2em] bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 transition-all`}>
                   Установить как системное приложение
                 </button>
                )}
                <p className="text-[8px] opacity-40 leading-relaxed italic mt-2">"Портативно" создаст файл-контейнер, который работает как независимая папка с программой.</p>
              </section>

              <section>
                <label className={`text-[10px] uppercase tracking-[0.2em] block mb-4 transition-colors ${styles.textSecondary}`}>Облачная Синхронизация</label>
                <button onClick={generateSyncUrl} className={`w-full py-3 rounded-xl text-[9px] uppercase tracking-[0.2em] border border-white/10 hover:bg-white/10 transition-all ${styles.textPrimary}`}>
                  Создать Ссылку-Ключ
                </button>
              </section>

              <section><label className={`text-[10px] uppercase tracking-[0.2em] block mb-4 transition-colors ${styles.textSecondary}`}>Эстетика палитры</label><div className="grid grid-cols-1 gap-2">{(['adaptive', 'vibrant', 'minimalist', 'monochrome', 'cybernetic'] as AestheticStyle[]).map(style => (<button key={style} onClick={() => setVisualConfig(prev => ({ ...prev, aesthetic: style }))} className={`px-4 py-3 rounded-xl text-left text-xs uppercase tracking-widest border transition-all duration-500 ${visualConfig.aesthetic === style ? (theme === 'dark' ? 'bg-white text-black border-white' : 'bg-black text-white border-black') : `bg-transparent border-white/10 ${styles.textPrimary} hover:bg-white/5`}`}>{style}</button>))}</div></section>
            </div>
          </div>
        </aside>

        <main className={`flex-grow relative transition-all duration-700 ${isSidebarOpen || isSettingsOpen ? 'opacity-40 sm:opacity-80 scale-[0.98]' : 'ml-0'}`}>
          {messages.filter(m => !m.isDeleted).map(msg => (
            <PulseNode key={msg.id} message={msg} isSelected={selectedId === msg.id} onClick={() => handleSelectMessage(msg)} onMove={handleMoveMessage} onDelete={() => handleDeleteMessage(msg.id)} />
          ))}
          {selectedMessage && (
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-full max-w-lg px-6 z-30 pointer-events-auto">
              <div className={`glass p-6 rounded-3xl animate-in fade-in slide-in-from-bottom-4 duration-500 border transition-all duration-500 ${styles.glass}`}>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 flex items-center justify-center rounded-full border transition-all duration-500 ${styles.glass}`}><span className="text-xl">{selectedMessage.vibe.emoji}</span></div>
                    <div><span className={`text-[10px] uppercase tracking-[0.2em] block transition-colors ${styles.textSecondary}`}>{sentimentDisplay[selectedMessage.vibe.sentiment]}</span></div>
                  </div>
                  <button onClick={() => setSelectedId(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors border border-white/10"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
                <p className="text-lg leading-relaxed font-light italic">"{selectedMessage.text}"</p>
              </div>
            </div>
          )}
        </main>
      </div>

      <footer className="z-50 p-8 pt-4">
        <form onSubmit={handleSendMessage} className={`max-w-3xl mx-auto glass p-2 rounded-full flex items-center gap-4 border transition-all duration-500 ${styles.glass} ${styles.input} focus-within:ring-1`}>
          <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="Отправьте мысль в поток..." className={`flex-grow bg-transparent border-none outline-none px-6 py-3 text-lg font-light placeholder:opacity-30 ${styles.textPrimary}`} disabled={isAnalyzing} />
          <button type="submit" disabled={isAnalyzing || !inputText.trim()} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 ${isAnalyzing ? 'bg-white/10 animate-pulse' : `bg-white/10 hover:bg-current hover:invert`}`}>
            {isAnalyzing ? <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>}
          </button>
        </form>
      </footer>
    </div>
  );
};

export default App;
