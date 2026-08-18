import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { LiveClassService } from './live-class.service';

/**
 * Controller providing REST API endpoints for starting, ending, and fetching tokens for live sessions.
 */
@Controller('live-class')
export class LiveClassController {
  constructor(private readonly liveClassService: LiveClassService) {}

  /**
   * POST /live-class/start
   * Teacher endpoint to initiate a live classroom session.
   *
   * @param {Object} body - Body payload containing { classId }.
   * @returns {Promise<Object>} Active live session object.
   */
  @Post('start')
  async startSession(@Body() body) {
    const classId = body?.classId;
    if (!classId) {
      throw new BadRequestException('classId is required in request body');
    }
    return await this.liveClassService.startSession(classId);
  }

  /**
   * POST /live-class/end
   * Teacher endpoint to conclude a live session and trigger final attendance report generation.
   *
   * @param {Object} body - Body payload containing { classId }.
   * @returns {Promise<Object>} Concluded session details and final attendance summary.
   */
  @Post('end')
  async endSession(@Body() body) {
    const classId = body?.classId;
    if (!classId) {
      throw new BadRequestException('classId is required in request body');
    }
    return await this.liveClassService.endSession(classId);
  }

  /**
   * GET /live-class/:classId/token
   * Student/Teacher endpoint to fetch session connection token.
   *
   * @param {string} classId - Classroom ID URL parameter.
   * @param {string} userId - User ID query parameter.
   * @param {string} [role] - Optional role query parameter ('STUDENT' or 'TEACHER').
   * @returns {Object} Access token payload.
   */
  @Get(':classId/token')
  async getSessionToken(
    @Param('classId') classId,
    @Query('userId') userId,
    @Query('role') role,
  ) {
    return this.liveClassService.generateSessionToken(classId, userId, role);
  }
}
