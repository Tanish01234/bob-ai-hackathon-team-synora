'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  X,
  AlertTriangle,
  AlertCircle,
  Thermometer,
  CloudRain,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { getAlerts, type ApiAlert } from '@/lib/api/alerts';

interface AlertCenterProps {
  onSelectShipment?: (shipmentId: string) => void;
  activeDisruptionCount?: number;
}

export function AlertCenter({ onSelectShipment, activeDisruptionCount = 0 }: AlertCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [alerts, setAlerts] = useState<ApiAlert[]>([]);
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'all' | 'critical' | 'cold_chain' | 'resolved'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Load resolved IDs from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('bob-resolved-alerts');
      if (saved) {
        setResolvedIds(new Set(JSON.parse(saved)));
      }
    } catch {}
  }, []);

  const saveResolvedIds = (newSet: Set<string>) => {
    setResolvedIds(newSet);
    try {
      localStorage.setItem('bob-resolved-alerts', JSON.stringify(Array.from(newSet)));
    } catch {}
  };

  const loadAlerts = () => {
    setIsLoading(true);
    getAlerts()
      .then((data) => {
        setAlerts(data || []);
      })
      .catch((err) => {
        console.error('Failed to load alerts:', err);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const activeAlerts = alerts.filter((a) => {
    const id = a.alert_id || a.id || `${a.shipment_id}-${a.type}`;
    return !resolvedIds.has(id);
  });

  const criticalCount = activeAlerts.filter((a) => a.severity === 'critical' || a.severity === 'high').length;

  const handleToggleResolve = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(resolvedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    saveResolvedIds(next);
  };

  const handleClearAll = () => {
    const next = new Set(resolvedIds);
    alerts.forEach((a) => {
      const id = a.alert_id || a.id || `${a.shipment_id}-${a.type}`;
      next.add(id);
    });
    saveResolvedIds(next);
  };

  const filteredAlerts = alerts.filter((a) => {
    const id = a.alert_id || a.id || `${a.shipment_id}-${a.type}`;
    const isResolved = resolvedIds.has(id);

    if (activeTab === 'resolved') return isResolved;
    if (isResolved) return false;

    if (activeTab === 'critical') return a.severity === 'critical' || a.severity === 'high';
    if (activeTab === 'cold_chain') return a.type.includes('cold') || a.type.includes('temp');
    return true;
  });

  return (
    <div className="relative" ref={popoverRef}>
      {/* Trigger Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        title="Alert Center"
      >
        <Bell className="w-4 h-4" />
        {criticalCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white shadow-sm ring-2 ring-slate-950">
            {criticalCount > 99 ? '99+' : criticalCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl z-50 overflow-hidden flex flex-col text-xs animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-red-500/10 text-red-400">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Alert Center</h3>
                <p className="text-[10px] text-slate-400">
                  {criticalCount} active urgent alert{criticalCount === 1 ? '' : 's'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {activeAlerts.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-[10px] text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 hover:bg-slate-700"
                >
                  Clear All
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex border-b border-slate-800 bg-slate-950/60 p-1 gap-1 text-[11px]">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 py-1 rounded-lg font-medium transition-colors ${
                activeTab === 'all'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Active ({activeAlerts.length})
            </button>
            <button
              onClick={() => setActiveTab('critical')}
              className={`flex-1 py-1 rounded-lg font-medium transition-colors ${
                activeTab === 'critical'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Critical ({activeAlerts.filter((a) => a.severity === 'critical' || a.severity === 'high').length})
            </button>
            <button
              onClick={() => setActiveTab('cold_chain')}
              className={`flex-1 py-1 rounded-lg font-medium transition-colors ${
                activeTab === 'cold_chain'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Cold-Chain
            </button>
            <button
              onClick={() => setActiveTab('resolved')}
              className={`flex-1 py-1 rounded-lg font-medium transition-colors ${
                activeTab === 'resolved'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Resolved ({resolvedIds.size})
            </button>
          </div>

          {/* Alert List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-800/60">
            {filteredAlerts.length === 0 ? (
              <div className="p-8 text-center text-slate-500 flex flex-col items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-500/60" />
                <p>No alerts in this view</p>
                <span className="text-[10px] text-slate-600">All network signals nominal</span>
              </div>
            ) : (
              filteredAlerts.map((alert) => {
                const id = alert.alert_id || alert.id || `${alert.shipment_id}-${alert.type}`;
                const isResolved = resolvedIds.has(id);

                return (
                  <div
                    key={id}
                    onClick={() => {
                      if (alert.shipment_id) {
                        onSelectShipment?.(alert.shipment_id);
                        setIsOpen(false);
                      }
                    }}
                    className={`p-3 hover:bg-slate-800/50 cursor-pointer transition-colors flex items-start gap-2.5 ${
                      isResolved ? 'opacity-60 bg-slate-950/40' : ''
                    }`}
                  >
                    <div className="mt-0.5">
                      {alert.severity === 'critical' ? (
                        <span className="flex h-2 w-2 rounded-full bg-red-500 animate-ping" />
                      ) : alert.severity === 'high' ? (
                        <span className="flex h-2 w-2 rounded-full bg-orange-500" />
                      ) : (
                        <span className="flex h-2 w-2 rounded-full bg-yellow-500" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="font-semibold text-white truncate font-mono text-[11px]">
                          {alert.shipment_id}
                        </span>
                        <span
                          className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded ${
                            alert.severity === 'critical'
                              ? 'bg-red-500/20 text-red-400'
                              : alert.severity === 'high'
                              ? 'bg-orange-500/20 text-orange-400'
                              : 'bg-yellow-500/20 text-yellow-400'
                          }`}
                        >
                          {alert.severity}
                        </span>
                      </div>
                      <p className="text-slate-300 line-clamp-2 text-[11px] leading-relaxed">
                        {alert.message}
                      </p>
                      <div className="mt-1 flex items-center justify-between text-[9px] text-slate-500">
                        <span>{new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <button
                          onClick={(e) => handleToggleResolve(id, e)}
                          className="text-blue-400 hover:text-blue-300 font-medium hover:underline"
                        >
                          {isResolved ? 'Reopen' : 'Mark Resolved'}
                        </button>
                      </div>
                    </div>

                    <ChevronRight className="w-3.5 h-3.5 text-slate-600 self-center" />
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-[10px] text-slate-500">
            <span>Deterministic Alert Engine</span>
            <span>Click any alert to inspect shipment</span>
          </div>
        </div>
      )}
    </div>
  );
}
