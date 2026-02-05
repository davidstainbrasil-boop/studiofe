export interface VideoTemplate {
  id: string;
  name: string;
  description: string;
  category: 'business' | 'education' | 'marketing' | 'corporate' | 'creative';
  language: 'pt-BR' | 'en-US';
  style: 'modern' | 'classic' | 'minimal' | 'bold' | 'elegant';
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  fonts: {
    heading: string;
    body: string;
    accent: string;
  };
  transitions: {
    type: 'fade' | 'slide' | 'zoom' | 'flip' | 'none';
    duration: number;
  };
  animations: {
    textEntrance: string;
    textEmphasis: string;
    imageEntrance: string;
  };
  layout: {
    headerHeight: number;
    footerHeight: number;
    contentPadding: number;
    aspectRatio: '16:9' | '9:16' | '4:3' | '1:1';
  };
  elements: {
    showLogo: boolean;
    showProgress: boolean;
    showTimestamp: boolean;
    watermark: boolean;
  };
  audio: {
    backgroundMusic: boolean;
    volume: number;
    fadeDuration: number;
  };
  metadata: {
    author: string;
    version: string;
    createdAt: string;
    tags: string[];
  };
}

export const videoTemplates: VideoTemplate[] = [
  {
    id: 'modern-business-pt',
    name: 'Negócios Moderno',
    description: 'Template profissional para apresentações corporativas em português',
    category: 'business',
    language: 'pt-BR',
    style: 'modern',
    colors: {
      primary: '#1e40af', // Azul corporativo
      secondary: '#3b82f6', // Azul claro
      accent: '#f59e0b', // Laranja destaque
      background: '#ffffff', // Branco
      text: '#1f2937', // Cinza escuro
    },
    fonts: {
      heading: 'Inter, sans-serif',
      body: 'Open Sans, sans-serif',
      accent: 'Montserrat, sans-serif',
    },
    transitions: {
      type: 'slide',
      duration: 0.8,
    },
    animations: {
      textEntrance: 'fadeInUp',
      textEmphasis: 'pulse',
      imageEntrance: 'zoomIn',
    },
    layout: {
      headerHeight: 120,
      footerHeight: 80,
      contentPadding: 60,
      aspectRatio: '16:9',
    },
    elements: {
      showLogo: true,
      showProgress: true,
      showTimestamp: true,
      watermark: false,
    },
    audio: {
      backgroundMusic: true,
      volume: 0.15,
      fadeDuration: 2.0,
    },
    metadata: {
      author: 'TécnicoCursos',
      version: '1.0.0',
      createdAt: '2024-01-01',
      tags: ['corporativo', 'negócios', 'profissional', 'apresentação'],
    },
  },
  {
    id: 'educational-pt',
    name: 'Educativo Brasileiro',
    description: 'Template ideal para conteúdo educacional e treinamentos',
    category: 'education',
    language: 'pt-BR',
    style: 'minimal',
    colors: {
      primary: '#059669', // Verde educacional
      secondary: '#10b981', // Verde claro
      accent: '#8b5cf6', // Roxo destaque
      background: '#f9fafb', // Cinza muito claro
      text: '#111827', // Preto suave
    },
    fonts: {
      heading: 'Roboto, sans-serif',
      body: 'Lato, sans-serif',
      accent: 'Poppins, sans-serif',
    },
    transitions: {
      type: 'fade',
      duration: 0.6,
    },
    animations: {
      textEntrance: 'typewriter',
      textEmphasis: 'highlight',
      imageEntrance: 'slideInLeft',
    },
    layout: {
      headerHeight: 100,
      footerHeight: 60,
      contentPadding: 80,
      aspectRatio: '16:9',
    },
    elements: {
      showLogo: true,
      showProgress: true,
      showTimestamp: false,
      watermark: true,
    },
    audio: {
      backgroundMusic: false,
      volume: 0.1,
      fadeDuration: 1.5,
    },
    metadata: {
      author: 'TécnicoCursos Educação',
      version: '1.0.0',
      createdAt: '2024-01-01',
      tags: ['educação', 'treinamento', 'aula', 'curso'],
    },
  },
  {
    id: 'marketing-digital-pt',
    name: 'Marketing Digital',
    description: 'Template vibrante para campanhas de marketing digital',
    category: 'marketing',
    language: 'pt-BR',
    style: 'bold',
    colors: {
      primary: '#dc2626', // Vermelho marketing
      secondary: '#f87171', // Vermelho claro
      accent: '#fbbf24', // Amarelo
      background: '#fef2f2', // Vermelho muito claro
      text: '#7f1d1d', // Vermelho escuro
    },
    fonts: {
      heading: 'Bebas Neue, cursive',
      body: 'Raleway, sans-serif',
      accent: 'Oswald, sans-serif',
    },
    transitions: {
      type: 'zoom',
      duration: 1.0,
    },
    animations: {
      textEntrance: 'bounceIn',
      textEmphasis: 'shake',
      imageEntrance: 'flipInX',
    },
    layout: {
      headerHeight: 140,
      footerHeight: 100,
      contentPadding: 40,
      aspectRatio: '16:9',
    },
    elements: {
      showLogo: true,
      showProgress: false,
      showTimestamp: true,
      watermark: false,
    },
    audio: {
      backgroundMusic: true,
      volume: 0.2,
      fadeDuration: 3.0,
    },
    metadata: {
      author: 'TécnicoCursos Marketing',
      version: '1.0.0',
      createdAt: '2024-01-01',
      tags: ['marketing', 'vendas', 'campanha', 'anúncio'],
    },
  },
  {
    id: 'corporativo-elegante',
    name: 'Corporativo Elegante',
    description: 'Template sofisticado para presentations executivas',
    category: 'corporate',
    language: 'pt-BR',
    style: 'elegant',
    colors: {
      primary: '#1f2937', // Cinza escuro
      secondary: '#4b5563', // Cinza médio
      accent: '#fbbf24', // Dourado
      background: '#ffffff', // Branco
      text: '#111827', // Preto
    },
    fonts: {
      heading: 'Playfair Display, serif',
      body: 'Source Sans Pro, sans-serif',
      accent: 'Lora, serif',
    },
    transitions: {
      type: 'fade',
      duration: 1.2,
    },
    animations: {
      textEntrance: 'fadeIn',
      textEmphasis: 'glow',
      imageEntrance: 'fadeIn',
    },
    layout: {
      headerHeight: 150,
      footerHeight: 90,
      contentPadding: 70,
      aspectRatio: '16:9',
    },
    elements: {
      showLogo: true,
      showProgress: true,
      showTimestamp: true,
      watermark: true,
    },
    audio: {
      backgroundMusic: true,
      volume: 0.08,
      fadeDuration: 2.5,
    },
    metadata: {
      author: 'TécnicoCursos Corporativo',
      version: '1.0.0',
      createdAt: '2024-01-01',
      tags: ['executivo', 'sofisticado', 'elegante', 'reunião'],
    },
  },
  {
    id: 'criativo-minimal',
    name: 'Criativo Minimalista',
    description: 'Template moderno e clean para conteúdo criativo',
    category: 'creative',
    language: 'pt-BR',
    style: 'minimal',
    colors: {
      primary: '#6366f1', // Índigo
      secondary: '#8b5cf6', // Roxo
      accent: '#ec4899', // Rosa
      background: '#fafafa', // Branco suave
      text: '#18181b', // Preto suave
    },
    fonts: {
      heading: 'Inter, sans-serif',
      body: 'Inter, sans-serif',
      accent: 'Inter, sans-serif',
    },
    transitions: {
      type: 'slide',
      duration: 0.5,
    },
    animations: {
      textEntrance: 'slideUp',
      textEmphasis: 'scale',
      imageEntrance: 'crossFade',
    },
    layout: {
      headerHeight: 80,
      footerHeight: 50,
      contentPadding: 90,
      aspectRatio: '16:9',
    },
    elements: {
      showLogo: false,
      showProgress: true,
      showTimestamp: false,
      watermark: false,
    },
    audio: {
      backgroundMusic: false,
      volume: 0.05,
      fadeDuration: 1.0,
    },
    metadata: {
      author: 'TécnicoCursos Creative',
      version: '1.0.0',
      createdAt: '2024-01-01',
      tags: ['minimal', 'moderno', 'clean', 'criativo'],
    },
  },
];

