import { useCurrentFrame, useVideoConfig, Img } from 'remotion'
import { useMemo } from 'react'
import { BlendShapeController } from '@/lib/avatar/blend-shape-controller'
import { Phoneme } from '@/lib/sync/types/phoneme.types'
import React from 'react'

export interface LipSyncAvatarProps {
    phonemes: Phoneme[]
    avatarImageUrl: string
    position?: { x: number; y: number }
    scale?: number
    enableBreathing?: boolean
    enableBlinking?: boolean
}

export const LipSyncAvatar: React.FC<LipSyncAvatarProps> = ({
    phonemes,
    avatarImageUrl,
    position = { x: 0, y: 0 },
    scale = 1,
    enableBreathing = true,
    enableBlinking = true
}) => {
    const frame = useCurrentFrame()
    const { fps } = useVideoConfig()
    const time = frame / fps

    const blendShapeController = useMemo(() => new BlendShapeController(), [])

    // Encontrar phonema ativo no tempo atual
    const currentPhoneme = useMemo(() => {
        return phonemes.find(p =>
            time >= p.time && time < p.time + p.duration
        )
    }, [phonemes, time])

    // Próximo phonema para interpolação suave
    const nextPhoneme = useMemo(() => {
        if (!currentPhoneme) return null

        const currentIndex = phonemes.indexOf(currentPhoneme)
        return phonemes[currentIndex + 1] || null
    }, [phonemes, currentPhoneme])

    // Calcular blend shapes para o frame atual
    const blendShapes = useMemo(() => {
        if (!currentPhoneme) {
            blendShapeController.reset()
            return blendShapeController.getWeights()
        }

        // Aplicar viseme atual
        blendShapeController.applyViseme(
            currentPhoneme.viseme,
            currentPhoneme.intensity
        )

        // Interpolar com próximo viseme se estiver próximo da transição
        if (nextPhoneme) {
            const transitionStart = currentPhoneme.time + currentPhoneme.duration - 0.05

            if (time >= transitionStart) {
                const transitionProgress = (time - transitionStart) / 0.05
                const nextController = new BlendShapeController()
                nextController.applyViseme(nextPhoneme.viseme, nextPhoneme.intensity)

                return blendShapeController.interpolate(
                    nextController.getWeights(),
                    transitionProgress
                )
            }
        }

        // Adicionar respiração
        if (enableBreathing) {
            blendShapeController.applyBreathing(time)
        }

        // Adicionar piscadas
        if (enableBlinking) {
            blendShapeController.applyBlink(time)
        }

        return blendShapeController.getWeights()
    }, [currentPhoneme, nextPhoneme, time, enableBreathing, enableBlinking])

    // Calcular transformações CSS baseadas em blend shapes
    const mouthTransform = useMemo(() => {
        const jawOpen = blendShapes.jawOpen * 20 // pixels
        const mouthWidth = 100 + (blendShapes.mouthStretchLeft + blendShapes.mouthStretchRight) * 50

        return {
            translateY: jawOpen,
            scaleX: mouthWidth / 100,
            scaleY: 1 + blendShapes.mouthFunnel * 0.3
        }
    }, [blendShapes])

    const eyeOpacity = useMemo(() => {
        return 1 - (blendShapes.eyeBlinkLeft || 0)
    }, [blendShapes])

    return (
        <div
            style={{
                position: 'absolute',
                left: position.x,
                top: position.y,
                transform: `scale(${scale})`,
                transformOrigin: 'center center'
            }}
        >
            {/* Avatar base */}
            <Img
                src={avatarImageUrl}
                style={{
                    width: 400,
                    height: 600,
                    objectFit: 'contain'
                }}
            />

            {/* Overlay de boca (simulação simplificada) */}
            <div
                style={{
                    position: 'absolute',
                    bottom: '35%',
                    left: '50%',
                    width: 80,
                    height: 40,
                    backgroundColor: '#2a1a1a',
                    borderRadius: '50%',
                    transform: `
            translateX(-50%)
            translateY(${mouthTransform.translateY}px)
            scaleX(${mouthTransform.scaleX})
            scaleY(${mouthTransform.scaleY})
          `,
                    mixBlendMode: 'multiply',
                    opacity: 0.6
                }}
            />

            {/* Debug: Mostrar viseme atual */}
            {currentPhoneme && (
                <div
                    style={{
                        position: 'absolute',
                        top: -30,
                        left: 0,
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        color: 'white',
                        padding: '5px 10px',
                        borderRadius: 5,
                        fontSize: 12,
                        fontFamily: 'monospace'
                    }}
                >
                    {currentPhoneme.viseme} ({(currentPhoneme.intensity * 100).toFixed(0)}%)
                </div>
            )}
        </div>
    )
}
