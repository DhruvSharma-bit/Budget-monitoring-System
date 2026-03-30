const express = require('express')
const eventsController = require('../controllers/events.controller')
const { authenticate, requireAdmin } = require('../middlewares/auth')

const router = express.Router()

router.get('/', eventsController.listEvents)
router.get('/:eventId', eventsController.getEvent)
router.post('/', authenticate, requireAdmin, eventsController.createEvent)
router.patch('/:eventId', authenticate, requireAdmin, eventsController.updateEvent)

router.post('/:eventId/funding-sources', authenticate, requireAdmin, eventsController.createFundingSource)
router.patch(
  '/:eventId/funding-sources/:sourceId',
  authenticate,
  requireAdmin,
  eventsController.updateFundingSource,
)
router.delete(
  '/:eventId/funding-sources/:sourceId',
  authenticate,
  requireAdmin,
  eventsController.deleteFundingSource,
)

router.post('/:eventId/categories', authenticate, requireAdmin, eventsController.createCategory)
router.patch('/:eventId/categories/:categoryId', authenticate, requireAdmin, eventsController.updateCategory)
router.delete('/:eventId/categories/:categoryId', authenticate, requireAdmin, eventsController.deleteCategory)

module.exports = router