export const templateCategories = [
  { value: 'business', label: 'Negócios' },
  { value: 'education', label: 'Educação' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'corporate', label: 'Corporativo' },
  { value: 'creative', label: 'Criativo' },
];

export const templateStyles = [
  { value: 'modern', label: 'Moderno' },
  { value: 'classic', label: 'Clássico' },
  { value: 'minimal', label: 'Minimalista' },
  { value: 'bold', label: 'Ousado' },
  { value: 'elegant', label: 'Elegante' },
];

export class VideoTemplateService {
  /**
   * Obter template por ID
   */
  static getTemplate(id: string): VideoTemplate | null {
    return videoTemplates.find((template) => template.id === id) || null;
  }

  /**
   * Obter templates por categoria
   */
  static getTemplatesByCategory(category: string): VideoTemplate[] {
    return videoTemplates.filter((template) => template.category === category);
  }

  /**
   * Obter templates por idioma
   */
  static getTemplatesByLanguage(language: string): VideoTemplate[] {
    return videoTemplates.filter((template) => template.language === language);
  }

  /**
   * Obter templates por estilo
   */
  static getTemplatesByStyle(style: string): VideoTemplate[] {
    return videoTemplates.filter((template) => template.style === style);
  }

  /**
   * Buscar templates por termo
   */
  static searchTemplates(query: string): VideoTemplate[] {
    const lowercaseQuery = query.toLowerCase();
    return videoTemplates.filter(
      (template) =>
        template.name.toLowerCase().includes(lowercaseQuery) ||
        template.description.toLowerCase().includes(lowercaseQuery) ||
        template.metadata.tags.some((tag) => tag.toLowerCase().includes(lowercaseQuery)),
    );
  }

