/**
 * 🎬 UniversalSlide - High-Fidelity Remotion Component
 * 
 * Renders slides extracted from PPTX with exact positioning and styling.
 * This component takes UniversalSlideElement[] and renders them frame-by-frame.
 */

import React from 'react';
import { AbsoluteFill, Img, Sequence, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import type { UniversalSlide, UniversalSlideElement, TextParagraph } from '@/lib/pptx/parsers/element-parser';

interface UniversalSlideCompositionProps {
    slide: UniversalSlide;
    width?: number;
    height?: number;
}

/**
 * Main composition that renders all elements of a single slide
 */
export const UniversalSlideComposition: React.FC<UniversalSlideCompositionProps> = ({
    slide,
    width = 1920,
    height = 1080
}) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // Fade in effect (first 15 frames = 0.5s at 30fps)
    const fadeIn = interpolate(frame, [0, 15], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp'
    });

    const scaleX = width / 1920;
    const scaleY = height / 1080;

    return (
        <AbsoluteFill
            style={{
                backgroundColor: slide.background?.color || '#FFFFFF',
                opacity: fadeIn
            }}
        >
            {slide.elements.map((element) => (
                <ElementRenderer
                    key={element.id}
                    element={element}
                    scaleX={scaleX}
                    scaleY={scaleY}
                />
            ))}
        </AbsoluteFill>
    );
};

interface ElementRendererProps {
    element: UniversalSlideElement;
    scaleX: number;
    scaleY: number;
}

/**
 * Renders a single element based on its type, with PPTX animations applied
 */
const ElementRenderer: React.FC<ElementRendererProps> = ({ element, scaleX, scaleY }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // Apply scaling for different output resolutions
    const scaledLayout = {
        left: element.layout.x * scaleX,
        top: element.layout.y * scaleY,
        width: element.layout.width * scaleX,
        height: element.layout.height * scaleY,
        transform: element.layout.rotation ? `rotate(${element.layout.rotation}deg)` : undefined,
        zIndex: element.layout.zIndex
    };

    // Calculate animation values from element.animations
    let animOpacity = 1;
    let animTranslateX = 0;
    let animTranslateY = 0;
    let animScale = 1;

    if (element.animations && element.animations.length > 0) {
        const anim = element.animations[0]; // Use first animation for now
        const delayFrames = Math.round((anim.delay / 1000) * fps);
        const durationFrames = Math.round((anim.duration / 1000) * fps);
        const animFrame = frame - delayFrames;

        switch (anim.type) {
            case 'fade':
                animOpacity = interpolate(animFrame, [0, durationFrames], [0, 1], {
                    extrapolateLeft: 'clamp',
                    extrapolateRight: 'clamp'
                });
                break;
            case 'slide':
                animOpacity = interpolate(animFrame, [0, durationFrames / 2], [0, 1], {
                    extrapolateLeft: 'clamp',
                    extrapolateRight: 'clamp'
                });
                // Slide in from direction
                const slideDistance = 100;
                const direction = anim.direction || 'left';
                if (direction === 'left') {
                    animTranslateX = interpolate(animFrame, [0, durationFrames], [-slideDistance, 0], {
                        extrapolateLeft: 'clamp',
                        extrapolateRight: 'clamp'
                    });
                } else if (direction === 'right') {
                    animTranslateX = interpolate(animFrame, [0, durationFrames], [slideDistance, 0], {
                        extrapolateLeft: 'clamp',
                        extrapolateRight: 'clamp'
                    });
                } else if (direction === 'up') {
                    animTranslateY = interpolate(animFrame, [0, durationFrames], [-slideDistance, 0], {
                        extrapolateLeft: 'clamp',
                        extrapolateRight: 'clamp'
                    });
                } else if (direction === 'down') {
                    animTranslateY = interpolate(animFrame, [0, durationFrames], [slideDistance, 0], {
                        extrapolateLeft: 'clamp',
                        extrapolateRight: 'clamp'
                    });
                }
                break;
            case 'zoom':
                animOpacity = interpolate(animFrame, [0, durationFrames / 2], [0, 1], {
                    extrapolateLeft: 'clamp',
                    extrapolateRight: 'clamp'
                });
                animScale = interpolate(animFrame, [0, durationFrames], [0.5, 1], {
                    extrapolateLeft: 'clamp',
                    extrapolateRight: 'clamp'
                });
                break;
            case 'wipe':
                // Wipe uses clip-path, simplified to fade for now
                animOpacity = interpolate(animFrame, [0, durationFrames], [0, 1], {
                    extrapolateLeft: 'clamp',
                    extrapolateRight: 'clamp'
                });
                break;
        }
    } else {
        // Default stagger animation if no PPTX animation
        const entryDelay = element.layout.zIndex * 3;
        animOpacity = interpolate(frame - entryDelay, [0, 10], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp'
        });
    }

    const baseStyle: React.CSSProperties = {
        position: 'absolute',
        ...scaledLayout,
        opacity: animOpacity,
        transform: [
            scaledLayout.transform,
            animTranslateX !== 0 ? `translateX(${animTranslateX}px)` : '',
            animTranslateY !== 0 ? `translateY(${animTranslateY}px)` : '',
            animScale !== 1 ? `scale(${animScale})` : ''
        ].filter(Boolean).join(' ') || undefined
    };

    switch (element.type) {
        case 'text':
            return <TextElement element={element} style={baseStyle} />;
        case 'image':
            return <ImageElement element={element} style={baseStyle} />;
        case 'shape':
            return <ShapeElement element={element} style={baseStyle} />;
        default:
            return null;
    }
};

