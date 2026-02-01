'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useTour, EDITOR_TOUR_STEPS, type TourStep } from '@/hooks/use-tour'

// =============================================================================
// Types
// =============================================================================

interface TourOverlayProps {
  steps?: TourStep[]
  onComplete?: () => void
  onSkip?: () => void
  autoStart?: boolean
  showTrigger?: boolean
  triggerPosition?: 'top-right' | 'bottom-right' | 'bottom-left' | 'top-left'
}

interface SpotlightPosition {
  top: number
  left: number
  width: number
  height: number
}

interface TooltipPosition {
  top: number
  left: number
  placement: 'top' | 'bottom' | 'left' | 'right'
}

// =============================================================================
// Utils
// =============================================================================

function getElementPosition(selector: string): SpotlightPosition | null {
  const element = document.querySelector(selector)
  if (!element) return null
  
  const rect = element.getBoundingClientRect()
  return {
    top: rect.top + window.scrollY,
    left: rect.left + window.scrollX,
    width: rect.width,
    height: rect.height,
  }
}

function calculateTooltipPosition(
  spotlight: SpotlightPosition | null,
  position: TourStep['position'],
  tooltipWidth: number = 320,
  tooltipHeight: number = 200,
  padding: number = 16
): TooltipPosition {
  if (!spotlight || position === 'center') {
    // Center of screen
    return {
      top: window.innerHeight / 2 - tooltipHeight / 2,
      left: window.innerWidth / 2 - tooltipWidth / 2,
      placement: 'bottom',
    }
  }

  const { top, left, width, height } = spotlight
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  let tooltipTop: number
  let tooltipLeft: number
  let placement: 'top' | 'bottom' | 'left' | 'right' = position || 'bottom'

  switch (position) {
    case 'top':
      tooltipTop = top - tooltipHeight - padding
      tooltipLeft = left + width / 2 - tooltipWidth / 2
      placement = 'top'
      break
    case 'bottom':
      tooltipTop = top + height + padding
      tooltipLeft = left + width / 2 - tooltipWidth / 2
      placement = 'bottom'
      break
    case 'left':
      tooltipTop = top + height / 2 - tooltipHeight / 2
      tooltipLeft = left - tooltipWidth - padding
      placement = 'left'
      break
    case 'right':
      tooltipTop = top + height / 2 - tooltipHeight / 2
      tooltipLeft = left + width + padding
      placement = 'right'
      break
    default:
      tooltipTop = top + height + padding
      tooltipLeft = left + width / 2 - tooltipWidth / 2
      placement = 'bottom'
  }

  // Clamp to viewport
  tooltipTop = Math.max(padding, Math.min(tooltipTop, viewportHeight - tooltipHeight - padding))
  tooltipLeft = Math.max(padding, Math.min(tooltipLeft, viewportWidth - tooltipWidth - padding))

  return { top: tooltipTop, left: tooltipLeft, placement }
}

// =============================================================================
// Spotlight Component
// =============================================================================

function Spotlight({
  position,
  padding = 8,
}: {
  position: SpotlightPosition | null
  padding?: number
}) {
  if (!position) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]" />
    )
  }

  const { top, left, width, height } = position
  const spotlightTop = top - padding
  const spotlightLeft = left - padding
  const spotlightWidth = width + padding * 2
  const spotlightHeight = height + padding * 2

  return (
    <div className="fixed inset-0 z-[9998] pointer-events-none">
      {/* Overlay with spotlight cutout using CSS mask */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        style={{
          maskImage: `radial-gradient(circle at center, transparent 0%, black 0%),
                      linear-gradient(black, black)`,
          WebkitMaskImage: `radial-gradient(circle at center, transparent 0%, black 0%),
                           linear-gradient(black, black)`,
          maskComposite: 'exclude',
          WebkitMaskComposite: 'xor',
          clipPath: `polygon(
            0% 0%,
            0% 100%,
            ${spotlightLeft}px 100%,
            ${spotlightLeft}px ${spotlightTop}px,
            ${spotlightLeft + spotlightWidth}px ${spotlightTop}px,
            ${spotlightLeft + spotlightWidth}px ${spotlightTop + spotlightHeight}px,
            ${spotlightLeft}px ${spotlightTop + spotlightHeight}px,
            ${spotlightLeft}px 100%,
            100% 100%,
            100% 0%
          )`,
        }}
      />
      {/* Spotlight border */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="absolute rounded-lg ring-4 ring-violet-500/50 ring-offset-2 ring-offset-black/20"
        style={{
          top: spotlightTop,
          left: spotlightLeft,
          width: spotlightWidth,
          height: spotlightHeight,
        }}
      />
    </div>
  )
}

// =============================================================================
// Tooltip Component
// =============================================================================

function TourTooltip({
  step,
  currentStep,
  totalSteps,
  position,
  onNext,
  onPrev,
  onSkip,
}: {
  step: TourStep
  currentStep: number
  totalSteps: number
  position: TooltipPosition
  onNext: () => void
  onPrev: () => void
  onSkip: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="fixed z-[9999] w-80"
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      <Card className="shadow-2xl border-violet-500/20 bg-white">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{step.title}</CardTitle>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onSkip}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          <p className="text-sm text-muted-foreground">{step.description}</p>
        </CardContent>
        <CardFooter className="flex items-center justify-between pt-0">
          <div className="text-xs text-muted-foreground">
            {currentStep + 1} de {totalSteps}
          </div>
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button variant="outline" size="sm" onClick={onPrev}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                {step.backLabel || 'Voltar'}
              </Button>
            )}
            <Button
              size="sm"
              onClick={onNext}
              className="bg-violet-600 hover:bg-violet-700"
            >
              {step.nextLabel || (currentStep === totalSteps - 1 ? 'Concluir' : 'Próximo')}
              {currentStep < totalSteps - 1 && <ChevronRight className="h-4 w-4 ml-1" />}
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* Arrow indicator */}
      <div
        className={cn(
          'absolute w-4 h-4 bg-white border-violet-500/20 rotate-45',
          position.placement === 'top' && 'bottom-[-8px] left-1/2 -translate-x-1/2 border-b border-r',
          position.placement === 'bottom' && 'top-[-8px] left-1/2 -translate-x-1/2 border-t border-l',
          position.placement === 'left' && 'right-[-8px] top-1/2 -translate-y-1/2 border-t border-r',
          position.placement === 'right' && 'left-[-8px] top-1/2 -translate-y-1/2 border-b border-l'
        )}
      />
    </motion.div>
  )
}

