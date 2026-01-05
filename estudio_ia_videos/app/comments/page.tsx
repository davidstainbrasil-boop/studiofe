'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
    MessageCircle,
    Send,
    Reply,
    ThumbsUp,
    MoreVertical,
    Trash2,
    Edit,
    Check,
    X,
    Video,
    Clock
} from 'lucide-react'
import { toast } from 'sonner'

interface Comment {
    id: string
    text: string
    author: string
    authorAvatar: string
    timestamp: Date
    projectName: string
    timecode?: string
    likes: number
    liked: boolean
    replies: Reply[]
}

interface Reply {
    id: string
    text: string
    author: string
    authorAvatar: string
    timestamp: Date
}

export default function CommentsPage() {
    const [comments, setComments] = useState<Comment[]>([
        {
            id: '1',
            text: 'Ficou incrível a transição aqui! Podemos usar essa mesma técnica no próximo vídeo.',
            author: 'Maria Santos',
            authorAvatar: 'MS',
            timestamp: new Date(Date.now() - 30 * 60000),
            projectName: 'Tutorial React Hooks',
            timecode: '02:34',
            likes: 3,
            liked: true,
            replies: [
                {
                    id: '1-1',
                    text: 'Concordo! Vou aplicar no próximo projeto.',
                    author: 'Pedro Oliveira',
                    authorAvatar: 'PO',
                    timestamp: new Date(Date.now() - 15 * 60000)
                }
            ]
        },
        {
            id: '2',
            text: 'O áudio está um pouco baixo nessa parte. Sugiro aumentar em 3dB.',
            author: 'João Silva',
            authorAvatar: 'JS',
            timestamp: new Date(Date.now() - 2 * 60 * 60000),
            projectName: 'Podcast Ep. 15',
            timecode: '15:22',
            likes: 1,
            liked: false,
            replies: []
        },
        {
            id: '3',
            text: 'Perfeito! Aprovado para publicação. 👏',
            author: 'Ana Costa',
            authorAvatar: 'AC',
            timestamp: new Date(Date.now() - 5 * 60 * 60000),
            projectName: 'Marketing Q4',
            likes: 5,
            liked: false,
            replies: []
        }
    ])

    const [newComment, setNewComment] = useState('')
    const [replyTo, setReplyTo] = useState<string | null>(null)
    const [replyText, setReplyText] = useState('')

    const formatTimestamp = (date: Date) => {
        const now = new Date()
        const diff = now.getTime() - date.getTime()
        const minutes = Math.floor(diff / 60000)
        const hours = Math.floor(minutes / 60)

        if (hours > 0) return `${hours}h atrás`
        if (minutes > 0) return `${minutes}min atrás`
        return 'Agora'
    }

    const handleLike = (id: string) => {
        setComments(prev => prev.map(c =>
            c.id === id ? { ...c, liked: !c.liked, likes: c.liked ? c.likes - 1 : c.likes + 1 } : c
        ))
    }

    const handleDelete = (id: string) => {
        setComments(prev => prev.filter(c => c.id !== id))
        toast.success('Comentário excluído')
    }

    const handleReply = (commentId: string) => {
        if (!replyText.trim()) return

        setComments(prev => prev.map(c => {
            if (c.id === commentId) {
                return {
                    ...c,
                    replies: [...c.replies, {
                        id: `${commentId}-${Date.now()}`,
                        text: replyText,
                        author: 'Você',
                        authorAvatar: 'VC',
                        timestamp: new Date()
                    }]
                }
            }
            return c
        }))

        setReplyText('')
        setReplyTo(null)
        toast.success('Resposta adicionada')
    }

    const handleAddComment = () => {
        if (!newComment.trim()) return

        const comment: Comment = {
            id: Date.now().toString(),
            text: newComment,
            author: 'Você',
            authorAvatar: 'VC',
            timestamp: new Date(),
            projectName: 'Projeto Atual',
            likes: 0,
            liked: false,
            replies: []
        }

        setComments(prev => [comment, ...prev])
        setNewComment('')
        toast.success('Comentário adicionado')
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-orange-50 p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-xl">
                            <MessageCircle className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                                Comentários
                            </h1>
                            <p className="text-gray-600">Feedback e discussões dos projetos</p>
                        </div>
                    </div>
                </div>

                {/* New Comment */}
                <Card className="mb-6">
                    <CardContent className="p-4">
                        <div className="flex gap-3">
                            <Avatar>
                                <AvatarFallback className="bg-gradient-to-r from-yellow-500 to-orange-600 text-white">
                                    VC
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <Textarea
                                    placeholder="Adicionar comentário..."
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    className="mb-2"
                                />
                                <Button
                                    onClick={handleAddComment}
                                    className="bg-gradient-to-r from-yellow-500 to-orange-600"
                                >
                                    <Send className="w-4 h-4 mr-2" />
                                    Comentar
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Comments List */}
                <Card>
                    <CardHeader>
                        <CardTitle>Todos os Comentários</CardTitle>
                        <CardDescription>{comments.length} comentários</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[600px]">
                            <div className="space-y-6">
                                {comments.map(comment => (
                                    <div key={comment.id} className="border-b pb-6 last:border-0">
                                        <div className="flex gap-3">
                                            <Avatar>
                                                <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm">
                                                    {comment.authorAvatar}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium">{comment.author}</span>
                                                        <span className="text-sm text-gray-500">
                                                            {formatTimestamp(comment.timestamp)}
                                                        </span>
                                                    </div>
                                                    <Button variant="ghost" size="sm" onClick={() => handleDelete(comment.id)}>
                                                        <Trash2 className="w-4 h-4 text-gray-400" />
                                                    </Button>
                                                </div>

                                                {/* Project & Timecode */}
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Badge variant="outline" className="text-xs">
                                                        <Video className="w-3 h-3 mr-1" />
                                                        {comment.projectName}
                                                    </Badge>
                                                    {comment.timecode && (
                                                        <Badge variant="outline" className="text-xs bg-blue-50">
                                                            <Clock className="w-3 h-3 mr-1" />
                                                            {comment.timecode}
                                                        </Badge>
                                                    )}
                                                </div>

                                                <p className="text-gray-700 mb-3">{comment.text}</p>

                                                {/* Actions */}
                                                <div className="flex items-center gap-4">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleLike(comment.id)}
                                                        className={comment.liked ? 'text-blue-600' : ''}
                                                    >
                                                        <ThumbsUp className={`w-4 h-4 mr-1 ${comment.liked ? 'fill-current' : ''}`} />
                                                        {comment.likes}
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                                                    >
                                                        <Reply className="w-4 h-4 mr-1" />
                                                        Responder
                                                    </Button>
                                                </div>

                                                {/* Reply Form */}
                                                {replyTo === comment.id && (
                                                    <div className="mt-3 flex gap-2">
                                                        <Input
                                                            placeholder="Escreva uma resposta..."
                                                            value={replyText}
                                                            onChange={(e) => setReplyText(e.target.value)}
                                                        />
                                                        <Button size="sm" onClick={() => handleReply(comment.id)}>
                                                            <Check className="w-4 h-4" />
                                                        </Button>
                                                        <Button size="sm" variant="outline" onClick={() => setReplyTo(null)}>
                                                            <X className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                )}

                                                {/* Replies */}
                                                {comment.replies.length > 0 && (
                                                    <div className="mt-4 ml-6 space-y-3">
                                                        {comment.replies.map(reply => (
                                                            <div key={reply.id} className="flex gap-3">
                                                                <Avatar className="w-8 h-8">
                                                                    <AvatarFallback className="bg-gray-200 text-gray-600 text-xs">
                                                                        {reply.authorAvatar}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-medium text-sm">{reply.author}</span>
                                                                        <span className="text-xs text-gray-500">
                                                                            {formatTimestamp(reply.timestamp)}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-sm text-gray-600">{reply.text}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
