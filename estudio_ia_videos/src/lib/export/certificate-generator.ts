/**
 * 📜 Certificate Generator - Geração de Certificados PDF
 * 
 * Sistema de geração de certificados de conclusão de treinamento NR
 * Compatível com requisitos de compliance e auditoria
 * 
 * NOTA: Para usar este módulo, instale: npm install jspdf
 */

import { Logger } from '@lib/logger';

// PDF instance type - uses any to avoid jspdf type dependency
type PDFInstance = {
  setFillColor: (r: number, g: number, b: number) => void;
  rect: (x: number, y: number, w: number, h: number, style?: string) => void;
  setDrawColor: (r: number, g: number, b: number) => void;
  setLineWidth: (width: number) => void;
  line: (x1: number, y1: number, x2: number, y2: number) => void;
  setFont: (fontName: string, fontStyle?: string) => void;
  setFontSize: (size: number) => void;
  setTextColor: (r: number, g: number, b: number) => void;
  text: (text: string, x: number, y: number, options?: { align?: string }) => void;
  getTextWidth: (text: string) => number;
  addImage?: (data: string, type: string, x: number, y: number, w: number, h: number) => void;
  output: (type: 'blob') => Blob;
};

async function loadJsPDF(): Promise<new (options: { orientation: string; unit: string; format: string }) => PDFInstance> {
  try {
    // Dynamic import with string literal to avoid static analysis
    const moduleName = 'jspdf';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const module = await (Function('moduleName', 'return import(moduleName)')(moduleName) as Promise<any>);
    return module.jsPDF || module.default?.jsPDF || module.default;
  } catch {
    throw new Error('jsPDF não está instalado. Execute: npm install jspdf');
  }
}

const logger = new Logger('certificate-generator');

// =============================================================================
// Types
// =============================================================================

export interface CertificateData {
  // Trainee info
  traineeName: string;
  traineeDocument?: string; // CPF or other ID
  traineeEmail?: string;
  
  // Course info
  courseTitle: string;
  courseCode?: string;
  nrNumber?: string; // e.g., "NR-35"
  courseDurationHours: number;
  courseDescription?: string;
  
  // Completion info
  completionDate: Date;
  expirationDate?: Date;
  score?: number; // 0-100
  
  // Organization info
  organizationName: string;
  organizationLogo?: string; // Base64 or URL
  instructorName?: string;
  instructorCredentials?: string;
  
  // Certificate metadata
  certificateId: string;
  verificationUrl?: string;
  validationCode?: string;
  
  // Styling
  template?: CertificateTemplate;
}

export type CertificateTemplate = 'professional' | 'modern' | 'corporate' | 'minimal';

export interface CertificateStyle {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  borderStyle: 'ornate' | 'simple' | 'none';
}

// =============================================================================
// Template Styles
// =============================================================================

const TEMPLATE_STYLES: Record<CertificateTemplate, CertificateStyle> = {
  professional: {
    primaryColor: '#1a365d',
    secondaryColor: '#2c5282',
    accentColor: '#c6a45a',
    fontFamily: 'times',
    borderStyle: 'ornate',
  },
  modern: {
    primaryColor: '#7c3aed',
    secondaryColor: '#8b5cf6',
    accentColor: '#a78bfa',
    fontFamily: 'helvetica',
    borderStyle: 'simple',
  },
  corporate: {
    primaryColor: '#0f172a',
    secondaryColor: '#334155',
    accentColor: '#3b82f6',
    fontFamily: 'helvetica',
    borderStyle: 'simple',
  },
  minimal: {
    primaryColor: '#18181b',
    secondaryColor: '#52525b',
    accentColor: '#a1a1aa',
    fontFamily: 'helvetica',
    borderStyle: 'none',
  },
};

// =============================================================================
// Certificate Generator Class
// =============================================================================

export class CertificateGenerator {
  private data: CertificateData;
  private style: CertificateStyle;
  private pdf: PDFInstance | null = null;

  constructor(data: CertificateData) {
    this.data = data;
    this.style = TEMPLATE_STYLES[data.template || 'professional'];
  }

