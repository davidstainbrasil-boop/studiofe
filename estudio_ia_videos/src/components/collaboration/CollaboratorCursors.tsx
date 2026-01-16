
'use client';

import React from 'react';
import { useCollaboration } from './CollaborationProvider';
import { MousePointer2 } from 'lucide-react';

export function CollaboratorCursors() {
    const { remoteCursors, activeUsers } = useCollaboration();

    const getUserName = (userId: string) => {
        const user = activeUsers.find(u => u.userId === userId);
        return user?.userName || 'User';
    };

    const getUserColor = (userId: string) => {
        // Simple hash to color
        const colors = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];
        let hash = 0;
        for (let i = 0; i < userId.length; i++) hash = userId.charCodeAt(i) + ((hash << 5) - hash);
        return colors[Math.abs(hash) % colors.length];
    };

    return (
        <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
            {Object.entries(remoteCursors).map(([userId, cursor]) => {
                // Adjust coordinates if needed. Assuming position is % (0-1) or pixel relative to a container.
                // For simplicity, let's assume pixel values relative to the window/viewport passed in payload.
                // Ideally we should map coordinates to the canvas container.

                return (
                    <div
                        key={userId}
                        className="absolute transition-all duration-100 ease-out flex flex-col items-start"
                        style={{
                            left: cursor.position.x,
                            top: cursor.position.y,
                        }}
                    >
                        <MousePointer2
                            className="w-4 h-4"
                            style={{ color: getUserColor(userId), fill: getUserColor(userId) }}
                        />
                        <span
                            className="text-[10px] text-white px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap"
                            style={{ backgroundColor: getUserColor(userId) }}
                        >
                            {getUserName(userId)}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}
