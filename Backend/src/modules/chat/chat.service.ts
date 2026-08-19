import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

function toUuid(id: string): string {
  if (!id) return '00000000-0000-4000-8000-000000000000';
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(id)) return id;
  let hex = '';
  for (let i = 0; i < id.length; i++) {
    hex += id.charCodeAt(i).toString(16).padStart(2, '0');
  }
  hex = hex.padEnd(32, '0').slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

@Injectable()
export class ChatService {
  constructor(private readonly db: DatabaseService) {}

  private groupReactions(reactions: Array<{ userId: string; emoji: string }>) {
    const grouped: Record<string, { emoji: string; count: number; userIds: string[] }> = {};
    for (const r of reactions || []) {
      if (!r || !r.emoji) continue;
      if (!grouped[r.emoji]) {
        grouped[r.emoji] = { emoji: r.emoji, count: 0, userIds: [] };
      }
      grouped[r.emoji].count++;
      grouped[r.emoji].userIds.push(r.userId);
    }
    return Object.values(grouped);
  }

  private formatMessage(msg: any) {
    const attachments = (typeof msg.attachments === 'object' && msg.attachments) ? msg.attachments : {};
    const senderObj = msg.sender ? {
      id: msg.sender.id,
      name: msg.sender.fullName || `User ${msg.sender.id}`,
      initials: msg.sender.initials,
      avatarBg: msg.sender.avatarBg,
    } : null;

    return {
      id: msg.id,
      text: msg.content,
      content: msg.content,
      senderId: msg.senderId,
      sender: senderObj,
      createdAt: msg.createdAt,
      image: attachments.image,
      type: attachments.type || 'text',
      fileName: attachments.fileName,
      fileSize: attachments.fileSize,
      fileIcon: attachments.fileIcon,
      replyToId: attachments.replyToId,
      replyTo: attachments.replyTo,
      forwardedFrom: attachments.forwardedFrom,
      isPinned: !!attachments.isPinned,
      reactions: attachments.reactions || [],
      reactionsGrouped: this.groupReactions(attachments.reactions || []),
    };
  }

  async ensureUserExists(
    userId: string,
    name?: string,
    initials?: string,
    avatarBg?: string,
  ) {
    const validId = toUuid(userId);
    const existing = await this.db.user.findUnique({
      where: { id: validId },
    });

    if (existing) {
      return existing;
    }

    const sanitizedEmail = userId.replace(/[^a-zA-Z0-9]/g, '');
    return this.db.user.create({
      data: {
        id: validId,
        email: `${sanitizedEmail || 'user'}@placeholder.com`,
        fullName: name || `User ${userId}`,
        initials: initials || userId.substring(0, 2).toUpperCase(),
        avatarBg: avatarBg || '#3b82f6',
      },
    });
  }

  private async ensureDefaultClassroom(creatorId: string): Promise<string> {
    const validCreatorId = toUuid(creatorId);
    await this.ensureUserExists(creatorId);
    const existing = await this.db.classroom.findFirst();
    if (existing) return existing.id;
    const created = await this.db.classroom.create({
      data: {
        title: 'General Classroom',
        inviteCode: 'GEN' + Math.floor(100 + Math.random() * 900),
        createdById: validCreatorId,
      },
    });
    return created.id;
  }

  async createGroup(
    name: string,
    description?: string,
    icon?: string,
    color?: string,
    memberIds: string[] = [],
    id?: string,
  ) {
    const creatorId = memberIds[0] || 'gs';
    await this.ensureUserExists(creatorId);
    for (const memberId of memberIds) {
      await this.ensureUserExists(memberId);
    }

    const classroomId = await this.ensureDefaultClassroom(creatorId);
    const groupUuid = id ? toUuid(id) : undefined;

    const createdGroup = await this.db.studyGroup.create({
      data: {
        ...(groupUuid ? { id: groupUuid } : {}),
        name,
        icon: icon || '📚',
        colorAccent: color || '#6366f1',
        classroomId,
        createdById: toUuid(creatorId),
        members: {
          create: memberIds.map((userId) => ({
            user: {
              connect: { id: toUuid(userId) },
            },
          })),
        },
      },
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
    });

    return {
      ...createdGroup,
      description: description || '',
    };
  }

  async updateMemberRole(groupId: string, userId: string, role: string) {
    const member = await this.db.studyGroupMember.findFirst({
      where: {
        studyGroupId: toUuid(groupId),
        userId: toUuid(userId),
      },
    });
    return { groupId, userId, role, success: !!member };
  }

