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
import { AttendanceService } from './attendance.service';
import { createSocketAuthMiddleware } from '../../common/socket-auth';

/**
 * Socket.io gateway under 'live-class' namespace handling real-time attendance check-in.
 */
@WebSocketGateway({
  namespace: 'live-class',
  cors: {
    origin: '*',
  },
})
export class AttendanceGateway {
  @WebSocketServer()
  server: any;

  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  afterInit(server: Server) {
    server.use(createSocketAuthMiddleware(this.jwtService, this.configService));
  }

  /**
   * Listens for 'joinLiveSession' event, extracts client IP, joins room, records check-in,
   * and emits 'attendanceUpdated' event to the classroom room.
   *
   * @param {Object} data - Payload containing { classId }.
   * @param {Object} client - Socket connection object.
   */
  @SubscribeMessage('joinLiveSession')
  async handleJoinLiveSession(@MessageBody() data, @ConnectedSocket() client: Socket) {
    try {
      const { classId } = data || {};
      const userId = (client.data as any).user?.sub;

      if (!classId || !userId) {
        throw new WsException('classId is required and authentication is required');
      }

      // Extract client IP address from socket connection headers or handshake address
      const xForwardedFor = client.handshake?.headers?.['x-forwarded-for'];
      const rawIp = xForwardedFor
        ? (Array.isArray(xForwardedFor)
            ? xForwardedFor[0]
            : xForwardedFor.split(',')[0]
          ).trim()
        : client.handshake?.address || client.conn?.remoteAddress || '';

      // Join the socket room for this class
      client.join(classId);

      // Record student check-in with the authenticated user's identity
      const record = await this.attendanceService.recordCheckIn(
        classId,
        userId,
        rawIp,
      );

      // Broadcast updated attendance record to all sockets in the classroom room
      this.server.to(classId).emit('attendanceUpdated', record);

      return { status: 'success', record };
    } catch (error) {
      const errorMessage =
        error?.response?.message ||
        error?.message ||
        'Attendance check-in failed';
      throw new WsException(errorMessage);
    }
  }
}
