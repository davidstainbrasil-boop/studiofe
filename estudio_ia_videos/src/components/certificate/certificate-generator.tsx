'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Award,
  Download,
  Share2,
  Calendar,
  User,
  Building2,
  Clock,
  CheckCircle2,
  FileText,
  Printer,
  Mail,
  Copy,
  Check,
  QrCode,
  Shield,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CertificateData {
  id: string;
  recipientName: string;
  recipientDocument?: string;
  courseTitle: string;
  courseCode: string;
  completionDate: string;
  expirationDate?: string;
  score: number;
  totalHours: number;
  instructorName: string;
  companyName?: string;
  companyLogo?: string;
  validationUrl: string;
  validationCode: string;
}

interface CertificateGeneratorProps {
  data: CertificateData;
  onDownload?: (format: 'pdf' | 'png') => void;
  onShare?: () => void;
  className?: string;
}

export function CertificateGenerator({
  data,
  onDownload,
  onShare,
  className,
}: CertificateGeneratorProps) {
  const [copied, setCopied] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);

  const handleCopyCode = useCallback(async () => {
    await navigator.clipboard.writeText(data.validationCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [data.validationCode]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div className={cn('flex flex-col bg-zinc-900 text-white rounded-2xl overflow-hidden', className)}>
      {/* Certificate Preview */}
      <div className="p-8">
        <div 
          className="relative bg-gradient-to-br from-blue-900 via-blue-800 to-purple-900 rounded-2xl p-8
                     border-4 border-yellow-500/30 shadow-2xl"
          style={{
            background: 'linear-gradient(135deg, #1e3a5f 0%, #2d3748 50%, #1a202c 100%)',
          }}
        >
          {/* Decorative Elements */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden rounded-2xl opacity-10">
            <div className="absolute top-4 left-4 w-32 h-32 border-2 border-yellow-400 rounded-full" />
            <div className="absolute bottom-4 right-4 w-24 h-24 border-2 border-yellow-400 rounded-full" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 border border-yellow-400/50 rounded-full" />
          </div>

          {/* Header */}
          <div className="relative text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              {data.companyLogo ? (
                <img src={data.companyLogo} alt="Logo" className="h-12" />
              ) : (
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl
                                flex items-center justify-center">
                  <Award className="h-6 w-6 text-white" />
                </div>
              )}
              {data.companyName && (
                <span className="text-xl font-semibold text-yellow-400">{data.companyName}</span>
              )}
            </div>
            <h2 className="text-3xl font-bold text-yellow-400 tracking-wide">CERTIFICADO</h2>
            <p className="text-sm text-zinc-400 mt-1">de Conclusão de Treinamento</p>
          </div>

          {/* Body */}
          <div className="relative text-center space-y-6">
            <p className="text-zinc-300">Certificamos que</p>
            
            <div className="py-4 border-y border-yellow-500/30">
              <h3 className="text-2xl font-bold text-white tracking-wide uppercase">
                {data.recipientName}
              </h3>
              {data.recipientDocument && (
                <p className="text-sm text-zinc-400 mt-1">
                  Documento: {data.recipientDocument}
                </p>
              )}
            </div>

            <p className="text-zinc-300">
              concluiu com êxito o treinamento em
            </p>

            <div className="py-4">
              <h4 className="text-xl font-bold text-yellow-400 mb-2">
                {data.courseTitle}
              </h4>
              <span className="inline-block px-4 py-1 bg-yellow-500/20 text-yellow-400 text-sm font-medium rounded-full">
                {data.courseCode}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4 py-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-zinc-400 mb-1">
                  <Calendar className="h-4 w-4" />
                  <span className="text-xs">Data</span>
                </div>
                <p className="text-sm font-medium">{formatDate(data.completionDate)}</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-zinc-400 mb-1">
                  <Clock className="h-4 w-4" />
                  <span className="text-xs">Carga Horária</span>
                </div>
                <p className="text-sm font-medium">{data.totalHours} horas</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-zinc-400 mb-1">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-xs">Aproveitamento</span>
                </div>
                <p className="text-sm font-medium">{data.score}%</p>
              </div>
            </div>

            {data.expirationDate && (
              <p className="text-xs text-zinc-500">
                Válido até: {formatDate(data.expirationDate)}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="relative mt-8 pt-6 border-t border-yellow-500/30">
            <div className="flex items-center justify-between">
              <div className="text-center">
                <div className="w-32 border-b border-zinc-600 mb-2" />
                <p className="text-xs text-zinc-400">{data.instructorName}</p>
                <p className="text-xs text-zinc-500">Instrutor</p>
              </div>

              <div className="text-center px-4">
                <div className="w-20 h-20 bg-zinc-800 rounded-lg flex items-center justify-center mb-2">
                  <QrCode className="h-12 w-12 text-zinc-600" />
                </div>
                <p className="text-xs text-zinc-500">Código: {data.validationCode}</p>
              </div>

              <div className="text-center">
                <div className="w-32 border-b border-zinc-600 mb-2" />
                <p className="text-xs text-zinc-400">Responsável Técnico</p>
                <p className="text-xs text-zinc-500">CREA/CRM</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-6 border-t border-zinc-800 space-y-4">
        {/* Validation Code */}
        <div className="flex items-center gap-4 p-4 bg-zinc-800 rounded-xl">
          <Shield className="h-6 w-6 text-green-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Código de Validação</p>
            <p className="text-xs text-zinc-400">Use para verificar autenticidade</p>
          </div>
          <div className="flex items-center gap-2">
            <code className="px-3 py-1.5 bg-zinc-900 rounded font-mono text-sm">
              {data.validationCode}
            </code>
            <button
              onClick={handleCopyCode}
              className="p-2 hover:bg-zinc-700 rounded-lg transition-colors"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-400" />
              ) : (
                <Copy className="h-4 w-4 text-zinc-400" />
              )}
            </button>
          </div>
        </div>

        {/* Download & Share Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <div className="relative">
            <button
              onClick={() => onDownload?.('pdf')}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl
                         font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <Download className="h-5 w-5" />
              Baixar PDF
            </button>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowShareMenu(!showShareMenu)}
              className="w-full py-3 bg-zinc-800 rounded-xl font-semibold
                         hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2"
            >
              <Share2 className="h-5 w-5" />
              Compartilhar
            </button>

            <AnimatePresence>
              {showShareMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-full left-0 right-0 mb-2 p-2 bg-zinc-800 rounded-xl
                             border border-zinc-700 shadow-xl"
                >
                  <button
                    onClick={() => { onShare?.(); setShowShareMenu(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-zinc-700 rounded-lg transition-colors"
                  >
                    <Mail className="h-4 w-4 text-zinc-400" />
                    <span className="text-sm">Enviar por E-mail</span>
                  </button>
                  <button
                    onClick={() => { window.print(); setShowShareMenu(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-zinc-700 rounded-lg transition-colors"
                  >
                    <Printer className="h-4 w-4 text-zinc-400" />
                    <span className="text-sm">Imprimir</span>
                  </button>
                  <button
                    onClick={() => { 
                      window.open(data.validationUrl, '_blank');
                      setShowShareMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-zinc-700 rounded-lg transition-colors"
                  >
                    <ExternalLink className="h-4 w-4 text-zinc-400" />
                    <span className="text-sm">Link de Validação</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Validation Link */}
        <div className="text-center">
          <a
            href={data.validationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-zinc-500 hover:text-zinc-400 transition-colors"
          >
            Validar certificado em: {data.validationUrl}
          </a>
        </div>
      </div>
    </div>
  );
}

// Example certificate data for demonstration
export const exampleCertificateData: CertificateData = {
  id: 'cert-123456',
  recipientName: 'João da Silva Santos',
  recipientDocument: '123.456.789-00',
  courseTitle: 'Trabalho em Altura - NR-35',
  courseCode: 'NR-35',
  completionDate: '2024-01-15',
  expirationDate: '2026-01-15',
  score: 92,
  totalHours: 8,
  instructorName: 'Eng. Carlos Roberto',
  companyName: 'TécnicoCursos',
  validationUrl: 'https://tecnicocursos.com.br/validar',
  validationCode: 'NR35-2024-ABC123',
};

export default CertificateGenerator;
