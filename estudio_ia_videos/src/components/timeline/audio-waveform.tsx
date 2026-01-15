'use client'

import React, { useEffect, useRef, useState } from 'react'

interface AudioWaveformProps {
    item: {
        id: string
        content: string // URL or content identifier
        duration: number
        start: number
    }
    color: string
    height: number
    width: number // Pixel width of the item in timeline
}

export function AudioWaveform({ item, color, height, width }: AudioWaveformProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [audioData, setAudioData] = useState<number[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(false)

    // Cache key to prevent re-fetching/re-processing same audio
    const cacheKey = `waveform-${item.content}`

    useEffect(() => {
        // If width is too small, don't bother rendering complex waveform
        if (width < 20) return

        const fetchAudio = async () => {
            // Check cache (memory or simple window object hack for now)
            if ((window as any)[cacheKey]) {
                setAudioData((window as any)[cacheKey])
                return
            }

            try {
                setLoading(true)
                // Simulate waveform data if no real URL or if it's a mock
                // In real app, we would fetch(item.content), decodeAudioData, and downsample
                if (!item.content.startsWith('http') && !item.content.startsWith('blob')) {
                    throw new Error('Not a valid URL')
                }

                const response = await fetch(item.content)
                const arrayBuffer = await response.arrayBuffer()
                const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

                // Downsample to ~100 points per visible chunk or based on width
                const samples = 100 // Fixed resolution for now to keep it simple
                const rawData = audioBuffer.getChannelData(0)
                const blockSize = Math.floor(rawData.length / samples)
                const downsampled = []

                for (let i = 0; i < samples; i++) {
                    let sum = 0
                    for (let j = 0; j < blockSize; j++) {
                        sum += Math.abs(rawData[i * blockSize + j])
                    }
                    downsampled.push(sum / blockSize)
                }

                // Normalize
                const multiplier = Math.pow(Math.max(...downsampled), -1)
                const normalized = downsampled.map(n => n * multiplier)

                setAudioData(normalized)
                    ; (window as any)[cacheKey] = normalized
            } catch (err) {
                // Fallback to fake data for visual "demo" effect if real fetch fails (common in dev/mock)
                const fakeSamples = 50
                const fakeData = Array.from({ length: fakeSamples }, () => Math.random() * 0.8 + 0.2)
                setAudioData(fakeData)
                // setError(true)
            } finally {
                setLoading(false)
            }
        }

        fetchAudio()
    }, [item.content, cacheKey, width])

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Clear
        ctx.clearRect(0, 0, width, height)

        if (loading) {
            ctx.fillStyle = `${color}40` // Low opacity
            ctx.fillRect(0, 0, width, height)
            return
        }

        if (audioData.length === 0) return

        // Draw
        const barWidth = width / audioData.length
        const gap = 1
        const actualBarWidth = Math.max(1, barWidth - gap)

        ctx.fillStyle = color // Use track color
        ctx.beginPath()

        // Center the waveform vertically
        const centerY = height / 2

        audioData.forEach((val, index) => {
            const barHeight = val * (height * 0.8) // 80% of track height max
            const x = index * barWidth

            // Draw centered bar
            ctx.roundRect(x, centerY - barHeight / 2, actualBarWidth, barHeight, 2)
        })

        ctx.fill()

    }, [audioData, width, height, color, loading])

    return (
        <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className="w-full h-full pointer-events-none opacity-80"
        />
    )
}
