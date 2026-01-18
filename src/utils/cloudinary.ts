import { v2 as cloudinary } from 'cloudinary';

import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import type { Request } from 'express';
import dotenv from 'dotenv';
import { Readable } from 'stream';

dotenv.config();

// Cloudinary upload result interface
export interface CloudinaryUploadResult {
    public_id: string;
    secure_url: string;
    url: string;
    format: string;
    resource_type: string;
    bytes: number;
    width?: number;
    height?: number;
    created_at: string;
}

// Extended params interface for CloudinaryStorage
interface CloudinaryStorageParams {
    folder: string;
    allowed_formats: string[];
    resource_type: string;
    public_id: (req: Request, file: Express.Multer.File) => string;
}

// Configure Cloudinary
const configureCloudinary = () => {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
        console.warn('⚠️  Cloudinary credentials not found in environment variables');
        console.warn('   Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET');
        return false;
    }

    cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true
    });

    console.log('✅ Cloudinary configured successfully');
    return true;
};

// Initialize configuration
const cloudinaryConfigured = configureCloudinary();

// Create storage engine for Cloudinary (for multer middleware)
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req: Request, file: Express.Multer.File) => {
        const fileName = file.originalname.split('.').slice(0, -1).join('.');
        const timestamp = Date.now();
        
        return {
            folder: 'security_reports',
            allowed_formats: ['pdf', 'png', 'jpg', 'jpeg', 'txt'],
            resource_type: 'auto',
            public_id: `report_${fileName}_${timestamp}`
        };
    }
});

// Configure multer middleware for file uploads via HTTP
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max file size
    },
    fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
        // Accept PDF, image files, and text files only
        if (
            file.mimetype === 'application/pdf' ||
            file.mimetype.startsWith('image/') ||
            file.mimetype === 'text/plain'
        ) {
            cb(null, true);
        } else {
            cb(new Error('Only PDF, image, and text files are allowed'));
        }
    }
});

/**
 * Upload a buffer directly to Cloudinary
 * Used for programmatic uploads like PDF generation
 */
const uploadBuffer = (
    fileBuffer: Buffer,
    fileName: string,
    folder: string = 'security_reports'
): Promise<CloudinaryUploadResult> => {
    return new Promise((resolve, reject) => {
        if (!isConfigured()) {
            reject(new Error('Cloudinary is not configured. Check your environment variables.'));
            return;
        }

        // Generate unique public ID
        const timestamp = Date.now();
        const cleanFileName = fileName.replace(/\.[^/.]+$/, ''); // Remove extension if present
        const publicId = `${folder}/${cleanFileName}_${timestamp}`;

        // Create readable stream from buffer
        const stream = Readable.from(fileBuffer);

        const uploadStream = cloudinary.uploader.upload_stream(
            {
                resource_type: 'raw', // PDFs must use 'raw' resource type
                public_id: publicId,
                overwrite: false,
                format: 'pdf',
                invalidate: true, // Invalidate CDN cache
            },
            (error, result) => {
                if (error) {
                    console.error('❌ Cloudinary upload error:', error);
                    reject(new Error(`Cloudinary upload failed: ${error.message}`));
                } else if (result) {
                    console.log('✅ Cloudinary upload success:', result.public_id);
                    resolve(result as CloudinaryUploadResult);
                } else {
                    reject(new Error('No result returned from Cloudinary'));
                }
            }
        );

        // Pipe the stream to Cloudinary
        stream.pipe(uploadStream);
    });
};

/**
 * Delete file from Cloudinary by public ID
 */
const deleteFile = async (publicId: string): Promise<{ result: string }> => {
    try {
        if (!isConfigured()) {
            throw new Error('Cloudinary is not configured');
        }

        // PDFs are stored as 'raw' resources
        const result = await cloudinary.uploader.destroy(publicId, { 
            resource_type: 'raw',
            invalidate: true 
        });
        
        console.log(`🗑️  Cloudinary delete: ${publicId} - ${result.result}`);
        return result;
    } catch (error: any) {
        console.error(`❌ Failed to delete from Cloudinary: ${error.message}`);
        throw new Error(`Failed to delete file: ${error.message}`);
    }
};

/**
 * Get file URL by public ID with optional transformations
 */
const getFileUrl = (publicId: string, options: Record<string, any> = {}): string => {
    if (!isConfigured()) {
        throw new Error('Cloudinary is not configured');
    }

    return cloudinary.url(publicId, {
        secure: true,
        resource_type: 'raw',
        ...options
    });
};

/**
 * Check if Cloudinary is properly configured
 */
const isConfigured = (): boolean => {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    const configured = !!(
        cloudName && 
        apiKey && 
        apiSecret &&
        cloudName !== 'your_cloud_name_here' &&
        apiKey !== 'your_api_key_here' &&
        apiSecret !== 'your_api_secret_here' &&
        cloudName.trim() !== '' &&
        apiKey.trim() !== '' &&
        apiSecret.trim() !== ''
    );

    if (!configured && !process.env.SUPPRESS_CLOUDINARY_WARNING) {
        console.warn('⚠️  Cloudinary not configured. Using local storage as fallback.');
    }

    return configured;
};

/**
 * Verify Cloudinary connection (useful for health checks)
 */
const verifyConnection = async (): Promise<boolean> => {
    try {
        if (!isConfigured()) {
            console.warn('⚠️  Cloudinary is not configured. Using local storage fallback.');
            return false;
        }

        // Ping Cloudinary by fetching account info
        await cloudinary.api.ping();
        console.log('✅ Cloudinary connection verified');
        return true;
    } catch (error: any) {
        console.error('❌ Cloudinary connection failed:', error.message);
        return false;
    }
};

/**
 * Get Cloudinary configuration status
 */
const getConfigStatus = () => {
    return {
        configured: isConfigured(),
        cloudName: process.env.CLOUDINARY_CLOUD_NAME || 'NOT_SET',
        hasApiKey: !!process.env.CLOUDINARY_API_KEY,
        hasApiSecret: !!process.env.CLOUDINARY_API_SECRET,
    };
};

export {
    cloudinary,
    upload,
    uploadBuffer,
    deleteFile,
    getFileUrl,
    isConfigured,
    verifyConnection,
    getConfigStatus
};

export default {
    cloudinary,
    upload,
    uploadBuffer,
    deleteFile,
    getFileUrl,
    isConfigured,
    verifyConnection,
    getConfigStatus
};