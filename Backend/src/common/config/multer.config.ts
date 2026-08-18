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
      // Validate common document/pdf types
      if (
        file.mimetype.match(/\/(pdf|msword|vnd.openxmlformats-officedocument.wordprocessingml.document|plain|zip|png|jpeg|jpg)$/i) ||
        file.originalname.match(/\.(pdf|doc|docx|txt|zip|png|jpg|jpeg)$/i)
      ) {
        cb(null, true);
      } else {
        cb(new BadRequestException('Only PDF, document, zip, and image files are allowed'), false);
      }
    },
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB limit
    },
  };
};
