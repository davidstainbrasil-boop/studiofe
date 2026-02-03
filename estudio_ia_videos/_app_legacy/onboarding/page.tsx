'use client'

import { useState } from 'react'
import { OnboardingWizard, type OnboardingData } from '@/components/onboarding'
import { useRouter } from 'next/navigation'

export default function OnboardingPage() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(true)

  const handleComplete = (data: OnboardingData) => {
    // Redirect to editor or dashboard after completion
    console.log('Onboarding completed:', data)
    router.push('/dashboard')
  }

  const handleClose = () => {
    setIsOpen(false)
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
      <OnboardingWizard
        isOpen={isOpen}
        onComplete={handleComplete}
        onClose={handleClose}
        userId="onboarding-user"
      />
    </div>
  )
}
