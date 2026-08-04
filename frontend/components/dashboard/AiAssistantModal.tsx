'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, X, Bot, ChevronRight, CalendarPlus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { usePathname, useRouter } from 'next/navigation';
import { getToken } from '@/lib/auth';
import { api } from '@/lib/api';

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  autoOpened?: boolean;
}

export default function AiAssistantModal({ isOpen, onClose, autoOpened = false }: AiAssistantModalProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isStaffOrDoctor = pathname?.includes('/dashboard/staff') || pathname?.includes('/dashboard/doctor');
  const basePath = pathname?.includes('/dashboard/doctor') ? '/dashboard/doctor' : '/dashboard/staff';

  const [reminders, setReminders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!isOpen || !token) return;

    const fetchReminders = async () => {
      setLoading(true);
      try {
        const response: any = await api.get('/ai/smart-reminders', token);
        if (response?.success) {
          setReminders(response.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch smart reminders:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReminders();
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 400);
  };

  if (!isOpen && !isClosing) return null;

  return (
    <div 
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-400 ${
        isClosing ? 'bg-transparent backdrop-blur-none' : 'bg-gray-900/40 backdrop-blur-sm'
      }`}
    >
      <div 
        className={`w-full sm:max-w-[425px] bg-white p-0 overflow-hidden border-0 shadow-2xl rounded-2xl relative transition-all duration-400 ease-in-out transform origin-top-right ${
          isClosing 
            ? 'scale-0 translate-x-[40vw] -translate-y-[40vh] opacity-0' 
            : 'scale-100 translate-x-0 translate-y-0 opacity-100'
        }`}
      >
          <div className="p-6 pb-4 relative bg-white border-b border-slate-100">
            <div className="absolute top-4 right-4 cursor-pointer text-slate-400 hover:text-slate-600 transition-colors" onClick={handleClose}>
              <X size={20} />
            </div>
            
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0 flex items-center justify-center">
                {/* Glowing background ring */}
                <div className="absolute inset-0 bg-teal-100 rounded-full animate-ping opacity-60 h-12 w-12 m-auto"></div>
                
                {/* Floating Bot Icon */}
                <div className="relative z-10 bg-white p-2.5 rounded-full shadow-sm border border-slate-100 text-teal-600">
                  <Bot size={26} className="animate-bounce" style={{ animationDuration: '2.5s' }} />
                </div>
                
                {/* Little sparkle */}
                <div className="absolute -top-1.5 -right-1.5 z-20">
                  <Sparkles size={14} className="text-amber-400 animate-pulse drop-shadow-sm" />
                </div>
              </div>
              
              <div className="flex flex-col">
                <h2 className="text-lg font-bold text-slate-800 tracking-tight">
                  Smart Assistant
                </h2>
                <p className="text-slate-500 text-sm font-medium mt-0.5">
                  {autoOpened ? "Here's what you need to know today." : "How can I help you today?"}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 bg-white min-h-[160px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center space-y-3 py-8 animate-pulse">
                <Sparkles size={28} className="text-teal-400" />
                <p className="text-sm font-medium text-slate-500">Analyzing your dashboard...</p>
              </div>
            ) : (reminders.length > 0 || isStaffOrDoctor) ? (
              <ul className="space-y-3">
                {isStaffOrDoctor && (
                  <li className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-teal-100 hover:bg-teal-50/50 transition-colors shadow-sm">
                    <div className="mt-0.5 bg-teal-100 p-1 rounded-full shrink-0">
                      <CalendarPlus size={14} className="text-teal-600 font-bold" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm text-slate-700 font-medium leading-relaxed">
                        Don't forget to review and add slots for today's schedule!
                      </span>
                      <button 
                        onClick={() => {
                          handleClose();
                          router.push(`${basePath}/calendar`);
                        }}
                        className="mt-1 text-xs text-teal-600 font-semibold text-left hover:underline"
                      >
                        Go to Calendar &rarr;
                      </button>
                    </div>
                  </li>
                )}
                {reminders.map((reminder, idx) => (
                  <li key={idx} className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-teal-100 hover:bg-teal-50/50 transition-colors shadow-sm">
                    <div className="mt-0.5 bg-teal-100 p-1 rounded-full shrink-0">
                      <ChevronRight size={14} className="text-teal-600 font-bold" />
                    </div>
                    <span className="text-sm text-slate-700 font-medium leading-relaxed">{reminder}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-8">
                <div className="bg-teal-50 p-3 rounded-full mb-3">
                  <Sparkles size={24} className="text-teal-500" />
                </div>
                <p className="text-sm font-medium text-slate-700">You're all caught up!</p>
                <p className="text-xs text-slate-500 mt-1">Have a great day ahead.</p>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
            <Button onClick={handleClose} className="rounded-xl px-6 bg-teal-600 hover:bg-teal-700 text-white font-medium shadow-sm transition-colors">
              Got it, thanks!
            </Button>
          </div>
      </div>
    </div>
  );
}
