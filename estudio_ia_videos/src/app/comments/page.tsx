'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card'
import { Button } from '@components/ui/button'
import { Badge } from '@components/ui/badge'
import { Input } from '@components/ui/input'
import { Textarea } from '@components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@components/ui/avatar'
import { ScrollArea } from '@components/ui/scroll-area'
import { Skeleton } from '@components/ui/skeleton'
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
    Clock,
    RefreshCw,
    AlertCircle,
    Loader2
} from 'lucide-react'
import { toast } from 'sonner'
import { useAllComments, type DashboardComment, type CommentReply } from '@hooks/use-all-comments'

export default function CommentsPage() {
    const {
        comments,
        loading,
        error,
        actionLoading,
        addReply,
        deleteComment,
        toggleLike,
        refresh
    } = useAllComments()

    const [replyTo, setReplyTo] = useState<string | null>(null)
    const [replyText, setReplyText] = useState('')

    const formatTimestamp = (dateStr: string) => {
        const date = new Date(dateStr)
        const now = new Date()
        const diff = now.getTime() - date.getTime()
        const minutes = Math.floor(diff / 60000)
        const hours = Math.floor(minutes / 60)

        if (hours > 0) return `${hours}h atrás`
        if (minutes > 0) return `${minutes}min atrás`
        return 'Agora'
    }

    const handleLike = async (id: string) => {
        try {
            await toggleLike(id)
        } catch {
            toast.error('Erro ao curtir comentário')
        }
    }

    const handleDelete = async (id: string) => {
        try {
            await deleteComment(id)
            toast.success('Comentário excluído')
        } catch {
            toast.error('Erro ao excluir comentário')
        }
    }

    const handleReply = async (commentId: string) => {
        if (!replyText.trim()) return

        try {
            await addReply(commentId, replyText)
            setReplyText('')
            setReplyTo(null)
            toast.success('Resposta adicionada')
        } catch {
            toast.error('Erro ao adicionar resposta')
        }
    }

    // Loading skeleton
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-orange-50 p-6">
                <div className="max-w-4xl mx-auto">
                    <div className="mb-8">
                        <Skeleton className="h-12 w-64 mb-2" />
                        <Skeleton className="h-4 w-48" />
                    </div>
                    <Card className="mb-6">
                        <CardContent className="p-4">
                            <div className="space-y-4">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="flex gap-3">
                                        <Skeleton className="w-10 h-10 rounded-full" />
                                        <div className="flex-1 space-y-2">
                                            <Skeleton className="h-4 w-32" />
                                            <Skeleton className="h-16 w-full" />
                                            <Skeleton className="h-4 w-24" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        )
    }

    // Error state
    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-orange-50 p-6">
                <div className="max-w-4xl mx-auto">
                    <Card className="border-red-200 bg-red-50">
                        <CardContent className="p-6 text-center">
                            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                            <h3 className="font-semibold text-red-700 mb-2">Erro ao carregar comentários</h3>
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
        <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-orange-50 p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
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
                        <Button variant="outline" onClick={() => refresh()}>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Atualizar
                        </Button>
                    </div>
                </div>

                {/* Comments List */}
                <Card>
                    <CardHeader>
                        <CardTitle>Todos os Comentários</CardTitle>
                        <CardDescription>{comments.length} comentários</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {comments.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>Nenhum comentário encontrado</p>
                                <p className="text-sm">Comentários aparecerão aqui quando você ou sua equipe comentar em projetos</p>
                            </div>
                        ) : (
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
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm" 
                                                            onClick={() => handleDelete(comment.id)}
                                                            disabled={actionLoading === `delete-${comment.id}`}
                                                        >
                                                            {actionLoading === `delete-${comment.id}` ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                <Trash2 className="w-4 h-4 text-gray-400" />
                                                            )}
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
                                                            disabled={actionLoading === `like-${comment.id}`}
                                                        >
                                                            {actionLoading === `like-${comment.id}` ? (
                                                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                                            ) : (
                                                                <ThumbsUp className={`w-4 h-4 mr-1 ${comment.liked ? 'fill-current' : ''}`} />
                                                            )}
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
                                                            <Button 
                                                                size="sm" 
                                                                onClick={() => handleReply(comment.id)}
                                                                disabled={actionLoading === `reply-${comment.id}`}
                                                            >
                                                                {actionLoading === `reply-${comment.id}` ? (
                                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                                ) : (
                                                                    <Check className="w-4 h-4" />
                                                                )}
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
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
