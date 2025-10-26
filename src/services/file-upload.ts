import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import multer from 'multer';
import multerS3 from 'multer-s3';
import dotenv from 'dotenv';

dotenv.config();

// Configure AWS SDK v3
const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

// Helper function to generate unique filename
const generateFileName = (originalname: string): string => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = originalname.split('.').pop();
  return `${timestamp}-${randomString}.${extension}`;
};

// File type definition for TypeScript
interface S3File extends Express.Multer.File {
  location: string;
  key: string;
  bucket: string;
  etag: string;
}

// Multer S3 upload configuration for audio files
export const uploadAudio = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: process.env.AWS_S3_BUCKET_NAME!,
    // acl: 'public-read',
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      const fileName = generateFileName(file.originalname);
      cb(null, `podcasts/audio/${fileName}`);
    }
  }),
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit for audio
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed!'));
    }
  }
});

// Multer S3 upload configuration for video files
export const uploadVideo = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: process.env.AWS_S3_BUCKET_NAME!,
    // acl: 'public-read',
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      const fileName = generateFileName(file.originalname);
      cb(null, `podcasts/video/${fileName}`);
    }
  }),
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB limit for video
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed!'));
    }
  }
});

// Function to delete file from S3
export const deleteFileFromS3 = async (fileUrl: string): Promise<boolean> => {
  try {
    // Extract key from URL
    const url = new URL(fileUrl);
    const key = url.pathname.substring(1); // Remove leading slash

    const command = new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: key
    });

    await s3Client.send(command);
    console.log(`File deleted successfully: ${key}`);
    return true;
  } catch (error) {
    console.error('Error deleting file from S3:', error);
    throw error;
  }
};

// Test S3 connection
export const testS3Connection = async (): Promise<boolean> => {
  try {
    const { ListBucketsCommand } = await import('@aws-sdk/client-s3');
    const command = new ListBucketsCommand({});
    await s3Client.send(command);
    console.log('✅ S3 connection successful');
    return true;
  } catch (error) {
    console.error('❌ S3 connection failed:', error);
    return false;
  }
};

// Add this to your upload config file (after the existing uploadAudio and uploadVideo)

// Multer S3 upload configuration for image files (thumbnails)
export const uploadImage = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: process.env.AWS_S3_BUCKET_NAME!,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      const fileName = generateFileName(file.originalname);
      cb(null, `podcasts/thumbnails/${fileName}`);
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit for images
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Combined uploader for podcasts (audio, video, and thumbnail)
export const uploadPodcast = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: process.env.AWS_S3_BUCKET_NAME!,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      const fileName = generateFileName(file.originalname);
      let folder = 'other';
      
      if (file.fieldname === 'audio') {
        folder = 'audio';
      } else if (file.fieldname === 'video') {
        folder = 'video';
      } else if (file.fieldname === 'thumbnail') {
        folder = 'thumbnails';
      }
      
      cb(null, `podcasts/${folder}/${fileName}`);
    }
  }),
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'audio' && file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else if (file.fieldname === 'video' && file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else if (file.fieldname === 'thumbnail' && file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type for ${file.fieldname}`));
    }
  }
});


// Add to your upload config file

// Combined uploader for articles (thumbnail only for now)
export const uploadArticle = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: process.env.AWS_S3_BUCKET_NAME!,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      const fileName = generateFileName(file.originalname);
      cb(null, `articles/thumbnails/${fileName}`);
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit for thumbnails
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'thumbnail' && file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for thumbnails'));
    }
  }
});

export { s3Client, S3File };