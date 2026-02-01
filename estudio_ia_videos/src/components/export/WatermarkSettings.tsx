/**
 * 🎨 Watermark Settings Component
 * UI for configuring video watermarks
 */

'use client'

import React, { useState, useRef } from 'react'
import {
  WatermarkConfig,
  WatermarkPosition,
  WatermarkPositionValues,
  DEFAULT_WATERMARK_PRESETS,
  DEFAULT_TEXT_STYLE,
  ImageWatermarkConfig,
  TextWatermarkConfig,
} from '@/types/watermark.types'

interface WatermarkSettingsProps {
  /** Current watermark configuration */
  config: WatermarkConfig | null
  
  /** Callback when config changes */
  onChange: (config: WatermarkConfig | null) => void
  
  /** Show in compact mode */
  compact?: boolean
}

export function WatermarkSettings({ config, onChange, compact = false }: WatermarkSettingsProps) {
  const [showPresets, setShowPresets] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Handle preset selection
  const handlePresetSelect = (preset: WatermarkConfig) => {
    onChange(preset)
    setShowPresets(false)
  }

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const imageUrl = event.target?.result as string
      
      const newConfig: ImageWatermarkConfig = {
        type: 'image',
        url: imageUrl,
        position: 'bottom-right',
        scale: 0.2,
        opacity: 0.8,
        margin: 20,
      }
      
      onChange(newConfig)
    }
    reader.readAsDataURL(file)
  }

  // Handle text watermark creation
  const handleCreateTextWatermark = () => {
    const newConfig: TextWatermarkConfig = {
      type: 'text',
      text: 'Sua Marca Aqui',
      style: { ...DEFAULT_TEXT_STYLE },
      position: 'bottom-right',
      opacity: 0.8,
      margin: 20,
    }
    
    onChange(newConfig)
  }

  // Handle opacity change
  const handleOpacityChange = (value: number) => {
    if (!config) return
    onChange({ ...config, opacity: value / 100 })
  }

  // Handle position change
  const handlePositionChange = (position: WatermarkPosition) => {
    if (!config) return
    onChange({ ...config, position })
  }

  // Remove watermark
  const handleRemoveWatermark = () => {
    onChange(null)
  }

  // Type guard for text watermark
  const isTextWatermark = (c: WatermarkConfig): c is TextWatermarkConfig => c.type === 'text'

  if (!config) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Marca D&apos;água</h3>
          <span className="text-xs text-gray-500">Desabilitado</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition text-sm"
          >
            📷 Adicionar Logo
          </button>
          
          <button
            onClick={handleCreateTextWatermark}
            className="px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition text-sm"
          >
            📝 Adicionar Texto
          </button>
        </div>

        <button
          onClick={() => setShowPresets(!showPresets)}
          className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition text-sm"
        >
          ⭐ Escolher Preset
        </button>

        {showPresets && (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {DEFAULT_WATERMARK_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handlePresetSelect(preset)}
                className="w-full text-left px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 transition"
              >
                <div className="font-semibold text-sm">{preset.name}</div>
                <div className="text-xs text-gray-500 mt-1">{preset.description}</div>
              </button>
            ))}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml"
          onChange={handleImageUpload}
          className="hidden"
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Marca D&apos;água</h3>
        <button
          onClick={handleRemoveWatermark}
          className="text-xs text-red-600 hover:text-red-700 dark:text-red-400"
        >
          🗑️ Remover
        </button>
      </div>

      {/* Type indicator */}
      <div className="flex items-center gap-2 text-xs">
        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
          {config.type === 'text' ? '📝 Texto' : '📷 Imagem'}
        </span>
      </div>

      {/* Text Content (if text watermark) */}
      {isTextWatermark(config) && (
        <div>
          <label className="block text-xs font-medium mb-1">Texto</label>
          <input
            type="text"
            value={config.text}
            onChange={(e) => {
              const newConfig: TextWatermarkConfig = { ...config, text: e.target.value }
              onChange(newConfig)
            }}
            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
            placeholder="Digite o texto..."
          />
        </div>
      )}

      {/* Font Size (if text watermark) */}
      {isTextWatermark(config) && (
        <div>
          <label className="block text-xs font-medium mb-1">
            Tamanho da Fonte: {config.style.fontSize}px
          </label>
          <input
            type="range"
            min="12"
            max="72"
            value={config.style.fontSize}
            onChange={(e) => {
              const newStyle = { ...config.style, fontSize: parseInt(e.target.value) }
              const newConfig: TextWatermarkConfig = { ...config, style: newStyle }
              onChange(newConfig)
            }}
            className="w-full"
          />
        </div>
      )}

      {/* Position */}
      <div>
        <label className="block text-xs font-medium mb-2">Posição</label>
        <div className="grid grid-cols-3 gap-1">
          {WatermarkPositionValues.map((position) => (
            <button
              key={position}
              onClick={() => handlePositionChange(position)}
              className={`
                p-2 text-xs rounded transition
                ${
                  config.position === position
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }
              `}
            >
              {position.split('-').map((w: string) => w[0].toUpperCase() + w.slice(1)).join(' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Opacity */}
      <div>
        <label className="block text-xs font-medium mb-1">
          Opacidade: {Math.round(config.opacity * 100)}%
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={Math.round(config.opacity * 100)}
          onChange={(e) => handleOpacityChange(parseInt(e.target.value))}
          className="w-full"
        />
      </div>

      {/* Scale (if image watermark) */}
      {config.type === 'image' && (
        <div>
          <label className="block text-xs font-medium mb-1">
            Escala: {Math.round(config.scale * 100)}%
          </label>
          <input
            type="range"
            min="10"
            max="100"
            value={Math.round(config.scale * 100)}
            onChange={(e) => {
              const newConfig: ImageWatermarkConfig = { ...config, scale: parseInt(e.target.value) / 100 }
              onChange(newConfig)
            }}
            className="w-full"
          />
        </div>
      )}

      {/* Preview */}
      <div className="bg-gray-900 rounded-lg p-4 aspect-video relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center text-gray-600">
          <div className="text-center">
            <div className="text-4xl mb-2">🎬</div>
            <div className="text-xs">Preview do Vídeo</div>
          </div>
        </div>
        
        {/* Watermark preview */}
        <div
          className="absolute text-white text-sm"
          style={{
            opacity: config.opacity,
            ...getPreviewPosition(config.position, config.margin),
          }}
        >
          {isTextWatermark(config) ? (
            <span style={{ fontSize: `${config.style.fontSize / 4}px` }}>
              {config.text}
            </span>
          ) : (
            <div className="bg-white/50 px-2 py-1 rounded text-xs">Logo</div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Get preview position styles
 */
function getPreviewPosition(
  position: WatermarkPosition,
  margin: number
): React.CSSProperties {
  const m = margin / 4
  
  const positionMap: Record<WatermarkPosition, React.CSSProperties> = {
    'top-left': { top: m, left: m },
    'top-center': { top: m, left: '50%', transform: 'translateX(-50%)' },
    'top-right': { top: m, right: m },
    'center-left': { top: '50%', left: m, transform: 'translateY(-50%)' },
    'center': { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
    'center-right': { top: '50%', right: m, transform: 'translateY(-50%)' },
    'bottom-left': { bottom: m, left: m },
    'bottom-center': { bottom: m, left: '50%', transform: 'translateX(-50%)' },
    'bottom-right': { bottom: m, right: m },
  }

  return positionMap[position] || {}
}
