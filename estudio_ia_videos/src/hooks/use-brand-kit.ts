'use client';

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

export interface BrandColors {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
}

export interface BrandFonts {
    heading: string;
    body: string;
}

export interface BrandLogo {
    url: string;
    width: number;
    height: number;
}

export interface BrandWatermark {
    enabled: boolean;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    opacity: number;
    size: number;
}

export interface BrandKit {
    id: string | null;
    name: string;
    logo: BrandLogo | null;
    colors: BrandColors;
    fonts: BrandFonts;
    watermark: BrandWatermark;
    updated_at?: string;
}

interface UseBrandKitReturn {
    brandKit: BrandKit | null;
    isLoading: boolean;
    isSaving: boolean;
    error: string | null;
    fetchBrandKit: () => Promise<void>;
    saveBrandKit: (kit: { name: string; logo?: BrandLogo | null; colors: BrandColors; fonts: BrandFonts; watermark: BrandWatermark }) => Promise<boolean>;
    updateColors: (colors: Partial<BrandColors>) => void;
    updateFonts: (fonts: Partial<BrandFonts>) => void;
    updateLogo: (logo: BrandLogo | null) => void;
    updateWatermark: (watermark: Partial<BrandWatermark>) => void;
}

const DEFAULT_BRAND_KIT: BrandKit = {
    id: null,
    name: 'Minha Marca',
    logo: null,
    colors: {
        primary: '#8B5CF6',
        secondary: '#6366F1',
        accent: '#F59E0B',
        background: '#FFFFFF',
        text: '#1F2937',
    },
    fonts: {
        heading: 'Inter',
        body: 'Inter',
    },
    watermark: {
        enabled: false,
        position: 'bottom-right',
        opacity: 0.5,
        size: 80,
    },
};

export function useBrandKit(): UseBrandKitReturn {
    const [brandKit, setBrandKit] = useState<BrandKit | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchBrandKit = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        
        try {
            const response = await fetch('/api/brand-kit');
            
            if (!response.ok) {
                if (response.status === 401) {
                    // Not logged in, use defaults
                    setBrandKit(DEFAULT_BRAND_KIT);
                    return;
                }
                throw new Error('Falha ao carregar brand kit');
            }
            
            const data = await response.json();
            setBrandKit(data);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro desconhecido';
            setError(message);
            setBrandKit(DEFAULT_BRAND_KIT);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const saveBrandKit = useCallback(async (kit: { name: string; logo?: BrandLogo | null; colors: BrandColors; fonts: BrandFonts; watermark: BrandWatermark }): Promise<boolean> => {
        setIsSaving(true);
        setError(null);
        
        try {
            const response = await fetch('/api/brand-kit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(kit),
            });
            
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Falha ao salvar brand kit');
            }
            
            const savedKit = await response.json();
            setBrandKit(savedKit);
            toast.success('Brand kit salvo com sucesso!');
            return true;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao salvar';
            setError(message);
            toast.error(message);
            return false;
        } finally {
            setIsSaving(false);
        }
    }, []);

    const updateColors = useCallback((colors: Partial<BrandColors>) => {
        setBrandKit(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                colors: { ...prev.colors, ...colors },
            };
        });
    }, []);

    const updateFonts = useCallback((fonts: Partial<BrandFonts>) => {
        setBrandKit(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                fonts: { ...prev.fonts, ...fonts },
            };
        });
    }, []);

    const updateLogo = useCallback((logo: BrandLogo | null) => {
        setBrandKit(prev => {
            if (!prev) return prev;
            return { ...prev, logo };
        });
    }, []);

    const updateWatermark = useCallback((watermark: Partial<BrandWatermark>) => {
        setBrandKit(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                watermark: { ...prev.watermark, ...watermark },
            };
        });
    }, []);

    // Fetch on mount
    useEffect(() => {
        fetchBrandKit();
    }, [fetchBrandKit]);

    return {
        brandKit,
        isLoading,
        isSaving,
        error,
        fetchBrandKit,
        saveBrandKit,
        updateColors,
        updateFonts,
        updateLogo,
        updateWatermark,
    };
}
