import { diskStorage } from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { extname, join } from 'path';
import { BadRequestException } from '@nestjs/common';

/**
 * Creates Multer options configured for disk storage under ./uploads/<subfolder>.
 * Ensures destination directory exists before saving files.
 *
 * @param subfolder Subdirectory inside uploads/ (e.g. 'materials', 'assignments', 'submissions')
 */
export const createMulterOptions = (subfolder: string) => {
  const uploadPath = join(process.cwd(), 'uploads', subfolder);

  return {
    storage: diskStorage({
      destination: (req: any, file: any, cb: any) => {
        if (!existsSync(uploadPath)) {
          mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
      },
      filename: (req: any, file: any, cb: any) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const ext = extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
      },
    }),
    fileFilter: (req: any, file: any, cb: any) => {
      const allowedExtensions = /\.(pdf|doc|docx|ppt|pptx|xls|xlsx|zip|rar|png|jpg|jpeg|gif|webp|svg|txt)$/i;

      const extMatch = file.originalname ? allowedExtensions.test(file.originalname) : false;
      const mimeMatch = file.mimetype
        ? /^image\/(png|jpeg|jpg|gif|webp|svg\+xml)$/i.test(file.mimetype) ||
          /^application\/(pdf|zip|x-zip|x-zip-compressed|x-rar|msword|vnd\.ms-|vnd\.openxmlformats-officedocument|octet-stream)/i.test(file.mimetype) ||
          /^text\//i.test(file.mimetype)
        : false;

      if (extMatch || mimeMatch || !file.mimetype) {
        cb(null, true);
      } else {
        cb(new BadRequestException('Only PDF, documents, slides, zip, and image files are allowed'), false);
      }
    },
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB limit
    },
  };
};
