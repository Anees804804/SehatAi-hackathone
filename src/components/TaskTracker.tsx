import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Circle, Clock, Plus, Trash2, Calendar, Pill, Stethoscope, Activity, Sparkles, Bell, X, History, Mic, MicOff } from 'lucide-react';
import { parseHealthTask } from '../services/geminiService';

interface HealthTask {
  id: string;
  title: string;
  time: string;
  completed: boolean;
  category: 'medicine' | 'appointment' | 'checkup' | 'other';
  lastNotified?: string; // date string
  userName?: string;
}

interface TaskLog {
  id: string;
  taskId: string;
  title: string;
  timestamp: Date;
  action: 'completed' | 'deleted';
}

export default function TaskTracker() {
  const [tasks, setTasks] = useState<HealthTask[]>(() => {
    const saved = localStorage.getItem('sehat_tasks');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [logs, setLogs] = useState<TaskLog[]>(() => {
    const saved = localStorage.getItem('sehat_task_logs');
    return saved ? JSON.parse(saved).map((l: any) => ({ ...l, timestamp: new Date(l.timestamp) })) : [];
  });

  const [globalUserName, setGlobalUserName] = useState(() => localStorage.getItem('sehat_user_name') || '');
  const [isAdding, setIsAdding] = useState(false);
  const [isSmartAdding, setIsSmartAdding] = useState(false);
  const [smartInput, setSmartInput] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', time: '', category: 'medicine' as const, userName: '' });
  const [activeReminder, setActiveReminder] = useState<HealthTask | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    localStorage.setItem('sehat_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('sehat_task_logs', JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    localStorage.setItem('sehat_user_name', globalUserName);
  }, [globalUserName]);

  const speak = (userName: string, medicineName: string) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const name = userName || globalUserName || 'Janab';
      const message = `${name}, aap ki medicine ${medicineName} lene ka time ho gaya hai.`;
      
      const utterance = new SpeechSynthesisUtterance(message);
      
      const getBestVoice = () => {
        const voices = window.speechSynthesis.getVoices();
        // Prefer Hindi/Urdu for better pronunciation of the phrase
        return voices.find(v => v.lang.includes('hi') || v.lang.includes('ur')) || voices[0];
      };

      const setVoiceAndSpeak = () => {
        utterance.voice = getBestVoice();
        utterance.rate = 0.9;
        utterance.pitch = 1;
        window.speechSynthesis.speak(utterance);
      };

      if (window.speechSynthesis.getVoices().length > 0) {
        setVoiceAndSpeak();
      } else {
        window.speechSynthesis.onvoiceschanged = () => {
          setVoiceAndSpeak();
          window.speechSynthesis.onvoiceschanged = null;
        };
      }
    }
  };

  // Reminder Logic
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const currentTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const todayDateStr = now.toDateString();

      const dueTask = tasks.find(t => 
        !t.completed && 
        t.time === currentTimeStr && 
        t.lastNotified !== todayDateStr
      );

      if (dueTask && !activeReminder) {
        setActiveReminder(dueTask);
        // Trigger Voice Announcement
        speak(dueTask.userName || globalUserName, dueTask.title);
        
        // Mark as notified so it doesn't trigger again in the same minute
        setTasks(prev => prev.map(t => t.id === dueTask.id ? { ...t, lastNotified: todayDateStr } : t));
        
        // Browser notification if permitted
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("SehatAI Reminder", { body: `Time for: ${dueTask.title}` });
        }
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [tasks, activeReminder, globalUserName]);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    // Pre-load voices for SpeechSynthesis
    window.speechSynthesis.getVoices();
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice recognition is not supported in your browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US'; 
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      if (event.error === 'not-allowed') {
        alert("Microphone allow nahi kiya gaya. Settings check karein.");
      }
      setIsListening(false);
    };
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSmartInput(prev => (prev + ' ' + transcript).trim());
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const addLog = (task: HealthTask, action: 'completed' | 'deleted') => {
    const log: TaskLog = {
      id: Date.now().toString(),
      taskId: task.id,
      title: task.title,
      timestamp: new Date(),
      action,
    };
    setLogs(prev => [log, ...prev].slice(0, 50));
  };

  const addTask = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newTask.title.trim()) return;

    if (newTask.userName && !globalUserName) {
      setGlobalUserName(newTask.userName);
    }

    const task: HealthTask = {
      id: Date.now().toString(),
      title: newTask.title,
      time: newTask.time,
      completed: false,
      category: newTask.category,
      userName: newTask.userName || globalUserName,
    };

    setTasks([task, ...tasks]);
    setNewTask({ title: '', time: '', category: 'medicine', userName: globalUserName });
    setIsAdding(false);
  };

  const handleSmartAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smartInput.trim() || isParsing) return;

    setIsParsing(true);
    const result = await parseHealthTask(smartInput);
    setIsParsing(false);

    if (result) {
      const task: HealthTask = {
        id: Date.now().toString(),
        title: result.title,
        time: result.time || '',
        completed: false,
        category: result.category || 'other',
        userName: globalUserName,
      };
      setTasks([task, ...tasks]);
      setSmartInput('');
      setIsSmartAdding(false);
    } else {
      alert("Maaf, AI task samajh nahi paya. Dubara koshish karein.");
    }
  };

  const toggleTask = (id: string, fromReminder = false) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const newCompletedState = !task.completed;
    if (newCompletedState) addLog(task, 'completed');

    setTasks(tasks.map(t => t.id === id ? { ...t, completed: newCompletedState } : t));
    if (fromReminder) {
      setActiveReminder(null);
      window.speechSynthesis.cancel(); // Stop talking if dismissed
    }
  };

  const deleteTask = (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (task) addLog(task, 'deleted');
    setTasks(tasks.filter(t => t.id !== id));
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'medicine': return <Pill size={16} className="text-emerald-500" />;
      case 'appointment': return <Calendar size={16} className="text-blue-500" />;
      case 'checkup': return <Stethoscope size={16} className="text-purple-500" />;
      default: return <Activity size={16} className="text-gray-500" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl border border-emerald-50 overflow-hidden shadow-sm relative">
      {/* Reminder Overlay */}
      <AnimatePresence>
        {activeReminder && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-x-4 top-4 z-50 bg-emerald-700 text-white p-5 rounded-2xl shadow-2xl border border-emerald-500 flex flex-col gap-4"
          >
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-2xl animate-bounce">
                <Bell size={32} />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-200 mb-1">Dawai ka waqt</p>
                <h3 className="font-extrabold text-xl leading-tight">{activeReminder.title}</h3>
                <p className="text-sm text-emerald-100 italic mt-1">
                   {activeReminder.userName || globalUserName}, aap ki medicine ka waqt ho gaya hai.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => toggleTask(activeReminder.id, true)}
                className="flex-1 bg-white text-emerald-700 py-3 rounded-xl font-black text-sm hover:bg-emerald-50 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={18} /> MAINE LE LI
              </button>
              <button 
                onClick={() => { setActiveReminder(null); window.speechSynthesis.cancel(); }}
                className="px-4 bg-emerald-800 text-emerald-300 rounded-xl hover:text-white transition-all flex items-center justify-center"
              >
                <X size={20} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-4 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between">
        <div className="flex flex-col">
          <h2 className="font-bold text-emerald-800 flex items-center gap-2">
            <Activity size={18} /> {activeReminder ? 'Urgent Alert' : 'Sehat Tasks'}
          </h2>
          {globalUserName && !activeReminder && (
            <p className="text-[10px] text-emerald-600 font-bold ml-6 uppercase tracking-wider">Hi, {globalUserName}</p>
          )}
        </div>
        <div className="flex gap-1">
          <button 
            onClick={() => setShowLogs(!showLogs)}
            title="History"
            className={`p-1.5 rounded-lg transition-colors ${showLogs ? 'bg-emerald-200 text-emerald-800' : 'text-emerald-500 hover:bg-emerald-100'}`}
          >
            <History size={18} />
          </button>
          <button 
            onClick={() => { setIsSmartAdding(!isSmartAdding); setIsAdding(false); setShowLogs(false); }}
            title="AI Add"
            className={`p-1.5 rounded-lg transition-colors ${isSmartAdding ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200' : 'text-emerald-600 hover:bg-emerald-100'}`}
          >
            <Sparkles size={18} />
          </button>
          <button 
            onClick={() => { setIsAdding(!isAdding); setIsSmartAdding(false); setShowLogs(false); }}
            title="Manual Add"
            className={`p-1.5 rounded-lg transition-colors ${isAdding ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200' : 'text-emerald-600 hover:bg-emerald-100'}`}
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar relative">
        <AnimatePresence mode="popLayout">
          {showLogs ? (
            <motion.div 
              key="history-view"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] border-l-2 border-emerald-400 pl-2">History Log</h3>
                <button onClick={() => setLogs([])} className="text-[10px] text-red-400 font-bold hover:underline">Clear History</button>
              </div>
              {logs.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-10 italic">Yahan abhi kuch nahi hai.</p>
              )}
              {logs.map(log => (
                <div key={log.id} className="flex items-start gap-3 bg-gray-50/50 p-3 rounded-xl border border-gray-100 shadow-sm transition-all hover:bg-white hover:border-emerald-100">
                  <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${log.action === 'completed' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-red-400'}`} />
                  <div className="flex-1">
                    <p className="text-xs text-gray-800 font-bold">{log.title}</p>
                    <p className="text-[10px] text-gray-400 font-medium">
                      {log.action === 'completed' ? 'Mukammal kiya gaya' : 'Delete kiya gaya'} • {log.timestamp.toLocaleDateString()} {log.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </p>
                  </div>
                </div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="tasks-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {isSmartAdding && (
                <motion.form 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  onSubmit={handleSmartAdd}
                  className="bg-emerald-900 text-white p-4 rounded-2xl space-y-4 mb-4 overflow-hidden shadow-xl border-t border-emerald-700"
                >
                  <p className="text-[10px] font-black text-emerald-300 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Sparkles size={12} className="animate-pulse" /> AI Quick Add
                  </p>
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="E.g. Take Panadol at 08:00 AM"
                      className="w-full bg-emerald-800 border border-emerald-700 rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 text-white placeholder:text-emerald-500 transition-all"
                      value={smartInput}
                      onChange={e => setSmartInput(e.target.value)}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={toggleListening}
                      className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all ${
                        isListening 
                          ? 'bg-red-500 text-white animate-pulse' 
                          : 'text-emerald-400 hover:bg-emerald-700'
                      }`}
                    >
                      {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                    </button>
                  </div>
                  <button 
                    type="submit"
                    disabled={isParsing || !smartInput.trim()}
                    className="w-full py-3 text-sm font-black bg-emerald-500 text-white rounded-xl hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/20 active:scale-95"
                  >
                    {isParsing ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'ANALYZE & ADD'}
                  </button>
                </motion.form>
              )}

              {isAdding && (
                <motion.form 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  onSubmit={addTask}
                  className="bg-white p-4 rounded-2xl border-2 border-emerald-100 space-y-4 mb-4 overflow-hidden shadow-lg"
                >
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-1 mb-1 block">User Name</label>
                      <input 
                        type="text" 
                        placeholder="Aapka naam"
                        className="w-full bg-emerald-50/50 border border-emerald-100 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                        value={newTask.userName}
                        onChange={e => {
                          setNewTask({...newTask, userName: e.target.value});
                          if (!globalUserName) setGlobalUserName(e.target.value);
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-1 mb-1 block">Medicine / Task</label>
                      <input 
                        type="text" 
                        placeholder="Medicine ka naam"
                        className="w-full bg-emerald-50/50 border border-emerald-100 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                        value={newTask.title}
                        onChange={e => setNewTask({...newTask, title: e.target.value})}
                      />
                    </div>
                    <div className="flex gap-2">
                       <div className="flex-1">
                        <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-1 mb-1 block">Time</label>
                        <input 
                          type="time" 
                          className="w-full bg-emerald-50/50 border border-emerald-100 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                          value={newTask.time}
                          onChange={e => setNewTask({...newTask, time: e.target.value})}
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-1 mb-1 block">Category</label>
                        <select 
                          className="w-full bg-emerald-50/50 border border-emerald-100 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all appearance-none"
                          value={newTask.category}
                          onChange={e => setNewTask({...newTask, category: e.target.value as any})}
                        >
                          <option value="medicine">Medicine</option>
                          <option value="appointment">Doctor</option>
                          <option value="checkup">Checkup</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <button 
                    type="submit"
                    className="w-full py-3 text-sm font-black bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 active:scale-95"
                  >
                    SET REMINDER
                  </button>
                </motion.form>
              )}

              {tasks.length === 0 && !isAdding && !isSmartAdding && (
                <div className="flex flex-col items-center justify-center py-16 opacity-30 text-center">
                  <div className="bg-emerald-50 p-6 rounded-full mb-4">
                    <Calendar size={64} className="text-emerald-400" />
                  </div>
                  <p className="text-sm font-black uppercase tracking-widest text-emerald-800">No active tasks</p>
                  <p className="text-xs text-gray-500 mt-1">Dawai ka waqt nishaan karein.</p>
                </div>
              )}

              {tasks.map(task => (
                <motion.div 
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`p-4 rounded-2xl border-2 flex items-center justify-between gap-4 transition-all hover:shadow-md ${
                    task.completed ? 'bg-gray-50 border-gray-100 opacity-60 grayscale' : 'bg-white border-emerald-50 shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => toggleTask(task.id)} 
                      className={`shrink-0 transition-transform active:scale-90 ${task.completed ? 'text-emerald-500' : 'text-gray-300 hover:text-emerald-400'}`}
                    >
                      {task.completed ? (
                        <CheckCircle2 size={24} />
                      ) : (
                        <Circle size={24} />
                      )}
                    </button>
                    <div>
                      <h3 className={`text-sm sm:text-base font-extrabold ${task.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                        {task.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-1">
                        <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-0.5 rounded-lg border border-gray-100">
                          {getCategoryIcon(task.category)}
                          <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider ">{task.category}</span>
                        </div>
                        {task.time && (
                          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border font-black text-[10px] ${activeReminder?.id === task.id ? 'bg-red-50 border-red-200 text-red-500 animate-pulse' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
                            <Clock size={10} /> {task.time}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => deleteTask(task.id)}
                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-75"
                  >
                    <Trash2 size={18} />
                  </button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="p-3 bg-gray-50 text-[10px] text-gray-400 text-center font-medium">
        Tasks aap ke browser mein save honge.
      </div>
    </div>
  );
}
