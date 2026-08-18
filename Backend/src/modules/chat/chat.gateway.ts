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

    this.server.to(roomId).emit('newMessage', savedMsg);
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
    client.join(data.groupId);
    this.server.to(data.groupId).emit('voiceChatUserJoined', data);
  }

  @SubscribeMessage('leaveVoiceChat')
  async handleLeaveVoiceChat(
    @MessageBody() data: any,
  ) {
    if (!data?.groupId) return;
    this.server.to(data.groupId).emit('voiceChatUserLeft', data);
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
