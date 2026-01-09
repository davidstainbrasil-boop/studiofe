

/**
 * 🏗️ Casos Reais NR - Database de Acidentes e Boas Práticas
 * Sistema de Aprendizado Baseado em Casos Documentados
 */

'use client';

import React, { useState, useEffect } from 'react';
import { logger } from '@lib/logger';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { Alert, AlertDescription } from '@components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@components/ui/select';
import { toast } from 'react-hot-toast';
import {
  AlertCircle,
  CheckCircle,
  MapPin,
  Calendar,
  Users,
  FileText,
  TrendingDown,
  TrendingUp,
  Shield,
  Target,
  BookOpen,
  ExternalLink,
  Download,
  Star
} from 'lucide-react';

interface CasoReal {
  id: string;
  titulo: string;
  nr: string[];
  tipo: 'acidente' | 'boa_pratica' | 'near_miss' | 'auditoria';
  local: string;
  setor: string;
  data: string;
  gravidade: 'leve' | 'moderada' | 'grave' | 'fatal';
  descricao: string;
  causas: string[];
  consequencias: string[];
  medidasAdotadas: string[];
  licoesAprendidas: string[];
  prevencao: string[];
  fonteOficial: string;
  documentos: string[];
  impactoTreinamento: number;
}

export default function NRCasosReais() {
  const [casosReais, setCasosReais] = useState<CasoReal[]>([]);
  const [filtroNR, setFiltroNR] = useState('all');
  const [filtroTipo, setFiltroTipo] = useState('all');
  const [casoSelecionado, setCasoSelecionado] = useState<CasoReal | null>(null);

  useEffect(() => {
    loadCasosReais();
  }, [filtroNR, filtroTipo]);

  const loadCasosReais = async () => {
    try {
      const response = await fetch(`/api/v4/nr-casos-reais?nr=${filtroNR}&tipo=${filtroTipo}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCasosReais(data.casos);
        }
      }
    } catch (error) {
      logger.error('Erro ao carregar casos reais', error instanceof Error ? error : new Error(String(error)), { component: 'NRCasosReais' });
    }
  };

  // Dados mock para demonstração
  const mockCasos: CasoReal[] = [
    {
      id: 'caso-nr10-2023-sp',
      titulo: 'Acidente Elétrico em Subestação - São Paulo',
      nr: ['NR-10', 'NR-06'],
      tipo: 'acidente',
      local: 'Subestação Industrial - São Paulo/SP',
      setor: 'Industrial',
      data: '2023-04-15',
      gravidade: 'grave',
      descricao: 'Trabalhador sofreu queimaduras durante manutenção em equipamento energizado',
      causas: [
        'Não utilização de EPIs adequados',
        'Procedimento de segurança não seguido',
        'Ausência de supervisão qualificada',
        'Falha na sinalização de risco'
      ],
      consequencias: [
        'Queimaduras de 2º grau em 40% do corpo',
        'Afastamento por 90 dias',
        'Tratamento médico prolongado',
        'Impacto psicológico na equipe'
      ],
      medidasAdotadas: [
        'Reforço no treinamento NR-10',
        'Implementação de dupla verificação',
        'Melhoria na sinalização de segurança',
        'Supervisão 100% das atividades'
      ],
      licoesAprendidas: [
        'EPIs são obrigatórios sempre',
        'Procedimentos devem ser rigorosamente seguidos',
        'Supervisão qualificada é essencial',
        'Sinalização clara previne acidentes'
      ],
      prevencao: [
        'Treinamento contínuo e reciclagem',
        'Check-list pré-atividade obrigatório',
        'Inspeção diária de EPIs',
        'Cultura de segurança forte'
      ],
      fonteOficial: 'Relatório MTE - Inspeção 2023/04/20',
      documentos: ['relatorio_mte_sp_2023.pdf', 'fotos_local.zip'],
      impactoTreinamento: 95
    },
    {
      id: 'boa-pratica-nr35-2024',
      titulo: 'Implementação Exemplar NR-35 - Construtora ABC',
      nr: ['NR-35', 'NR-18'],
      tipo: 'boa_pratica',
      local: 'Obra Residencial - Rio de Janeiro/RJ',
      setor: 'Construção Civil',
      data: '2024-08-10',
      gravidade: 'leve',
      descricao: 'Construtora implementou sistema exemplar de segurança em altura',
      causas: [
        'Investimento em tecnologia',
        'Treinamento intensivo da equipe',
        'Cultura de segurança sólida',
        'Monitoramento constante'
      ],
      consequencias: [
        'Zero acidentes em 18 meses',
        'Redução de 80% em near miss',
        'Aumento da produtividade',
        'Reconhecimento do setor'
      ],
      medidasAdotadas: [
        'Sistema de linha de vida permanente',
        'Treinamento VR para todos',
        'App mobile para check-list',
        'Supervisão por drone'
      ],
      licoesAprendidas: [
        'Investimento em segurança compensa',
        'Tecnologia pode revolucionar segurança',
        'Cultura organizacional é fundamental',
        'Monitoramento previne acidentes'
      ],
      prevencao: [
        'Manter investimento em tecnologia',
        'Atualizar treinamentos regularmente',
        'Expandir boas práticas para outros projetos',
        'Compartilhar conhecimento no setor'
      ],
      fonteOficial: 'Estudo de Caso FUNDACENTRO 2024',
      documentos: ['estudo_caso_abc.pdf', 'sistema_seguranca.mp4'],
      impactoTreinamento: 98
    },
    {
      id: 'near-miss-nr12-2024',
      titulo: 'Quase Acidente - Prensa Hidráulica',
      nr: ['NR-12', 'NR-06'],
      tipo: 'near_miss',
      local: 'Metalúrgica XYZ - Minas Gerais/MG',
      setor: 'Metalúrgico',
      data: '2024-06-22',
      gravidade: 'moderada',
      descricao: 'Falha em sistema de segurança quase causou prensamento de mão',
      causas: [
        'Sensor de presença com defeito',
        'Manutenção preventiva atrasada',
        'Operador não percebeu falha',
        'Procedimento de teste não realizado'
      ],
      consequencias: [
        'Operação interrompida imediatamente',
        'Revisão de todos os equipamentos',
        'Reforço nos procedimentos',
        'Treinamento emergencial da equipe'
      ],
      medidasAdotadas: [
        'Substituição de todos os sensores',
        'Implementação de dupla verificação',
        'Cronograma rígido de manutenção',
        'Sistema de alerta visual e sonoro'
      ],
      licoesAprendidas: [
        'Manutenção preventiva salva vidas',
        'Sistemas redundantes são essenciais',
        'Operador treinado detecta anomalias',
        'Near miss deve ser sempre investigado'
      ],
      prevencao: [
        'Manutenção preditiva com IoT',
        'Treinamento em detecção de falhas',
        'Check-list pré-operacional obrigatório',
        'Cultura de reporte sem punição'
      ],
      fonteOficial: 'Relatório Interno - Análise de Near Miss',
      documentos: ['analise_near_miss.pdf', 'procedimento_revisado.doc'],
      impactoTreinamento: 92
    }
  ];

  const currentCasos = casosReais.length > 0 ? casosReais : mockCasos;

  const filteredCasos = currentCasos.filter(caso => {
    const nrMatch = filtroNR === 'all' || caso.nr.includes(filtroNR);
    const tipoMatch = filtroTipo === 'all' || caso.tipo === filtroTipo;
    return nrMatch && tipoMatch;
  });

  const getGravidadeColor = (gravidade: string) => {
    const colors = {
      leve: 'text-green-600',
      moderada: 'text-yellow-600',
      grave: 'text-orange-600',
      fatal: 'text-red-600'
    };
    return colors[gravidade as keyof typeof colors] || 'text-gray-600';
  };

  const getTipoIcon = (tipo: string) => {
    const icons = {
      acidente: AlertCircle,
      boa_pratica: CheckCircle,
      near_miss: Target,
      auditoria: FileText
    };
    const Icon = icons[tipo as keyof typeof icons] || FileText;
    return Icon;
  };

  const getTipoColor = (tipo: string) => {
    const colors = {
      acidente: 'bg-red-100 text-red-800',
      boa_pratica: 'bg-green-100 text-green-800',
      near_miss: 'bg-yellow-100 text-yellow-800',
      auditoria: 'bg-blue-100 text-blue-800'
    };
    return colors[tipo as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="text-center space-y-3">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
          📋 Base de Casos Reais NR
        </h2>
        <p className="text-gray-600">
          Aprenda com acidentes reais, boas práticas documentadas e near miss investigados
        </p>
      </div>

      {/* Filtros */}
      <div className="flex items-center space-x-4">
        <Select value={filtroNR} onValueChange={setFiltroNR}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por NR" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as NRs</SelectItem>
            <SelectItem value="NR-06">NR-06 - EPIs</SelectItem>
            <SelectItem value="NR-10">NR-10 - Eletricidade</SelectItem>
            <SelectItem value="NR-12">NR-12 - Máquinas</SelectItem>
            <SelectItem value="NR-35">NR-35 - Altura</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="acidente">Acidentes</SelectItem>
            <SelectItem value="boa_pratica">Boas Práticas</SelectItem>
            <SelectItem value="near_miss">Near Miss</SelectItem>
            <SelectItem value="auditoria">Auditorias</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex-1"></div>
        
        <Badge className="bg-blue-100 text-blue-800">
          {filteredCasos.length} casos encontrados
        </Badge>
      </div>

      {/* Lista de Casos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredCasos.map((caso) => {
          const TipoIcon = getTipoIcon(caso.tipo);
          
          return (
            <Card 
              key={caso.id} 
              className="hover:shadow-lg transition-all cursor-pointer group"
              onClick={() => setCasoSelecionado(caso)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <TipoIcon className={`h-5 w-5 ${getGravidadeColor(caso.gravidade)}`} />
                      <Badge className={getTipoColor(caso.tipo)}>
                        {caso.tipo.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <Badge variant="outline">
                        {caso.setor}
                      </Badge>
                    </div>
                    <CardTitle className="group-hover:text-blue-600 transition-colors">
                      {caso.titulo}
                    </CardTitle>
                    <CardDescription>
                      {caso.local} • {new Date(caso.data).toLocaleDateString('pt-BR')}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-blue-600">{caso.impactoTreinamento}%</div>
                    <div className="text-xs text-gray-500">Impacto</div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="text-sm text-gray-700">
                  {caso.descricao.substring(0, 120)}...
                </div>

                <div className="flex flex-wrap gap-2">
                  {caso.nr.map((nr) => (
                    <Badge key={nr} variant="secondary" className="text-xs">
                      {nr}
                    </Badge>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <div className="font-medium text-gray-600">Causas</div>
                    <div className="text-gray-500">{caso.causas.length} identificadas</div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-600">Lições</div>
                    <div className="text-gray-500">{caso.licoesAprendidas.length} aprendidas</div>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => toast.success('Abrindo conteúdo para estudo!')}
                  >
                    <BookOpen className="h-3 w-3 mr-1" />
                    Estudar
                  </Button>
                  <Button 
                    size="sm" 
                    className="flex-1 bg-gradient-to-r from-orange-500 to-red-500"
                    onClick={() => toast.success('Adicionando caso ao projeto de vídeo!')}
                  >
                    <Star className="h-3 w-3 mr-1" />
                    Usar em Vídeo
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detalhes do Caso Selecionado */}
      {casoSelecionado && (
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Caso Selecionado: {casoSelecionado.titulo}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Informações Gerais</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <span>{casoSelecionado.local}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span>{new Date(casoSelecionado.data).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Shield className="h-4 w-4 text-gray-500" />
                      <span>Fonte: {casoSelecionado.fonteOficial}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Causas Identificadas</h4>
                  <div className="space-y-1">
                    {casoSelecionado.causas.map((causa, index) => (
                      <div key={index} className="flex items-start space-x-2 text-sm">
                        <div className="w-4 h-4 bg-red-100 text-red-600 rounded text-xs flex items-center justify-center mt-0.5">
                          {index + 1}
                        </div>
                        <span>{causa}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Medidas Adotadas</h4>
                  <div className="space-y-1">
                    {casoSelecionado.medidasAdotadas.map((medida, index) => (
                      <div key={index} className="flex items-start space-x-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                        <span>{medida}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Lições Aprendidas</h4>
                  <div className="space-y-2">
                    {casoSelecionado.licoesAprendidas.map((licao, index) => (
                      <Alert key={index} className="border-blue-200 bg-blue-50">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-sm">
                          {licao}
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Como Prevenir</h4>
                  <div className="space-y-1">
                    {casoSelecionado.prevencao.map((prevencao, index) => (
                      <div key={index} className="flex items-start space-x-2 text-sm">
                        <Target className="h-4 w-4 text-blue-600 mt-0.5" />
                        <span>{prevencao}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Documentos Oficiais</h4>
                  <div className="space-y-2">
                    {casoSelecionado.documentos.map((doc) => (
                      <Button 
                        key={doc} 
                        size="sm" 
                        variant="outline" 
                        className="w-full justify-start"
                        onClick={() => toast.success(`Baixando: ${doc}`)}
                      >
                        <Download className="h-3 w-3 mr-2" />
                        {doc}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Caso validado por especialistas em segurança do trabalho
                </div>
                <Button 
                  className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
                  onClick={() => toast.success('Caso incluído no treinamento!')}
                >
                  <Star className="h-4 w-4 mr-2" />
                  Incluir em Treinamento
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estatísticas da Base */}
      <Card>
        <CardHeader>
          <CardTitle>Estatísticas da Base de Casos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">247</div>
              <div className="text-sm text-gray-600">Casos Documentados</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">89</div>
              <div className="text-sm text-gray-600">Boas Práticas</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">156</div>
              <div className="text-sm text-gray-600">Near Miss</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">12</div>
              <div className="text-sm text-gray-600">Acidentes Graves</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