  async getGroups() {
    return this.db.studyGroup.findMany({
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  async getChatHistory(groupId: string) {
    const messages = await this.db.chatMessage.findMany({
      where: { studyGroupId: toUuid(groupId) },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: true,
      },
    });

    const formatted = messages.map((msg) => this.formatMessage(msg));
    await this.attachReplies(formatted);
    return formatted;
  }

  async saveMessage(groupId: string, senderId: string, data: any) {
    const groupUuid = toUuid(groupId);
    const senderUuid = toUuid(senderId);

    const existingGroup = await this.db.studyGroup.findUnique({
      where: { id: groupUuid },
    });

    if (!existingGroup) {
      const creatorId = senderId;
      await this.ensureUserExists(creatorId);
      const classroomId = await this.ensureDefaultClassroom(creatorId);

      const allGroups = await this.db.studyGroup.findMany({ select: { id: true } });
      const parentGroup = allGroups.find(
        (g) => groupId.startsWith(g.id + '-') && g.id !== groupId,
      );

      let groupName = groupId;
      if (parentGroup) {
        const topicSuffix = groupId.substring(parentGroup.id.length + 1);
        groupName = topicSuffix.charAt(0).toUpperCase() + topicSuffix.slice(1).replace(/-/g, ' ');
      } else if (groupId === 'flutter') {
        groupName = 'Flutter';
      } else if (groupId === 'react-native') {
        groupName = 'React Native';
      }

      await this.db.studyGroup.create({
        data: {
          id: groupUuid,
          name: groupName,
          classroomId,
          createdById: senderUuid,
        },
      });
    }

    await this.ensureUserExists(senderId);

    const isStaleBlobAudio =
      data.type === 'audio' &&
      typeof data.text === 'string' &&
      data.text.startsWith('blob:');

    if (isStaleBlobAudio) {
      console.warn(`Refusing to persist voice note with blob URL from ${senderId}`);
      return null;
    }

    const attachments: any = {
      image: data.image,
      type: data.type || 'text',
      fileName: data.fileName,
      fileSize: data.fileSize,
      fileIcon: data.fileIcon,
      replyToId: data.replyToId,
      forwardedFrom: data.forwardedFrom,
      isPinned: false,
      reactions: [],
    };

    const savedMessage = await this.db.chatMessage.create({
      data: {
        content: data.text || '',
        senderId: senderUuid,
        studyGroupId: groupUuid,
        attachments,
      },
      include: {
        sender: true,
      },
    });

    const formatted = this.formatMessage(savedMessage);

    if (formatted.replyToId) {
      await this.attachReplies([formatted]);
    }

    return formatted;
  }

  private async attachReplies(messages: any[]) {
    const replyIds = messages
      .map((m) => m.replyToId)
      .filter((id) => id && typeof id === 'string');

    if (replyIds.length === 0) return;

    const validReplyIds = replyIds.map((id) => toUuid(id));
    const replies = await this.db.chatMessage.findMany({
      where: { id: { in: validReplyIds } },
      include: { sender: true },
    });
    const replyMap = new Map(replies.map((r) => [r.id, this.formatMessage(r)]));

    for (const message of messages) {
      if (!message.replyToId) continue;
      const reply = replyMap.get(toUuid(message.replyToId));
      if (reply) {
        message.replyTo = {
          id: reply.id,
          text: reply.text,
          sender: reply.sender?.name || reply.senderId,
        };
      }
    }
  }

  async togglePinMessage(messageId: string, isPinned: boolean) {
    const messageUuid = toUuid(messageId);
    const existing = await this.db.chatMessage.findUnique({
      where: { id: messageUuid },
      include: { sender: true },
    });

    if (!existing) return null;

    const attachments: any = (typeof existing.attachments === 'object' && existing.attachments) ? existing.attachments : {};
    attachments.isPinned = !!isPinned;

    const updated = await this.db.chatMessage.update({
      where: { id: messageUuid },
      data: { attachments },
      include: { sender: true },
    });

    return this.formatMessage(updated);
  }

  async deleteMessage(messageId: string) {
    try {
      return await this.db.chatMessage.delete({
        where: { id: toUuid(messageId) },
      });
    } catch (err: any) {
      console.warn(`Could not delete message ${messageId}:`, err.message);
      return null;
    }
  }

  async editMessage(messageId: string, text: string) {
    try {
      const updated = await this.db.chatMessage.update({
        where: { id: toUuid(messageId) },
        data: { content: text },
        include: { sender: true },
      });
      return this.formatMessage(updated);
    } catch (err: any) {
      console.warn(`Could not edit message ${messageId}:`, err.message);
      return null;
    }
  }

  async toggleReaction(messageId: string, userId: string, emoji: string) {
    await this.ensureUserExists(userId);
    const messageUuid = toUuid(messageId);
    const message = await this.db.chatMessage.findUnique({
      where: { id: messageUuid },
    });

    if (!message) return [];

    const attachments: any = (typeof message.attachments === 'object' && message.attachments) ? message.attachments : {};
    let reactions: Array<{ userId: string; emoji: string }> = attachments.reactions || [];

    const existingIdx = reactions.findIndex((r) => r.userId === userId && r.emoji === emoji);

    if (existingIdx >= 0) {
      reactions.splice(existingIdx, 1);
    } else {
      reactions = reactions.filter((r) => r.userId !== userId);
      reactions.push({ userId, emoji });
    }

    attachments.reactions = reactions;

    await this.db.chatMessage.update({
      where: { id: messageUuid },
      data: { attachments },
    });

    return this.groupReactions(reactions);
  }

  async deleteGroup(id: string) {
    try {
      const groupUuid = toUuid(id);
      await this.db.studyGroupMember.deleteMany({
        where: { studyGroupId: groupUuid },
      });
      await this.db.chatMessage.deleteMany({
        where: { studyGroupId: groupUuid },
      });
      return await this.db.studyGroup.deleteMany({
        where: { id: groupUuid },
      });
    } catch (err: any) {
      console.warn(`Could not delete group ${id}:`, err.message);
      return { count: 0 };
    }
  }

  async removeMember(groupId: string, userId: string) {
    try {
      return await this.db.studyGroupMember.deleteMany({
        where: {
          userId: toUuid(userId),
          studyGroupId: toUuid(groupId),
        },
      });
    } catch (err: any) {
      console.warn(
        `Could not remove member ${userId} from ${groupId}:`,
        err.message,
      );
      return { count: 0 };
    }
  }
}

