import React, { useEffect, useRef, useState, CSSProperties } from 'react';
import { cn } from '@lib/utils';
import Avatar3DRenderer from '../avatars/Avatar3DRenderer';

// Content types for different clip types
interface ClipContent {
  url?: string;
  src?: string;
  text?: string;
  avatarId?: string;
  audioUrl?: string;
  color?: string;
  thumbnail?: string;
  style?: CSSProperties;
  [key: string]: unknown;
}

interface TimelineClip {
  id: string;
  name: string;
  startTime: number;
  duration: number;
  content: ClipContent | string;
  effects?: string[];
  transition?: string;
}

interface TimelineTrack {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'text' | 'image' | 'shape' | 'avatar';
  color: string;
  visible: boolean;
  locked: boolean;
  clips: TimelineClip[];
}

interface UnifiedPreviewPlayerProps {
  currentTime: number;
  tracks: TimelineTrack[];
  isPlaying: boolean;
  className?: string;
}

// Helper to extract URL from content
function getContentUrl(content: ClipContent | string): string | undefined {
  if (typeof content === 'string') return content;
  return content?.url || content?.src || content?.audioUrl;
}

// Helper to extract object content
function getContentObject(content: ClipContent | string): ClipContent {
  if (typeof content === 'string') return { url: content };
  return content || {};
}

interface UnifiedPreviewPlayerProps {
  currentTime: number;
  tracks: TimelineTrack[];
  isPlaying: boolean;
  className?: string;
}

export function UnifiedPreviewPlayer({
  currentTime,
  tracks,
  isPlaying,
  className
}: UnifiedPreviewPlayerProps) {
  // Filter for active clips based on currentTime
  const getActiveClips = () => {
    const activeClips: { track: TimelineTrack; clip: TimelineClip }[] = [];
    
    // Sort tracks by some z-index logic if needed (usually bottom tracks are background, top are foreground)
    // Assuming tracks array order: 0 is bottom, length-1 is top
    tracks.forEach(track => {
      if (!track.visible) return;
      
      const clip = track.clips.find(
        c => currentTime >= c.startTime && currentTime < c.startTime + c.duration
      );
      
      if (clip) {
        activeClips.push({ track, clip });
      }
    });
    
    return activeClips;
  };

  const activeClips = getActiveClips();

  return (
    <div className={cn("relative w-full h-full bg-black overflow-hidden", className)}>
      {/* Base Layer / Background */}
      <div className="absolute inset-0 flex items-center justify-center text-gray-500 z-0">
        {activeClips.length === 0 && (
          <div className="text-center">
            <p>Sem conteúdo</p>
          </div>
        )}
      </div>

      {/* Render Active Clips */}
      {activeClips.map(({ track, clip }, index) => {
        const relativeTime = currentTime - clip.startTime;
        
        return (
          <div 
            key={`${track.id}-${clip.id}`}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ zIndex: index + 1 }}
          >
            <ClipRenderer 
              type={track.type} 
              content={clip.content} 
              time={relativeTime}
              isPlaying={isPlaying}
            />
          </div>
        );
      })}
      
      {/* Overlay Info (Optional) */}
      <div className="absolute bottom-4 right-4 z-50 text-white text-xs bg-black/50 px-2 py-1 rounded">
        {activeClips.length} camadas ativas
      </div>
    </div>
  );
}

interface ClipRendererProps {
  type: TimelineTrack['type'];
  content: ClipContent | string;
  time: number;
  isPlaying: boolean;
}

function ClipRenderer({ type, content, time, isPlaying }: ClipRendererProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  // Normalize content to object
  const contentObj = getContentObject(content);
  const url = getContentUrl(content);

  // Sync media time
  useEffect(() => {
    const mediaElement = videoRef.current || audioRef.current;
    if (mediaElement) {
      const diff = Math.abs(mediaElement.currentTime - time);
      if (diff > 0.5) {
        mediaElement.currentTime = time;
      }
      
      if (isPlaying && mediaElement.paused) {
        mediaElement.play().catch((error) => {
          // Audio/video play() pode falhar silenciosamente se bloqueado pelo browser
          // (ex: autoplay policy). Não é crítico, apenas log para debug.
          if (process.env.NODE_ENV === 'development') {
            console.debug('Media play() failed (likely autoplay policy)', { error });
          }
        });
      } else if (!isPlaying && !mediaElement.paused) {
        mediaElement.pause();
      }
    }
  }, [time, isPlaying]);

  const isVideoFile = (testUrl: string) => /\.(mp4|webm|mov)$/i.test(testUrl);
  const isAudioFile = (testUrl: string) => /\.(mp3|wav|ogg)$/i.test(testUrl);

  switch (type) {
    case 'video':
    case 'avatar':
      if (url && isVideoFile(url)) {
        return (
          <video
            ref={videoRef}
            src={url}
            className="w-full h-full object-contain"
            playsInline
            muted={type === 'avatar' ? false : true} // Avatar should speak
          />
        );
      }

      if (url && isAudioFile(url) && type === 'avatar') {
        return (
          <div className="relative w-full h-full flex items-center justify-center">
            <audio 
              ref={(el) => {
                if (audioRef.current !== el) {
                  (audioRef as React.MutableRefObject<HTMLAudioElement | null>).current = el;
                }
                if (el !== audioElement) {
                  setAudioElement(el);
                }
              }} 
              src={url} 
            />
             
             {/* Ritmo Continuo: Avatar 3D Hyper-Realista */}
             {audioElement && (
               <Avatar3DRenderer
                 avatarId={contentObj.avatarId || 'sarah_executive'}
                 text={contentObj.text || ''}
                 audioUrl={url}
                 autoPlay={false} // Controlado pelo audioRef via useLipSync
                 showControls={false}
                 externalAudio={audioElement}
                 className="w-full h-full"
               />
             )}
             
             {!audioElement && (
               <div className="animate-pulse flex flex-col items-center">
                 <span className="text-white text-sm">Carregando Avatar 3D...</span>
               </div>
             )}
          </div>
        );
      }
      
      // Fallback / Custom Render
      if (type === 'avatar') {
        return (
          <div className="relative w-full h-full flex items-center justify-center">
             <img 
               src={contentObj.thumbnail || "/avatars/avatar-placeholder.png"} 
               alt="Avatar"
               className="h-[80%] object-contain drop-shadow-xl"
             />
             <div className="absolute bottom-10 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
               Avatar Idle: {(time).toFixed(1)}s
             </div>
          </div>
        );
      }
      return <div className="text-white bg-blue-500/50 p-4">Vídeo sem fonte</div>;

    case 'image':
      return (
        <img 
          src={url || "/placeholder.png"} 
          alt="Clip" 
          className="w-full h-full object-contain"
        />
      );

    case 'text':
      return (
        <div className="text-white text-4xl font-bold drop-shadow-md" style={contentObj.style}>
          {contentObj.text || (typeof content === 'string' ? content : "Texto")}
        </div>
      );

    case 'shape':
      return (
        <div 
          className="bg-red-500" 
          style={{ 
            width: '100px', 
            height: '100px', 
            ...(contentObj.style || {})
          }} 
        />
      );

    default:
      return null;
  }
}
