import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AssignmentsService } from './assignments.service';
import { createMulterOptions } from '../../common/config/multer.config';

@Controller('assignments')
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  /**
   * POST /assignments/create
   * Instructor endpoint to create an assignment (title, description, guide file/link, deadline, classId).
   */
  @Post('create')
  @UseInterceptors(FileInterceptor('file', createMulterOptions('assignments')))
  async createAssignment(
    @UploadedFile() file: any,
    @Body('title') title: string,
    @Body('description') description: string,
    @Body('deadline') deadline: string,
    @Body('classId') classId: string,
    @Body('guideUrl') guideUrl?: string,
  ) {
    const guidePath = file ? `/uploads/assignments/${file.filename}` : guideUrl || undefined;

    return await this.assignmentsService.createAssignment({
      title,
      description: description ? `${description}${guidePath ? `\nGuide: ${guidePath}` : ''}` : guidePath,
      deadline,
      classId,
    });
  }

  /**
   * GET /assignments/class/:classId
   * Display active and past assignments for a class dashboard.
   */
  @Get('class/:classId')
  async getAssignmentsByClass(@Param('classId') classId: string) {
    return await this.assignmentsService.getAssignmentsByClass(classId);
  }

  /**
   * POST /assignments/:id/submit
   * Student endpoint to submit work. Supports PDF file upload (to ./uploads/submissions), link URL, or both.
   */
  @Post(':id/submit')
  @UseInterceptors(FileInterceptor('file', createMulterOptions('submissions')))
  async submitAssignment(
    @Param('id') assignmentId: string,
    @UploadedFile() file: any,
    @Body('studentId') studentId: string,
    @Body('linkUrl') linkUrl?: string,
  ) {
    const pdfPath = file ? `/uploads/submissions/${file.filename}` : undefined;

    return await this.assignmentsService.submitAssignment(assignmentId, {
      studentId,
      pdfPath,
      linkUrl,
    });
  }

  /**
   * GET /assignments/:id/submissions
   * Instructor endpoint to view all student submissions for an assignment.
   */
  @Get(':id/submissions')
  async getSubmissions(@Param('id') assignmentId: string) {
    return await this.assignmentsService.getSubmissions(assignmentId);
  }
}
