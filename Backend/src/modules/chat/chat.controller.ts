import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';

const uploadStorage = diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = join(process.cwd(), 'uploads');
    if (!existsSync(uploadPath)) {
      mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    let ext = extname(file.originalname || '');
    if (!ext && file.mimetype) {
      if (file.mimetype.includes('mp4') || file.mimetype.includes('aac')) ext = '.mp4';
      else if (file.mimetype.includes('ogg')) ext = '.ogg';
      else if (file.mimetype.includes('wav')) ext = '.wav';
      else if (file.mimetype.includes('audio') || file.mimetype.includes('webm')) ext = '.webm';
      else if (file.mimetype.includes('png')) ext = '.png';
      else if (file.mimetype.includes('jpeg') || file.mimetype.includes('jpg')) ext = '.jpg';
      else if (file.mimetype.includes('pdf')) ext = '.pdf';
    }
    cb(null, `${uniqueSuffix}${ext || '.webm'}`);
  },
});

@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { storage: uploadStorage }))
  async uploadFile(@UploadedFile() file: any) {
    if (!file) {
      return { error: 'No file uploaded' };
    }
    const fileUrl = `http://localhost:3000/uploads/${file.filename}`;
    return {
      url: fileUrl,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    };
  }

  @Post('groups')
  async createGroup(@Body() createGroupDto: any) {
    const group = await this.chatService.createGroup(
      createGroupDto.name,
      createGroupDto.description,
      createGroupDto.icon,
      createGroupDto.color,
      createGroupDto.memberIds || [],
      createGroupDto.id,
    );
    this.chatGateway.server.emit('groupCreated', group);
    return group;
  }

  @Get('groups')
  async getGroups() {
    return this.chatService.getGroups();
  }

  @Get('history/:groupId')
  async getChatHistory(@Param('groupId') groupId: string) {
    return this.chatService.getChatHistory(groupId);
  }

  @Put('messages/:id/pin')
  async togglePinMessage(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    const updated = await this.chatService.togglePinMessage(id, body.isPinned);
    this.chatGateway.server.emit('messagePinned', {
      messageId: id,
      isPinned: body.isPinned,
      message: updated,
    });
    return updated;
  }

  @Delete('messages/:id')
  async deleteMessage(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    const deleted = await this.chatService.deleteMessage(id);
    if (deleted && body?.roomId) {
      this.chatGateway.server.to(body.roomId).emit('messageDeleted', { messageId: id });
    }
    return { success: !!deleted };
  }

  @Put('messages/:id')
  async editMessage(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    const updated = await this.chatService.editMessage(id, body.text);
    if (updated && body?.roomId) {
      this.chatGateway.server.to(body.roomId).emit('messageUpdated', {
        messageId: id,
        text: body.text,
      });
    }
    return updated;
  }

  @Post('messages/:id/reactions')
  async toggleReaction(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    const reactions = await this.chatService.toggleReaction(id, body.userId || 'gs', body.emoji);
    if (body?.roomId) {
      this.chatGateway.server.to(body.roomId).emit('reactionToggled', {
        messageId: id,
        reactions,
      });
    }
    return reactions;
  }

  @Put('groups/:groupId/members/:userId/role')
  async updateMemberRole(
    @Param('groupId') groupId: string,
    @Param('userId') userId: string,
    @Body() body: any,
  ) {
    const updated = await this.chatService.updateMemberRole(groupId, userId, body.role);
    this.chatGateway.server.emit('roleUpdated', {
      groupId,
      userId,
      role: body.role,
    });
    return updated;
  }

  @Delete('groups/:id')
  async deleteGroup(@Param('id') id: string) {
    const deleted = await this.chatService.deleteGroup(id);
    this.chatGateway.broadcastGroupDeleted(id);
    return deleted;
  }

  @Delete('groups/:groupId/members/:userId')
  async removeMember(
    @Param('groupId') groupId: string,
    @Param('userId') userId: string,
  ) {
    const deleted = await this.chatService.removeMember(groupId, userId);
    this.chatGateway.server.emit('memberRemoved', { groupId, userId });
    return deleted;
  }
}