// =============================================================================
// Main Tour Overlay Component
// =============================================================================

export function TourOverlay({
  steps = EDITOR_TOUR_STEPS,
  onComplete,
  onSkip,
  autoStart = false,
  showTrigger = true,
  triggerPosition = 'bottom-right',
}: TourOverlayProps) {
  const tour = useTour(steps.length)
  const [spotlight, setSpotlight] = useState<SpotlightPosition | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition>({
    top: 0,
    left: 0,
    placement: 'bottom',
  })

  const currentStep = steps[tour.state.currentStep]

  // Auto-start tour on first visit
  useEffect(() => {
    if (autoStart && !tour.state.hasCompletedTour && !tour.state.isActive) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => tour.startTour(), 500)
      return () => clearTimeout(timer)
    }
  }, [autoStart, tour])

  // Update spotlight position when step changes
  useEffect(() => {
    if (!tour.state.isActive || !currentStep) return

    const updatePosition = () => {
      if (currentStep.targetSelector) {
        const elementPos = getElementPosition(currentStep.targetSelector)
        setSpotlight(elementPos)
        setTooltipPosition(
          calculateTooltipPosition(
            elementPos,
            currentStep.position,
            320,
            200,
            currentStep.spotlightPadding || 8
          )
        )
      } else {
        setSpotlight(null)
        setTooltipPosition(
          calculateTooltipPosition(null, currentStep.position)
        )
      }
    }

    updatePosition()

    // Update on window resize
    window.addEventListener('resize', updatePosition)
    return () => window.removeEventListener('resize', updatePosition)
  }, [tour.state.isActive, tour.state.currentStep, currentStep])

  const handleNext = useCallback(() => {
    if (tour.state.currentStep === steps.length - 1) {
      tour.endTour()
      onComplete?.()
    } else {
      tour.nextStep()
    }
  }, [tour, steps.length, onComplete])

  const handlePrev = useCallback(() => {
    tour.prevStep()
  }, [tour])

  const handleSkip = useCallback(() => {
    tour.skipTour()
    onSkip?.()
  }, [tour, onSkip])

  const triggerPositionClasses = {
    'top-right': 'top-4 right-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-left': 'top-4 left-4',
  }

  return (
    <>
      {/* Tour Trigger Button */}
      {showTrigger && !tour.state.isActive && (
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'fixed z-50 gap-2 bg-white shadow-lg',
            triggerPositionClasses[triggerPosition]
          )}
          onClick={() => tour.startTour()}
        >
          <HelpCircle className="h-4 w-4" />
          Tour guiado
        </Button>
      )}

      {/* Tour Overlay */}
      <AnimatePresence>
        {tour.state.isActive && currentStep && (
          <>
            <Spotlight
              position={spotlight}
              padding={currentStep.spotlightPadding}
            />
            <TourTooltip
              step={currentStep}
              currentStep={tour.state.currentStep}
              totalSteps={steps.length}
              position={tooltipPosition}
              onNext={handleNext}
              onPrev={handlePrev}
              onSkip={handleSkip}
            />
          </>
        )}
      </AnimatePresence>
    </>
  )
}

// =============================================================================
// Exports
// =============================================================================

export default TourOverlay
