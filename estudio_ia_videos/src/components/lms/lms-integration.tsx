

'use client'

import { useState, useEffect } from 'react'
import { logger } from '@lib/logger';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Progress } from '../ui/progress'
import { 
  BookOpen,
  Download,
  Upload,
  Settings,
  CheckCircle,
  AlertCircle,
  Package,
  Globe,
  BarChart3,
  Users,
  FileText,
  Zap
} from 'lucide-react'
import { SCORMEngine, SCORMPackage } from '../../lib/lms/scorm-engine'

interface LMSConfig {
  lms_type: 'moodle' | 'blackboard' | 'canvas' | 'brightspace' | 'generic'
  scorm_version: '1.2' | '2004'
  xapi_enabled: boolean
  endpoint_url?: string
  auth_token?: string
  completion_threshold: number
  mastery_score: number
  max_time_allowed?: number
  launch_data?: string
}

interface ExportProgress {
  step: string
  progress: number
  message: string
  completed: boolean
  error?: string
}

export default function LMSIntegration() {
  const [lmsConfig, setLMSConfig] = useState<LMSConfig>({
    lms_type: 'moodle',
    scorm_version: '2004',
    xapi_enabled: true,
    completion_threshold: 80,
    mastery_score: 70,
    max_time_allowed: 120
  })
  
  interface Project {
    id: string;
    title: string;
    description: string;
    duration_minutes: number;
    scenes: number;
    quiz_questions?: unknown[];
    completion_rate?: number;
    last_updated?: string;
  }
  
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null)
  const [scormPackage, setSCORMPackage] = useState<SCORMPackage | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    // Carregar projetos disponíveis
    loadAvailableProjects()
  }, [])

  const loadAvailableProjects = async () => {
    // Simular carregamento de projetos
    const mockProjects = [
      {
        id: 'nr12-safety',
        title: 'NR-12: Segurança em Máquinas',
        description: 'Treinamento completo sobre segurança em máquinas industriais',
        duration_minutes: 25,
        scenes: 8,
        quiz_questions: [
          {
            question: 'Qual é o principal objetivo da NR-12?',
            options: [
              'Aumentar produtividade',
              'Garantir segurança de máquinas',
              'Reduzir custos',
              'Melhorar ergonomia'
            ],
            correct_answer: 1
          }
        ],
        completion_rate: 87,
        last_updated: '2025-08-30'
      },
      {
        id: 'nr35-height',
        title: 'NR-35: Trabalho em Altura',
        description: 'Procedimentos de segurança para trabalho em altura',
        duration_minutes: 30,
        scenes: 10,
        quiz_questions: [
          {
            question: 'A partir de que altura é considerado trabalho em altura?',
            options: ['1,5m', '2m', '2,5m', '3m'],
            correct_answer: 1
          }
        ],
        completion_rate: 92,
        last_updated: '2025-08-29'
      }
    ]
    
    setProjects(mockProjects)
    if (mockProjects.length > 0) {
      setSelectedProject(mockProjects[0])
    }
  }

  const handleExportSCORM = async () => {
    if (!selectedProject) return

    setIsExporting(true)
    setExportProgress({ step: 'Iniciando', progress: 0, message: 'Preparando exportação...', completed: false })

    try {
      // Etapa 1: Validação
      setExportProgress({ step: 'Validação', progress: 20, message: 'Validando projeto...', completed: false })
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Etapa 2: Geração de conteúdo
      setExportProgress({ step: 'Conteúdo', progress: 40, message: 'Gerando conteúdo SCORM...', completed: false })
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Etapa 3: Criação do pacote
      setExportProgress({ step: 'Pacote', progress: 60, message: 'Criando pacote SCORM...', completed: false })
      
      const scormResult = await SCORMEngine.generateSCORMPackage(
        selectedProject as unknown as Record<string, unknown>,
        {
          version: lmsConfig.scorm_version,
          mastery_score: lmsConfig.mastery_score,
          max_time_allowed: lmsConfig.max_time_allowed
        }
      )

      setSCORMPackage(scormResult)

      // Etapa 4: Compressão
      setExportProgress({ step: 'Compressão', progress: 80, message: 'Comprimindo arquivos...', completed: false })
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Finalização
      setExportProgress({ step: 'Concluído', progress: 100, message: 'Pacote SCORM gerado com sucesso!', completed: true })

    } catch (error) {
      setExportProgress({ 
        step: 'Erro', 
        progress: 0, 
        message: 'Falha na exportação', 
        completed: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleDownloadSCORM = () => {
    if (!scormPackage || !selectedProject) return

    // Simular download
    const link = document.createElement('a')
    link.href = URL.createObjectURL(scormPackage.zip_blob)
    link.download = `${selectedProject.id}-scorm-${lmsConfig.scorm_version}.zip`
    link.click()
  }

  const handleTestXAPI = async () => {
    if (!selectedProject) return

    // Gerar statements xAPI de exemplo
    const statements = SCORMEngine.generatexAPIStatements(
      'user-demo-123',
      selectedProject as unknown as Record<string, unknown>,
      {
        start_time: new Date(Date.now() - 1800000).toISOString(), // 30 min ago
        end_time: new Date().toISOString(),
        interactions: [
          {
            scene_id: 'scene-1',
            action: 'started',
            timestamp: new Date(Date.now() - 1800000).toISOString()
          },
          {
            scene_id: 'scene-5',
            action: 'completed',
            timestamp: new Date(Date.now() - 300000).toISOString()
          }
        ],
        quiz_results: [
          {
            question_id: 'q1',
            answer: 'Garantir segurança de máquinas',
            correct: true,
            timestamp: new Date(Date.now() - 60000).toISOString()
          }
        ],
        completion_status: 'passed',
        score: 85
      }
    )

    logger.info('xAPI Statements gerados', { component: 'LMSIntegration', statements });
    alert(`${statements.length} statements xAPI gerados com sucesso!`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-blue-600" />
            LMS Enterprise Integration
          </h3>
          <p className="text-muted-foreground">
            Sistema completo de integração com Learning Management Systems
          </p>
        </div>
        <Badge variant="secondary" className="bg-green-100 text-green-700">
          SCORM 1.2 & 2004 + xAPI
        </Badge>
      </div>

      <Tabs defaultValue="config" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="config">Configuração</TabsTrigger>
          <TabsTrigger value="export">Exportar SCORM</TabsTrigger>
          <TabsTrigger value="xapi">xAPI Tracking</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Configuração LMS */}
        <TabsContent value="config" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configurações do LMS
              </CardTitle>
              <CardDescription>
                Configure as definições para integração com seu LMS
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Tipo de LMS */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo de LMS</label>
                  <Select
                    value={lmsConfig.lms_type}
                    onValueChange={(value) => setLMSConfig(prev => ({...prev, lms_type: value as LMSConfig['lms_type']}))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="moodle">🎓 Moodle</SelectItem>
                      <SelectItem value="blackboard">⚫ Blackboard</SelectItem>
                      <SelectItem value="canvas">🎨 Canvas</SelectItem>
                      <SelectItem value="brightspace">💡 Brightspace</SelectItem>
                      <SelectItem value="generic">🔧 Genérico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Versão SCORM */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Versão SCORM</label>
                  <Select
                    value={lmsConfig.scorm_version}
                    onValueChange={(value) => setLMSConfig(prev => ({...prev, scorm_version: value as LMSConfig['scorm_version']}))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1.2">SCORM 1.2 (Compatibilidade)</SelectItem>
                      <SelectItem value="2004">SCORM 2004 (Recomendado)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Limiar de Conclusão */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Limiar de Conclusão (%)</label>
                  <Input
                    type="number"
                    value={lmsConfig.completion_threshold}
                    onChange={(e) => setLMSConfig(prev => ({...prev, completion_threshold: parseInt(e.target.value)}))}
                    min="0"
                    max="100"
                  />
                </div>

                {/* Nota de Aprovação */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nota de Aprovação (%)</label>
                  <Input
                    type="number"
                    value={lmsConfig.mastery_score}
                    onChange={(e) => setLMSConfig(prev => ({...prev, mastery_score: parseInt(e.target.value)}))}
                    min="0"
                    max="100"
                  />
                </div>

                {/* Tempo Máximo */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tempo Máximo (minutos)</label>
                  <Input
                    type="number"
                    value={lmsConfig.max_time_allowed || ''}
                    onChange={(e) => setLMSConfig(prev => ({...prev, max_time_allowed: parseInt(e.target.value)}))}
                    placeholder="Ilimitado"
                  />
                </div>

                {/* xAPI Ativado */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">xAPI Tracking</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={lmsConfig.xapi_enabled}
                      onChange={(e) => setLMSConfig(prev => ({...prev, xapi_enabled: e.target.checked}))}
                      className="rounded"
                    />
                    <span className="text-sm">Ativar rastreamento xAPI</span>
                  </div>
                </div>
              </div>

              {/* URL do Endpoint (se xAPI ativado) */}
              {lmsConfig.xapi_enabled && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">xAPI Endpoint URL</label>
                  <Input
                    value={lmsConfig.endpoint_url || ''}
                    onChange={(e) => setLMSConfig(prev => ({...prev, endpoint_url: e.target.value}))}
                    placeholder="https://seu-lrs.com/xapi/"
                  />
                </div>
              )}

              {/* Dados de Inicialização */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Dados de Inicialização (Opcional)</label>
                <Textarea
                  value={lmsConfig.launch_data || ''}
                  onChange={(e) => setLMSConfig(prev => ({...prev, launch_data: e.target.value}))}
                  placeholder="Dados específicos do LMS..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Exportação SCORM */}
        <TabsContent value="export" className="space-y-6">
          
          {/* Seleção de Projeto */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Exportar para SCORM
              </CardTitle>
              <CardDescription>
                Selecione um projeto para exportar como pacote SCORM
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Projeto para Exportar</label>
                <Select 
                  value={selectedProject?.id || ''}
                  onValueChange={(value) => {
                    const project = projects.find(p => p.id === value)
                    setSelectedProject(project || null)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um projeto" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.title} ({project.duration_minutes}min)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Preview do Projeto */}
              {selectedProject && (
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Duração:</span>
                        <p>{selectedProject.duration_minutes} minutos</p>
                      </div>
                      <div>
                        <span className="font-medium">Cenas:</span>
                        <p>{selectedProject.scenes}</p>
                      </div>
                      <div>
                        <span className="font-medium">Questões:</span>
                        <p>{selectedProject.quiz_questions?.length || 0}</p>
                      </div>
                      <div>
                        <span className="font-medium">Taxa:</span>
                        <p>{selectedProject.completion_rate}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Botão de Exportação */}
              <div className="flex gap-2">
                <Button 
                  onClick={handleExportSCORM}
                  disabled={!selectedProject || isExporting}
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isExporting ? 'Exportando...' : 'Exportar SCORM'}
                </Button>
                
                {scormPackage && (
                  <Button 
                    onClick={handleDownloadSCORM}
                    variant="outline"
                  >
                    <Package className="h-4 w-4 mr-2" />
                    Download ZIP
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Progress da Exportação */}
          {exportProgress && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {exportProgress.completed ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : exportProgress.error ? (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  ) : (
                    <Zap className="h-5 w-5 text-blue-600 animate-pulse" />
                  )}
                  Progresso da Exportação
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{exportProgress.step}</span>
                    <span>{exportProgress.progress}%</span>
                  </div>
                  <Progress value={exportProgress.progress} />
                  <p className="text-sm text-muted-foreground">{exportProgress.message}</p>
                </div>
                
                {exportProgress.error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-700">{exportProgress.error}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* xAPI Tracking */}
        <TabsContent value="xapi" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                xAPI Experience Tracking
              </CardTitle>
              <CardDescription>
                Rastreamento avançado de experiência de aprendizagem
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Recursos xAPI</h4>
                  <div className="space-y-1 text-sm">
                    <p>✅ Actor identification</p>
                    <p>✅ Verb tracking (completed, experienced, answered)</p>
                    <p>✅ Object definition (courses, lessons, questions)</p>
                    <p>✅ Result scoring (raw, scaled, success)</p>
                    <p>✅ Context information (registration, platform)</p>
                    <p>✅ Statement extensions</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium">Eventos Rastreados</h4>
                  <div className="space-y-1 text-sm">
                    <p>▶️ Início do treinamento</p>
                    <p>⏸️ Pausas e retomadas</p>
                    <p>📝 Respostas de quiz</p>
                    <p>⏱️ Tempo gasto por cena</p>
                    <p>✅ Conclusão e resultados</p>
                    <p>🏆 Certificação</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <Button onClick={handleTestXAPI} variant="outline" className="w-full">
                  <Globe className="h-4 w-4 mr-2" />
                  Testar Geração de Statements xAPI
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Projetos Exportados</p>
                    <p className="text-2xl font-bold">24</p>
                  </div>
                  <Package className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Learners Ativos</p>
                    <p className="text-2xl font-bold">1,247</p>
                  </div>
                  <Users className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Taxa Conclusão</p>
                    <p className="text-2xl font-bold">89%</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Statements xAPI</p>
                    <p className="text-2xl font-bold">15.8K</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Relatórios LMS</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <h4 className="font-medium">Relatório de Engajamento</h4>
                    <p className="text-sm text-muted-foreground">Análise completa de participação dos usuários</p>
                  </div>
                  <Button size="sm" variant="outline">
                    <FileText className="h-4 w-4 mr-2" />
                    Gerar
                  </Button>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <h4 className="font-medium">Relatório de Performance</h4>
                    <p className="text-sm text-muted-foreground">Scores e tempo de conclusão por treinamento</p>
                  </div>
                  <Button size="sm" variant="outline">
                    <FileText className="h-4 w-4 mr-2" />
                    Gerar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

