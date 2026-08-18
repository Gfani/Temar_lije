import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WsException,
} from '@nestjs/websockets';
import { AttendanceService } from './attendance.service';

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

  constructor(private readonly attendanceService: AttendanceService) {}

  /**
   * Listens for 'joinLiveSession' event, extracts client IP, joins room, records check-in,
   * and emits 'attendanceUpdated' event to the classroom room.
   *
   * @param {Object} data - Payload containing { classId, studentId }.
   * @param {Object} client - Socket connection object.
   */
  @SubscribeMessage('joinLiveSession')
  async handleJoinLiveSession(@MessageBody() data, @ConnectedSocket() client) {
    try {
      const { classId, studentId } = data || {};

      if (!classId || !studentId) {
        throw new WsException('classId and studentId are required');
      }

      // Extract client IP address from socket connection headers or handshake address
      const xForwardedFor = client.handshake?.headers?.['x-forwarded-for'];
      const rawIp = xForwardedFor
        ? (Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor.split(',')[0]).trim()
        : client.handshake?.address || client.conn?.remoteAddress || '';

      // Join the socket room for this class
      client.join(classId);

      // Record student check-in
      const record = await this.attendanceService.recordCheckIn(classId, studentId, rawIp);

      // Broadcast updated attendance record to all sockets in the classroom room
      this.server.to(classId).emit('attendanceUpdated', record);

      return { status: 'success', record };
    } catch (error) {
      const errorMessage = error?.response?.message || error?.message || 'Attendance check-in failed';
      throw new WsException(errorMessage);
    }
  }
}
