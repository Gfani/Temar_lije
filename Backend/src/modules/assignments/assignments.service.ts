import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class AssignmentsService {
  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Creates a new classroom assignment.
   */
  async createAssignment(data: {
    title: string;
    description?: string;
    guidePath?: string;
    deadline: string | Date;
    classId: string;
  }) {
    const { title, description, guidePath, deadline, classId } = data;

    if (!title || !classId || !deadline) {
      throw new BadRequestException('title, classId, and deadline are required');
    }

    const parsedDeadline = new Date(deadline);
    if (isNaN(parsedDeadline.getTime())) {
      throw new BadRequestException('Invalid deadline date format');
    }

    // Verify classroom exists
    const classroom = await this.databaseService.classroom.findUnique({
      where: { id: classId },
    });

    if (!classroom) {
      throw new NotFoundException(`Classroom with ID ${classId} not found`);
    }

    return await this.databaseService.assignment.create({
      data: {
        title,
        description: description || null,
        guidePath: guidePath || null,
        deadline: parsedDeadline,
        classId,
      },
    });
  }

  /**
   * Retrieves active and past assignments for a class dashboard.
   */
  async getAssignmentsByClass(classId: string) {
    if (!classId) {
      throw new BadRequestException('classId parameter is required');
    }

    const now = new Date();

    const assignments = await this.databaseService.assignment.findMany({
      where: { classId },
      include: {
        _count: {
          select: { submissions: true },
        },
      },
      orderBy: { deadline: 'asc' },
    });

    const active = assignments.filter((a) => new Date(a.deadline) >= now);
    const past = assignments.filter((a) => new Date(a.deadline) < now);

    return {
      all: assignments,
      active,
      past,
    };
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
    },
  ) {
    const { studentId, pdfPath, linkUrl } = data;

    if (!assignmentId || !studentId) {
      throw new BadRequestException('assignmentId and studentId are required');
    }

    // Validate that at least a file or link URL is provided
    if (!pdfPath && (!linkUrl || !linkUrl.trim())) {
      throw new BadRequestException('At least a file upload or a link URL must be provided');
    }

    // Fetch assignment to verify existence and check deadline
    const assignment = await this.databaseService.assignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      throw new NotFoundException(`Assignment with ID ${assignmentId} not found`);
    }

    // Strict deadline validation
    const now = new Date();
    if (now > new Date(assignment.deadline)) {
      throw new BadRequestException('Assignment deadline has passed. Submissions are closed.');
    }

    return await this.databaseService.submission.create({
      data: {
        assignmentId,
        studentId,
        pdfPath: pdfPath || null,
        linkUrl: linkUrl ? linkUrl.trim() : null,
      },
      include: {
        student: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  /**
   * Retrieves all student submissions for a specific assignment.
   */
  async getSubmissions(assignmentId: string) {
    if (!assignmentId) {
      throw new BadRequestException('assignmentId parameter is required');
    }

    const assignment = await this.databaseService.assignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      throw new NotFoundException(`Assignment with ID ${assignmentId} not found`);
    }

    return await this.databaseService.submission.findMany({
      where: { assignmentId },
      include: {
        student: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });
  }
}
