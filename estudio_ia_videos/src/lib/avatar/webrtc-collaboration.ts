import { z } from 'zod';

/**
 * WebRTC Real-time Avatar Collaboration System
 * Multi-user avatar streaming and interaction platform
 */

// Collaboration Session Schema
export const CollaborationSessionSchema = z.object({
  sessionId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  maxParticipants: z.number().min(2).max(50).default(10),
  isPrivate: z.boolean().default(false),
  password: z.string().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().optional(),
  settings: z.object({
    enableVideo: z.boolean().default(true),
    enableAudio: z.boolean().default(true),
    enableChat: z.boolean().default(true),
    enableScreenShare: z.boolean().default(false),
    enableAvatarControl: z.boolean().default(true),
    quality: z.enum(['low', 'medium', 'high', 'ultra']).default('high'),
    recordingEnabled: z.boolean().default(false),
  }),
});

export type CollaborationSession = z.infer<typeof CollaborationSessionSchema>;

// Participant Schema
export const ParticipantSchema = z.object({
  participantId: z.string(),
  userId: z.string(),
  username: z.string(),
  avatarId: z.string(),
  role: z.enum(['host', 'presenter', 'participant', 'observer']).default('participant'),
  joinedAt: z.string().datetime(),
  connectionStatus: z
    .enum(['connecting', 'connected', 'disconnected', 'reconnecting'])
    .default('connecting'),
  mediaStatus: z.object({
    videoEnabled: z.boolean().default(true),
    audioEnabled: z.boolean().default(true),
    screenSharing: z.boolean().default(false),
  }),
  avatarState: z.object({
    position: z.tuple([z.number(), z.number(), z.number()]),
    rotation: z.tuple([z.number(), z.number(), z.number()]),
    animation: z.string().default('idle'),
    facialExpression: z.string().default('neutral'),
    isSpeaking: z.boolean().default(false),
  }),
});

export type Participant = z.infer<typeof ParticipantSchema>;

// Stream Configuration Schema
export const StreamConfigSchema = z.object({
  video: z.object({
    width: z.number().min(320).max(3840).default(1920),
    height: z.number().min(240).max(2160).default(1080),
    frameRate: z.number().min(15).max(60).default(30),
    bitrate: z.number().min(100).max(10000).default(2000),
    codec: z.enum(['vp8', 'vp9', 'h264']).default('vp9'),
  }),
  audio: z.object({
    sampleRate: z.number().min(8000).max(48000).default(48000),
    channels: z.number().min(1).max(2).default(1),
    bitrate: z.number().min(32).max(320).default(128),
    codec: z.enum(['opus', 'aac']).default('opus'),
    echoCancellation: z.boolean().default(true),
    noiseSuppression: z.boolean().default(true),
  }),
  avatar: z.object({
    quality: z.enum(['low', 'medium', 'high', 'ultra']).default('high'),
    expressionSync: z.boolean().default(true),
    lipSync: z.boolean().default(true),
    gesturesEnabled: z.boolean().default(true),
  }),
});

export type StreamConfig = z.infer<typeof StreamConfigSchema>;

/**
 * WebRTC Avatar Collaboration Manager
 */
export class WebRTCCollaborationManager {
  private localStream?: MediaStream;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private participants: Map<string, Participant> = new Map();
  private session?: CollaborationSession;
  private signalingServer: WebSocket;
  private localParticipant?: Participant;
  private mediaConstraints: MediaStreamConstraints;
  private streamConfig: StreamConfig;

  constructor(streamConfig: StreamConfig) {
    this.streamConfig = StreamConfigSchema.parse(streamConfig);
    this.signalingServer = new WebSocket(
      process.env.WEBSOCKET_SIGNALING_URL || 'ws://localhost:8080',
    );
    this.mediaConstraints = this.buildMediaConstraints();

    this.setupSignalingHandlers();
  }

