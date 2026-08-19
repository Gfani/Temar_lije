import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MaterialsService } from './materials.service';
import { createMulterOptions } from '../../common/config/multer.config';

@Controller('materials')
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  /**
   * POST /materials/upload
   * Instructor endpoint for uploading course materials.
   * File is saved locally to ./uploads/materials.
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', createMulterOptions('materials')))
  async uploadMaterial(
    @UploadedFile() file: any,
    @Body('title') title: string,
    @Body('classId') classId: string,
    @Body('description') description?: string,
  ) {
    if (!file) {
      throw new BadRequestException('File is required for material upload');
    }

    const filePath = `/uploads/materials/${file.filename}`;
    const mimetype = (file.mimetype || '').toLowerCase();
    const ext = (file.originalname || '').toLowerCase();

    let fileType = 'DOCUMENT';
    if (mimetype.includes('pdf') || ext.endsWith('.pdf')) {
      fileType = 'PDF';
    } else if (mimetype.includes('image') || ext.match(/\.(png|jpe?g|gif|webp|svg)$/)) {
      fileType = 'IMAGE';
    } else if (mimetype.includes('presentation') || mimetype.includes('powerpoint') || ext.match(/\.(ppt|pptx)$/)) {
      fileType = 'SLIDES';
    }

    return await this.materialsService.uploadMaterial({
      title,
      description,
      filePath,
      classId,
      fileType,
      fileSizeBytes: file.size,
    });
  }

  /**
   * GET /materials/class/:classId
   * Endpoint to fetch all materials for a class dashboard.
   */
  @Get('class/:classId')
  async getMaterialsByClass(@Param('classId') classId: string) {
    return await this.materialsService.getMaterialsByClass(classId);
  }
}
