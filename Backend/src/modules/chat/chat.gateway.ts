import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly chatService: ChatService,
  ) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any,
  ) {
    const { roomId, userId, username, initials, avatarBg } = data;
    if (!roomId || !userId) return;

    client.join(roomId);

    await this.chatService.ensureUserExists(userId, username, initials, avatarBg);
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @MessageBody() data: any,
  ) {
    const { roomId, senderId } = data;
    if (!roomId || !senderId) return;

    const savedMsg = await this.chatService.saveMessage(roomId, senderId, {
      text: data.text,
      image: data.image,
      type: data.type,
      fileName: data.fileName,
      fileSize: data.fileSize,
      fileIcon: data.fileIcon,
      replyToId: data.replyToId,
      forwardedFrom: data.forwardedFrom,
    });

    if (savedMsg) {
      // Pass _optimisticId back so the frontend can replace the placeholder precisely
      this.server.to(roomId).emit('newMessage', {
        ...savedMsg,
        _optimisticId: data._optimisticId,
      });
    }
  }

  @SubscribeMessage('deleteMessage')
  async handleDeleteMessage(
    @MessageBody() data: any,
  ) {
    const { messageId, roomId } = data;
    if (!messageId) return;

    await this.chatService.deleteMessage(messageId);
    if (roomId) {
      this.server.to(roomId).emit('messageDeleted', { messageId });
    } else {
      this.server.emit('messageDeleted', { messageId });
    }
  }

  @SubscribeMessage('editMessage')
  async handleEditMessage(
    @MessageBody() data: any,
  ) {
    const { messageId, text, roomId } = data;
    if (!messageId || text === undefined) return;

    const updated = await this.chatService.editMessage(messageId, text);
    if (updated) {
      if (roomId) {
        this.server.to(roomId).emit('messageUpdated', { messageId, text });
      } else {
        this.server.emit('messageUpdated', { messageId, text });
      }
    }
  }

  @SubscribeMessage('toggleReaction')
  async handleToggleReaction(
    @MessageBody() data: any,
  ) {
    const { messageId, userId, emoji, roomId } = data;
    if (!messageId || !emoji) return;

    const reactions = await this.chatService.toggleReaction(messageId, userId || 'gs', emoji);
    if (roomId) {
      this.server.to(roomId).emit('reactionToggled', { messageId, reactions });
    } else {
      this.server.emit('reactionToggled', { messageId, reactions });
    }
  }

  @SubscribeMessage('studyInvitation')
  async handleStudyInvitation(
    @MessageBody() data: any,
  ) {
    this.server.emit('studyInvitation', data);
  }

  @SubscribeMessage('deleteGroup')
  async handleDeleteGroup(
    @MessageBody() data: any,
  ) {
    const { groupId } = data;
    if (!groupId) return;

    try {
      await this.chatService.deleteGroup(groupId);
      this.server.emit('groupDeleted', { groupId });
    } catch (err) {
      console.error(`Failed to delete group ${groupId}:`, err);
    }
  }

  @SubscribeMessage('joinVoiceChat')
  async handleJoinVoiceChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any,
  ) {
    if (!data?.groupId) return;
    // Only join the voice-specific room if not already in it
    if (!client.rooms.has(data.groupId)) {
      client.join(data.groupId);
    }
    this.server.to(data.groupId).emit('voiceChatUserJoined', data);
  }

  @SubscribeMessage('leaveVoiceChat')
  async handleLeaveVoiceChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any,
  ) {
    if (!data?.groupId) return;
    this.server.to(data.groupId).emit('voiceChatUserLeft', data);
    client.leave(data.groupId);
  }

  @SubscribeMessage('toggleMuteVoice')
  async handleToggleMuteVoice(
    @MessageBody() data: any,
  ) {
    if (!data?.groupId) return;
    this.server.to(data.groupId).emit('voiceChatUserMuteToggled', data);
  }

  broadcastGroupDeleted(groupId: string) {
    this.server.emit('groupDeleted', { groupId });
  }
}
