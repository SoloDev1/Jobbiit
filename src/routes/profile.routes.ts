import { Router } from 'express'
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

router.get('/:userId', ProfileController.getProfile)

export default router
