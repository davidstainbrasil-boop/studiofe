import React from 'react';
import { Dialog, DialogContent, DialogTrigger } from '@components/ui/dialog';
import RealisticAvatarSystem from '@components/avatars/realistic/RealisticAvatarSystem';
import { Button } from '@components/ui/button'; // Assuming standard Shadcn button if needed inside, but mostly used by wrapping

interface AvatarConfiguratorModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    selectedAvatar: { id: string; name: string } | null;
    onGenerate: (config: any) => void;
}

export function AvatarConfiguratorModal({ isOpen, onOpenChange, selectedAvatar, onGenerate }: AvatarConfiguratorModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[90vw] w-[1200px] h-[85vh] p-0 bg-slate-950 border-slate-800 overflow-hidden flex flex-col">
                <div className="flex-1 min-h-0 relative">
                    {/* Render the System in Studio Mode */}
                    <RealisticAvatarSystem
                        isStudioMode={true}
                        initialAvatarId={selectedAvatar?.id}
                        initialAvatarName={selectedAvatar?.name}
                        onConfirm={(config) => {
                            onGenerate(config);
                            onOpenChange(false);
                        }}
                        onCancel={() => onOpenChange(false)}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
