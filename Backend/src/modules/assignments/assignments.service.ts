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
    deadline?: string | Date;
    dueDate?: string | Date;
    totalPoints?: number;
    classId: string;
    createdById?: string;
  }) {
    const { title, description, deadline, dueDate, totalPoints, classId, createdById } = data;
    const targetDueDate = dueDate || deadline;

    if (!title || !classId || !targetDueDate) {
      throw new BadRequestException('title, classId, and due date/deadline are required');
    }

    const parsedDueDate = new Date(targetDueDate);
    if (isNaN(parsedDueDate.getTime())) {
      throw new BadRequestException('Invalid due date format');
    }

    // Verify classroom exists
    const classroom = await this.databaseService.classroom.findUnique({
      where: { id: classId },
    });

    if (!classroom) {
      throw new NotFoundException(`Classroom with ID ${classId} not found`);
    }

    const creatorId = createdById || classroom.createdById;

    return await this.databaseService.assignment.create({
      data: {
        title,
        description: description || null,
        dueDate: parsedDueDate,
        totalPoints: totalPoints || 100,
        classroomId: classId,
        createdById: creatorId,
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
      where: { classroomId: classId },
      include: {
        _count: {
          select: { submissions: true },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    const active = assignments.filter((a) => a.dueDate && new Date(a.dueDate) >= now);
    const past = assignments.filter((a) => a.dueDate && new Date(a.dueDate) < now);

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
      submissionText?: string;
      fileUrl?: string;
    },
  ) {
    const { studentId, pdfPath, linkUrl, submissionText, fileUrl } = data;
    const file = fileUrl || pdfPath || linkUrl;

    if (!assignmentId || !studentId) {
      throw new BadRequestException('assignmentId and studentId are required');
    }

    // Validate that at least a file or text submission is provided
    if (!file && (!submissionText || !submissionText.trim())) {
      throw new BadRequestException('At least a file upload or text submission must be provided');
    }

    // Fetch assignment to verify existence and check due date
    const assignment = await this.databaseService.assignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      throw new NotFoundException(`Assignment with ID ${assignmentId} not found`);
    }

    // Strict deadline validation if dueDate exists
    const now = new Date();
    if (assignment.dueDate && now > new Date(assignment.dueDate)) {
      throw new BadRequestException('Assignment deadline has passed. Submissions are closed.');
    }

    return await this.databaseService.assignmentSubmission.create({
      data: {
        assignmentId,
        studentId,
        fileUrl: file || null,
        submissionText: submissionText ? submissionText.trim() : null,
      },
      include: {
        student: {
          select: { id: true, fullName: true, email: true },
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

    return await this.databaseService.assignmentSubmission.findMany({
      where: { assignmentId },
      include: {
        student: {
          select: { id: true, fullName: true, email: true },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });
  }
}

