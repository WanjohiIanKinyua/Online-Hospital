const express = require('express');
const chatController = require('../controllers/chatController');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticateToken);

router.get('/unread-summary', chatController.getUnreadSummary);
router.get('/appointments', chatController.getChatAppointments);
router.get('/appointments/:appointmentId/messages', chatController.getAppointmentMessages);
router.post('/appointments/:appointmentId/messages', chatController.sendAppointmentMessage);
router.post('/appointments/:appointmentId/fallback-link', chatController.shareFallbackMeetingLink);

module.exports = router;
