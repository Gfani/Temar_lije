import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class ChatService {
  constructor(private readonly db: DatabaseService) {}

  async ensureUserExists(
    userId: string,
    name?: string,
    initials?: string,
    avatarBg?: string,
  ) {
    const existing = await this.db.user.findUnique({
      where: { id: userId },
    });

    if (existing) {
      const derivedName = existing.fullName || existing.name || name || `User ${userId}`;
      const derivedInitials = this._deriveInitials(derivedName);
      const needsReconcile =
        existing.name !== derivedName ||
        existing.initials !== derivedInitials ||
        !existing.avatarBg;

      if (needsReconcile) {
        return this.db.user.update({
          where: { id: userId },
          data: {
            name: derivedName,
            initials: derivedInitials,
            avatarBg: existing.avatarBg || avatarBg || '#3b82f6',
          },
        });
      }

      return existing;
    }

    try {
      return await this.db.user.create({
        data: {
          id: userId,
          name: name || `User ${userId}`,
          initials: initials || this._deriveInitials(name || userId),
          avatarBg: avatarBg || '#3b82f6',
        },
      });
    } catch (err: any) {
      // Concurrent creation race — the other request won; return its row
      if (err?.code === 'P2002') {
        const winner = await this.db.user.findUnique({
          where: { id: userId },
        });
        if (winner) {
          return winner;
        }
      }
      throw err;
    }
  }

  private _deriveInitials(name?: string) {
    const parts = (name || 'U').trim().split(/\s+/).filter(Boolean);
    return parts.map((p) => p[0]).join('').slice(0, 2).toUpperCase() || 'U';
  }

  /**
   * A group is accessible to a user when the user is a member, OR when
   * the group has no members at all (legacy/demo/classroom groups that
   * predate per-user membership stay public).
   */
  private async _assertGroupAccess(groupId: string, userId?: string) {
    const group = await this.db.studyGroup.findUnique({
      where: { id: groupId },
      include: {
        members: {
          select: { userId: true, role: true },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    if (
      group.members.length > 0 &&
      userId &&
      !group.members.some((m) => m.userId === userId)
    ) {
      // Allow seamless access to classroom study groups and default channels
      if (group.classroomId || group.id === 'flutter' || group.id === 'react-native') {
        await this.ensureUserExists(userId);
        await this.db.groupMember.create({
          data: {
            userId,
            groupId,
            role: 'MEMBER',
          },
        }).catch(() => {});
        return group;
      }
      throw new ForbiddenException('You are not a member of this group');
    }

    return group;
  }

  /**
   * Membership checks that require the OWNER role. Zero-member (legacy)
   * groups have no owner, so any accessible user may manage them.
   */
  private async _assertOwner(groupId: string, userId: string) {
    const group = await this._assertGroupAccess(groupId, userId);

    const membership = group.members.find((m) => m.userId === userId);
    if (membership && membership.role !== 'OWNER') {
      throw new ForbiddenException(
        'Only the group owner can perform this action',
      );
    }

    return group;
  }

  async createGroup(
    name: string,
    description?: string,
    icon?: string,
    color?: string,
    memberIds: string[] = [],
    id?: string,
    creatorId?: string,
    classroomId?: string,
  ) {
    const groupId = id || undefined;

    // Topics are child groups (`parentId-slug`) — inherit the parent's
    // members so topics behave as subchannels of the parent group.
    const inherited: { userId: string; role: string }[] = [];
    if (groupId) {
      const allGroups = await this.db.studyGroup.findMany({
        select: { id: true },
      });
      const parent = allGroups.find(
        (g) => groupId.startsWith(g.id + '-') && g.id !== groupId,
      );
      if (parent) {
        const parentMembers = await this.db.groupMember.findMany({
          where: { groupId: parent.id },
          select: { userId: true, role: true },
        });
        inherited.push(...parentMembers);
      }
    }

    const memberMap = new Map<string, string>();
    for (const m of inherited) {
      memberMap.set(m.userId, m.role);
    }
    if (creatorId) {
      memberMap.set(creatorId, 'OWNER');
    }
    for (const memberId of memberIds || []) {
      if (!memberMap.has(memberId)) {
        memberMap.set(memberId, 'MEMBER');
      }
    }

    for (const userId of memberMap.keys()) {
      await this.ensureUserExists(userId);
    }

    return this.db.studyGroup.create({
      data: {
        id: groupId,
        name,
        description,
        icon: icon || '📚',
        color: color || '#6366f1',
        classroomId: classroomId || null,
        members: {
          create: [...memberMap.entries()].map(([userId, role]) => ({
            role,
            user: {
              connect: { id: userId },
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
  }

  async updateMemberRole(
    groupId: string,
    userId: string,
    role: string,
    actorId?: string,
  ) {
    if (actorId) {
      await this._assertOwner(groupId, actorId);
    }

    return this.db.groupMember.update({
      where: {
        userId_groupId: {
          userId,
          groupId,
        },
      },
      data: {
        role,
      },
    });
  }

  async getGroups(userId?: string, classroomId?: string) {
    return this.db.studyGroup.findMany({
      where: classroomId
        ? {
            OR: [
              { classroomId },
              { classroomId: null },
            ],
          }
        : {
            OR: [
              ...(userId ? [{ members: { some: { userId } } }] : []),
              { members: { none: {} } },
              { classroomId: null },
            ],
          },
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  async getChatHistory(groupId: string, userId: string) {
    await this._assertGroupAccess(groupId, userId);

    const messages = await this.db.message.findMany({
      where: { groupId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: true,
        reactions: true,
      },
    });

    await this.attachReplies(messages);

    // Attach grouped reactions
    for (const msg of messages) {
      const grouped: Record<string, { emoji: string; count: number; userIds: string[] }> = {};
      for (const r of (msg as any).reactions || []) {
        if (!grouped[r.emoji]) {
          grouped[r.emoji] = { emoji: r.emoji, count: 0, userIds: [] };
        }
        grouped[r.emoji].count++;
        grouped[r.emoji].userIds.push(r.userId);
      }
      (msg as any).reactionsGrouped = Object.values(grouped);
    }

    return messages;
  }

  async saveMessage(groupId: string, senderId: string, data: any) {
    const existingGroup = await this.db.studyGroup.findUnique({
      where: { id: groupId },
      include: {
        members: {
          select: { userId: true },
        },
      },
    });

    if (!existingGroup) {
      // Find parent group: look for any existing group whose ID is a prefix of groupId
      const allGroups = await this.db.studyGroup.findMany({ select: { id: true } });
      const parentGroup = allGroups.find(
        (g) => groupId.startsWith(g.id + '-') && g.id !== groupId,
      );

      if (parentGroup) {
        // This is a topic channel — ensure the topic group exists
        const topicSuffix = groupId.substring(parentGroup.id.length + 1);
        await this.db.studyGroup.create({
          data: {
            id: groupId,
            name:
              topicSuffix.charAt(0).toUpperCase() +
              topicSuffix.slice(1).replace(/-/g, ' '),
            description: `Topic room for ${topicSuffix}`,
          },
        });
      } else {
        // Could be a plain classroom or top-level group
        await this.db.studyGroup.create({
          data: {
            id: groupId,
            name:
              groupId === 'flutter'
                ? 'Flutter'
                : groupId === 'react-native'
                  ? 'React Native'
                  : groupId,
            description: 'Classroom discussion',
          },
        });
      }
    } else if (
      existingGroup.members.length > 0 &&
      !existingGroup.members.some((m) => m.userId === senderId)
    ) {
      throw new ForbiddenException('You are not a member of this group');
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

    const savedMessage = await this.db.message.create({
      data: {
        text: data.text,
        image: data.image,
        type: data.type || 'text',
        fileName: data.fileName,
        fileSize: data.fileSize,
        fileIcon: data.fileIcon,
        replyToId: data.replyToId,
        forwardedFrom: data.forwardedFrom,
        group: {
          connect: { id: groupId },
        },
        sender: {
          connect: { id: senderId },
        },
      },
      include: {
        sender: true,
        reactions: true,
      },
    });

    if (savedMessage.replyToId) {
      await this.attachReplies([savedMessage]);
    }

    return savedMessage;
  }

  private async attachReplies(messages: any[]) {
    const replyIds = messages
      .map((m) => m.replyToId)
      .filter(Boolean);

    if (replyIds.length === 0) return;

    const replies = await this.db.message.findMany({
      where: { id: { in: replyIds } },
      include: { sender: true },
    });
    const replyMap = new Map(replies.map((r) => [r.id, r]));

    for (const message of messages) {
      const reply = replyMap.get(message.replyToId);
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
    return this.db.message.update({
      where: { id: messageId },
      data: { isPinned: !!isPinned },
      include: {
        sender: true,
        reactions: true,
      },
    });
  }

  async deleteMessage(messageId: string) {
    try {
      return await this.db.message.delete({
        where: { id: messageId },
      });
    } catch (err: any) {
      if (err?.code === 'P2025') {
        throw new NotFoundException('Message not found');
      }
      throw err;
    }
  }

  async editMessage(messageId: string, text: string) {
    try {
      return await this.db.message.update({
        where: { id: messageId },
        data: { text },
        include: {
          sender: true,
          reactions: true,
        },
      });
    } catch (err: any) {
      if (err?.code === 'P2025') {
        throw new NotFoundException('Message not found');
      }
      throw err;
    }
  }

  async toggleReaction(messageId: string, userId: string, emoji: string) {
    await this.ensureUserExists(userId);

    const existing = await this.db.messageReaction.findUnique({
      where: {
        messageId_userId_emoji: { messageId, userId, emoji },
      },
    });

    if (existing) {
      await this.db.messageReaction.delete({
        where: { id: existing.id },
      });
    } else {
      // Remove any other reaction from this user on this message first (one reaction per user)
      await this.db.messageReaction.deleteMany({
        where: { messageId, userId },
      });
      await this.db.messageReaction.create({
        data: { messageId, userId, emoji },
      });
    }

    // Return grouped reactions for this message
    const allReactions = await this.db.messageReaction.findMany({
      where: { messageId },
    });

    const grouped: Record<string, { emoji: string; count: number; userIds: string[] }> = {};
    for (const r of allReactions) {
      if (!grouped[r.emoji]) {
        grouped[r.emoji] = { emoji: r.emoji, count: 0, userIds: [] };
      }
      grouped[r.emoji].count++;
      grouped[r.emoji].userIds.push(r.userId);
    }

    return Object.values(grouped);
  }

  async deleteGroup(id: string, userId?: string) {
    if (userId) {
      await this._assertOwner(id, userId);
    }

    try {
      // Delete all sub-topics whose ID starts with "id-"
      await this.db.studyGroup.deleteMany({
        where: {
          id: {
            startsWith: `${id}-`,
          },
        },
      });

      return await this.db.studyGroup.deleteMany({
        where: { id },
      });
    } catch (err: any) {
      console.warn(`Could not delete group ${id}:`, err.message);
      return { count: 0 };
    }
  }

  async removeMember(groupId: string, userId: string, actorId?: string) {
    if (actorId) {
      await this._assertOwner(groupId, actorId);
    }

    try {
      return await this.db.groupMember.deleteMany({
        where: {
          userId,
          groupId,
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