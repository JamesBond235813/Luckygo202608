/** EBA 助手（暂不在 Me 页挂载，恢复时取消 Me.tsx 中的注释） */
import React, { useState, useRef, useEffect } from 'react';
import { useI18n } from '../lib/useI18n';
// import { GoogleGenAI } from "@google/genai"; // Commented out to avoid runtime crash if not installed properly or missing key

interface Message {
    role: 'user' | 'bot';
    text: string;
}

const LuckyAssistant: React.FC = () => {
    const { t, language } = useI18n();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([{ role: 'bot', text: t('assistantWelcome') }]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setMessages([{ role: 'bot', text: t('assistantWelcome') }]);
            setInput('');
        }, 0);
        return () => window.clearTimeout(timer);
    }, [language, t]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

    const sendMessage = async (text: string) => {
        if (!text.trim() || isLoading) return;

        const userMessage = text.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
        setIsLoading(true);

        // Mock AI response for demo stability
        setTimeout(() => {
            const botResponse = t('assistantReply');
            setMessages(prev => [...prev, { role: 'bot', text: botResponse }]);
            setIsLoading(false);
        }, 1000);
    };

    const handleSend = async () => {
        await sendMessage(input);
    };

    const askQuickQuestion = (question: string) => {
        void sendMessage(question);
    };

    return (
        <>
            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-24 right-5 size-14 bg-gradient-to-tr from-ghana-green to-emerald-500 rounded-full shadow-2xl flex items-center justify-center text-white z-40 animate-bounce active:scale-90 transition-transform"
            >
                <span className="material-symbols-outlined text-3xl filled">smart_toy</span>
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-primary"></span>
                </span>
            </button>

            {/* Chat Modal */}
            {isOpen && (
                <div className="fixed inset-0 z-[60] flex items-end justify-center px-4 pb-20 bg-black/60 backdrop-blur-md transition-all duration-300">
                    <div className="w-full max-w-md sm:max-w-lg bg-white dark:bg-dark-card rounded-3xl shadow-2xl flex flex-col h-[65vh] sm:h-[60vh] overflow-hidden animate-in slide-in-from-bottom duration-300 transition-colors">
                        <div className="bg-ghana-green p-4 flex justify-between items-center shadow-md">
                            <div className="flex items-center gap-3">
                                <div className="size-10 rounded-full bg-white/20 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-primary text-2xl filled">auto_awesome</span>
                                </div>
                                <div>
                                    <h3 className="text-white font-bold text-sm">{t('assistantTitle')}</h3>
                                    <div className="flex items-center gap-1">
                                        <span className="size-1.5 rounded-full bg-primary animate-pulse"></span>
                                        <span className="text-white/60 text-[10px]">{t('assistantAiPowered')}</span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-4 no-scrollbar bg-gray-50 dark:bg-slate-900/50 transition-colors">
                            <div className="flex flex-wrap gap-2">
                                {(['assistantQuick1', 'assistantQuick2', 'assistantQuick3'] as const).map((key) => (
                                    <button key={key} type="button" onClick={() => askQuickQuestion(t(key))} className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-ghana-green shadow-sm border border-gray-100">
                                        {t(key)}
                                    </button>
                                ))}
                            </div>
                            {messages.map((msg, idx) => (
                                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm shadow-sm leading-relaxed ${msg.role === 'user'
                                            ? 'bg-ghana-green text-white rounded-tr-none'
                                            : 'bg-white dark:bg-dark-card text-gray-800 dark:text-slate-200 rounded-tl-none border border-gray-100 dark:border-slate-800'
                                        }`}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-white dark:bg-dark-card p-4 rounded-2xl rounded-tl-none border border-gray-100 dark:border-slate-800 flex gap-1.5">
                                        <div className="size-2 bg-ghana-green/40 rounded-full animate-bounce"></div>
                                        <div className="size-2 bg-ghana-green/40 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                        <div className="size-2 bg-ghana-green/40 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-white dark:bg-dark-card border-t border-gray-100 dark:border-slate-800 flex gap-2 transition-colors">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                                placeholder={t('assistantPlaceholder')}
                                className="flex-1 bg-gray-100 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-ghana-green text-gray-900 dark:text-slate-100 transition-colors"
                            />
                            <button
                                onClick={handleSend}
                                disabled={isLoading}
                                className="size-12 bg-ghana-green rounded-xl flex items-center justify-center text-white active:scale-90 transition-all disabled:opacity-50 shadow-lg shadow-ghana-green/20"
                            >
                                <span className="material-symbols-outlined text-xl">send</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default LuckyAssistant;
