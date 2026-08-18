import { Injectable, Inject } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class ChatService {
  constructor(@Inject(DatabaseService) db) {
    this.db = db;
  }

  async ensureUserExists(userId, name, initials, avatarBg) {
    const existing = await this.db.user.findUnique({
      where: { id: userId },
    });

    if (existing) {
      return existing;
    }

    return this.db.user.create({
      data: {
        id: userId,
        name: name || `User ${userId}`,
        initials: initials || userId.substring(0, 2).toUpperCase(),
        avatarBg: avatarBg || '#3b82f6',
      },
    });
  }

  async createGroup(name, description, icon, color, memberIds = [], id = undefined) {
    for (const memberId of memberIds) {
      await this.ensureUserExists(memberId);
    }

    return this.db.studyGroup.create({
      data: {
        id: id || undefined,
        name,
        description,
        icon: icon || '📚',
        color: color || '#6366f1',
        members: {
          create: memberIds.map((userId) => ({
            role: userId === 'gs' ? 'OWNER' : 'MEMBER',
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

  async updateMemberRole(groupId, userId, role) {
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

  async getChatHistory(groupId) {
    return this.db.message.findMany({
      where: { groupId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: true,
      },
    });
  }

  async saveMessage(groupId, senderId, data) {
    const existingGroup = await this.db.studyGroup.findUnique({
      where: { id: groupId },
    });

    if (!existingGroup) {
      // Find parent group: look for any existing group whose ID is a prefix of groupId
      // This is safe for UUID-based group IDs like "3757e38b-4a6c-...-general"
      const allGroups = await this.db.studyGroup.findMany({ select: { id: true } });
      const parentGroup = allGroups.find(g => groupId.startsWith(g.id + '-') && g.id !== groupId);

      if (parentGroup) {
        // This is a topic channel — ensure the topic group exists
        const topicSuffix = groupId.substring(parentGroup.id.length + 1);
        await this.db.studyGroup.create({
          data: {
            id: groupId,
            name: topicSuffix.charAt(0).toUpperCase() + topicSuffix.slice(1).replace(/-/g, ' '),
            description: `Topic room for ${topicSuffix}`,
          },
        });
      } else {
        // Could be a plain classroom or top-level group
        await this.db.studyGroup.create({
          data: {
            id: groupId,
            name: groupId === 'flutter' ? 'Flutter' : (groupId === 'react-native' ? 'React Native' : groupId),
            description: 'Classroom discussion',
          },
        });
      }
    }


    await this.ensureUserExists(senderId);

    return this.db.message.create({
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
      },
    });
  }

  async togglePinMessage(messageId, isPinned) {
    return this.db.message.update({
      where: { id: messageId },
      data: { isPinned: !!isPinned },
      include: {
        sender: true,
      },
    });
  }

  async deleteGroup(id) {
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
    } catch (err) {
      console.warn(`Could not delete group ${id}:`, err.message);
      return { count: 0 };
    }
  }

  async removeMember(groupId, userId) {
    try {
      return await this.db.groupMember.deleteMany({
        where: {
          userId,
          groupId,
        },
      });
    } catch (err) {
      console.warn(`Could not remove member ${userId} from ${groupId}:`, err.message);
      return { count: 0 };
    }
  }
}