  /**
   * Create new collaboration session
   */
  async createSession(sessionConfig: CollaborationSession): Promise<string> {
    const validatedSession = CollaborationSessionSchema.parse(sessionConfig);

    try {
      // Get local media stream
      this.localStream = await navigator.mediaDevices.getUserMedia(this.mediaConstraints);

      // Create session via signaling server
      const response = await this.sendSignalingMessage('create_session', validatedSession);
      this.session = { ...validatedSession, sessionId: response.sessionId };

      // Create local participant
      this.localParticipant = await this.createLocalParticipant('host');

      // Start connection monitoring
      this.startConnectionMonitoring();

      return this.session.sessionId;
    } catch (error) {
      console.error('Failed to create session:', error);
      throw new Error(
        `Session creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Join existing collaboration session
   */
  async joinSession(sessionId: string, userId: string, avatarId: string): Promise<void> {
    try {
      // Get local media stream
      this.localStream = await navigator.mediaDevices.getUserMedia(this.mediaConstraints);

      // Join session via signaling server
      const response = await this.sendSignalingMessage('join_session', {
        sessionId,
        userId,
        avatarId,
      });

      this.session = response.session;
      this.localParticipant = await this.createLocalParticipant('participant');

      // Connect to existing participants
      await this.connectToExistingParticipants(response.participants);
    } catch (error) {
      console.error('Failed to join session:', error);
      throw new Error(
        `Failed to join session: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Leave collaboration session
   */
  async leaveSession(): Promise<void> {
    try {
      // Notify other participants
      await this.sendSignalingMessage('leave_session', {
        sessionId: this.session?.sessionId,
        participantId: this.localParticipant?.participantId,
      });

      // Close all peer connections
      this.peerConnections.forEach((connection) => connection.close());
      this.peerConnections.clear();

      // Stop local stream
      this.localStream?.getTracks().forEach((track) => track.stop());

      // Clear participants
      this.participants.clear();
    } catch (error) {
      console.error('Error leaving session:', error);
    }
  }

  /**
   * Start screen sharing
   */
  async startScreenShare(): Promise<void> {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { max: 1920 },
          height: { max: 1080 },
          frameRate: { max: 30 },
        },
        audio: true,
      });

      // Add screen share tracks to existing peer connections
      screenStream.getTracks().forEach((track) => {
        this.peerConnections.forEach((connection) => {
          const sender = connection.getSenders().find((s) => s.track?.kind === track.kind);
          if (sender) {
            sender.replaceTrack(track);
          } else {
            connection.addTrack(track, screenStream);
          }
        });
      });

      // Update local participant status
      if (this.localParticipant) {
        this.localParticipant.mediaStatus.screenSharing = true;
        this.updateParticipantStatus(this.localParticipant);
      }

      // Handle screen share end
      screenStream.getVideoTracks()[0].addEventListener('ended', () => {
        this.stopScreenShare();
      });
    } catch (error) {
      console.error('Failed to start screen share:', error);
      throw new Error(
        `Screen share failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Stop screen sharing
   */
  async stopScreenShare(): Promise<void> {
    try {
      // Replace screen share tracks with camera tracks
      this.localStream?.getTracks().forEach((track) => {
        this.peerConnections.forEach((connection) => {
          const sender = connection.getSenders().find((s) => s.track?.kind === track.kind);
          if (
            sender &&
            sender.track?.kind === 'video' &&
            this.localParticipant?.mediaStatus.screenSharing
          ) {
            sender.replaceTrack(track);
          }
        });
      });

      // Update local participant status
      if (this.localParticipant) {
        this.localParticipant.mediaStatus.screenSharing = false;
        this.updateParticipantStatus(this.localParticipant);
      }
    } catch (error) {
      console.error('Failed to stop screen share:', error);
    }
  }

  /**
   * Toggle audio mute/unmute
   */
  toggleAudio(): void {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;

        if (this.localParticipant) {
          this.localParticipant.mediaStatus.audioEnabled = audioTrack.enabled;
          this.updateParticipantStatus(this.localParticipant);
        }
      }
    }
  }

  /**
   * Toggle video on/off
   */
  toggleVideo(): void {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;

        if (this.localParticipant) {
          this.localParticipant.mediaStatus.videoEnabled = videoTrack.enabled;
          this.updateParticipantStatus(this.localParticipant);
        }
      }
    }
  }

  /**
   * Update avatar state
   */
  updateAvatarState(avatarState: Partial<Participant['avatarState']>): void {
    if (this.localParticipant) {
      this.localParticipant.avatarState = { ...this.localParticipant.avatarState, ...avatarState };

      // Broadcast avatar state to all participants
      this.sendSignalingMessage('avatar_state_update', {
        sessionId: this.session?.sessionId,
        participantId: this.localParticipant.participantId,
        avatarState: this.localParticipant.avatarState,
      });
    }
  }

  /**
   * Send message to chat
   */
  async sendChatMessage(message: string): Promise<void> {
    await this.sendSignalingMessage('chat_message', {
      sessionId: this.session?.sessionId,
      participantId: this.localParticipant?.participantId,
      message,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get list of participants
   */
  getParticipants(): Participant[] {
    return Array.from(this.participants.values());
  }

  /**
   * Get session information
   */
  getSession(): CollaborationSession | undefined {
    return this.session;
  }

  /**
   * Get local participant
   */
  getLocalParticipant(): Participant | undefined {
    return this.localParticipant;
  }

  /**
   * Private methods
   */

  private buildMediaConstraints(): MediaStreamConstraints {
    const constraints: MediaStreamConstraints = {
      video: {
        width: { ideal: this.streamConfig.video.width },
        height: { ideal: this.streamConfig.video.height },
        frameRate: { ideal: this.streamConfig.video.frameRate },
      },
      audio: {
        sampleRate: this.streamConfig.audio.sampleRate,
        channelCount: this.streamConfig.audio.channels,
        echoCancellation: this.streamConfig.audio.echoCancellation,
        noiseSuppression: this.streamConfig.audio.noiseSuppression,
      },
    };

    return constraints;
  }

  private async createLocalParticipant(role: Participant['role']): Promise<Participant> {
    const participant: Participant = {
      participantId: `participant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: 'local_user',
      username: 'Local User',
      avatarId: 'default_avatar',
      role,
      joinedAt: new Date().toISOString(),
      connectionStatus: 'connected',
      mediaStatus: {
        videoEnabled: true,
        audioEnabled: true,
        screenSharing: false,
      },
      avatarState: {
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        animation: 'idle',
        facialExpression: 'neutral',
        isSpeaking: false,
      },
    };

    this.participants.set(participant.participantId, participant);
    return participant;
  }