  /**
   * Generate the certificate PDF
   */
  async generate(): Promise<Blob> {
    logger.info('Gerando certificado', { 
      certificateId: this.data.certificateId,
      template: this.data.template 
    });

    try {
      // Load jsPDF dynamically
      const JsPDF = await loadJsPDF();
      this.pdf = new JsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      // Draw background and border
      this.drawBackground();
      this.drawBorder();

      // Draw header (logo and organization)
      await this.drawHeader();

      // Draw title
      this.drawTitle();

      // Draw main content
      this.drawContent();

      // Draw course details
      this.drawCourseDetails();

      // Draw signatures
      this.drawSignatures();

      // Draw footer (validation info)
      this.drawFooter();

      // Return as blob
      const blob = this.pdf.output('blob');
      
      logger.info('Certificado gerado com sucesso', { 
        certificateId: this.data.certificateId,
        size: blob.size 
      });

      return blob;
    } catch (error) {
      logger.error('Erro ao gerar certificado', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Draw background
   */
  private drawBackground(): void {
    if (!this.pdf) return;
    // Light background
    this.pdf.setFillColor(252, 252, 253);
    this.pdf.rect(0, 0, 297, 210, 'F');

    // Subtle gradient effect using multiple rectangles
    this.pdf.setFillColor(248, 250, 252);
    this.pdf.rect(10, 10, 277, 190, 'F');
  }

  /**
   * Draw decorative border
   */
  private drawBorder(): void {
    if (!this.pdf) return;
    const { borderStyle, primaryColor, accentColor } = this.style;

    if (borderStyle === 'none') return;

    const [r, g, b] = this.hexToRgb(primaryColor);
    this.pdf.setDrawColor(r, g, b);

    if (borderStyle === 'ornate') {
      // Double border
      this.pdf.setLineWidth(0.5);
      this.pdf.rect(8, 8, 281, 194);
      this.pdf.setLineWidth(1.5);
      this.pdf.rect(12, 12, 273, 186);

      // Corner decorations
      const [ar, ag, ab] = this.hexToRgb(accentColor);
      this.pdf.setFillColor(ar, ag, ab);
      
      // Top-left corner
      this.drawCornerDecoration(15, 15, 0);
      // Top-right corner
      this.drawCornerDecoration(282, 15, 90);
      // Bottom-right corner
      this.drawCornerDecoration(282, 195, 180);
      // Bottom-left corner
      this.drawCornerDecoration(15, 195, 270);
    } else {
      // Simple border
      this.pdf.setLineWidth(2);
      this.pdf.rect(10, 10, 277, 190);
    }
  }

  /**
   * Draw corner decoration
   */
  private drawCornerDecoration(x: number, y: number, _rotation: number): void {
    if (!this.pdf) return;
    const pdf = this.pdf;
    // Simple corner flourish
    const size = 8;
    pdf.setLineWidth(0.5);
    
    // Draw a small decorative element
    pdf.line(x, y, x + size, y);
    pdf.line(x, y, x, y + size);
  }

  /**
   * Draw header with logo and organization
   */
  private async drawHeader(): Promise<void> {
    if (!this.pdf) return;
    const pdf = this.pdf;
    const { organizationName, organizationLogo } = this.data;
    const { primaryColor } = this.style;

    // Organization name
    pdf.setFont(this.style.fontFamily, 'bold');
    pdf.setFontSize(14);
    const [r, g, b] = this.hexToRgb(primaryColor);
    pdf.setTextColor(r, g, b);
    pdf.text(organizationName.toUpperCase(), 148.5, 30, { align: 'center' });

    // Add logo if provided
    if (organizationLogo && pdf.addImage) {
      try {
        // Logo would be added here
        // pdf.addImage(organizationLogo, 'PNG', 20, 15, 30, 30);
      } catch (error) {
        logger.warn('Não foi possível adicionar logo ao certificado');
      }
    }
  }

  /**
   * Draw certificate title
   */
  private drawTitle(): void {
    if (!this.pdf) return;
    const pdf = this.pdf;
    const { primaryColor, accentColor } = this.style;
    const [r, g, b] = this.hexToRgb(primaryColor);
    const [ar, ag, ab] = this.hexToRgb(accentColor);

    // Main title
    pdf.setFont(this.style.fontFamily, 'bold');
    pdf.setFontSize(36);
    pdf.setTextColor(r, g, b);
    pdf.text('CERTIFICADO', 148.5, 50, { align: 'center' });

    // Subtitle
    pdf.setFontSize(14);
    pdf.setTextColor(ar, ag, ab);
    pdf.text('DE CONCLUSÃO DE TREINAMENTO', 148.5, 58, { align: 'center' });

    // Decorative line
    pdf.setDrawColor(ar, ag, ab);
    pdf.setLineWidth(0.5);
    pdf.line(90, 62, 207, 62);
  }

  /**
   * Draw main content (trainee name, course, etc.)
   */
  private drawContent(): void {
    if (!this.pdf) return;
    const pdf = this.pdf;
    const { traineeName, courseTitle, nrNumber, courseDurationHours } = this.data;
    const { primaryColor, secondaryColor } = this.style;
    const [r, g, b] = this.hexToRgb(primaryColor);
    const [sr, sg, sb] = this.hexToRgb(secondaryColor);

    // Certifies text
    pdf.setFont(this.style.fontFamily, 'normal');
    pdf.setFontSize(12);
    pdf.setTextColor(sr, sg, sb);
    pdf.text('Certificamos que', 148.5, 78, { align: 'center' });

    // Trainee name
    pdf.setFont(this.style.fontFamily, 'bold');
    pdf.setFontSize(28);
    pdf.setTextColor(r, g, b);
    pdf.text(traineeName.toUpperCase(), 148.5, 92, { align: 'center' });

    // Underline for name
    const nameWidth = pdf.getTextWidth(traineeName.toUpperCase());
    pdf.setDrawColor(r, g, b);
    pdf.setLineWidth(0.5);
    pdf.line(148.5 - nameWidth / 2, 94, 148.5 + nameWidth / 2, 94);

    // Course completion text
    pdf.setFont(this.style.fontFamily, 'normal');
    pdf.setFontSize(12);
    pdf.setTextColor(sr, sg, sb);
    pdf.text('concluiu com êxito o treinamento', 148.5, 108, { align: 'center' });

    // Course title with NR
    pdf.setFont(this.style.fontFamily, 'bold');
    pdf.setFontSize(18);
    pdf.setTextColor(r, g, b);
    const courseTitleText = nrNumber ? `${nrNumber} - ${courseTitle}` : courseTitle;
    pdf.text(courseTitleText, 148.5, 120, { align: 'center' });

    // Duration
    pdf.setFont(this.style.fontFamily, 'normal');
    pdf.setFontSize(11);
    pdf.setTextColor(sr, sg, sb);
    pdf.text(`Carga Horária: ${courseDurationHours} hora${courseDurationHours !== 1 ? 's' : ''}`, 148.5, 130, { align: 'center' });
  }

  /**
   * Draw course details section
   */
  private drawCourseDetails(): void {
    if (!this.pdf) return;
    const pdf = this.pdf;
    const { completionDate, expirationDate, score, courseCode } = this.data;
    const { secondaryColor } = this.style;
    const [r, g, b] = this.hexToRgb(secondaryColor);

    pdf.setFont(this.style.fontFamily, 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(r, g, b);

    const details: string[] = [];

    // Completion date
    const formattedDate = completionDate.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    details.push(`Data de Conclusão: ${formattedDate}`);

    // Expiration date (if applicable)
    if (expirationDate) {
      const formattedExpiration = expirationDate.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
      details.push(`Válido até: ${formattedExpiration}`);
    }

    // Score (if applicable)
    if (score !== undefined) {
      details.push(`Aproveitamento: ${score}%`);
    }

    // Course code (if applicable)
    if (courseCode) {
      details.push(`Código do Curso: ${courseCode}`);
    }

    // Draw details
    const startY = 142;
    details.forEach((detail, index) => {
      pdf.text(detail, 148.5, startY + index * 6, { align: 'center' });
    });
  }

  /**
   * Draw signature section
   */
  private drawSignatures(): void {
    if (!this.pdf) return;
    const pdf = this.pdf;
    const { instructorName, instructorCredentials, organizationName } = this.data;
    const { primaryColor, secondaryColor } = this.style;
    const [r, g, b] = this.hexToRgb(primaryColor);
    const [sr, sg, sb] = this.hexToRgb(secondaryColor);

    const signatureY = 172;
    const lineWidth = 60;

    // Left signature (Instructor)
    if (instructorName) {
      pdf.setDrawColor(r, g, b);
      pdf.setLineWidth(0.5);
      pdf.line(40, signatureY, 40 + lineWidth, signatureY);

      pdf.setFont(this.style.fontFamily, 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(r, g, b);
      pdf.text(instructorName, 40 + lineWidth / 2, signatureY + 5, { align: 'center' });

      if (instructorCredentials) {
        pdf.setFont(this.style.fontFamily, 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(sr, sg, sb);
        pdf.text(instructorCredentials, 40 + lineWidth / 2, signatureY + 10, { align: 'center' });
      }

      pdf.setFontSize(9);
      pdf.text('Instrutor', 40 + lineWidth / 2, signatureY + 16, { align: 'center' });
    }

    // Right signature (Organization)
    pdf.setDrawColor(r, g, b);
    pdf.setLineWidth(0.5);
    pdf.line(197, signatureY, 197 + lineWidth, signatureY);

    pdf.setFont(this.style.fontFamily, 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(r, g, b);
    pdf.text(organizationName, 197 + lineWidth / 2, signatureY + 5, { align: 'center' });

    pdf.setFont(this.style.fontFamily, 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(sr, sg, sb);
    pdf.text('Organização', 197 + lineWidth / 2, signatureY + 10, { align: 'center' });
  }

  /**
   * Draw footer with validation info
   */
  private drawFooter(): void {
    if (!this.pdf) return;
    const pdf = this.pdf;
    const { certificateId, verificationUrl, validationCode } = this.data;
    const { secondaryColor } = this.style;
    const [r, g, b] = this.hexToRgb(secondaryColor);

    pdf.setFont(this.style.fontFamily, 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(r, g, b);

    // Certificate ID
    pdf.text(`Certificado Nº: ${certificateId}`, 20, 195);

    // Validation info
    if (verificationUrl) {
      pdf.text(`Verificar em: ${verificationUrl}`, 148.5, 195, { align: 'center' });
    }

    if (validationCode) {
      pdf.text(`Código de Validação: ${validationCode}`, 277, 195, { align: 'right' });
    }

    // Generated by
    pdf.setFontSize(7);
    pdf.setTextColor(150, 150, 150);
    pdf.text('Certificado gerado por Estúdio IA Vídeos - TecnicoCursos', 148.5, 200, { align: 'center' });
  }

  /**
   * Convert hex color to RGB
   */
  private hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return [0, 0, 0];
    return [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16),
    ];
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generate a unique certificate ID
 */
export function generateCertificateId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `CERT-${timestamp}-${random}`;
}

/**
 * Generate a validation code
 */
export function generateValidationCode(certificateId: string): string {
  // Simple hash for validation
  let hash = 0;
  for (let i = 0; i < certificateId.length; i++) {
    const char = certificateId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).toUpperCase().substring(0, 8);
}

/**
 * Calculate expiration date based on NR requirements
 */
export function calculateExpirationDate(nrNumber: string, completionDate: Date): Date | undefined {
  // NR validity periods (in years)
  const nrValidityYears: Record<string, number> = {
    'NR-10': 2,  // Segurança em Instalações Elétricas
    'NR-11': 1,  // Operador de Empilhadeira
    'NR-12': 2,  // Máquinas e Equipamentos
    'NR-13': 2,  // Caldeiras e Vasos de Pressão
    'NR-18': 2,  // Construção Civil
    'NR-20': 3,  // Líquidos Combustíveis e Inflamáveis
    'NR-33': 1,  // Espaços Confinados
    'NR-35': 2,  // Trabalho em Altura
  };

  const validity = nrValidityYears[nrNumber];
  if (!validity) return undefined;

  const expiration = new Date(completionDate);
  expiration.setFullYear(expiration.getFullYear() + validity);
  return expiration;
}

/**
 * Quick function to generate certificate
 */
export async function generateCertificate(data: CertificateData): Promise<Blob> {
  const generator = new CertificateGenerator(data);
  return generator.generate();
}

// =============================================================================
// Exports
// =============================================================================

export default CertificateGenerator;
