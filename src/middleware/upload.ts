import multer from 'multer'

const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp'])

export const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED.has(file.mimetype)) {
      cb(new Error('INVALID_IMAGE_TYPE'))
      return
    }
    cb(null, true)
  },
})

/** Field name `file`. Max 5MB. JPEG, PNG, or WebP only. */
export const uploadSingleFile = upload.single('file')

/** Field name `files`. Up to 4 files, max 5MB each. JPEG, PNG, or WebP only. */
export const uploadPostFiles = upload.array('files', 4)
