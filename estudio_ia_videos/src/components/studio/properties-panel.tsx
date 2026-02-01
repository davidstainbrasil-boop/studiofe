'use client';

import { useState, useEffect } from 'react';
import { useTimelineStore } from '@lib/stores/timeline-store';

interface PropertyValue {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    opacity?: number;
    color?: string;
    animation?: string;
    duration?: number;
}

export function PropertiesPanel() {
    const { selection, project, updateElement } = useTimelineStore();
    const [properties, setProperties] = useState<PropertyValue>({});

    const selectedElement = selection.elementIds[0];
    const element = project?.layers
        .flatMap((l) => l.elements)
        .find((e) => e.id === selectedElement);

    useEffect(() => {
        if (element) {
            setProperties({
                x: element.data?.x as number || 0,
                y: element.data?.y as number || 0,
                width: element.data?.width as number || 100,
                height: element.data?.height as number || 100,
                opacity: element.properties?.opacity as number || 1,
                color: element.properties?.color as string || '#000000',
                animation: element.properties?.animation as string || 'none',
                duration: element.duration || 5000
            });
        }
    }, [element]);

    if (!element) {
        return (
            <div className="w-80 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 p-4">
                <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
                    <svg className="mx-auto h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                    </svg>
                    <p className="text-sm">Nenhum elemento selecionado</p>
                    <p className="text-xs mt-1">
                        Clique em um elemento no canvas ou timeline para editar
                    </p>
                </div>
            </div>
        );
    }

    const handleChange = (key: keyof PropertyValue, value: any) => {
        setProperties((prev) => ({ ...prev, [key]: value }));
    };

    const handleSave = () => {
        if (!element) return;

        updateElement(element.id, {
            data: {
                ...element.data,
                x: properties.x,
                y: properties.y,
                width: properties.width,
                height: properties.height
            },
            properties: {
                ...element.properties,
                opacity: properties.opacity,
                color: properties.color,
                animation: properties.animation
            },
            duration: properties.duration
        });
    };

    return (
        <div className="w-80 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 overflow-y-auto">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    ⚙️ Propriedades
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {element.name || element.id}
                </p>
            </div>

            {/* Properties Form */}
            <div className="p-4 space-y-4">
                {/* Position & Size */}
                <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                        Posição e Tamanho
                    </h4>

                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">X</label>
                            <input
                                type="number"
                                value={properties.x}
                                onChange={(e) => handleChange('x', parseInt(e.target.value))}
                                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-800"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Y</label>
                            <input
                                type="number"
                                value={properties.y}
                                onChange={(e) => handleChange('y', parseInt(e.target.value))}
                                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-800"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Largura</label>
                            <input
                                type="number"
                                value={properties.width}
                                onChange={(e) => handleChange('width', parseInt(e.target.value))}
                                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-800"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Altura</label>
                            <input
                                type="number"
                                value={properties.height}
                                onChange={(e) => handleChange('height', parseInt(e.target.value))}
                                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-800"
                            />
                        </div>
                    </div>
                </div>

                {/* Appearance */}
                <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                        Aparência
                    </h4>

                    <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Opacidade</label>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={properties.opacity}
                            onChange={(e) => handleChange('opacity', parseFloat(e.target.value))}
                            className="w-full"
                        />
                        <div className="text-xs text-gray-500 text-right">{(properties.opacity! * 100).toFixed(0)}%</div>
                    </div>

                    <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Cor</label>
                        <input
                            type="color"
                            value={properties.color}
                            onChange={(e) => handleChange('color', e.target.value)}
                            className="w-full h-10 border border-gray-300 dark:border-gray-600 rounded"
                        />
                    </div>
                </div>

                {/* Animation */}
                <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                        Animação
                    </h4>

                    <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Tipo</label>
                        <select
                            value={properties.animation}
                            onChange={(e) => handleChange('animation', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-800"
                        >
                            <option value="none">Nenhuma</option>
                            <option value="fadeIn">Fade In</option>
                            <option value="fadeOut">Fade Out</option>
                            <option value="slideLeft">Slide da Esquerda</option>
                            <option value="slideRight">Slide da Direita</option>
                            <option value="zoomIn">Zoom In</option>
                            <option value="zoomOut">Zoom Out</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Duração (ms)</label>
                        <input
                            type="number"
                            value={properties.duration}
                            onChange={(e) => handleChange('duration', parseInt(e.target.value))}
                            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-800"
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                        onClick={handleSave}
                        className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm font-medium"
                    >
                        Aplicar Mudanças
                    </button>
                </div>
            </div>
        </div>
    );
}
