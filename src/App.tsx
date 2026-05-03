/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import ChatInterface from './components/ChatInterface';
import TaskTracker from './components/TaskTracker';
import { Heart, Activity, MessageSquare } from 'lucide-react';
import { useState } from 'react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'chat' | 'tasks'>('chat');

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-4 px-2 sm:p-4 md:p-8 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">
      <header className="mb-6 text-center w-full max-w-6xl">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Heart className="text-emerald-600 fill-emerald-600" size={32} />
          <span className="text-3xl font-black tracking-tighter text-gray-900 border-b-4 border-emerald-500">SehatAI</span>
        </div>
        <p className="text-gray-500 text-sm font-medium">Aapka digital sehat ka sathi (Your digital health companion)</p>
      </header>

      {/* Mobile Tab Switcher */}
      <div className="flex sm:hidden w-full max-w-md bg-white rounded-xl p-1 mb-4 shadow-sm border border-emerald-50 font-bold text-xs uppercase tracking-widest">
        <button 
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-3 px-2 rounded-lg flex items-center justify-center gap-2 transition-all ${activeTab === 'chat' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200' : 'text-gray-400'}`}
        >
          <MessageSquare size={16} /> Chat
        </button>
        <button 
          onClick={() => setActiveTab('tasks')}
          className={`flex-1 py-3 px-2 rounded-lg flex items-center justify-center gap-2 transition-all ${activeTab === 'tasks' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200' : 'text-gray-400'}`}
        >
          <Activity size={16} /> Tasks
        </button>
      </div>

      <main className="w-full max-w-6xl h-[75vh] sm:h-[80vh] max-h-[850px] grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Chat - Takes 3 columns on LG screens */}
        <div className={`lg:col-span-3 transition-all h-full ${activeTab === 'chat' ? 'block' : 'hidden sm:block'}`}>
          <ChatInterface />
        </div>

        {/* Task Tracker - Takes 1 column on LG screens */}
        <div className={`lg:col-span-1 h-full ${activeTab === 'tasks' ? 'block' : 'hidden lg:block'}`}>
          <TaskTracker />
        </div>
      </main>

      <footer className="mt-8 text-gray-400 text-[10px] sm:text-xs text-center max-w-md px-4 pb-4">
        <p>© 2026 SehatAI. Tamam huqooq mehfooz hain. Ye sirf rahnumai ke liye hai, tibbi ilaaj ke liye doctor se mashwara karein.</p>
      </footer>
    </div>
  );
}
