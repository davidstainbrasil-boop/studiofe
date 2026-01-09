

/**
 * 🏗️ Templates NR Específicos
 * Templates detalhados baseados em cenários reais de NRs
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { Progress } from '@components/ui/progress';
import {
  HardHat,
  Wrench,
  Zap,
  AlertTriangle,
  Shield,
  CheckCircle,
  Users,
  Building,
  Cog,
  Eye,
  Play,
  Download
} from 'lucide-react';
import Image from 'next/image';
import { toast } from 'react-hot-toast';

interface NRSpecificTemplate {
  id: string;
  nr: string;
  titulo: string;
  subtitulo: string;
  categoria: string;
  cenario: string;
  duracao: number;
  modulos: NRModule[];
  recursos: {
    avatar3D: boolean;
    cenarios3D: boolean;
    quizInterativo: boolean;
    certificado: boolean;
  };
  compliance: number;
  thumbnail: string;
}

interface NRModule {
  id: string;
  titulo: string;
  duracao: number;
  topicos: string[];
  exercicios: number;
}

export default function NRSpecificTemplates() {
  const [selectedTemplate, setSelectedTemplate] = useState<NRSpecificTemplate | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const templatesEspecificos: NRSpecificTemplate[] = [
    {
      id: 'nr12-maquinas-detalhado',
      nr: 'NR-12',
      titulo: 'Segurança em Máquinas e Equipamentos',
      subtitulo: 'Treinamento Completo sobre Dispositivos de Proteção',
      categoria: 'Segurança em Máquinas',
      cenario: 'Ambiente Industrial com Máquinas Reais',
      duracao: 45,
      modulos: [
        {
          id: 'arranjo-fisico',
          titulo: 'Arranjo Físico e Instalações',
          duracao: 10,
          topicos: [
            'Distâncias mínimas de segurança',
            'Pisos e passarelas',
            'Sinalização de segurança',
            'Iluminação adequada'
          ],
          exercicios: 3
        },
        {
          id: 'dispositivos-protecao',
          titulo: 'Dispositivos de Proteção',
          duracao: 15,
          topicos: [
            'Proteções fixas e móveis',
            'Dispositivos de intertravamento',
            'Dispositivos de parada de emergência',
            'Barreiras de luz'
          ],
          exercicios: 5
        },
        {
          id: 'sistemas-seguranca',
          titulo: 'Sistemas de Segurança',
          duracao: 12,
          topicos: [
            'Comandos bimanuais',
            'Sensores de segurança',
            'Dispositivos limitadores',
            'Sistemas de retenção mecânica'
          ],
          exercicios: 4
        },
        {
          id: 'procedimentos-trabalho',
          titulo: 'Procedimentos de Trabalho',
          duracao: 8,
          topicos: [
            'Permissão de trabalho',
            'Bloqueio e etiquetagem (LOTO)',
            'Procedimentos de manutenção',
            'Capacitação de operadores'
          ],
          exercicios: 2
        }
      ],
      recursos: {
        avatar3D: true,
        cenarios3D: true,
        quizInterativo: true,
        certificado: true
      },
      compliance: 98,
      thumbnail: '/templates/nr12-maquinas-thumb.jpg'
    },
    {
      id: 'nr10-eletrica-avancado',
      nr: 'NR-10',
      titulo: 'Segurança em Instalações Elétricas',
      subtitulo: 'Análise de Riscos e Medidas de Proteção',
      categoria: 'Segurança Elétrica',
      cenario: 'Instalações Elétricas Industriais',
      duracao: 40,
      modulos: [
        {
          id: 'introducao-eletrica',
          titulo: 'Introdução à Segurança Elétrica',
          duracao: 8,
          topicos: [
            'Conceitos fundamentais',
            'Riscos da eletricidade',
            'Efeitos da corrente elétrica',
            'Legislação aplicável'
          ],
          exercicios: 2
        },
        {
          id: 'riscos-eletricos',
          titulo: 'Riscos Elétricos e Medidas de Controle',
          duracao: 15,
          topicos: [
            'Choque elétrico',
            'Arco elétrico',
            'Incêndio e explosão',
            'Campos eletromagnéticos'
          ],
          exercicios: 4
        },
        {
          id: 'epis-eletricos',
          titulo: 'EPIs e EPCs Específicos',
          duracao: 10,
          topicos: [
            'Capacetes dielétricos',
            'Luvas isolantes',
            'Calçados de segurança',
            'Ferramentas isoladas'
          ],
          exercicios: 3
        },
        {
          id: 'procedimentos-seguranca',
          titulo: 'Procedimentos de Segurança',
          duracao: 7,
          topicos: [
            'Desenergização',
            'Aterramento temporário',
            'Sinalização e isolamento',
            'Liberação para serviços'
          ],
          exercicios: 2
        }
      ],
      recursos: {
        avatar3D: true,
        cenarios3D: true,
        quizInterativo: true,
        certificado: true
      },
      compliance: 96,
      thumbnail: '/templates/nr10-eletrica-thumb.jpg'
    },
    {
      id: 'nr06-epis-pratico',
      nr: 'NR-06',
      titulo: 'Equipamentos de Proteção Individual',
      subtitulo: 'Uso Correto e Manutenção de EPIs',
      categoria: 'Proteção Individual',
      cenario: 'Canteiro de Obras e Indústria',
      duracao: 25,
      modulos: [
        {
          id: 'tipos-epis',
          titulo: 'Tipos de EPIs e Aplicações',
          duracao: 8,
          topicos: [
            'Proteção da cabeça',
            'Proteção dos olhos e face',
            'Proteção respiratória',
            'Proteção de mãos e pés'
          ],
          exercicios: 3
        },
        {
          id: 'uso-correto',
          titulo: 'Uso Correto dos EPIs',
          duracao: 10,
          topicos: [
            'Inspeção antes do uso',
            'Colocação adequada',
            'Limitações dos EPIs',
            'Quando substituir'
          ],
          exercicios: 4
        },
        {
          id: 'manutencao-cuidados',
          titulo: 'Manutenção e Cuidados',
          duracao: 7,
          topicos: [
            'Limpeza e higienização',
            'Armazenamento correto',
            'Vida útil dos EPIs',
            'Certificação (CA)'
          ],
          exercicios: 2
        }
      ],
      recursos: {
        avatar3D: true,
        cenarios3D: false,
        quizInterativo: true,
        certificado: true
      },
      compliance: 94,
      thumbnail: '/templates/nr06-epis-thumb.jpg'
    },
    {
      id: 'nr35-altura-especializado',
      nr: 'NR-35',
      titulo: 'Trabalho em Altura',
      subtitulo: 'Sistemas de Proteção e Resgate',
      categoria: 'Trabalho em Altura',
      cenario: 'Torres, Andaimes e Estruturas Elevadas',
      duracao: 50,
      modulos: [
        {
          id: 'analise-riscos-altura',
          titulo: 'Análise de Riscos em Altura',
          duracao: 12,
          topicos: [
            'Identificação de perigos',
            'Avaliação de riscos',
            'Medidas de controle',
            'Permissão de trabalho (PT)'
          ],
          exercicios: 3
        },
        {
          id: 'sistemas-protecao',
          titulo: 'Sistemas de Proteção',
          duracao: 18,
          topicos: [
            'Proteção coletiva (EPC)',
            'Cinturões e talabartes',
            'Trava-quedas',
            'Sistemas de ancoragem'
          ],
          exercicios: 5
        },
        {
          id: 'equipamentos-acesso',
          titulo: 'Equipamentos de Acesso',
          duracao: 12,
          topicos: [
            'Escadas e andaimes',
            'Plataformas elevatórias',
            'Cordas e técnicas verticais',
            'Inspeção de equipamentos'
          ],
          exercicios: 4
        },
        {
          id: 'emergencia-resgate',
          titulo: 'Emergência e Resgate',
          duracao: 8,
          topicos: [
            'Procedimentos de emergência',
            'Técnicas de resgate',
            'Primeiros socorros em altura',
            'Comunicação de emergência'
          ],
          exercicios: 2
        }
      ],
      recursos: {
        avatar3D: true,
        cenarios3D: true,
        quizInterativo: true,
        certificado: true
      },
      compliance: 97,
      thumbnail: '/templates/nr35-altura-thumb.jpg'
    }
  ];

  const handleGenerateFromTemplate = async (template: NRSpecificTemplate) => {
    setIsGenerating(true);
    try {
      // Simular geração do treinamento
      await new Promise(resolve => setTimeout(resolve, 3000));
      toast.success(`Treinamento ${template.nr} gerado com sucesso!`);
    } catch (error) {
      toast.error('Erro na geração do treinamento');
    } finally {
      setIsGenerating(false);
    }
  };

  const getNRIcon = (nr: string) => {
    const icons = {
      'NR-06': HardHat,
      'NR-10': Zap,
      'NR-12': Cog,
      'NR-35': Building
    };
    return icons[nr as keyof typeof icons] || Shield;
  };

  const getNRColor = (nr: string) => {
    const colors = {
      'NR-06': 'from-orange-500 to-red-500',
      'NR-10': 'from-yellow-500 to-orange-500', 
      'NR-12': 'from-blue-500 to-purple-500',
      'NR-35': 'from-green-500 to-blue-500'
    };
    return colors[nr as keyof typeof colors] || 'from-gray-500 to-gray-600';
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-3">
          <Building className="h-10 w-10 text-blue-600" />
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Templates NR Específicos
          </h2>
          <Wrench className="h-10 w-10 text-orange-600" />
        </div>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Templates detalhados com cenários reais e módulos práticos para cada Norma Regulamentadora
        </p>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {templatesEspecificos.map((template) => {
          const IconComponent = getNRIcon(template.nr);
          
          return (
            <Card 
              key={template.id}
              className={`cursor-pointer transition-all duration-300 hover:shadow-xl group ${
                selectedTemplate?.id === template.id ? 'ring-2 ring-blue-500 shadow-lg' : ''
              }`}
              onClick={() => setSelectedTemplate(template)}
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg bg-gradient-to-r ${getNRColor(template.nr)}`}>
                        <IconComponent className="h-6 w-6 text-white" />
                      </div>
                      <Badge className="bg-orange-100 text-orange-800 text-lg px-3 py-1">
                        {template.nr}
                      </Badge>
                    </div>
                    
                    <div>
                      <CardTitle className="text-xl group-hover:text-blue-600 transition-colors">
                        {template.titulo}
                      </CardTitle>
                      <CardDescription className="text-base mt-1">
                        {template.subtitulo}
                      </CardDescription>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">{template.compliance}%</div>
                    <div className="text-xs text-gray-500">Compliance</div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Preview Thumbnail */}
                <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center space-y-3">
                      <IconComponent className="h-12 w-12 text-gray-400 mx-auto" />
                      <div>
                        <div className="font-medium">{template.cenario}</div>
                        <div className="text-sm text-gray-500">{template.duracao} minutos</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Módulos */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-gray-700">Módulos de Treinamento:</h4>
                  <div className="space-y-2">
                    {template.modulos.map((modulo, index) => (
                      <div key={modulo.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs">{index + 1}</Badge>
                          <span className="text-sm font-medium">{modulo.titulo}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <span>{modulo.duracao}min</span>
                          <span>•</span>
                          <span>{modulo.exercicios} exercícios</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recursos */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-gray-700">Recursos Inclusos:</h4>
                  <div className="flex flex-wrap gap-1">
                    {template.recursos.avatar3D && (
                      <Badge variant="outline" className="text-xs bg-blue-50">
                        <Users className="h-3 w-3 mr-1" />
                        Avatar 3D
                      </Badge>
                    )}
                    {template.recursos.cenarios3D && (
                      <Badge variant="outline" className="text-xs bg-purple-50">
                        <Eye className="h-3 w-3 mr-1" />
                        Cenários 3D
                      </Badge>
                    )}
                    {template.recursos.quizInterativo && (
                      <Badge variant="outline" className="text-xs bg-green-50">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Quiz Interativo
                      </Badge>
                    )}
                    {template.recursos.certificado && (
                      <Badge variant="outline" className="text-xs bg-yellow-50">
                        <Shield className="h-3 w-3 mr-1" />
                        Certificado
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-2 pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => {
                      toast.success(`Preview de ${template.titulo} carregado`);
                      // Implementar preview do template
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                  <Button 
                    size="sm" 
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleGenerateFromTemplate(template);
                    }}
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <>
                        <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                        Gerando...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Usar Template
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Template Detalhado */}
      {selectedTemplate && (
        <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg bg-gradient-to-r ${getNRColor(selectedTemplate.nr)}`}>
                  {React.createElement(getNRIcon(selectedTemplate.nr), { className: 'h-6 w-6 text-white' })}
                </div>
                <div>
                  <div className="text-2xl font-bold">{selectedTemplate.titulo}</div>
                  <div className="text-gray-600">{selectedTemplate.subtitulo}</div>
                </div>
              </div>
              <Badge className="bg-orange-100 text-orange-800 text-xl px-4 py-2">
                {selectedTemplate.nr}
              </Badge>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Informações Gerais */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Informações Gerais</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Duração Total:</span>
                    <span className="font-medium">{selectedTemplate.duracao} minutos</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Módulos:</span>
                    <span className="font-medium">{selectedTemplate.modulos.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Exercícios:</span>
                    <span className="font-medium">
                      {selectedTemplate.modulos.reduce((acc, mod) => acc + mod.exercicios, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Compliance:</span>
                    <span className="font-bold text-green-600">{selectedTemplate.compliance}%</span>
                  </div>
                </CardContent>
              </Card>

              {/* Progresso do Compliance */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Conformidade Regulamentária</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Score Geral</span>
                      <span className="font-bold">{selectedTemplate.compliance}%</span>
                    </div>
                    <Progress value={selectedTemplate.compliance} className="h-3" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">100% Conforme MTE</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Certificação Válida</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Auditoria Aprovada</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recursos Técnicos */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Recursos Técnicos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(selectedTemplate.recursos).map(([recurso, ativo]) => (
                    <div key={recurso} className="flex items-center justify-between">
                      <span className="text-sm capitalize">{recurso.replace(/([A-Z])/g, ' $1')}</span>
                      <Badge className={ativo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
                        {ativo ? 'Incluído' : 'N/A'}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Módulos Detalhados */}
            <div>
              <h3 className="text-xl font-bold mb-4">Conteúdo Detalhado por Módulo</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedTemplate.modulos.map((modulo, index) => (
                  <Card key={modulo.id}>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center space-x-2">
                        <Badge className="bg-blue-100 text-blue-800">{index + 1}</Badge>
                        <span className="text-lg">{modulo.titulo}</span>
                      </CardTitle>
                      <CardDescription>{modulo.duracao} minutos • {modulo.exercicios} exercícios</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1">
                        {modulo.topicos.map((topico, i) => (
                          <li key={i} className="flex items-start space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{topico}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-center space-x-4 pt-6 border-t">
              <Button variant="outline" size="lg">
                <Eye className="h-5 w-5 mr-2" />
                Visualizar Preview
              </Button>
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-blue-600 to-purple-600 px-8"
                onClick={() => handleGenerateFromTemplate(selectedTemplate)}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin h-5 w-5 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                    Gerando Treinamento...
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5 mr-2" />
                    Gerar Treinamento Completo
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

