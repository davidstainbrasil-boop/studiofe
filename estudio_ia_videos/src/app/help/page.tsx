'use client'

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card'
import { Button } from '@components/ui/button'
import { Badge } from '@components/ui/badge'
import { Input } from '@components/ui/input'
import { ScrollArea } from '@components/ui/scroll-area'
import { Skeleton } from '@components/ui/skeleton'
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
    Settings,
    RefreshCw,
    AlertCircle,
    Mic,
    User,
    Download,
    Presentation
} from 'lucide-react'
import Link from 'next/link'
import { useHelp } from '@hooks/use-help'

// Icon mapping for guides
const iconMap: Record<string, React.ReactNode> = {
    'lightbulb': <Lightbulb className="w-6 h-6 text-yellow-500" />,
    'video': <Video className="w-6 h-6 text-blue-500" />,
    'file-text': <FileText className="w-6 h-6 text-green-500" />,
    'settings': <Settings className="w-6 h-6 text-purple-500" />,
    'presentation': <Presentation className="w-6 h-6 text-orange-500" />,
    'mic': <Mic className="w-6 h-6 text-pink-500" />,
    'user': <User className="w-6 h-6 text-cyan-500" />,
    'download': <Download className="w-6 h-6 text-indigo-500" />,
    'book': <Book className="w-6 h-6 text-amber-500" />,
    'message-circle': <MessageCircle className="w-6 h-6 text-emerald-500" />,
    'mail': <Mail className="w-6 h-6 text-rose-500" />
}

function getGuideIcon(iconName: string): React.ReactNode {
    return iconMap[iconName] || <HelpCircle className="w-6 h-6 text-gray-500" />
}

export default function HelpCenterPage() {
    const [searchQuery, setSearchQuery] = useState('')
    const [expandedFaq, setExpandedFaq] = useState<number | null>(null)

    const { faqs, guides, contact, loading, error, refresh } = useHelp()

    // Filter FAQs by search query
    const filteredFaqs = useMemo(() => {
        if (!searchQuery) return faqs
        const query = searchQuery.toLowerCase()
        return faqs.filter(faq =>
            faq.question.toLowerCase().includes(query) ||
            faq.answer.toLowerCase().includes(query) ||
            faq.category.toLowerCase().includes(query)
        )
    }, [faqs, searchQuery])

    // Loading skeleton
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-12">
                        <Skeleton className="w-20 h-20 rounded-2xl mx-auto mb-4" />
                        <Skeleton className="h-12 w-64 mx-auto mb-4" />
                        <Skeleton className="h-6 w-48 mx-auto mb-8" />
                        <Skeleton className="h-14 w-full max-w-2xl mx-auto" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                        {[1, 2, 3].map(i => (
                            <Card key={i}>
                                <CardContent className="p-6 text-center">
                                    <Skeleton className="w-12 h-12 rounded-full mx-auto mb-4" />
                                    <Skeleton className="h-6 w-32 mx-auto mb-2" />
                                    <Skeleton className="h-4 w-40 mx-auto" />
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    // Error state
    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
                <div className="max-w-5xl mx-auto">
                    <Card className="border-red-200 bg-red-50">
                        <CardContent className="p-6 text-center">
                            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                            <h3 className="font-semibold text-red-700 mb-2">Erro ao carregar ajuda</h3>
                            <p className="text-red-600 mb-4">{error}</p>
                            <Button onClick={() => refresh()} variant="outline">
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Tentar novamente
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        )
    }

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
                    {contact.map((option) => (
                        <Card key={option.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                            <CardContent className="p-6 text-center">
                                <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center">
                                    {option.icon === 'message-circle' && <MessageCircle className="w-12 h-12 text-blue-500" />}
                                    {option.icon === 'mail' && <Mail className="w-12 h-12 text-purple-500" />}
                                    {option.icon === 'book' && <Book className="w-12 h-12 text-green-500" />}
                                </div>
                                <h3 className="font-semibold text-lg mb-2">{option.title}</h3>
                                <p className="text-sm text-gray-600 mb-4">{option.description}</p>
                                {option.icon === 'message-circle' && (
                                    <Badge className="bg-green-100 text-green-800">Online agora</Badge>
                                )}
                                {option.icon === 'mail' && (
                                    <Badge className="bg-blue-100 text-blue-800">Resposta em 24h</Badge>
                                )}
                                {option.icon === 'book' && (
                                    <Badge className="bg-purple-100 text-purple-800">{faqs.length}+ artigos</Badge>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Guides */}
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle>Guias Rápidos</CardTitle>
                        <CardDescription>Aprenda a usar cada funcionalidade</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {guides.map((guide) => (
                                <Link
                                    key={guide.id}
                                    href={guide.link}
                                    className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                                >
                                    <div className="p-3 bg-white rounded-lg shadow-sm">
                                        {getGuideIcon(guide.icon)}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-medium">{guide.title}</h4>
                                        <p className="text-sm text-gray-500">{guide.description}</p>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-gray-400" />
                                </Link>
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
                        {filteredFaqs.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <HelpCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>Nenhuma pergunta encontrada para "{searchQuery}"</p>
                                <Button 
                                    variant="link" 
                                    onClick={() => setSearchQuery('')}
                                    className="mt-2"
                                >
                                    Limpar busca
                                </Button>
                            </div>
                        ) : (
                            <ScrollArea className="h-[500px]">
                                <div className="space-y-4">
                                    {filteredFaqs.map((faq) => (
                                        <div
                                            key={faq.id}
                                            className="border rounded-lg overflow-hidden"
                                        >
                                            <button
                                                className="w-full p-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                                                onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Badge variant="outline">{faq.category}</Badge>
                                                    <span className="font-medium">{faq.question}</span>
                                                </div>
                                                <ChevronRight
                                                    className={`w-5 h-5 text-gray-400 transition-transform ${expandedFaq === faq.id ? 'rotate-90' : ''
                                                        }`}
                                                />
                                            </button>
                                            {expandedFaq === faq.id && (
                                                <div className="p-4 bg-gray-50 border-t">
                                                    <p className="text-gray-600">{faq.answer}</p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        )}
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
                            <Button variant="outline" asChild>
                                <Link href="/ai-assistant">
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    Assistente AI
                                </Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
