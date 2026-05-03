import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, User, Bot, AlertTriangle, Info, ShieldAlert, HeartPulse, Mic, MicOff, Stethoscope } from 'lucide-react';
import { getHealthAdvice } from '../services/geminiService';

interface Message {
  id: string;
  role: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

// Type definitions for SpeechRecognition API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: any) => void;
  onend: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: {
      new (): SpeechRecognition;
    };
    webkitSpeechRecognition: {
      new (): SpeechRecognition;
    };
  }
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'bot',
      content: 'Assalam-o-Alaikum! Main SehatAI hoon. Aap ko kya masla ho raha hai? Apni alamat (symptoms) batayein.',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [language, setLanguage] = useState<'en' | 'ur'>('ur');
  const languageRef = useRef(language);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Speech Recognition Setup
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'ur-PK';

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        setInput((prev) => (prev ? prev + ' ' + transcript : transcript));
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        if (event.error === 'not-allowed') {
          const errMsg = languageRef.current === 'ur' 
            ? "Microphone allow nahi kiya gaya. Baraye maharban browser settings check karein."
            : "Microphone access denied. Please check your browser settings.";
          alert(errMsg);
        }
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setIsListening(true);
      recognitionRef.current?.start();
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    try {
      const advice = await getHealthAdvice(currentInput, language);
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        content: advice,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatContent = (content: string) => {
    return content.split('\n').map((line, i) => {
      const processBold = (text: string) => {
        const parts = text.split(/(\*\*.*?\*\*)/g);
        return parts.map((part, index) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={index} className="font-bold">{part.slice(2, -2)}</strong>;
          }
          return part;
        });
      };

      if (line.includes('🧾 POSSIBLE CONDITIONS:')) {
        return <h3 key={i} className="font-bold text-emerald-800 mt-4 mb-2 flex items-center gap-2 border-b border-emerald-100 pb-1"><HeartPulse size={18} /> {processBold(line.replace('🧾', '').trim())}</h3>;
      }
      if (line.includes('⚠️ URGENCY LEVEL:')) {
        let colorClass = 'text-gray-800';
        if (line.toLowerCase().includes('red') || line.toLowerCase().includes('high')) colorClass = 'text-red-600 bg-red-50 p-2 rounded-lg border border-red-200';
        if (line.toLowerCase().includes('yellow') || line.toLowerCase().includes('medium')) colorClass = 'text-yellow-700 bg-yellow-50 p-2 rounded-lg border border-yellow-200';
        if (line.toLowerCase().includes('green') || line.toLowerCase().includes('low')) colorClass = 'text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-200';
        
        return <h3 key={i} className={`font-bold mt-4 mb-2 flex items-center gap-2 ${colorClass}`}><AlertTriangle size={18} /> {processBold(line.replace('⚠️', '').trim())}</h3>;
      }
      if (line.includes('🏠 HOME CARE ADVICE:')) {
        return <h3 key={i} className="font-bold text-blue-800 mt-4 mb-2 flex items-center gap-2 border-b border-blue-100 pb-1"><Info size={18} /> {processBold(line.replace('🏠', '').trim())}</h3>;
      }
      if (line.includes('🏥 WHEN TO SEE DOCTOR:')) {
        return <h3 key={i} className="font-bold text-red-800 mt-4 mb-2 flex items-center gap-2 border-b border-red-100 pb-1"><ShieldAlert size={18} /> {processBold(line.replace('🏥', '').trim())}</h3>;
      }
      if (line.startsWith('- ')) {
        return <li key={i} className="ml-5 list-disc mb-1 text-gray-700">{processBold(line.slice(2))}</li>;
      }
      if (line.trim() === '') return <div key={i} className="h-2" />;
      return <p key={i} className="mb-1 text-gray-700 leading-relaxed">{processBold(line)}</p>;
    });
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto bg-white shadow-2xl rounded-3xl overflow-hidden border border-emerald-50" id="chat-container">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 p-4 sm:p-5 text-white flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-4">
          <motion.div 
            whileHover={{ rotate: 15 }}
            className="bg-white/20 p-2.5 rounded-2xl backdrop-blur-sm shadow-inner"
          >
            <Stethoscope size={28} />
          </motion.div>
          <div>
            <h1 className="font-extrabold text-xl tracking-tight leading-none mb-1">SehatAI</h1>
            <div className="flex items-center gap-1.5 opacity-90">
              <div className="w-1.5 h-1.5 bg-emerald-300 rounded-full animate-pulse"></div>
              <p className="text-[10px] sm:text-xs font-medium uppercase tracking-widest text-emerald-50">Assistant</p>
            </div>
          </div>
        </div>
        
        <button
          onClick={() => setLanguage(l => l === 'en' ? 'ur' : 'en')}
          className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-xl border border-white/20 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 backdrop-blur-sm"
        >
          <span className={language === 'ur' ? 'text-emerald-200' : 'text-gray-400'}>اردو</span>
          <div className="w-px h-3 bg-white/20" />
          <span className={language === 'en' ? 'text-emerald-200' : 'text-gray-400'}>EN</span>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-emerald-50/10 custom-scrollbar">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[90%] sm:max-w-[80%] rounded-2xl p-4 sm:p-5 shadow-sm relative ${
                  msg.role === 'user'
                    ? 'bg-emerald-600 text-white rounded-tr-none'
                    : 'bg-white text-gray-800 border border-emerald-100 rounded-tl-none font-medium'
                }`}
              >
                <div className={`flex items-center gap-2 mb-3 opacity-60 text-[10px] font-black uppercase tracking-[0.2em] ${msg.role === 'user' ? 'text-emerald-50' : 'text-emerald-800'}`}>
                  {msg.role === 'user' ? <User size={10} /> : <Bot size={10} />}
                  {msg.role === 'user' ? 'Aap' : 'SehatAI'}
                </div>
                <div className="text-sm sm:text-base leading-relaxed overflow-hidden">
                  {msg.role === 'bot' ? formatContent(msg.content) : msg.content}
                </div>
                <div className={`mt-3 text-[10px] font-medium flex items-center justify-end gap-1 ${msg.role === 'user' ? 'text-emerald-100/70' : 'text-gray-400'}`}>
                  <span>{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-white border border-emerald-100 rounded-2xl rounded-tl-none p-5 shadow-sm flex items-center gap-4">
              <div className="relative">
                <Bot size={20} className="text-emerald-600" />
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1.5, opacity: [0, 0.5, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="absolute inset-0 bg-emerald-400 rounded-full -z-10"
                />
              </div>
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ y: [0, -6, 0] }}
                    transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.1 }}
                    className="w-2.5 h-2.5 bg-emerald-200 rounded-full"
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Section */}
      <form onSubmit={handleSend} className="p-4 sm:px-6 sm:pb-4 sm:pt-2 bg-white border-t border-emerald-50 relative">
        <div className="flex flex-col gap-3 relative">
          <div className="relative flex items-end gap-2 bg-gray-50 border border-emerald-100 p-2 rounded-2xl focus-within:ring-2 focus-within:ring-emerald-500 focus-within:bg-white transition-all">
            <textarea
              id="symptom-input"
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={language === 'ur' ? "Apni alamat detail se batayein ya poochhein... (e.g. Bukhaar ke liye kya karoon?)" : "Describe your symptoms or ask a question... (e.g. What to do for fever?)"}
              className="flex-1 bg-transparent border-none resize-none px-3 py-2 text-sm sm:text-base focus:ring-0 focus:outline-none min-h-[60px] custom-scrollbar"
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <div className="flex gap-1.5 pb-1">
              <button
                id="voice-button"
                type="button"
                onClick={toggleListening}
                disabled={isLoading}
                className={`p-3 rounded-xl transition-all relative ${
                  isListening 
                    ? 'bg-red-500 text-white pulse-red' 
                    : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                }`}
              >
                {isListening ? (
                  <>
                    <MicOff size={22} />
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                  </>
                ) : (
                  <Mic size={22} />
                )}
              </button>
              <button
                id="send-button"
                type="submit"
                disabled={!input.trim() || isLoading}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 text-white p-3 rounded-xl transition-all shadow-lg shadow-emerald-200 disabled:shadow-none flex items-center justify-center min-w-[50px]"
              >
                {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={22} />}
              </button>
            </div>
          </div>
          {isListening && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute -top-10 left-0 right-0 bg-red-600 text-white text-[10px] font-bold py-1.5 px-4 rounded-full text-center shadow-lg mx-auto w-fit z-20"
            >
              Listening... Bolna jari rakhein (Urdu/English)
            </motion.div>
          )}
        </div>
        
        {/* Simple Bottom Disclaimer */}
        <div className="mt-3 text-[10px] text-gray-400 text-center font-medium">
          Disclaimer: Yeh app sirf rehnumai ke liye hai. Kisi bhi tabdeeli ki soorat mein doctor se lazmi mashwara karein.
        </div>
      </form>

      {/* Global CSS for custom elements */}
      <style>{`
        .pulse-red {
          box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
          animation: pulse-red-anim 1.5s infinite cubic-bezier(0.66, 0, 0, 1);
        }
        @keyframes pulse-red-anim {
          to { box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
      `}</style>
    </div>
  );
}

