/**
 * 🎯 Página PPTX - Interface Completa para Processamento
 * Página dedicada ao upload e processamento de apresentações PowerPoint
 */

import React from 'react';
import { Metadata } from 'next';
import PPTXUploadComponent from '@components/pptx/PPTXUploadComponent';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Badge } from '@components/ui/badge';
import { Separator } from '@components/ui/separator';
import { 
  FileText, 
  Upload, 
  Zap, 
  Brain, 
  Video, 
  Sparkles,
  CheckCircle,
  Clock,
  Settings
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Processamento PPTX | Estúdio IA Vídeos',
  description: 'Transforme suas apresentações PowerPoint em vídeos profissionais com IA',
  keywords: ['PPTX', 'PowerPoint', 'IA', 'vídeo', 'automação', 'apresentação']
};

export default function PPTXPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        
        {/* Header da Página */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-blue-600 rounded-xl">
              <FileText className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Processamento PPTX
            </h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Transforme suas apresentações PowerPoint em vídeos profissionais com tecnologia de IA avançada
          </p>
        </div>

        {/* Cards de Funcionalidades */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mb-3">
                <Upload className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-blue-800">Upload Inteligente</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <CardDescription className="text-blue-700">
                Analise automática de conteúdo, extração de texto e identificação de elementos visuais
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center mb-3">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-purple-800">Processamento IA</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <CardDescription className="text-purple-700">
                Análise inteligente de slides, geração de roteiros e timing automático otimizado
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mb-3">
                <Video className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-green-800">Vídeo Profissional</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <CardDescription className="text-green-700">
                Renderização em alta qualidade com narração IA e transições cinematográficas
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Componente Principal de Upload */}
        <PPTXUploadComponent />

        {/* Seção de Recursos e Benefícios */}
        <div className="mt-12 grid md:grid-cols-2 gap-8">
          
          {/* Recursos Técnicos */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-blue-600" />
                Recursos Técnicos
              </CardTitle>
              <CardDescription>
                Tecnologias avançadas para processamento otimizado
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold">Extração Avançada</h4>
                  <p className="text-sm text-gray-600">Análise completa de texto, imagens, notas e metadados</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold">Validação Robusta</h4>
                  <p className="text-sm text-gray-600">Verificação de integridade e compatibilidade automática</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold">Cache Inteligente</h4>
                  <p className="text-sm text-gray-600">Sistema de cache para processamento rápido e eficiente</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold">APIs Escaláveis</h4>
                  <p className="text-sm text-gray-600">Arquitetura preparada para alto volume de processamento</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fluxo de Processamento */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-purple-600" />
                Fluxo de Processamento
              </CardTitle>
              <CardDescription>
                Etapas automatizadas para máxima eficiência
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-bold text-blue-600">
                  1
                </div>
                <div>
                  <h4 className="font-semibold">Upload & Validação</h4>
                  <p className="text-sm text-gray-600">Verificação de formato e integridade</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-sm font-bold text-purple-600">
                  2
                </div>
                <div>
                  <h4 className="font-semibold">Análise de Conteúdo</h4>
                  <p className="text-sm text-gray-600">Extração de texto, imagens e estrutura</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-sm font-bold text-green-600">
                  3
                </div>
                <div>
                  <h4 className="font-semibold">Processamento IA</h4>
                  <p className="text-sm text-gray-600">Otimização de timing e geração de roteiro</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-sm font-bold text-orange-600">
                  4
                </div>
                <div>
                  <h4 className="font-semibold">Preparação Final</h4>
                  <p className="text-sm text-gray-600">Dados estruturados para criação de vídeo</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Estatísticas de Performance */}
        <div className="mt-12 text-center">
          <Card className="border-0 shadow-lg bg-gradient-to-r from-gray-50 to-gray-100">
            <CardContent className="py-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    <Sparkles className="h-8 w-8 mx-auto mb-2" />
                    99.8%
                  </div>
                  <div className="text-sm text-gray-600">Taxa de Sucesso</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    <Clock className="h-8 w-8 mx-auto mb-2" />
                    &lt;30s
                  </div>
                  <div className="text-sm text-gray-600">Tempo Médio</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-purple-600 mb-2">50MB</div>
                  <div className="text-sm text-gray-600">Tamanho Máximo</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-orange-600 mb-2">24/7</div>
                  <div className="text-sm text-gray-600">Disponibilidade</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer da Página */}
        <div className="mt-12 text-center text-gray-500 text-sm">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span>Suporte a arquivos .pptx</span>
            <span>•</span>
            <span>Processamento seguro e privado</span>
            <span>•</span>
            <Badge variant="outline">
              Powered by IA
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}