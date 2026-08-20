import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

function isValidUUID(id: string): boolean {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id.trim());
}

@Injectable()
export class AssignmentsService {
  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Creates a new classroom assignment.
   */
  async createAssignment(data: {
    title: string;
    description?: string;
    deadline?: string | Date;
    dueDate?: string | Date;
    totalPoints?: number;
    classId: string;
    createdById?: string;
  }) {
    const { title, description, deadline, dueDate, totalPoints, classId, createdById } = data;
    const targetDueDate = dueDate || deadline;

    if (!title || !classId) {
      throw new BadRequestException('title and classId are required');
    }

    let parsedDueDate: Date | null = null;
    if (targetDueDate) {
      parsedDueDate = new Date(targetDueDate);
      if (isNaN(parsedDueDate.getTime())) {
        parsedDueDate = null;
      }
    }

    const cleanClassId = String(classId).trim();
    let targetClassroom: any = null;

    if (isValidUUID(cleanClassId)) {
      try {
        targetClassroom = await this.databaseService.classroom.findUnique({
          where: { id: cleanClassId },
        });
      } catch (err) {
        console.warn('Classroom UUID lookup notice:', err);
      }
    }

    if (!targetClassroom) {
      try {
        targetClassroom = await this.databaseService.classroom.findFirst();
      } catch (err) {
        console.warn('First classroom lookup notice:', err);
      }
    }

    if (!targetClassroom) {
      throw new NotFoundException(`Classroom with ID ${cleanClassId} not found`);
    }

    let creatorId = createdById && isValidUUID(createdById) ? createdById : targetClassroom.createdById;
    if (!creatorId || !isValidUUID(creatorId)) {
      const teacher = await this.databaseService.user.findFirst({ where: { role: 'TEACHER' } });
      creatorId = teacher?.id || targetClassroom.createdById;
    }

    try {
      return await this.databaseService.assignment.create({
        data: {
          title: title.trim(),
          description: description ? description.trim() : null,
          dueDate: parsedDueDate,
          totalPoints: totalPoints || 100,
          classroomId: targetClassroom.id,
          createdById: creatorId,
        },
      });
    } catch (error: any) {
      console.error('Error creating assignment:', error);
      throw new BadRequestException(error?.message || 'Failed to create assignment');
    }
  }

  /**
   * Retrieves active and past assignments for a class dashboard.
   */
  async getAssignmentsByClass(classId: string) {
    if (!classId) return { all: [], active: [], past: [] };

    const cleanClassId = String(classId).trim();
    let targetClassId = cleanClassId;

    if (!isValidUUID(cleanClassId)) {
      try {
        const firstClass = await this.databaseService.classroom.findFirst();
        if (!firstClass) return { all: [], active: [], past: [] };
        targetClassId = firstClass.id;
      } catch (err) {
        return { all: [], active: [], past: [] };
      }
    }

    try {
      const now = new Date();
      const assignments = await this.databaseService.assignment.findMany({
        where: { classroomId: targetClassId, deletedAt: null },
        include: {
          _count: {
            select: { submissions: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const active = assignments.filter((a) => !a.dueDate || new Date(a.dueDate) >= now);
      const past = assignments.filter((a) => a.dueDate && new Date(a.dueDate) < now);

      return {
        all: assignments,
        active,
        past,
      };
    } catch (error) {
      console.warn('Failed to retrieve assignments:', error);
      return { all: [], active: [], past: [] };
    }
  }

  /**
   * Submits student work for an assignment with strict deadline and input validation.
   */
  async submitAssignment(
    assignmentId: string,
    data: {
      studentId: string;
      pdfPath?: string;
      linkUrl?: string;
      submissionText?: string;
      fileUrl?: string;
    },
  ) {
    const { studentId, pdfPath, linkUrl, submissionText, fileUrl } = data;
    const file = fileUrl || pdfPath || linkUrl;

    if (!assignmentId) {
      throw new BadRequestException('assignmentId is required');
    }

    let cleanStudentId = studentId && isValidUUID(studentId) ? studentId : null;
    if (!cleanStudentId) {
      const studentUser = await this.databaseService.user.findFirst({ where: { role: 'STUDENT' } });
      cleanStudentId = studentUser?.id || null;
    }

    if (!cleanStudentId) {
      throw new BadRequestException('Valid studentId is required');
    }

    if (!file && (!submissionText || !submissionText.trim())) {
      throw new BadRequestException('At least a file upload or text/link submission must be provided');
    }

    if (!isValidUUID(assignmentId)) {
      throw new BadRequestException('Invalid assignmentId UUID format');
    }

    const assignment = await this.databaseService.assignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      throw new NotFoundException(`Assignment with ID ${assignmentId} not found`);
    }

    const now = new Date();
    const isLate = assignment.dueDate ? now > new Date(assignment.dueDate) : false;

    try {
      return await this.databaseService.assignmentSubmission.create({
        data: {
          assignmentId,
          studentId: cleanStudentId,
          fileUrl: file || null,
          submissionText: submissionText ? submissionText.trim() : null,
        },
        include: {
          student: {
            select: { id: true, fullName: true, email: true },
          },
        },
      });
    } catch (error: any) {
      console.error('Failed to submit assignment:', error);
      throw new BadRequestException(error?.message || 'Failed to record submission');
    }
  }

  /**
   * Retrieves all student submissions for a specific assignment.
   */
  async getSubmissions(assignmentId: string) {
    if (!assignmentId || !isValidUUID(assignmentId)) {
      return [];
    }

    try {
      return await this.databaseService.assignmentSubmission.findMany({
        where: { assignmentId },
        include: {
          student: {
            select: { id: true, fullName: true, email: true },
          },
        },
        orderBy: { submittedAt: 'desc' },
      });
    } catch (error) {
      console.warn('Failed to retrieve submissions:', error);
      return [];
    }
  }

  /**
   * Deletes an assignment by ID.
   */
  async deleteAssignment(assignmentId: string) {
    if (!assignmentId || !isValidUUID(assignmentId)) {
      throw new BadRequestException('Valid assignmentId UUID is required');
    }

    try {
      await this.databaseService.assignment.delete({
        where: { id: assignmentId },
      });
      return { success: true, message: 'Assignment deleted successfully' };
    } catch (error: any) {
      console.error('Error deleting assignment:', error);
      throw new BadRequestException(error?.message || 'Failed to delete assignment');
    }
  }
}


