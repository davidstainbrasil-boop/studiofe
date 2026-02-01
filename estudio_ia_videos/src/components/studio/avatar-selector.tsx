'use client';

import { useState } from 'react';
import { useTimelineStore } from '@lib/stores/timeline-store';
import type { TimelineElement, TimelineElementType } from '@lib/types/timeline-types';

interface Avatar {
    id: string;
    name: string;
    provider: 'd-id' | 'heygen';
    thumbnail?: string;
    voiceId?: string;
}

const AVAILABLE_AVATARS: Avatar[] = [
    { id: 'anna', name: 'Anna', provider: 'd-id', voiceId: '21m00Tcm4TlvDq8ikWAM' },
    { id: 'josh', name: 'Josh', provider: 'd-id', voiceId: 'TxGEqnHWrfWFTfGW9XjX' },
    { id: 'rachel', name: 'Rachel', provider: 'heygen', voiceId: 'pNInz6obpgDQGcFmaJgB' },
    { id: 'marcus', name: 'Marcus', provider: 'heygen', voiceId: 'ErXwobaYiN019PkySvjV' },
];

export function AvatarSelector() {
    const { addElement, currentTime } = useTimelineStore();
    const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(null);
    const [script, setScript] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const handleAddToScene = async () => {
        if (!selectedAvatar || !script.trim()) {
            alert('Selecione um avatar e insira um texto');
            return;
        }

        setIsAdding(true);

        try {
            // Create avatar element
            const avatarElement: TimelineElement = {
                id: `avatar-${Date.now()}`,
                name: `${selectedAvatar.name} Avatar`,
                type: 'avatar' as TimelineElementType,
                layer: 0,
                layerId: 'video',
                start: currentTime,
                duration: 5000, // 5 seconds default
                source: `avatar://${selectedAvatar.id}`,
                data: {
                    avatarId: selectedAvatar.id,
                    provider: selectedAvatar.provider,
                    voiceId: selectedAvatar.voiceId,
                    script: script,
                    x: 50,
                    y: 50,
                    width: 400,
                    height: 600
                },
                properties: {
                    opacity: 1,
                    visible: true,
                    locked: false
                },
                keyframes: []
            };

            addElement(avatarElement);

            // Clear form
            setScript('');
            setSelectedAvatar(null);

            alert(`Avatar ${selectedAvatar.name} adicionado à cena!`);
        } catch (error) {
            console.error('Error adding avatar:', error);
            alert('Erro ao adicionar avatar à cena');
        } finally {
            setIsAdding(false);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-4">
            {/* Header */}
            <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    👤 Adicionar Avatar
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Selecione um avatar e insira o texto para narração
                </p>
            </div>

            {/* Avatar Selection */}
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Escolha o Avatar
                </label>
                <div className="grid grid-cols-2 gap-3">
                    {AVAILABLE_AVATARS.map((avatar) => (
                        <button
                            key={avatar.id}
                            onClick={() => setSelectedAvatar(avatar)}
                            className={`p-3 border-2 rounded-lg transition-all ${selectedAvatar?.id === avatar.id
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-300'
                                }`}
                        >
                            <div className="w-full h-24 bg-gray-200 dark:bg-gray-700 rounded mb-2 flex items-center justify-center">
                                <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {avatar.name}
                            </div>
                            <div className="text-xs text-gray-500 capitalize">
                                {avatar.provider}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Script Input */}
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Texto para Narração (TTS)
                </label>
                <textarea
                    value={script}
                    onChange={(e) => setScript(e.target.value)}
                    placeholder="Digite o texto que o avatar irá narrar..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                    maxLength={500}
                />
                <div className="text-xs text-gray-500 text-right mt-1">
                    {script.length}/500 caracteres
                </div>
            </div>

            {/* Preview */}
            {selectedAvatar && script && (
                <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                        Preview:
                    </div>
                    <div className="flex items-start space-x-2">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                            <span className="text-sm">👤</span>
                        </div>
                        <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {selectedAvatar.name}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                "{script.substring(0, 100)}{script.length > 100 ? '...' : ''}"
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Button */}
            <button
                onClick={handleAddToScene}
                disabled={!selectedAvatar || !script.trim() || isAdding}
                className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors"
            >
                {isAdding ? 'Adicionando...' : '✨ Adicionar à Cena'}
            </button>
        </div>
    );
}