  private async connectToExistingParticipants(existingParticipants: Participant[]): Promise<void> {
    for (const participant of existingParticipants) {
      await this.createPeerConnection(participant.participantId);
      await this.offerConnection(participant.participantId);
    }
  }

  private async createPeerConnection(participantId: string): Promise<RTCPeerConnection> {
    const configuration: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        {
          urls: 'turn:turn.example.com:3478',
          username: 'turnuser',
          credential: 'turnpass',
        },
      ],
    };

    const peerConnection = new RTCPeerConnection(configuration);

    // Add local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, this.localStream!);
      });
    }

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignalingMessage('ice_candidate', {
          sessionId: this.session?.sessionId,
          toParticipantId: participantId,
          candidate: event.candidate,
        });
      }
    };

    // Handle incoming tracks
    peerConnection.ontrack = (event) => {
      // Handle remote media streams
      this.handleRemoteStream(participantId, event.streams[0]);
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      this.updateParticipantConnectionStatus(participantId, peerConnection.connectionState);
    };

    this.peerConnections.set(participantId, peerConnection);
    return peerConnection;
  }

  private async offerConnection(participantId: string): Promise<void> {
    const peerConnection = this.peerConnections.get(participantId);
    if (!peerConnection) return;

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    await this.sendSignalingMessage('offer', {
      sessionId: this.session?.sessionId,
      toParticipantId: participantId,
      offer,
    });
  }

  private async answerConnection(
    participantId: string,
    offer: RTCSessionDescriptionInit,
  ): Promise<void> {
    const peerConnection = await this.createPeerConnection(participantId);

    await peerConnection.setRemoteDescription(offer);
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    await this.sendSignalingMessage('answer', {
      sessionId: this.session?.sessionId,
      toParticipantId: participantId,
      answer,
    });
  }

  private async handleRemoteStream(participantId: string, stream: MediaStream): Promise<void> {
    const participant = this.participants.get(participantId);
    if (participant) {
      participant.connectionStatus = 'connected';
      // Trigger event for UI to handle remote stream
      this.onRemoteStreamReceived(participantId, stream, participant);
    }
  }

  private updateParticipantConnectionStatus(
    participantId: string,
    state: RTCPeerConnectionState,
  ): void {
    const participant = this.participants.get(participantId);
    if (participant) {
      const statusMap: Record<RTCPeerConnectionState, Participant['connectionStatus']> = {
        new: 'connecting',
        connecting: 'connecting',
        connected: 'connected',
        disconnected: 'disconnected',
        failed: 'disconnected',
        closed: 'disconnected',
      };

      participant.connectionStatus = statusMap[state] || 'disconnected';
      this.onParticipantStatusChanged(participant);
    }
  }

  private updateParticipantStatus(participant: Participant): void {
    this.sendSignalingMessage('participant_update', {
      sessionId: this.session?.sessionId,
      participant,
    });
    this.onParticipantStatusChanged(participant);
  }

  private setupSignalingHandlers(): void {
    this.signalingServer.onmessage = async (event) => {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case 'offer':
          await this.answerConnection(message.fromParticipantId, message.offer);
          break;

        case 'answer':
          const pc = this.peerConnections.get(message.fromParticipantId);
          if (pc) {
            await pc.setRemoteDescription(message.answer);
          }
          break;

        case 'ice_candidate':
          const peerConnection = this.peerConnections.get(message.fromParticipantId);
          if (peerConnection) {
            await peerConnection.addIceCandidate(message.candidate);
          }
          break;

        case 'participant_joined':
          const participant = ParticipantSchema.parse(message.participant);
          this.participants.set(participant.participantId, participant);
          await this.createPeerConnection(participant.participantId);
          await this.offerConnection(participant.participantId);
          this.onParticipantJoined(participant);
          break;

        case 'participant_left':
          this.participants.delete(message.participantId);
          const leavingConnection = this.peerConnections.get(message.participantId);
          if (leavingConnection) {
            leavingConnection.close();
            this.peerConnections.delete(message.participantId);
          }
          this.onParticipantLeft(message.participantId);
          break;

        case 'participant_update':
          const updatedParticipant = ParticipantSchema.parse(message.participant);
          this.participants.set(updatedParticipant.participantId, updatedParticipant);
          this.onParticipantStatusChanged(updatedParticipant);
          break;

        case 'avatar_state_update':
          const avatarParticipant = this.participants.get(message.participantId);
          if (avatarParticipant) {
            avatarParticipant.avatarState = message.avatarState;
            this.onAvatarStateChanged(message.participantId, message.avatarState);
          }
          break;

        case 'chat_message':
          this.onChatMessage(message.participantId, message.message, message.timestamp);
          break;
      }
    };
  }

  private async sendSignalingMessage(type: string, data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const message = { type, ...data };

      this.signalingServer.send(JSON.stringify(message));

      // Handle response for certain message types
      const handleMessage = (event: MessageEvent) => {
        const response = JSON.parse(event.data);
        if (response.type === type + '_response') {
          this.signalingServer.removeEventListener('message', handleMessage);
          resolve(response);
        }
      };

      this.signalingServer.addEventListener('message', handleMessage);

      // Timeout after 5 seconds
      setTimeout(() => {
        this.signalingServer.removeEventListener('message', handleMessage);
        reject(new Error('Signaling timeout'));
      }, 5000);
    });
  }

  private startConnectionMonitoring(): void {
    setInterval(() => {
      this.peerConnections.forEach((connection, participantId) => {
        if (
          connection.connectionState === 'disconnected' ||
          connection.connectionState === 'failed'
        ) {
          this.attemptReconnection(participantId);
        }
      });
    }, 5000); // Check every 5 seconds
  }

  private async attemptReconnection(participantId: string): Promise<void> {
    try {
      console.log(`Attempting to reconnect to participant ${participantId}`);

      // Close existing connection
      const oldConnection = this.peerConnections.get(participantId);
      if (oldConnection) {
        oldConnection.close();
      }

      // Create new connection and offer
      await this.createPeerConnection(participantId);
      await this.offerConnection(participantId);
    } catch (error) {
      console.error(`Reconnection failed for participant ${participantId}:`, error);
    }
  }

  // Event handlers (to be overridden by UI)
  protected onParticipantJoined(participant: Participant): void {
    console.log('Participant joined:', participant);
  }

  protected onParticipantLeft(participantId: string): void {
    console.log('Participant left:', participantId);
  }

  protected onParticipantStatusChanged(participant: Participant): void {
    console.log('Participant status changed:', participant);
  }

  protected onAvatarStateChanged(
    participantId: string,
    avatarState: Participant['avatarState'],
  ): void {
    console.log('Avatar state changed:', participantId, avatarState);
  }

  protected onRemoteStreamReceived(
    participantId: string,
    stream: MediaStream,
    participant: Participant,
  ): void {
    console.log('Remote stream received:', participantId);
  }

  protected onChatMessage(participantId: string, message: string, timestamp: string): void {
    console.log('Chat message:', participantId, message);
  }
}

