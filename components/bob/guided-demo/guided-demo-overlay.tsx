"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, X, Sparkles, Check, ArrowRight } from "lucide-react";
import type { TourStep, TourPlacement } from "./types";

interface GuidedDemoOverlayProps {
  isOpen: boolean;
  activeStep: TourStep | null;
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
}

export function GuidedDemoOverlay({
  isOpen,
  activeStep,
  stepIndex,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
}: GuidedDemoOverlayProps) {
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number }>({ top: -9999, left: -9999 });
  const popoverRef = useRef<HTMLDivElement>(null);

  // Measure and track target element bounding box
  const updateTargetRect = useCallback(() => {
    if (!activeStep) {
      setTargetRect(null);
      return;
    }

    const el = document.querySelector(activeStep.targetSelector);
    if (!el) {
      setTargetRect(null);
      return;
    }

    // Scroll smoothly into view if needed
    const r = el.getBoundingClientRect();
    const isOffscreen =
      r.top < 60 || r.bottom > window.innerHeight - 60 || r.left < 20 || r.right > window.innerWidth - 20;

    if (isOffscreen) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    const rect = el.getBoundingClientRect();
    setTargetRect({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      bottom: rect.bottom,
      right: rect.right,
    });
  }, [activeStep]);

  // Update on step change, resize, and scroll
  useEffect(() => {
    if (!isOpen || !activeStep) return;

    // Smart auto-reveal: ensure prerequisite views are visible for this step
    if (typeof window !== 'undefined') {
      if (activeStep.id === 'affected-shipments') {
        const el = document.querySelector(activeStep.targetSelector);
        if (!el) {
          const firstDisruption = document.querySelector('[data-tour="disruptions-feed"] button') as HTMLButtonElement | null;
          firstDisruption?.click();
        }
      } else if (
        ['shipment-summary', 'live-tracking', 'route-weather', 'cold-chain', 'bob-intelligence', 'ai-analysis'].includes(activeStep.id)
      ) {
        const el = document.querySelector(activeStep.targetSelector);
        if (!el) {
          const firstShipmentBtn = document.querySelector('[data-tour="affected-shipments"] article button') as HTMLButtonElement | null;
          firstShipmentBtn?.click();
        }
      } else if (activeStep.id === 'bob-assistant-drawer') {
        const el = document.querySelector(activeStep.targetSelector);
        if (!el) {
          window.dispatchEvent(new CustomEvent('bob:open-chat'));
        }
      }
    }

    // Small delay to allow any modal, animation, or view to stabilize
    const timer = setTimeout(updateTargetRect, 100);
    const retryTimer = setTimeout(updateTargetRect, 350);
    window.addEventListener("resize", updateTargetRect);
    window.addEventListener("scroll", updateTargetRect, true);

    return () => {
      clearTimeout(timer);
      clearTimeout(retryTimer);
      window.removeEventListener("resize", updateTargetRect);
      window.removeEventListener("scroll", updateTargetRect, true);
    };
  }, [isOpen, activeStep, updateTargetRect]);

  // Calculate Popover Position relative to target
  useEffect(() => {
    if (!isOpen || !activeStep) return;

    const popover = popoverRef.current;
    const pWidth = popover ? popover.offsetWidth : 360;
    const pHeight = popover ? popover.offsetHeight : 220;
    const margin = 16;
    const gap = 14;

    if (!targetRect) {
      // Center fallback if target not found
      setPopoverPos({
        top: Math.max(margin, (window.innerHeight - pHeight) / 2),
        left: Math.max(margin, (window.innerWidth - pWidth) / 2),
      });
      return;
    }

    let placement: TourPlacement = activeStep.preferredPlacement || "bottom";
    let top = 0;
    let left = 0;

    // Determine coordinate based on placement preference
    if (placement === "bottom") {
      top = targetRect.bottom + gap;
      left = targetRect.left + (targetRect.width - pWidth) / 2;
      // If overflows bottom, flip to top
      if (top + pHeight > window.innerHeight - margin) {
        top = targetRect.top - pHeight - gap;
      }
    } else if (placement === "top") {
      top = targetRect.top - pHeight - gap;
      left = targetRect.left + (targetRect.width - pWidth) / 2;
      // If overflows top, flip to bottom
      if (top < margin) {
        top = targetRect.bottom + gap;
      }
    } else if (placement === "right") {
      top = targetRect.top + (targetRect.height - pHeight) / 2;
      left = targetRect.right + gap;
      // If overflows right, flip to left or bottom
      if (left + pWidth > window.innerWidth - margin) {
        left = targetRect.left - pWidth - gap;
      }
    } else if (placement === "left") {
      top = targetRect.top + (targetRect.height - pHeight) / 2;
      left = targetRect.left - pWidth - gap;
      if (left < margin) {
        left = targetRect.right + gap;
      }
    }

    // Clamp coordinates strictly inside viewport
    top = Math.max(margin, Math.min(top, window.innerHeight - pHeight - margin));
    left = Math.max(margin, Math.min(left, window.innerWidth - pWidth - margin));

    setPopoverPos({ top, left });
  }, [isOpen, activeStep, targetRect]);

  // Smart Auto-Advancement Listener (listens to meaningful user interactions)
  useEffect(() => {
    if (!isOpen || !activeStep?.actionEvent) return;
    const eventName = activeStep.actionEvent;

    const handleAction = () => {
      // Advance to next step after action occurs
      setTimeout(onNext, 250);
    };

    window.addEventListener(eventName, handleAction);
    return () => {
      window.removeEventListener(eventName, handleAction);
    };
  }, [isOpen, activeStep, onNext]);

  // Keyboard navigation (ArrowRight -> Next, ArrowLeft -> Prev, Escape -> Skip)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onSkip();
      } else if (e.key === "ArrowRight") {
        onNext();
      } else if (e.key === "ArrowLeft" && stepIndex > 0) {
        onPrev();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, stepIndex, onNext, onPrev, onSkip]);

  if (!isOpen || !activeStep) return null;

  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === totalSteps - 1;
  const progressPercent = Math.round(((stepIndex + 1) / totalSteps) * 100);

  return (
    <div className="fixed inset-0 z-50 pointer-events-auto select-none overflow-hidden">
      {/* ── SVG Cutout Mask (Darks background, cuts out transparent target) ── */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none transition-all duration-300">
        <defs>
          <mask id="spotlight-mask">
            {/* White background: fully visible (opaque dark overlay) */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Black cutout: transparent window over target */}
            {targetRect && (
              <rect
                x={targetRect.left - 6}
                y={targetRect.top - 6}
                width={targetRect.width + 12}
                height={targetRect.height + 12}
                rx="12"
                fill="black"
              />
            )}
          </mask>
        </defs>

        {/* Semi-transparent dark overlay through mask */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(5, 10, 20, 0.78)"
          mask="url(#spotlight-mask)"
        />
      </svg>

      {/* Glowing Cyan Target Ring (Frames spotlighted element) */}
      {targetRect && (
        <div
          className="absolute pointer-events-none rounded-xl border-2 border-cyan-400 shadow-[0_0_24px_rgba(0,212,255,0.4)] transition-all duration-300"
          style={{
            top: `${targetRect.top - 6}px`,
            left: `${targetRect.left - 6}px`,
            width: `${targetRect.width + 12}px`,
            height: `${targetRect.height + 12}px`,
          }}
        >
          <span className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-cyan-400 animate-ping" />
        </div>
      )}

      {/* ── Clamped Tooltip Popover ─────────────────────────────────── */}
      <div
        ref={popoverRef}
        className="absolute z-55 w-[360px] max-w-[calc(100vw-32px)] rounded-2xl bg-[#0A0F1E] border border-[#1E2D4A] shadow-[0_0_40px_rgba(0,0,0,0.8)] backdrop-blur-xl flex flex-col transition-all duration-200"
        style={{
          top: `${popoverPos.top}px`,
          left: `${popoverPos.left}px`,
        }}
      >
        {/* Popover Header with Stepper & Skip */}
        <div className="p-4 pb-3 border-b border-[#1E2D4A]/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
              STEP {String(stepIndex + 1).padStart(2, "0")} / {String(totalSteps).padStart(2, "0")}
            </span>
            <span className="text-[10px] font-mono text-slate-500">BOB TOUR</span>
          </div>

          <button
            onClick={onSkip}
            className="text-slate-400 hover:text-slate-200 text-xs font-mono transition-colors p-1"
            title="Skip tour"
          >
            Skip
          </button>
        </div>

        {/* Step Content */}
        <div className="p-4 space-y-2.5">
          <h3 className="text-sm font-bold text-white font-mono tracking-wide">
            {activeStep.title}
          </h3>

          <p className="text-xs leading-relaxed text-slate-300">
            {activeStep.description}
          </p>

          {/* Interactive User Action Prompt */}
          {activeStep.instruction && (
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-[11px] font-mono text-cyan-300 flex items-center gap-2 shadow-inner">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shrink-0" />
              <span>{activeStep.instruction}</span>
            </div>
          )}
        </div>

        {/* Stepper Progress Bar */}
        <div className="w-full h-1 bg-[#162038] overflow-hidden">
          <div
            className="h-full bg-cyan-500 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Popover Navigation Controls */}
        <div className="p-3 bg-[#162038]/40 flex items-center justify-between">
          <div>
            {!isFirstStep && (
              <button
                onClick={onPrev}
                className="flex items-center gap-1 py-1.5 px-2.5 rounded-lg text-xs font-mono text-slate-400 hover:text-white hover:bg-[#1E2D4A] transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}
          </div>

          <button
            onClick={onNext}
            className="flex items-center gap-1.5 py-1.5 px-3.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs transition-colors shadow-md cursor-pointer"
          >
            <span>{isLastStep ? "Finish Tour" : "Next"}</span>
            {isLastStep ? <Check className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
