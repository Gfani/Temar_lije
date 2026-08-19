import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createSocketAuthMiddleware } from '../../common/socket-auth';

/**
 * Socket.io gateway handling offline/LAN fallback, low-bandwidth audio streaming,
 * and real-time whiteboard vector stroke synchronization.
 */
@WebSocketGateway({
  namespace: 'live-class',
  cors: {
    origin: '*',
  },
})
export class LiveClassGateway {
  @WebSocketServer()
  server: Server;

  // In-memory buffer of vector strokes per classroom room to sync reconnected/new students
  private whiteboardHistory: Map<string, Array<any>> = new Map();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  afterInit(server: Server) {
    server.use(createSocketAuthMiddleware(this.jwtService, this.configService));
  }

  /**
   * Handles explicit socket room joining for classroom channels & syncs stroke history.
   */
  @SubscribeMessage('joinRoom')
  @SubscribeMessage('joinLiveClassRoom')
  handleJoinRoom(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    const classId = data?.classId || data?.roomId || data;
    if (classId && typeof classId === 'string') {
      client.join(classId);

      // Emit cached stroke vector history for this classroom to the joining student
      const history = this.whiteboardHistory.get(classId) || [];
      client.emit('syncWhiteboardHistory', { classId, strokes: history });

      return { status: 'joined', classId, strokeCount: history.length };
    }
  }

  /**
   * Receives vector stroke tuple/object and broadcasts 'receiveWhiteboardStroke'
   * to all other connected clients in the classroom room.
   */
  @SubscribeMessage('sendWhiteboardStroke')
  handleSendWhiteboardStroke(
    @MessageBody() data: any,
    @ConnectedSocket() client: Socket,
  ) {
    const { classId, stroke, x0, y0, x1, y1, color, lineWeight } = data || {};

    if (!classId) {
      throw new WsException(
        'classId is required to broadcast whiteboard stroke',
      );
    }

    const strokePayload = stroke || [
      x0 ?? data?.prevX,
      y0 ?? data?.prevY,
      x1 ?? data?.x,
      y1 ?? data?.y,
      color || '#3b82f6',
      lineWeight || data?.lineWeight || 3,
    ];

    // Buffer stroke vector in room history (capped at 2000 strokes to limit RAM usage)
    if (!this.whiteboardHistory.has(classId)) {
      this.whiteboardHistory.set(classId, []);
    }
    const history = this.whiteboardHistory.get(classId)!;
    history.push(strokePayload);
    if (history.length > 2000) {
      history.shift();
    }

    // Broadcast receiveWhiteboardStroke to all other clients in classId room
    client.to(classId).emit('receiveWhiteboardStroke', {
      classId,
      stroke: strokePayload,
      x0: strokePayload[0],
      y0: strokePayload[1],
      x1: strokePayload[2],
      y1: strokePayload[3],
      color: strokePayload[4],
      lineWeight: strokePayload[5],
    });
  }

  /**
   * Wipes whiteboard vector history for a classroom and notifies all participants.
   */
  @SubscribeMessage('clearWhiteboard')
  handleClearWhiteboard(
    @MessageBody() data: any,
    @ConnectedSocket() client: Socket,
  ) {
    const classId = data?.classId || data;
    if (classId) {
      this.whiteboardHistory.set(classId, []);
      client.to(classId).emit('receiveClearWhiteboard', { classId });
      this.server.to(classId).emit('receiveClearWhiteboard', { classId });
    }
  }

  /**
   * Relays real-time low-bandwidth PCM/Opus audio stream chunks from teacher to students.
   */
  @SubscribeMessage('streamAudioChunk')
  handleStreamAudioChunk(
    @MessageBody() data: any,
    @ConnectedSocket() client: Socket,
  ) {
    const { classId, audioChunk, senderId } = data || {};
    if (classId && audioChunk) {
      client.to(classId).emit('receiveAudioChunk', {
        classId,
        audioChunk,
        senderId: senderId || client.id,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Heartbeat ping handler to measure socket latency.
   */
  @SubscribeMessage('ping')
  handlePing() {
    return { status: 'pong', timestamp: Date.now() };
  }
}