interface TextElementProps {
    element: UniversalSlideElement;
    style: React.CSSProperties;
}

/**
 * Renders text with full styling
 */
const TextElement: React.FC<TextElementProps> = ({ element, style }) => {
    const { textStyle, content, shapeStyle } = element;

    // If we have paragraphs with runs, render rich text
    if (content.paragraphs && content.paragraphs.length > 0) {
        return (
            <div
                style={{
                    ...style,
                    backgroundColor: shapeStyle?.backgroundColor,
                    borderColor: shapeStyle?.borderColor,
                    borderWidth: shapeStyle?.borderWidth,
                    borderStyle: shapeStyle?.borderWidth ? 'solid' : undefined,
                    borderRadius: shapeStyle?.borderRadius,
                    padding: '8px',
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-start'
                }}
            >
                {content.paragraphs.map((para, pIdx) => (
                    <ParagraphRenderer key={pIdx} paragraph={para} defaultStyle={textStyle} />
                ))}
            </div>
        );
    }

    // Simple text fallback
    return (
        <div
            style={{
                ...style,
                fontFamily: textStyle?.fontFamily || 'Arial',
                fontSize: textStyle?.fontSize || 18,
                fontWeight: textStyle?.fontWeight || 'normal',
                fontStyle: textStyle?.fontStyle || 'normal',
                color: textStyle?.color || '#000000',
                textAlign: textStyle?.textAlign || 'left',
                backgroundColor: shapeStyle?.backgroundColor,
                padding: '8px',
                boxSizing: 'border-box',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center'
            }}
        >
            {content.text}
        </div>
    );
};

interface ParagraphRendererProps {
    paragraph: TextParagraph;
    defaultStyle?: UniversalSlideElement['textStyle'];
}

/**
 * Renders a paragraph with multiple styled runs
 */
const ParagraphRenderer: React.FC<ParagraphRendererProps> = ({ paragraph, defaultStyle }) => {
    return (
        <p
            style={{
                margin: '0 0 0.5em 0',
                textAlign: paragraph.alignment || defaultStyle?.textAlign || 'left',
                lineHeight: 1.3
            }}
        >
            {paragraph.runs.map((run, rIdx) => (
                <span
                    key={rIdx}
                    style={{
                        fontFamily: run.style.fontFamily || defaultStyle?.fontFamily || 'Arial',
                        fontSize: run.style.fontSize || defaultStyle?.fontSize || 18,
                        fontWeight: run.style.fontWeight || defaultStyle?.fontWeight || 'normal',
                        fontStyle: run.style.fontStyle || defaultStyle?.fontStyle || 'normal',
                        textDecoration: run.style.textDecoration || defaultStyle?.textDecoration || 'none',
                        color: run.style.color || defaultStyle?.color || '#000000'
                    }}
                >
                    {run.text}
                </span>
            ))}
        </p>
    );
};

interface ImageElementProps {
    element: UniversalSlideElement;
    style: React.CSSProperties;
}

/**
 * Renders an image element
 */
const ImageElement: React.FC<ImageElementProps> = ({ element, style }) => {
    const { content } = element;

    if (!content.src) {
        // Placeholder for missing images
        return (
            <div
                style={{
                    ...style,
                    backgroundColor: '#E0E0E0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#666'
                }}
            >
                [Image]
            </div>
        );
    }

    return (
        <Img
            src={content.src}
            style={{
                ...style,
                objectFit: 'contain'
            }}
        />
    );
};

interface ShapeElementProps {
    element: UniversalSlideElement;
    style: React.CSSProperties;
}

/**
 * Renders a shape (rectangle, etc.)
 */
const ShapeElement: React.FC<ShapeElementProps> = ({ element, style }) => {
    const { shapeStyle } = element;

    return (
        <div
            style={{
                ...style,
                backgroundColor: shapeStyle?.backgroundColor || 'transparent',
                borderColor: shapeStyle?.borderColor,
                borderWidth: shapeStyle?.borderWidth || 0,
                borderStyle: shapeStyle?.borderWidth ? 'solid' : 'none',
                borderRadius: shapeStyle?.borderRadius || 0,
                opacity: shapeStyle?.opacity ?? 1
            }}
        />
    );
};

// ===== MULTI-SLIDE COMPOSITION =====

interface UniversalPresentationCompositionProps {
    slides: UniversalSlide[];
    fps?: number;
}

/**
 * Renders a full presentation as a sequence of slides
 */
export const UniversalPresentationComposition: React.FC<UniversalPresentationCompositionProps> = ({
    slides,
    fps = 30
}) => {
    let currentFrame = 0;

    return (
        <AbsoluteFill>
            {slides.map((slide, index) => {
                const durationInFrames = Math.round(slide.duration * fps);
                const from = currentFrame;
                currentFrame += durationInFrames;

                return (
                    <Sequence key={index} from={from} durationInFrames={durationInFrames}>
                        <UniversalSlideComposition slide={slide} />
                    </Sequence>
                );
            })}
        </AbsoluteFill>
    );
};

export default UniversalSlideComposition;
