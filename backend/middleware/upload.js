import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const uploadDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'attachment-' + uniqueSuffix + path.extname(file.originalname).toLowerCase());
    }
});

// Strict file type & extension filter
const chatFileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');

    // Strictly blocked executables and scripts
    const blockedExts = ['exe', 'bat', 'cmd', 'sh', 'js', 'apk', 'vbs', 'msi', 'ps1', 'jar'];
    if (blockedExts.includes(ext)) {
        const err = new Error('File type not allowed. Executable and script files are strictly blocked for security.');
        err.status = 400;
        return cb(err, false);
    }

    // Allowed extensions
    const allowedExts = [
        'jpg', 'jpeg', 'png', 'webp',
        'pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'zip', 'rar'
    ];

    if (!allowedExts.includes(ext)) {
        const err = new Error('File type not supported. Allowed formats: images (JPG, PNG, WEBP) and documents (PDF, DOCX, PPTX, XLSX, TXT, ZIP, RAR).');
        err.status = 400;
        return cb(err, false);
    }

    cb(null, true);
};

// Create multer instances
export const upload = multer({
    storage: storage,
    limits: {
        fileSize: 20 * 1024 * 1024 // 20 MB limit
    },
    fileFilter: chatFileFilter
});

export const uploadSingle = upload.single('file');
export const uploadMultiple = upload.array('files', 5);