/**
 * Factory function
 */
export function createWebRTCCollaboration(streamConfig: StreamConfig): WebRTCCollaborationManager {
  return new WebRTCCollaborationManager(streamConfig);
}

/**
 * Stream presets
 */
export const STREAM_PRESETS = {
  HIGH_QUALITY: {
    video: {
      width: 1920,
      height: 1080,
      frameRate: 60,
      bitrate: 4000,
      codec: 'vp9' as const,
    },
    audio: {
      sampleRate: 48000,
      channels: 2,
      bitrate: 192,
      codec: 'opus' as const,
      echoCancellation: true,
      noiseSuppression: true,
    },
    avatar: {
      quality: 'ultra' as const,
      expressionSync: true,
      lipSync: true,
      gesturesEnabled: true,
    },
  },

  STANDARD: {
    video: {
      width: 1280,
      height: 720,
      frameRate: 30,
      bitrate: 2000,
      codec: 'vp9' as const,
    },
    audio: {
      sampleRate: 48000,
      channels: 1,
      bitrate: 128,
      codec: 'opus' as const,
      echoCancellation: true,
      noiseSuppression: true,
    },
    avatar: {
      quality: 'high' as const,
      expressionSync: true,
      lipSync: true,
      gesturesEnabled: true,
    },
  },

  LOW_BANDWIDTH: {
    video: {
      width: 640,
      height: 480,
      frameRate: 15,
      bitrate: 500,
      codec: 'vp8' as const,
    },
    audio: {
      sampleRate: 16000,
      channels: 1,
      bitrate: 64,
      codec: 'opus' as const,
      echoCancellation: true,
      noiseSuppression: true,
    },
    avatar: {
      quality: 'medium' as const,
      expressionSync: false,
      lipSync: true,
      gesturesEnabled: false,
    },
  },
};
