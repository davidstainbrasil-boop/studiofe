import React from 'react'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AvatarQuality, QUALITY_TIERS } from '@/lib/avatar/quality-tier-system'
import { Clock, Zap, Coins } from 'lucide-react'

interface AvatarQualitySelectorProps {
    value: AvatarQuality
    onChange: (quality: AvatarQuality) => void
    userPlan?: string // 'free', 'basic', 'pro', 'enterprise'
    disabled?: boolean
}

export function AvatarQualitySelector({
    value,
    onChange,
    userPlan = 'free',
    disabled = false
}: AvatarQualitySelectorProps) {

    const selectedTier = QUALITY_TIERS[value]

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Qualidade do Avatar
                </label>
                {selectedTier && (
                    <Badge variant={selectedTier.costCredits > 0 ? "default" : "secondary"} className="ml-2">
                        {selectedTier.costCredits === 0 ? 'Grátis' : `${selectedTier.costCredits} Créditos`}
                    </Badge>
                )}
            </div>

            <Select
                value={value}
                onValueChange={(val) => onChange(val as AvatarQuality)}
                disabled={disabled}
            >
                <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione a qualidade" />
                </SelectTrigger>
                <SelectContent>
                    {Object.values(QUALITY_TIERS).map((tier) => {
                        const isLocked = !tier.requiredPlan.includes(userPlan)
                        return (
                            <SelectItem
                                key={tier.name}
                                value={tier.name}
                                disabled={isLocked}
                                className="flex flex-col items-start py-2"
                            >
                                <div className="flex items-center w-full justify-between gap-2">
                                    <span className="font-medium">{tier.displayName}</span>
                                    {isLocked && <Badge variant="outline" className="text-xs">Lock</Badge>}
                                </div>
                                <span className="text-xs text-muted-foreground line-clamp-1">
                                    {tier.name === AvatarQuality.PLACEHOLDER && "Instantâneo (Canvas 2D)"}
                                    {tier.name === AvatarQuality.STANDARD && "D-ID / HeyGen (Padrão)"}
                                    {tier.name === AvatarQuality.HIGH && "ReadyPlayerMe (3D)"}
                                    {tier.name === AvatarQuality.HYPERREAL && "Cinema Quality (Audio2Face)"}
                                </span>
                            </SelectItem>
                        )
                    })}
                </SelectContent>
            </Select>

            {selectedTier && (
                <Card className="bg-muted/50">
                    <CardContent className="p-3 space-y-2">
                        <div className="flex items-center text-xs text-muted-foreground gap-2">
                            <Clock className="w-3 h-3" />
                            <span>Tempo estimado: {selectedTier.estimatedTime < 60 ? `${selectedTier.estimatedTime}s` : `${Math.ceil(selectedTier.estimatedTime / 60)} min`}</span>
                        </div>
                        <div className="flex items-center text-xs text-muted-foreground gap-2">
                            <Coins className="w-3 h-3" />
                            <span>Custo: {selectedTier.costCredits} créditos</span>
                        </div>
                        <div className="flex items-center text-xs text-muted-foreground gap-2">
                            <Zap className="w-3 h-3" />
                            <span>Features: </span>
                            <div className="flex gap-1 flex-wrap">
                                {selectedTier.features.lipSync && <Badge variant="outline" className="h-4 text-[10px] px-1">LipSync</Badge>}
                                {selectedTier.features.facialExpressions && <Badge variant="outline" className="h-4 text-[10px] px-1">Expressões</Badge>}
                                {selectedTier.features.photoRealistic && <Badge variant="outline" className="h-4 text-[10px] px-1">Realista</Badge>}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
