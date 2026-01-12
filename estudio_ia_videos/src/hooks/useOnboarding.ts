'use client';

import { useState, useEffect } from 'react';

type OnboardingState = {
  isActive: boolean;
  isComplete: boolean;
  step: number;
};

export function useOnboarding() {
  const [state, setState] = useState<OnboardingState>({
    isActive: false,
    isComplete: false,
    step: 0,
  });

  useEffect(() => {
    // Check local storage on mount
    const complete = localStorage.getItem('onboarding_complete');
    if (!complete) {
      setState({ isActive: true, isComplete: false, step: 1 });
    } else {
      setState({ isActive: false, isComplete: true, step: 0 });
    }
  }, []);

  const completeOnboarding = () => {
    localStorage.setItem('onboarding_complete', 'true');
    setState({ isActive: false, isComplete: true, step: 0 });
  };

  const skipOnboarding = () => {
    // Treat skip effectively as complete for now to avoid annoying the user
    completeOnboarding();
  };

  return {
    ...state,
    completeOnboarding,
    skipOnboarding,
  };
}
