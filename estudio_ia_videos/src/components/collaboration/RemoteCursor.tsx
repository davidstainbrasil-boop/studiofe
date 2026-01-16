/**
 * 🖱️ Remote Cursor Component
 * Renders cursor positions from other collaborators
 */

'use client';

import { useEffect, useState } from 'react';
import { Collaborator } from '@/hooks/use-collaborators';

interface RemoteCursorProps {
    collaborator: Collaborator;
    containerWidth: number;
    containerHeight: number;
}

export function RemoteCursor({ collaborator, containerWidth, containerHeight }: RemoteCursorProps) {
    const [visible, setVisible] = useState(true);
    const [position, setPosition] = useState({ x: 0, y: 0 });

    useEffect(() => {
        if (!collaborator.cursorPosition) {
            setVisible(false);
            return;
        }

        const { x, y } = collaborator.cursorPosition;

        // Hide if cursor is outside container
        if (x < 0 || y < 0) {
            setVisible(false);
            return;
        }

        // Convert relative position to absolute
        setPosition({
            x: x * containerWidth,
            y: y * containerHeight
        });
        setVisible(true);
    }, [collaborator.cursorPosition, containerWidth, containerHeight]);

    if (!visible || !collaborator.isOnline) {
        return null;
    }

    return (
        <div
            className="absolute pointer-events-none z-50 transition-all duration-75 ease-out"
            style={{
                left: position.x,
                top: position.y,
                transform: 'translate(-2px, -2px)'
            }}
        >
            {/* Cursor pointer */}
            <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                className="drop-shadow-md"
            >
                <path
                    d="M5.65376 3.01954C5.12213 2.77165 4.53158 3.26528 4.67662 3.83107L8.50463 19.1849C8.66967 19.8307 9.52147 19.9813 9.89646 19.4415L13.3612 14.4443C13.4994 14.246 13.7062 14.1025 13.9423 14.0407L20.0453 12.4456C20.6687 12.2829 20.8105 11.4605 20.2888 11.098L5.65376 3.01954Z"
                    fill={collaborator.color}
                    stroke="white"
                    strokeWidth="1.5"
                />
            </svg>

            {/* Name label */}
            <div
                className="absolute left-4 top-4 px-2 py-0.5 rounded text-xs font-medium text-white whitespace-nowrap shadow-md"
                style={{ backgroundColor: collaborator.color }}
            >
                {collaborator.name}
            </div>
        </div>
    );
}

interface RemoteCursorsContainerProps {
    collaborators: Collaborator[];
    containerRef: React.RefObject<HTMLElement>;
}

export function RemoteCursorsContainer({ collaborators, containerRef }: RemoteCursorsContainerProps) {
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.clientWidth,
                    height: containerRef.current.clientHeight
                });
            }
        };

        updateDimensions();
        window.addEventListener('resize', updateDimensions);

        // Use ResizeObserver for more accurate tracking
        const observer = new ResizeObserver(updateDimensions);
        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => {
            window.removeEventListener('resize', updateDimensions);
            observer.disconnect();
        };
    }, [containerRef]);

    return (
        <>
            {collaborators.map(collaborator => (
                <RemoteCursor
                    key={collaborator.id}
                    collaborator={collaborator}
                    containerWidth={dimensions.width}
                    containerHeight={dimensions.height}
                />
            ))}
        </>
    );
}
