'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
    HelpCircle,
    Search,
    Book,
    Video,
    MessageCircle,
    Mail,
    ExternalLink,
    ChevronRight,
    Lightbulb,
    Zap,
    FileText,
    Settings
} from 'lucide-react'

interface FAQ {
    question: string
    answer: string
    category: string
}

interface Guide {
    title: string
    description: string
    icon: React.ReactNode
    link: string
}

export default function HelpCenterPage() {
    const [searchQuery, setSearchQuery] = useState('')
    const [expandedFaq, setExpandedFaq] = useState<number | null>(null)

    const faqs: FAQ[] = [
        {
            question: 'Como gerar legendas automáticas?',
            answer: 'Acesse a página Auto-Subtitles, faça upload do seu vídeo e clique em "Gerar Legendas". O sistema usará IA (Whisper) para transcrever automaticamente.',
            category: 'Legendas'
        },
        {
            question: 'Qual o limite de tamanho para upload de vídeos?',
            answer: 'Para processamento direto, o limite é 25MB. Para vídeos maiores, use o processamento em lote que suporta até 500MB.',
            category: 'Upload'
        },
        {
            question: 'Como funciona a clonagem de voz?',
            answer: 'Você precisa de pelo menos 30 segundos de áudio limpo. Faça upload na página Voice Cloning e o sistema criará um modelo de voz personalizado.',
            category: 'Voz'
        },
        {
            question: 'Posso processar vários vídeos ao mesmo tempo?',
            answer: 'Sim! Use a funcionalidade de Batch Processing para processar múltiplos vídeos simultaneamente com drag and drop.',
            category: 'Processamento'
        },
        {
            question: 'Como exportar vídeos em 4K?',
            answer: 'Na página Video Enhancement, selecione a opção de upscaling e escolha 2160p (4K). O sistema usará IA para escalar seu vídeo.',
            category: 'Export'
        },
        {
            question: 'Meus dados estão seguros?',
            answer: 'Sim! Usamos criptografia SSL/TLS, armazenamento seguro na AWS/Cloudflare, e seguimos as melhores práticas de segurança.',
            category: 'Segurança'
        }
    ]

    const guides: Guide[] = [
        {
            title: 'Primeiros Passos',
            description: 'Aprenda o básico da plataforma',
            icon: <Lightbulb className="w-6 h-6 text-yellow-500" />,
            link: '/docs/getting-started'
        },
        {
            title: 'Tutoriais em Vídeo',
            description: 'Assista demonstrações práticas',
            icon: <Video className="w-6 h-6 text-blue-500" />,
            link: '/docs/tutorials'
        },
        {
            title: 'Documentação da API',
            description: 'Referência técnica completa',
            icon: <FileText className="w-6 h-6 text-green-500" />,
            link: '/docs/api'
        },
        {
            title: 'Guia de Configuração',
            description: 'Configure a plataforma',
            icon: <Settings className="w-6 h-6 text-purple-500" />,
            link: '/docs/configuration'
        }
    ]

    const filteredFaqs = faqs.filter(faq =>
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="inline-flex p-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl mb-4">
                        <HelpCircle className="w-12 h-12 text-white" />
                    </div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
                        Central de Ajuda
                    </h1>
                    <p className="text-gray-600 text-lg mb-8">
                        Como podemos ajudar você hoje?
                    </p>

                    {/* Search */}
                    <div className="relative max-w-2xl mx-auto">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                            placeholder="Buscar por ajuda..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-12 py-6 text-lg"
                        />
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                        <CardContent className="p-6 text-center">
                            <MessageCircle className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                            <h3 className="font-semibold text-lg mb-2">Chat ao Vivo</h3>
                            <p className="text-sm text-gray-600 mb-4">Fale com nosso suporte</p>
                            <Badge className="bg-green-100 text-green-800">Online agora</Badge>
                        </CardContent>
                    </Card>

                    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                        <CardContent className="p-6 text-center">
                            <Mail className="w-12 h-12 text-purple-500 mx-auto mb-4" />
                            <h3 className="font-semibold text-lg mb-2">Email</h3>
                            <p className="text-sm text-gray-600 mb-4">suporte@mvpvideo.com</p>
                            <Badge className="bg-blue-100 text-blue-800">Resposta em 24h</Badge>
                        </CardContent>
                    </Card>

                    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                        <CardContent className="p-6 text-center">
                            <Book className="w-12 h-12 text-green-500 mx-auto mb-4" />
                            <h3 className="font-semibold text-lg mb-2">Documentação</h3>
                            <p className="text-sm text-gray-600 mb-4">Guias e tutoriais</p>
                            <Badge className="bg-purple-100 text-purple-800">100+ artigos</Badge>
                        </CardContent>
                    </Card>
                </div>

                {/* Guides */}
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle>Guias Rápidos</CardTitle>
                        <CardDescription>Aprenda a usar cada funcionalidade</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {guides.map((guide, index) => (
                                <div
                                    key={index}
                                    className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                                >
                                    <div className="p-3 bg-white rounded-lg shadow-sm">
                                        {guide.icon}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-medium">{guide.title}</h4>
                                        <p className="text-sm text-gray-500">{guide.description}</p>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-gray-400" />
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* FAQs */}
                <Card>
                    <CardHeader>
                        <CardTitle>Perguntas Frequentes</CardTitle>
                        <CardDescription>
                            {filteredFaqs.length} perguntas encontradas
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[500px]">
                            <div className="space-y-4">
                                {filteredFaqs.map((faq, index) => (
                                    <div
                                        key={index}
                                        className="border rounded-lg overflow-hidden"
                                    >
                                        <button
                                            className="w-full p-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                                            onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <Badge variant="outline">{faq.category}</Badge>
                                                <span className="font-medium">{faq.question}</span>
                                            </div>
                                            <ChevronRight
                                                className={`w-5 h-5 text-gray-400 transition-transform ${expandedFaq === index ? 'rotate-90' : ''
                                                    }`}
                                            />
                                        </button>
                                        {expandedFaq === index && (
                                            <div className="p-4 bg-gray-50 border-t">
                                                <p className="text-gray-600">{faq.answer}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>

                {/* Still need help */}
                <Card className="mt-8 border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50">
                    <CardContent className="p-8 text-center">
                        <Zap className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                        <h3 className="text-xl font-bold mb-2">Precisa de mais ajuda?</h3>
                        <p className="text-gray-600 mb-6">
                            Nossa equipe está pronta para ajudar você a alcançar seus objetivos
                        </p>
                        <div className="flex gap-4 justify-center">
                            <Button className="bg-gradient-to-r from-blue-500 to-purple-600">
                                <MessageCircle className="w-4 h-4 mr-2" />
                                Iniciar Chat
                            </Button>
                            <Button variant="outline">
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Agendar Demo
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
