import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class MaterialsService {
  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Creates a new course material record linked to a classroom and file path.
   *
   * @param data Material metadata including title, description, classId, and relative filePath
   */
  async uploadMaterial(data: {
    title: string;
    description?: string;
    filePath: string;
    classId: string;
  }) {
    const { title, description, filePath, classId } = data;

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

    return await this.databaseService.material.create({
      data: {
        title,
        description: description || null,
        filePath,
        classId,
      },
    });
  }

  /**
   * Retrieves all course materials for a specific class dashboard.
   *
   * @param classId Classroom ID
   */
  async getMaterialsByClass(classId: string) {
    if (!classId) {
      throw new BadRequestException('classId parameter is required');
    }

    return await this.databaseService.material.findMany({
      where: { classId },
      orderBy: { uploadedAt: 'desc' },
    });
  }
}
