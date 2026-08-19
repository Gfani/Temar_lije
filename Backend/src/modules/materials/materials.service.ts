import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class MaterialsService {
  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Creates a new course material record linked to a classroom and file path.
   */
  async uploadMaterial(data: {
    title: string;
    description?: string;
    filePath: string;
    classId: string;
    uploadedById?: string;
    fileType?: string;
    fileSizeBytes?: number;
  }) {
    const { title, filePath, classId, uploadedById, fileType, fileSizeBytes } = data;

    if (!title || !classId || !filePath) {
      throw new BadRequestException('title, classId, and file are required');
    }

    // Verify classroom exists
    const classroom = await this.databaseService.classroom.findUnique({
      where: { id: classId },
    });

    if (!classroom) {
      throw new NotFoundException(`Classroom with ID ${classId} not found`);
    }

    const uId = uploadedById || classroom.createdById;

    const result = await this.databaseService.material.create({
      data: {
        title,
        fileUrl: filePath,
        fileType: (fileType as any) || 'PDF',
        fileSizeBytes: fileSizeBytes ? BigInt(fileSizeBytes) : null,
        classroomId: classId,
        uploadedById: uId,
      },
    });

    return {
      ...result,
      fileSizeBytes: result.fileSizeBytes ? Number(result.fileSizeBytes) : null,
    };
  }

  /**
   * Retrieves all course materials for a specific class dashboard.
   */
  async getMaterialsByClass(classId: string) {
    if (!classId) {
      throw new BadRequestException('classId parameter is required');
    }

    const list = await this.databaseService.material.findMany({
      where: { classroomId: classId },
      orderBy: { createdAt: 'desc' },
    });

    return list.map((item) => ({
      ...item,
      fileSizeBytes: item.fileSizeBytes ? Number(item.fileSizeBytes) : null,
    }));
  }
}

