'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { OnboardingWalkthrough } from '@/components/onboarding/walkthrough'

export default function TourPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnTo = searchParams.get('returnTo') || '/dashboard'
  
  const [isFirstVisit, setIsFirstVisit] = useState(true)

  useEffect(() => {
    // Check if user has completed the tour before
    const tourCompleted = localStorage.getItem('tour-completed')
    if (tourCompleted) {
      setIsFirstVisit(false)
    }
  }, [])

  const handleComplete = () => {
    localStorage.setItem('tour-completed', 'true')
    localStorage.setItem('tour-completed-at', new Date().toISOString())
    router.push(returnTo)
  }

  const handleSkip = () => {
    router.push(returnTo)
  }

  const handleStepChange = (stepIndex: number) => {
    console.log('Tour step:', stepIndex)
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <OnboardingWalkthrough
        userName="Usuário"
        isFirstVisit={isFirstVisit}
        onComplete={handleComplete}
        onSkip={handleSkip}
        onStepChange={handleStepChange}
      />
    </div>
  )
}
