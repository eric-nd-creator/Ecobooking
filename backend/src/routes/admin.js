const express = require('express');
const router = express.Router();
const {
  getMembers, getCoaches, getBallBoys,
  addUser, deleteUser, getMemberAccount,
  assignBallBoy, getAnalytics
} = require('../controllers/adminController');
const { auth, checkRole } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const adminOnly = [auth, checkRole('admin')];

router.get('/members', ...adminOnly, asyncHandler(getMembers));
router.get('/members/:id', ...adminOnly, asyncHandler(getMemberAccount));
router.get('/coaches', ...adminOnly, asyncHandler(getCoaches));
router.get('/ballboys', ...adminOnly, asyncHandler(getBallBoys));
router.post('/users', ...adminOnly, asyncHandler(addUser));
router.delete('/users/:id', ...adminOnly, asyncHandler(deleteUser));
router.post('/assign-ballboy', ...adminOnly, asyncHandler(assignBallBoy));
router.get('/analytics', ...adminOnly, asyncHandler(getAnalytics));

module.exports = router;
