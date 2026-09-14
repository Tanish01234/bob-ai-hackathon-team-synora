'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  X,
  Minus,
  Maximize2,
  Send,
  Bot,
  User,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Compass,
  Layers,
  ChevronRight,
} from 'lucide-react';
import Image from 'next/image';
import { OceanShipLauncher } from './ocean-ai/ocean-ship-launcher';
import { chatWithBob, type AIChatResponse } from '@/lib/api/ai';
import { ensureAuthSession, getAuthState, subscribeAuth, type AuthStatus } from '@/lib/auth-bootstrap';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{ type: string; id?: string; name?: string; location?: string }>;
  riskLevel?: string | null;
  recommendedAction?: string | null;
  timestamp: string;
  offTopic?: boolean;
}

interface BobAssistantPanelProps {
  initialShipmentId?: string | null;
  isOpen?: boolean;
  onClose?: () => void;
}

export function BobAssistantPanel({ initialShipmentId, isOpen: propIsOpen, onClose }: BobAssistantPanelProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeShipmentId, setActiveShipmentId] = useState<string | null>(initialShipmentId || null);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [authStatus, setAuthStatus] = useState<AuthStatus>(() => getAuthState().status);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Subscribe to auth bootstrap status
  useEffect(() => {
    return subscribeAuth((state) => {
      setAuthStatus(state.status);
    });
  }, []);

  // Sync propIsOpen
  useEffect(() => {
    if (propIsOpen !== undefined) {
      setIsOpen(propIsOpen);
      if (propIsOpen) setIsCollapsed(false);
    }
  }, [propIsOpen]);

  // Sync initialShipmentId
  useEffect(() => {
    if (initialShipmentId) {
      setActiveShipmentId(initialShipmentId);
    }
  }, [initialShipmentId]);

  // Listen for global custom events to open Bob AI drawer
  useEffect(() => {
    const handleOpenBob = (e: CustomEvent<{ shipmentId?: string; prompt?: string }>) => {
      setIsOpen(true);
      setIsCollapsed(false);
      if (e.detail?.shipmentId) {
        setActiveShipmentId(e.detail.shipmentId);
      }
      if (e.detail?.prompt) {
        sendMessage(e.detail.prompt, e.detail.shipmentId || activeShipmentId);
      }
    };

    window.addEventListener('bob:open-chat' as any, handleOpenBob);
    return () => {
      window.removeEventListener('bob:open-chat' as any, handleOpenBob);
    };
  }, [activeShipmentId]);

  // Initial welcome message if empty
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: activeShipmentId
            ? `Hello! I'm Bob, your Supply Chain Intelligence Assistant. I am actively monitoring shipment **${activeShipmentId}**. How can I help you analyze risk, weather, or routes?`
            : "Hello! I'm Bob, your Supply Chain Intelligence Assistant. Ask me anything about active disruptions, fleet health, weather events, or high-risk shipments.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  }, [activeShipmentId, messages.length]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (isOpen && !isCollapsed) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isCollapsed]);

  const sendMessage = async (textToSend?: string, overrideShipmentId?: string | null) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    const targetShipmentId = overrideShipmentId !== undefined ? overrideShipmentId : activeShipmentId;

    try {
      const history = messages.slice(-4).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res: AIChatResponse = await chatWithBob(query, targetShipmentId || undefined, history);

      const assistantMsg: ChatMessage = {
        id: `bob-${Date.now()}`,
        role: 'assistant',
        content: res.answer,
        sources: res.sources,
        riskLevel: res.risk_level,
        recommendedAction: res.recommended_action,
        offTopic: res.off_topic,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      let friendlyError = err?.message || 'Network error';
      if (err?.status === 401) {
        friendlyError = 'Authentication session required or expired. Please sign in or enter Judge Demo mode.';
      } else if (err?.status === 503) {
        friendlyError = 'Bob AI reasoning engine is momentarily unavailable. Telemetry and rule checks remain active.';
      } else if (err?.status === 400) {
        friendlyError = err?.data?.detail || 'Invalid query parameters.';
      }
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Error from Bob AI engine: ${friendlyError}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleExpandToFullPage = () => {
    const url = activeShipmentId
      ? `/dashboard/assistant?shipment_id=${activeShipmentId}`
      : '/dashboard/assistant';
    router.push(url);
  };

  const handleClose = () => {
    setIsOpen(false);
    onClose?.();
  };

  // Contextual presets
  const suggestions = activeShipmentId
    ? [
        'Why is it delayed?',
        'Should I reroute this shipment?',
        'What alternative routes exist?',
        'Is cold-chain temperature within range?',
      ]
    : [
        'Fleet overview & active disruptions',
        'Show highest risk shipments',
        'What weather events are affecting transit?',
        'Cold-chain excursion status',
      ];

  return (
    <>
      {/* Draggable Ocean Ship AI Launcher (when closed) */}
      {!isOpen && (
        <OceanShipLauncher
          onOpen={() => {
            setIsOpen(true);
            setIsCollapsed(false);
          }}
          activeShipmentId={activeShipmentId}
        />
      )}

      {/* Persistent Drawer Panel */}
      {isOpen && (
        <div
          data-tour="bob-assistant-drawer"
          className={`fixed z-50 transition-all duration-300 shadow-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 flex flex-col ${
            isCollapsed
              ? 'bottom-6 right-6 w-80 h-14 rounded-2xl border'
              : 'bottom-6 right-6 w-96 sm:w-[420px] h-[580px] max-h-[85vh] rounded-2xl border'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0A0F1E] rounded-t-2xl">
            <div className="flex items-center gap-2.5">
              <div className="relative w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 overflow-hidden flex items-center justify-center p-0.5">
                <Image
                  src="/bob-ocean-ship.png"
                  alt="BOB Ocean Vessel"
                  width={34}
                  height={17}
                  className="object-contain"
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold font-mono tracking-wide text-slate-900 dark:text-white">BOB AI</h3>
                  <span className="text-[9px] font-mono text-cyan-400 font-semibold px-1.5 py-0.2 rounded bg-cyan-500/10 border border-cyan-500/30">
                    OCEAN INTELLIGENCE
                  </span>
                  {authStatus === 'AUTH_INITIALIZING' ? (
                    <span className="text-[9px] font-mono text-amber-400 font-medium px-1.5 py-0.2 rounded bg-amber-500/10 border border-amber-500/30 animate-pulse flex items-center gap-1">
                      <span className="size-1 rounded-full bg-amber-400 animate-ping" />
                      CONNECTING...
                    </span>
                  ) : authStatus === 'AUTHENTICATED' ? (
                    <span className="text-[9px] font-mono text-emerald-400 font-medium px-1.5 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-1">
                      <span className="size-1 rounded-full bg-emerald-400" />
                      ONLINE
                    </span>
                  ) : null}
                </div>
                {activeShipmentId ? (
                  <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                    <span>Context:</span>
                    <span className="text-blue-600 dark:text-blue-400 font-semibold">{activeShipmentId}</span>
                    <button
                      type="button"
                      onClick={() => setActiveShipmentId(null)}
                      className="text-slate-400 hover:text-slate-600 text-[10px] ml-1"
                      title="Clear shipment context"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-500">Fleet Intelligence Mode</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-1 rounded text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
                title={isCollapsed ? 'Expand' : 'Collapse'}
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleExpandToFullPage}
                className="p-1 rounded text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
                title="Expand to Full Page"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="p-1 rounded text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
                title="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Drawer Body (hidden when collapsed) */}
          {!isCollapsed && (
            <>
              {/* Message Scroll Area */}
              <div className="flex-1 overflow-y-auto p-3.5 space-y-3 text-xs">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 px-1">
                      {m.role === 'user' ? (
                        <>
                          <span className="text-[10px] text-slate-400">{m.timestamp}</span>
                          <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">You</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3 text-blue-500" />
                          <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">Bob</span>
                          <span className="text-[10px] text-slate-400">{m.timestamp}</span>
                        </>
                      )}
                    </div>

                    <div
                      className={`max-w-[88%] rounded-xl px-3 py-2 leading-relaxed ${
                        m.role === 'user'
                          ? 'bg-blue-600 text-white rounded-br-none shadow-sm'
                          : m.offTopic
                          ? 'bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 rounded-bl-none'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{m.content}</div>

                      {/* Action & Risk badges if present */}
                      {(m.riskLevel || m.recommendedAction) && (
                        <div className="mt-2 pt-2 border-t border-slate-200/50 dark:border-slate-700/50 flex flex-wrap items-center gap-1.5">
                          {m.riskLevel && (
                            <span
                              className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                m.riskLevel === 'critical'
                                  ? 'bg-red-500/20 text-red-700 dark:text-red-400'
                                  : m.riskLevel === 'high'
                                  ? 'bg-orange-500/20 text-orange-700 dark:text-orange-400'
                                  : m.riskLevel === 'medium'
                                  ? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400'
                                  : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                              }`}
                            >
                              Risk: {m.riskLevel}
                            </span>
                          )}
                          {m.recommendedAction && (
                            <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-700 dark:text-blue-300">
                              Action: {m.recommendedAction.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Sources pill list */}
                      {m.sources && m.sources.length > 0 && (
                        <div className="mt-2 pt-1.5 border-t border-slate-200/40 dark:border-slate-700/40">
                          <div className="text-[9px] text-slate-400 uppercase font-semibold mb-1 flex items-center gap-1">
                            <Layers className="w-2.5 h-2.5" /> Grounded Sources
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {m.sources.map((s, idx) => (
                              <span
                                key={idx}
                                className="text-[9px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono"
                              >
                                {s.id || s.name || s.location || s.type}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex items-center gap-2 text-slate-400 text-xs py-2 px-1">
                    <Sparkles className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                    <span>Bob is reasoning from live telemetry...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Suggestions Chips */}
              <div className="px-3 py-1.5 border-t border-slate-200/60 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850">
                <p className="text-[9px] font-medium text-slate-400 uppercase mb-1">Suggested prompts</p>
                <div className="flex flex-wrap gap-1">
                  {suggestions.slice(0, 3).map((item, i) => (
                    <button
                      type="button"
                      key={i}
                      onClick={() => sendMessage(item)}
                      disabled={isLoading}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-400 hover:text-blue-600 transition-colors truncate max-w-[190px] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input Bar */}
              <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-b-2xl">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      activeShipmentId
                        ? `Ask Bob about ${activeShipmentId}...`
                        : 'Ask Bob about shipments, weather, disruptions...'
                    }
                    disabled={isLoading}
                    className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                  <button
                    type="submit"
                    disabled={!inputMessage.trim() || isLoading}
                    className="p-2 rounded-xl bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title="Send message"
                    aria-label="Send message"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
                <div className="mt-1.5 flex items-center justify-between text-[9px] text-slate-400 px-1">
                  <span>RULES DETECT. AI REASONS.</span>
                  <span>Dual Gemini/Groq Grounding</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
