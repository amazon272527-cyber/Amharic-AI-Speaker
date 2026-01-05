
import React, { useState, useCallback, useRef } from 'react';
import { 
  Play, 
  Volume2, 
  Download, 
  MessageSquare, 
  Settings, 
  Loader2, 
  Trash2, 
  History,
  Languages,
  ArrowRight
} from 'lucide-react';
import { geminiService } from './services/geminiService';
import { VoiceName, HistoryItem } from './types';
import { decodeBase64, decodeAudioData, pcmToWav } from './utils/audioUtils';

const DEFAULT_AMHARIC_TEXT = 'ሰላም! እኔ የአማርኛ ተናጋሪ ረዳት ነኝ። እንዴት ልረዳዎት እችላለሁ?';

const App: React.FC = () => {
  const [text, setText] = useState(DEFAULT_AMHARIC_TEXT);
  const [voice, setVoice] = useState<VoiceName>(VoiceName.Kore);
  const [isGenerating, setIsGenerating] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    return audioContextRef.current;
  }, []);

  const playAudio = useCallback(async (base64: string) => {
    try {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      
      const audioBytes = decodeBase64(base64);
      const audioBuffer = await decodeAudioData(audioBytes, ctx, 24000, 1);
      
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.start();
    } catch (err) {
      console.error("Playback failed:", err);
      setError("Playback failed. Please try again.");
    }
  }, [getAudioContext]);

  const handleGenerate = async () => {
    if (!text.trim()) return;
    
    setIsGenerating(true);
    setError(null);
    
    try {
      const base64Audio = await geminiService.generateSpeech(text, voice);
      
      // Play immediately
      await playAudio(base64Audio);
      
      // Create WAV for history and download
      const audioBytes = decodeBase64(base64Audio);
      const pcmData = new Int16Array(audioBytes.buffer);
      const wavBlob = pcmToWav(pcmData);
      const audioUrl = URL.createObjectURL(wavBlob);
      
      const newItem: HistoryItem = {
        id: crypto.randomUUID(),
        text: text.trim(),
        voice,
        timestamp: Date.now(),
        audioBlob: wavBlob,
        audioUrl
      };
      
      setHistory(prev => [newItem, ...prev]);
    } catch (err: any) {
      console.error("Generation error:", err);
      setError(err.message || "Something went wrong during speech generation.");
    } finally {
      setIsGenerating(false);
    }
  };

  const deleteHistoryItem = (id: string) => {
    setHistory(prev => {
      const item = prev.find(i => i.id === id);
      if (item) URL.revokeObjectURL(item.audioUrl);
      return prev.filter(i => i.id !== id);
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-8 px-4 sm:px-6 lg:px-8">
      {/* Container */}
      <div className="w-full max-w-4xl space-y-8">
        
        {/* Header */}
        <header className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200 text-white mb-2">
            <Languages size={32} />
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight sm:text-5xl">
            Amharic AI <span className="text-indigo-600">Speaker</span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg text-slate-600 ethio-font">
            የላቀ የአማርኛ ንግግር ማመንጫ - በጌሚኒ AI የተደገፈ
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Controls Panel */}
          <main className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden transition-all hover:shadow-2xl hover:shadow-slate-200/60">
              <div className="p-6 sm:p-8 space-y-6">
                
                {/* Text Input */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <MessageSquare size={16} className="text-indigo-500" />
                      Amharic Text / የአማርኛ ጽሑፍ
                    </label>
                    <span className="text-xs font-medium text-slate-400">
                      {text.length} characters
                    </span>
                  </div>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="እዚህ መናገር የሚፈልጉትን ጽሑፍ ያስገቡ..."
                    className="ethio-font w-full h-48 p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none text-slate-800 text-lg leading-relaxed placeholder:text-slate-400"
                  />
                </div>

                {/* Voice Settings */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Settings size={16} className="text-indigo-500" />
                      Voice Model / የድምፅ አይነት
                    </label>
                    <div className="relative">
                      <select
                        value={voice}
                        onChange={(e) => setVoice(e.target.value as VoiceName)}
                        className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-4 py-3 pr-10 text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none cursor-pointer transition-all hover:border-indigo-300"
                      >
                        <option value={VoiceName.Kore}>Kore (Deep Male)</option>
                        <option value={VoiceName.Zephyr}>Zephyr (Neutral)</option>
                        <option value={VoiceName.Puck}>Puck (Friendly)</option>
                        <option value={VoiceName.Charon}>Charon (Professional)</option>
                        <option value={VoiceName.Fenrir}>Fenrir (Warm)</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-400">
                        <ArrowRight size={16} className="rotate-90" />
                      </div>
                    </div>
                  </div>

                  {/* Generate Button */}
                  <div className="flex items-end">
                    <button
                      onClick={handleGenerate}
                      disabled={isGenerating || !text.trim()}
                      className={`w-full h-[50px] rounded-xl flex items-center justify-center gap-2 font-bold text-white transition-all shadow-lg ${
                        isGenerating || !text.trim()
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                        : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 hover:-translate-y-0.5'
                      }`}
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="animate-spin" size={20} />
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <Volume2 size={20} />
                          <span className="ethio-font text-lg">ድምፅ አውጣ</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Error State */}
                {error && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-700">
                    <div className="bg-red-100 p-1 rounded-full mt-0.5">
                      <Trash2 size={14} className="text-red-600" />
                    </div>
                    <p className="text-sm font-medium">{error}</p>
                  </div>
                )}
              </div>
            </div>
          </main>

          {/* Sidebar: History */}
          <aside className="space-y-6">
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-6 sm:p-8 h-[600px] flex flex-col transition-all hover:shadow-2xl hover:shadow-slate-200/60">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <History size={20} className="text-indigo-500" />
                  History / ታሪክ
                </h3>
                <span className="bg-slate-100 text-slate-500 text-xs font-bold px-2 py-1 rounded-full">
                  {history.length}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-2 -mr-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                {history.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-3 opacity-60">
                    <div className="p-4 bg-slate-50 rounded-full">
                      <MessageSquare size={32} className="text-slate-300" />
                    </div>
                    <p className="text-sm text-slate-500 italic">No recordings yet.<br/>የተመዘገበ ታሪክ የለም።</p>
                  </div>
                ) : (
                  history.map((item) => (
                    <div 
                      key={item.id} 
                      className="group p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3 transition-all hover:bg-indigo-50/50 hover:border-indigo-100 relative"
                    >
                      <p className="ethio-font text-sm text-slate-700 line-clamp-2 leading-relaxed">
                        {item.text}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-white px-2 py-0.5 rounded-md border border-slate-100">
                            {item.voice}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              const audio = new Audio(item.audioUrl);
                              audio.play();
                            }}
                            className="p-2 text-indigo-600 hover:bg-white rounded-lg transition-colors shadow-sm"
                            title="Play"
                          >
                            <Play size={16} fill="currentColor" />
                          </button>
                          <a
                            href={item.audioUrl}
                            download={`amharic_ai_${item.id.slice(0,4)}.wav`}
                            className="p-2 text-emerald-600 hover:bg-white rounded-lg transition-colors shadow-sm"
                            title="Download"
                          >
                            <Download size={16} />
                          </a>
                          <button
                            onClick={() => deleteHistoryItem(item.id)}
                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-white rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>
        </div>

        {/* Footer */}
        <footer className="text-center pt-8 border-t border-slate-200 text-slate-400 text-sm">
          <p>© {new Date().getFullYear()} Amharic AI Speaker. Powered by Google Gemini.</p>
        </footer>
      </div>

      <style>{`
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  );
};

export default App;
