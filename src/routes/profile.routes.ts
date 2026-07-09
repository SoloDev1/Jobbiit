import { Router } from 'express'
import multer from 'multer'
import rateLimit from 'express-rate-limit'
import { authenticate } from '../middleware/authenticate'
import { validate } from '../middleware/validate'
import { uploadSingleFile } from '../middleware/upload'
import {
  createProfileSchema,
  updateProfileSchema,
  addExperienceSchema,
  addEducationSchema,
  addSkillsSchema,
} from '../schemas/profile.schema'
import * as ProfileController from '../controllers/profile.controller'

const router = Router()

const cvLimit = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 3, // Limit each IP to 3 requests per day
  message: 'Daily CV upload limit reached.',
  standardHeaders: true,
  legacyHeaders: false,
})

const uploadCvFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (_req, file, cb) => {
    const allowed = new Set([
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ])
    if (!allowed.has(file.mimetype)) {
      cb(new Error('INVALID_FILE_TYPE'))
      return
    }
    cb(null, true)
  },
}).single('cv')

router.use(authenticate)

router.post('/', validate(createProfileSchema), ProfileController.createProfile)
router.patch('/', validate(updateProfileSchema), ProfileController.updateProfile)

router.post(
  '/experience',
  validate(addExperienceSchema),
  ProfileController.addExperience,
)
router.delete('/experience/:id', ProfileController.deleteExperience)

router.post(
  '/education',
  validate(addEducationSchema),
  ProfileController.addEducation,
)
router.delete('/education/:id', ProfileController.deleteEducation)

router.post('/skills', validate(addSkillsSchema), ProfileController.addSkills)

router.post('/avatar', uploadSingleFile, ProfileController.uploadAvatar)
router.post('/banner', uploadSingleFile, ProfileController.uploadBanner)
router.post('/upload-cv', cvLimit, uploadCvFile, ProfileController.uploadAndParseCv)

router.get('/me', ProfileController.getProfile)

export default router
