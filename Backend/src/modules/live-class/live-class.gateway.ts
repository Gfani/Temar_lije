import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WsException,
} from '@nestjs/websockets';

/**
 * Socket.io gateway handling offline/LAN fallback and real-time whiteboard collaboration.
 */
@WebSocketGateway({
  namespace: 'live-class',
  cors: {
    origin: '*',
  },
})
export class LiveClassGateway {
  @WebSocketServer()
  server;

  /**
   * Handles explicit socket room joining for classroom channels.
   *
   * @param {Object} data - Event payload containing { classId }.
   * @param {Object} client - Socket client connection.
   */
  @SubscribeMessage('joinRoom')
  handleJoinRoom(@MessageBody() data, @ConnectedSocket() client) {
    const { classId } = data || {};
    if (classId) {
      client.join(classId);
      return { status: 'joined', classId };
    }
  }

  /**
   * Listens for 'sendWhiteboardStroke' event and broadcasts 'receiveWhiteboardStroke'
   * to all other connected clients in the classroom room (excluding sender).
   *
   * @param {Object} data - Stroke payload { classId, x, y, prevX, prevY, color }.
   * @param {Object} client - Sender socket client connection.
   */
  @SubscribeMessage('sendWhiteboardStroke')
  handleSendWhiteboardStroke(@MessageBody() data, @ConnectedSocket() client) {
    const { classId, x, y, prevX, prevY, color } = data || {};

    if (!classId) {
      throw new WsException('classId is required to broadcast whiteboard stroke');
    }

    // Broadcast receiveWhiteboardStroke to all other clients in classId room
    client.to(classId).emit('receiveWhiteboardStroke', {
      classId,
      x,
      y,
      prevX,
      prevY,
      color,
    });
  }
}
