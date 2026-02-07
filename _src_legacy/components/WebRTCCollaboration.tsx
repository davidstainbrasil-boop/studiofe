'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface CollaborationState {
  isConnected: boolean;
  isHost: boolean;
  participants: Participant[];
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  messages: ChatMessage[];
  cursor: CursorPosition;
  screenShare: boolean;
}

interface Participant {
  id: string;
  name: string;
  isHost: boolean;
  isSpeaking: boolean;
  cursor?: CursorPosition;
}

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: Date;
}

interface CursorPosition {
  x: number;
  y: number;
  target?: string;
}

export default function WebRTCCollaboration({ projectId }: { projectId: string }) {
  const [state, setState] = useState<CollaborationState>({
    isConnected: false,
    isHost: false,
    participants: [],
    localStream: null,
    remoteStreams: new Map(),
    messages: [],
    cursor: { x: 0, y: 0 },
    screenShare: false,
  });

  const socketRef = useRef<Socket | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideosRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const localAudioRef = useRef<HTMLAudioElement>(null);

  // WebRTC configuration
  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
    ],
  };

  // Initialize Socket.IO connection
  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:3001', {
      transports: ['websocket'],
      upgrade: false,
    });

    socketRef.current = socket;

    // Socket event handlers
    socket.on('connect', () => {
      console.log('Connected to collaboration server');
      setState(prev => ({ ...prev, isConnected: true }));
      
      // Join project room
      socket.emit('join-project', { projectId });
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from collaboration server');
      setState(prev => ({ ...prev, isConnected: false }));
    });

    socket.on('project-joined', (data: { participants: Participant[], isHost: boolean }) => {
      setState(prev => ({
        ...prev,
        participants: data.participants,
        isHost: data.isHost,
      }));
    });

    socket.on('participant-joined', (participant: Participant) => {
      setState(prev => ({
        ...prev,
        participants: [...prev.participants, participant],
      }));
    });

    socket.on('participant-left', (participantId: string) => {
      setState(prev => ({
        ...prev,
        participants: prev.participants.filter(p => p.id !== participantId),
        remoteStreams: new Map([...prev.remoteStreams].filter(([id]) => id !== participantId)),
      }));

      // Clean up peer connection
      const pc = peerConnectionsRef.current.get(participantId);
      if (pc) {
        pc.close();
        peerConnectionsRef.current.delete(participantId);
      }
    });

    socket.on('chat-message', (message: ChatMessage) => {
      setState(prev => ({
        ...prev,
        messages: [...prev.messages, message],
      }));
    });

    socket.on('cursor-move', (data: { userId: string, cursor: CursorPosition }) => {
      setState(prev => ({
        ...prev,
        participants: prev.participants.map(p => 
          p.id === data.userId ? { ...p, cursor: data.cursor } : p
        ),
      }));
    });

    // WebRTC signaling
    socket.on('offer', async (data: { from: string, offer: RTCSessionDescriptionInit }) => {
      await handleOffer(data.from, data.offer);
    });

    socket.on('answer', async (data: { from: string, answer: RTCSessionDescriptionInit }) => {
      await handleAnswer(data.from, data.answer);
    });

    socket.on('ice-candidate', async (data: { from: string, candidate: RTCIceCandidateInit }) => {
      await handleIceCandidate(data.from, data.candidate);
    });

    socket.on('screen-share-started', (userId: string) => {
      console.log('Screen share started by:', userId);
    });

    socket.on('screen-share-stopped', (userId: string) => {
      console.log('Screen share stopped by:', userId);
    });

    return () => {
      socket.disconnect();
      // Clean up peer connections
      peerConnectionsRef.current.forEach(pc => pc.close());
    };
  }, [projectId]);

  // Initialize local media stream
  const initializeLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      setState(prev => ({ ...prev, localStream: stream }));

      // Attach to local video
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Create peer connections for existing participants
      state.participants.forEach(participant => {
        if (participant.id !== socketRef.current?.id) {
          createPeerConnection(participant.id);
        }
      });

    } catch (error) {
      console.error('Error accessing media devices:', error);
    }
  }, [state.participants]);

  // Create peer connection
  const createPeerConnection = useCallback(async (participantId: string) => {
    try {
      const pc = new RTCPeerConnection(rtcConfig);
      
      // Add local stream
      if (state.localStream) {
        state.localStream.getTracks().forEach(track => {
          pc.addTrack(track, state.localStream!);
        });
      }

      // Handle remote stream
      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        setState(prev => ({
          ...prev,
          remoteStreams: new Map(prev.remoteStreams.set(participantId, remoteStream)),
        }));

        // Attach to remote video
        const remoteVideo = remoteVideosRef.current.get(participantId);
        if (remoteVideo) {
          remoteVideo.srcObject = remoteStream;
        }
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          socketRef.current.emit('ice-candidate', {
            to: participantId,
            candidate: event.candidate,
          });
        }
      };

      // Handle connection state change
      pc.onconnectionstatechange = () => {
        console.log('Connection state:', pc.connectionState);
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          setState(prev => ({
            ...prev,
            remoteStreams: new Map([...prev.remoteStreams].filter(([id]) => id !== participantId)),
          }));
        }
      };

      peerConnectionsRef.current.set(participantId, pc);

      // Create and send offer if we're the host
      if (state.isHost) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        if (socketRef.current) {
          socketRef.current.emit('offer', {
            to: participantId,
            offer: offer,
          });
        }
      }

    } catch (error) {
      console.error('Error creating peer connection:', error);
    }
  }, [state.localStream, state.isHost]);

  // Handle WebRTC signaling
  const handleOffer = useCallback(async (from: string, offer: RTCSessionDescriptionInit) => {
    try {
      let pc = peerConnectionsRef.current.get(from);
      if (!pc) {
        await createPeerConnection(from);
        pc = peerConnectionsRef.current.get(from);
      }
      
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        if (socketRef.current) {
          socketRef.current.emit('answer', {
            to: from,
            answer: answer,
          });
        }
      }
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  }, []);

  const handleAnswer = useCallback(async (from: string, answer: RTCSessionDescriptionInit) => {
    try {
      const pc = peerConnectionsRef.current.get(from);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  }, []);

  const handleIceCandidate = useCallback(async (from: string, candidate: RTCIceCandidateInit) => {
    try {
      const pc = peerConnectionsRef.current.get(from);
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  }, []);

  // Send chat message
  const sendMessage = useCallback((message: string) => {
    if (socketRef.current) {
      const chatMessage: ChatMessage = {
        id: Date.now().toString(),
        userId: socketRef.current.id || 'unknown',
        userName: 'You', // TODO: Get actual user name
        message,
        timestamp: new Date(),
      };
      
      socketRef.current.emit('chat-message', chatMessage);
    }
  }, []);

  // Toggle screen share
  const toggleScreenShare = useCallback(async () => {
    try {
      if (state.screenShare) {
        // Stop screen share
        state.localStream?.getVideoTracks().forEach(track => {
          if (track.label.includes('screen')) {
            track.stop();
          }
        });
        
        setState(prev => ({ ...prev, screenShare: false }));
        
        if (socketRef.current) {
          socketRef.current.emit('screen-share-stopped');
        }
      } else {
        // Start screen share
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });

        // Replace video track with screen share
        const videoTrack = screenStream.getVideoTracks()[0];
        peerConnectionsRef.current.forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(videoTrack);
          }
        });

        setState(prev => ({ ...prev, screenShare: true }));
        
        if (socketRef.current) {
          socketRef.current.emit('screen-share-started');
        }

        // Handle screen share end
        videoTrack.onended = () => {
          toggleScreenShare();
        };
      }
    } catch (error) {
      console.error('Error toggling screen share:', error);
    }
  }, [state.screenShare, state.localStream]);

  // Handle cursor movement
  const handleCursorMove = useCallback((e: React.MouseEvent) => {
    const cursor = { x: e.clientX, y: e.clientY };
    setState(prev => ({ ...prev, cursor }));
    
    if (socketRef.current) {
      socketRef.current.emit('cursor-move', { cursor });
    }
  }, []);

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold">Collaboration Room</h3>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${state.isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm">{state.isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
          {state.isHost && (
            <span className="px-2 py-1 bg-blue-600 text-xs rounded">Host</span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm">{state.participants.length} participants</span>
          <button
            onClick={toggleScreenShare}
            className={`px-3 py-1 rounded text-sm ${
              state.screenShare 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {state.screenShare ? 'Stop Share' : 'Share Screen'}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Video Area */}
        <div className="flex-1 p-4">
          <div className="grid grid-cols-2 gap-4 h-full">
            {/* Local Video */}
            <div className="relative bg-gray-800 rounded-lg overflow-hidden">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-xs">
                You
              </div>
            </div>

            {/* Remote Videos */}
            {Array.from(state.remoteStreams.entries()).map(([participantId, stream]) => (
              <div key={participantId} className="relative bg-gray-800 rounded-lg overflow-hidden">
                <video
                  ref={(el) => {
                    if (el && !remoteVideosRef.current.has(participantId)) {
                      remoteVideosRef.current.set(participantId, el);
                      el.srcObject = stream;
                    }
                  }}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-xs">
                  {state.participants.find(p => p.id === participantId)?.name || 'Participant'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-80 border-l border-gray-700 flex flex-col">
          {/* Participants */}
          <div className="p-4 border-b border-gray-700">
            <h4 className="font-medium mb-2">Participants</h4>
            <div className="space-y-2">
              {state.participants.map(participant => (
                <div key={participant.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      participant.isSpeaking ? 'bg-green-500' : 'bg-gray-500'
                    }`} />
                    <span className="text-sm">{participant.name}</span>
                    {participant.isHost && (
                      <span className="px-1 py-0.5 bg-blue-600 text-xs rounded">H</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chat */}
          <div className="flex-1 flex flex-col p-4">
            <h4 className="font-medium mb-2">Chat</h4>
            <div className="flex-1 overflow-y-auto mb-2 space-y-2">
              {state.messages.map(message => (
                <div key={message.id} className="text-sm">
                  <span className="font-medium text-blue-400">{message.userName}: </span>
                  <span>{message.message}</span>
                </div>
              ))}
            </div>
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="Type a message..."
                className="flex-1 px-2 py-1 bg-gray-800 rounded text-sm"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    sendMessage(e.currentTarget.value);
                    e.currentTarget.value = '';
                  }
                }}
              />
              <button
                onClick={() => {
                  const input = document.querySelector('input[type="text"]') as HTMLInputElement;
                  if (input.value) {
                    sendMessage(input.value);
                    input.value = '';
                  }
                }}
                className="px-3 py-1 bg-blue-600 rounded text-sm hover:bg-blue-700"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Initialize Media Button */}
      {!state.localStream && (
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={initializeLocalStream}
            className="w-full px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
          >
            Initialize Camera & Microphone
          </button>
        </div>
      )}
    </div>
  );
}