  /**
   * Obter todos os templates
   */
  static getAllTemplates(): VideoTemplate[] {
    return videoTemplates;
  }

  /**
   * Obter templates populares
   */
  static getPopularTemplates(limit: number = 5): VideoTemplate[] {
    // Simular popularidade baseado na ordem
    return videoTemplates.slice(0, limit);
  }

  /**
   * Validar configuração de template
   */
  static validateTemplate(template: Partial<VideoTemplate>): string[] {
    const errors: string[] = [];

    if (!template.name || template.name.trim().length < 3) {
      errors.push('Nome do template é obrigatório e deve ter pelo menos 3 caracteres');
    }

    if (!template.category || !templateCategories.some((cat) => cat.value === template.category)) {
      errors.push('Categoria inválida');
    }

    if (!template.style || !templateStyles.some((style) => style.value === template.style)) {
      errors.push('Estilo inválido');
    }

    if (template.colors) {
      const requiredColors = ['primary', 'secondary', 'accent', 'background', 'text'];
      requiredColors.forEach((color) => {
        if (!template.colors![color as keyof typeof template.colors]) {
          errors.push(`Cor '${color}' é obrigatória`);
        }
      });
    }

    return errors;
  }

  /**
   * Criar template personalizado
   */
  static createCustomTemplate(customization: Partial<VideoTemplate>): VideoTemplate {
    const baseTemplate = this.getTemplate('modern-business-pt')!;

    return {
      ...baseTemplate,
      id: `custom-${Date.now()}`,
      name: customization.name || 'Template Personalizado',
      description: customization.description || 'Template criado pelo usuário',
      ...customization,
      metadata: {
        ...baseTemplate.metadata,
        author: 'Custom User',
        createdAt: new Date().toISOString(),
        version: '1.0.0',
        tags: [...(baseTemplate.metadata.tags || []), 'personalizado'],
      },
    };
  }

  /**
   * Obter paleta de cores para preview
   */
  static getTemplateColors(template: VideoTemplate): string[] {
    return Object.values(template.colors);
  }

  /**
   * Obter configuração de CSS para template
   */
  static getTemplateCSS(template: VideoTemplate): string {
    return `
      .template-${template.id} {
        --primary-color: ${template.colors.primary};
        --secondary-color: ${template.colors.secondary};
        --accent-color: ${template.colors.accent};
        --background-color: ${template.colors.background};
        --text-color: ${template.colors.text};
        --heading-font: ${template.fonts.heading};
        --body-font: ${template.fonts.body};
        --accent-font: ${template.fonts.accent};
        --transition-duration: ${template.transitions.duration}s;
        --header-height: ${template.layout.headerHeight}px;
        --footer-height: ${template.layout.footerHeight}px;
        --content-padding: ${template.layout.contentPadding}px;
      }
    `;
  }
}

export default VideoTemplateService;
