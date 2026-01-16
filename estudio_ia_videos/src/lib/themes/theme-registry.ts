
export interface Theme {
    id: string;
    name: string;
    description: string;
    isPremium: boolean;
    styles: {
        background: string; // CSS color or gradient
        textPrimary: string;
        textSecondary: string;
        fontFamily: string;
        accentColor: string;
        borderRadius: number;
    };
    transition: 'fade' | 'slide' | 'zoom' | 'wipe';
}

export const EXPORT_THEMES: Record<string, Theme> = {
    modern: {
        id: 'modern',
        name: 'Modern Clean',
        description: 'Professional and minimalist design',
        isPremium: false,
        styles: {
            background: '#ffffff',
            textPrimary: '#1a1a1a',
            textSecondary: '#666666',
            fontFamily: 'Inter',
            accentColor: '#3b82f6',
            borderRadius: 16
        },
        transition: 'fade'
    },
    dark: {
        id: 'dark',
        name: 'Dark Mode',
        description: 'Sleek dark interface for tech content',
        isPremium: false,
        styles: {
            background: '#0f172a',
            textPrimary: '#f8fafc',
            textSecondary: '#94a3b8',
            fontFamily: 'Inter',
            accentColor: '#6366f1',
            borderRadius: 8
        },
        transition: 'fade'
    },
    cyberpunk: {
        id: 'cyberpunk',
        name: 'Cyberpunk',
        description: 'Vibrant colors and sharp angles',
        isPremium: true,
        styles: {
            background: 'linear-gradient(135deg, #2b0057 0%, #000000 100%)',
            textPrimary: '#00fff5',
            textSecondary: '#ff00ff',
            fontFamily: 'Orbitron',
            accentColor: '#fcee0a',
            borderRadius: 0
        },
        transition: 'zoom'
    },
    corporate: {
        id: 'corporate',
        name: 'Corporate Blue',
        description: 'Trustworthy and traditional',
        isPremium: true,
        styles: {
            background: '#f0f9ff',
            textPrimary: '#0c4a6e',
            textSecondary: '#5e8599',
            fontFamily: 'Roboto',
            accentColor: '#0284c7',
            borderRadius: 4
        },
        transition: 'slide'
    }
};

export function getTheme(id: string | undefined): Theme {
    if (!id || !EXPORT_THEMES[id]) return EXPORT_THEMES['modern'];
    return EXPORT_THEMES[id];
}
