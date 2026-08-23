import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MaterialsService } from './materials.service';
import { createMulterOptions } from '../../common/config/multer.config';
import * as fs from 'fs';
import * as path from 'path';

// Ensure upload destination folder exists on application start
const uploadDir = path.join(process.cwd(), 'uploads', 'materials');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

@Controller()
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  /**
   * POST /materials and POST /materials/upload
   * Instructor endpoint for uploading course materials.
   * File is saved locally to ./uploads/materials.
   */
  @Post('materials/upload')
  @Post('materials')
  @UseInterceptors(FileInterceptor('file', createMulterOptions('materials')))
  async uploadMaterial(
    @UploadedFile() file: any,
    @Body() body: any,
    @Req() req: any,
  ) {
    if (!file && !body?.fileUrl) {
      throw new BadRequestException('File is required for material upload');
    }

    const title = body?.title || body?.materialTitle || file?.originalname || 'Uploaded Document';
    const classId = body?.classId || body?.classroomId || req.params?.classId;
    const description = body?.description;
    const userId = req.user?.id || req.user?.sub || body?.uploadedById;

    const filePath = file ? `/uploads/materials/${file.filename}` : body?.fileUrl;
    const mimetype = (file?.mimetype || '').toLowerCase();
    const ext = (file?.originalname || filePath || '').toLowerCase();

    let fileType = 'DOCUMENT';
    if (mimetype.includes('pdf') || ext.endsWith('.pdf')) {
      fileType = 'PDF';
    } else if (mimetype.includes('image') || ext.match(/\.(png|jpe?g|gif|webp|svg)$/)) {
      fileType = 'IMAGE';
    } else if (mimetype.includes('presentation') || mimetype.includes('powerpoint') || ext.match(/\.(ppt|pptx)$/)) {
      fileType = 'SLIDES';
    } else if (mimetype.includes('audio') || ext.match(/\.(mp3|wav|ogg|webm|m4a)$/)) {
      fileType = 'AUDIO';
    }

    return await this.materialsService.uploadMaterial({
      title: title.trim(),
      description,
      filePath,
      classId,
      uploadedById: userId,
      fileType,
      fileSizeBytes: file?.size || 0,
    });
  }

  /**
   * GET /materials/class/:classId, GET /materials/:classId, and GET /classrooms/:classId/materials
   * Endpoints to fetch all materials for a class dashboard.
   */
  @Get('materials/class/:classId')
  @Get('materials/:classId')
  @Get('classrooms/:classId/materials')
  async getMaterialsByClass(@Param('classId') classId: string) {
    return await this.materialsService.getMaterialsByClass(classId);
  }
}

