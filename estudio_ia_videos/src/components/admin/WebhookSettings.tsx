"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Trash2, Plus, Play, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface Webhook {
    id: string
    url: string
    events: string[]
    active: boolean
    lastDeliveryAt?: string
    totalDeliveries: number
    failedDeliveries: number
}

// Mock data integration - in real app connect to internal-render-api or new webhook routes
// We will assume an API wrapper exists or we fetch from /api/webhooks (to be created)

export function WebhookSettings() {
    const [webhooks, setWebhooks] = useState<Webhook[]>([])
    const [loading, setLoading] = useState(false) // toggle to true when fetching
    const [isCreating, setIsCreating] = useState(false)

    // New Webhook State
    const [newUrl, setNewUrl] = useState('')
    const [selectedEvents, setSelectedEvents] = useState<string[]>(['render.completed', 'render.failed'])

    const availableEvents = [
        { id: 'render.completed', label: 'Render Completed' },
        { id: 'render.failed', label: 'Render Failed' },
        { id: 'render.started', label: 'Render Started' },
        { id: 'project.created', label: 'Project Created' }
    ]

    const { toast } = useToast()

    // NOTE: This component currently uses local state mock. 
    // In a full implementation, you would `useEffect` to fetch valid webhooks from `/api/webhooks`.

    const handleCreate = () => {
        if (!newUrl) return

        const newWebhook: Webhook = {
            id: crypto.randomUUID(),
            url: newUrl,
            events: selectedEvents,
            active: true,
            totalDeliveries: 0,
            failedDeliveries: 0
        }

        setWebhooks([newWebhook, ...webhooks])
        setNewUrl('')
        setIsCreating(false)
        toast({
            title: "Webhook Created",
            description: "Your webhook has been registered successfully."
        })
    }

    const handleDelete = (id: string) => {
        setWebhooks(webhooks.filter(w => w.id !== id))
        toast({
            title: "Webhook Deleted",
            variant: "destructive"
        })
    }

    const handleTest = async (id: string) => {
        toast({
            title: "Test Event Sent",
            description: "A test payload has been sent to the webhook URL."
        })
    }

    const toggleEvent = (eventId: string) => {
        if (selectedEvents.includes(eventId)) {
            setSelectedEvents(selectedEvents.filter(e => e !== eventId))
        } else {
            setSelectedEvents([...selectedEvents, eventId])
        }
    }

    return (
        <Card className="w-full">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Webhooks</CardTitle>
                        <CardDescription>
                            Receive real-time notifications for system events.
                        </CardDescription>
                    </div>
                    <Button onClick={() => setIsCreating(!isCreating)} variant={isCreating ? "secondary" : "default"}>
                        {isCreating ? 'Cancel' : <><Plus className="mr-2 h-4 w-4" /> Add Webhook</>}
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">

                {isCreating && (
                    <div className="border rounded-lg p-4 bg-slate-50 dark:bg-slate-900 space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="url">Endpoint URL</Label>
                            <Input
                                id="url"
                                placeholder="https://your-api.com/webhooks"
                                value={newUrl}
                                onChange={(e) => setNewUrl(e.target.value)}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label>Events to subscribe</Label>
                            <div className="flex flex-wrap gap-2">
                                {availableEvents.map(event => (
                                    <Badge
                                        key={event.id}
                                        variant={selectedEvents.includes(event.id) ? "default" : "outline"}
                                        className="cursor-pointer select-none"
                                        onClick={() => toggleEvent(event.id)}
                                    >
                                        {event.label}
                                    </Badge>
                                ))}
                            </div>
                        </div>

                        <Button onClick={handleCreate} disabled={!newUrl || selectedEvents.length === 0}>
                            Save Webhook
                        </Button>
                    </div>
                )}

                {webhooks.length === 0 && !isCreating ? (
                    <div className="text-center py-8 text-muted-foreground">
                        No webhooks configured. Click "Add Webhook" to get started.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {webhooks.map(webhook => (
                            <div key={webhook.id} className="flex flex-col md:flex-row md:items-center justify-between border p-4 rounded-lg gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-sm bg-muted px-2 py-1 rounded">{webhook.url}</span>
                                        <Badge variant={webhook.active ? "secondary" : "destructive"}>
                                            {webhook.active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </div>
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {webhook.events.map(e => (
                                            <span key={e} className="text-xs text-muted-foreground bg-slate-100 dark:bg-slate-800 px-1 rounded">
                                                {e}
                                            </span>
                                        ))}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        Deliveries: {webhook.totalDeliveries} | Failed: {webhook.failedDeliveries}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Button size="sm" variant="outline" onClick={() => handleTest(webhook.id)}>
                                        <Play className="h-3 w-3 mr-1" /> Test
                                    </Button>
                                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(webhook.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
