"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import type { TourContextType, TourStep, DemoMode } from "./types";
import { TOUR_STEPS } from "./tour-steps";
import { GuidedDemoWelcome } from "./guided-demo-welcome";
import { GuidedDemoOverlay } from "./guided-demo-overlay";
import { GuidedDemoComplete } from "./guided-demo-complete";

const TourContext = createContext<TourContextType | null>(null);

export function useGuidedDemo() {
  const ctx = useContext(TourContext);
  if (!ctx) {
    throw new Error("useGuidedDemo must be used within a GuidedDemoProvider");
  }
  return ctx;
}

interface GuidedDemoProviderProps {
  children: React.ReactNode;
  stats?: {
    total: number;
    inTransit: number;
    delayed: number;
    delivered: number;
    disruptions: number;
  };
}

export function GuidedDemoProvider({ children, stats }: GuidedDemoProviderProps) {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);
  const [isCompleteOpen, setIsCompleteOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [demoMode, setDemoMode] = useState<DemoMode>("full");

  // Filter steps according to mode
  const activeSteps: TourStep[] = useMemo(() => {
    if (demoMode === "quick") {
      return TOUR_STEPS.filter((s) => s.quickMode);
    }
    return TOUR_STEPS;
  }, [demoMode]);

  const activeStep = activeSteps[currentStepIndex] || null;

  // Check first-time user status on mount
  useEffect(() => {
    setMounted(true);
    try {
      const dontShow = localStorage.getItem("bob-tour-dont-show");
      const completed = localStorage.getItem("bob-tour-completed");
      const skipped = localStorage.getItem("bob-tour-skipped");

      // If user has not completed, skipped, or disabled it, show welcome modal
      if (!dontShow && !completed && !skipped) {
        setIsWelcomeOpen(true);
      }
    } catch {}
  }, []);

  // Tour Control Actions
  const startTour = useCallback((mode: DemoMode = "full") => {
    setDemoMode(mode);
    setCurrentStepIndex(0);
    setIsWelcomeOpen(false);
    setIsCompleteOpen(false);
    setIsOpen(true);
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStepIndex((prev) => {
      const nextIdx = prev + 1;
      if (nextIdx >= activeSteps.length) {
        // Completed all steps!
        setIsOpen(false);
        setIsCompleteOpen(true);
        try {
          localStorage.setItem("bob-tour-completed", "true");
        } catch {}
        return prev;
      }
      return nextIdx;
    });
  }, [activeSteps.length]);

  const prevStep = useCallback(() => {
    setCurrentStepIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const skipTour = useCallback(() => {
    setIsOpen(false);
    setIsWelcomeOpen(false);
    try {
      localStorage.setItem("bob-tour-skipped", "true");
    } catch {}
  }, []);

  const finishTour = useCallback(() => {
    setIsOpen(false);
    setIsCompleteOpen(true);
    try {
      localStorage.setItem("bob-tour-completed", "true");
    } catch {}
  }, []);

  const handleWelcomeSkip = useCallback((dontShowAgain: boolean) => {
    setIsWelcomeOpen(false);
    try {
      localStorage.setItem("bob-tour-skipped", "true");
      if (dontShowAgain) {
        localStorage.setItem("bob-tour-dont-show", "true");
      }
    } catch {}
  }, []);

  const handleRestart = useCallback(() => {
    setIsCompleteOpen(false);
    startTour(demoMode);
  }, [demoMode, startTour]);

  // Context value
  const contextValue: TourContextType = {
    isOpen,
    isWelcomeOpen,
    isCompleteOpen,
    currentStepIndex,
    activeStep,
    totalSteps: activeSteps.length,
    demoMode,
    startTour,
    nextStep,
    prevStep,
    skipTour,
    finishTour,
    openWelcome: () => setIsWelcomeOpen(true),
    closeWelcome: () => setIsWelcomeOpen(false),
    closeComplete: () => setIsCompleteOpen(false),
    setDemoMode,
  };

  return (
    <TourContext.Provider value={contextValue}>
      {children}

      {/* Welcome Modal on First Visit */}
      {mounted && (
        <>
          <GuidedDemoWelcome
            isOpen={isWelcomeOpen}
            onStart={(mode) => startTour(mode)}
            onSkip={handleWelcomeSkip}
          />

          {/* Active Spotlight & Popover Overlay */}
          <GuidedDemoOverlay
            isOpen={isOpen}
            activeStep={activeStep}
            stepIndex={currentStepIndex}
            totalSteps={activeSteps.length}
            onNext={nextStep}
            onPrev={prevStep}
            onSkip={skipTour}
          />

          {/* Celebration Completion Modal */}
          <GuidedDemoComplete
            isOpen={isCompleteOpen}
            onRestart={handleRestart}
            onClose={() => setIsCompleteOpen(false)}
            stats={stats}
          />
        </>
      )}
    </TourContext.Provider>
  );
}
