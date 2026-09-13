export type TourPlacement = 'top' | 'bottom' | 'left' | 'right' | 'center';

export type DemoMode = 'full' | 'quick';

export interface TourStep {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  targetSelector: string;
  instruction?: string;
  preferredPlacement?: TourPlacement;
  waitForAction?: boolean;
  actionEvent?: string; // e.g. 'bob:disruption-selected', 'bob:shipment-selected', 'bob:ship-dragged'
  quickMode?: boolean; // included in 30-sec quick demo
}

export interface TourContextType {
  isOpen: boolean;
  isWelcomeOpen: boolean;
  isCompleteOpen: boolean;
  currentStepIndex: number;
  activeStep: TourStep | null;
  totalSteps: number;
  demoMode: DemoMode;
  startTour: (mode?: DemoMode) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  finishTour: () => void;
  openWelcome: () => void;
  closeWelcome: () => void;
  closeComplete: () => void;
  setDemoMode: (mode: DemoMode) => void;
}
