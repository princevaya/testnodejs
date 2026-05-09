const express = require("express");
const { body } = require("express-validator");
const { addFeedbackHandler } = require("../controllers/feedbackController");
const { protect, authorize } = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validateRequest");

const router = express.Router();

router.post(
  "/add",
  protect,
  authorize("User", "Admin", "Staff"),
  [
    body("complaint_id").isInt({ min: 1 }).withMessage("Valid complaint_id is required"),
    body("rating").isInt({ min: 1, max: 5 }).withMessage("Rating must be between 1 and 5"),
    body("comment").optional().isString().isLength({ max: 1000 })
  ],
  validateRequest,
  addFeedbackHandler
);

module.exports = router;
