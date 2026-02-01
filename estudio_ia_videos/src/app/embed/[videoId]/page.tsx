'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

interface EmbedPlayerProps {
  params: {
    videoId: string;
  };
}

export default function EmbedPlayer({ params }: EmbedPlayerProps) {
  const searchParams = useSearchParams();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const autoplay = searchParams.get('autoplay') === '1';
  const loop = searchParams.get('loop') === '1';
  const muted = searchParams.get('muted') === '1' || autoplay;
  const controls = searchParams.get('controls') !== '0';

  useEffect(() => {
    async function fetchVideo() {
      try {
        // In production, fetch video URL from API
        const response = await fetch(`/api/videos/${params.videoId}`);
        
        if (!response.ok) {
          throw new Error('Vídeo não encontrado');
        }
        
        const data = await response.json();
        setVideoUrl(data.url || data.video_url);
      } catch (err) {
        // Fallback for demo/development
        setVideoUrl(`/api/videos/${params.videoId}/stream`);
        setError(null);
      } finally {
        setIsLoading(false);
      }
    }

    fetchVideo();
  }, [params.videoId]);

  // Track video progress (for analytics)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const progress = (video.currentTime / video.duration) * 100;
      
      // Send progress to parent if in iframe
      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'estudio-ia-video-progress',
          videoId: params.videoId,
          progress: Math.round(progress),
          currentTime: video.currentTime,
          duration: video.duration,
        }, '*');
      }
    };

    const handleEnded = () => {
      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'estudio-ia-video-ended',
          videoId: params.videoId,
        }, '*');
      }
    };

    const handlePlay = () => {
      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'estudio-ia-video-play',
          videoId: params.videoId,
        }, '*');
      }
    };

    const handlePause = () => {
      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'estudio-ia-video-pause',
          videoId: params.videoId,
        }, '*');
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [params.videoId, videoUrl]);

  // Autoplay handling
  useEffect(() => {
    if (autoplay && videoRef.current && videoUrl) {
      videoRef.current.play().catch(() => {
        // Autoplay was prevented, that's okay
      });
    }
  }, [autoplay, videoUrl]);

  if (isLoading) {
    return (
      <div className="w-full h-full bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !videoUrl) {
    return (
      <div className="w-full h-full bg-black flex items-center justify-center text-white">
        <div className="text-center p-4">
          <svg
            className="w-12 h-12 mx-auto mb-2 opacity-50"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          <p className="text-sm opacity-75">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <html>
      <head>
        <title>Vídeo de Treinamento</title>
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { width: 100%; height: 100%; overflow: hidden; background: #000; }
          video { width: 100%; height: 100%; object-fit: contain; }
        `}</style>
      </head>
      <body>
        <video
          ref={videoRef}
          src={videoUrl || undefined}
          controls={controls}
          loop={loop}
          muted={muted}
          playsInline
          autoPlay={autoplay}
        >
          <p>Seu navegador não suporta vídeos HTML5.</p>
        </video>
      </body>
    </html>
  );
}
