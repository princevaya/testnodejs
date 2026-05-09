const express = require("express");
const { body, query } = require("express-validator");
const {
  createComplaintHandler,
  getAllComplaintsHandler,
  getMyComplaintsHandler,
  getAssignedComplaintsHandler,
  getStaffListHandler,
  assignComplaintHandler,
  updateComplaintStatusHandler
} = require("../controllers/complaintController");
const { protect, authorize } = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validateRequest");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

router.post(
  "/create",
  protect,
  authorize("User", "Admin", "Staff"),
  upload.single("image"),
  [
    body("title").trim().notEmpty().withMessage("Title is required"),
    body("description").trim().notEmpty().withMessage("Description is required"),
    body("building").trim().notEmpty().withMessage("Building is required"),
    body("floor").trim().notEmpty().withMessage("Floor is required"),
    body("room").trim().notEmpty().withMessage("Room is required")
  ],
  validateRequest,
  createComplaintHandler
);

router.get(
  "/all",
  protect,
  authorize("Admin"),
  [
    query("status").optional().isIn(["Pending", "In Progress", "Resolve Requested", "Resolved"]),
    query("category").optional().isIn(["Network", "Plumbing", "Electrical", "General"]),
    query("priority").optional().isIn(["High", "Medium", "Low"])
  ],
  validateRequest,
  getAllComplaintsHandler
);

router.get("/my", protect, authorize("User", "Admin", "Staff"), getMyComplaintsHandler);

router.get("/assigned", protect, authorize("Staff"), getAssignedComplaintsHandler);

router.get("/staff", protect, authorize("Admin"), getStaffListHandler);

router.post(
  "/assign",
  protect,
  authorize("Admin"),
  [
    body("complaint_id").isInt({ min: 1 }).withMessage("Valid complaint_id is required"),
    body("staff_id").isInt({ min: 1 }).withMessage("Valid staff_id is required")
  ],
  validateRequest,
  assignComplaintHandler
);

router.patch(
  "/update-status",
  protect,
  authorize("Admin", "Staff"),
  [
    body("complaint_id").isInt({ min: 1 }).withMessage("Valid complaint_id is required"),
    body("status")
      .isIn(["Pending", "In Progress", "Resolve Requested", "Resolved"])
      .withMessage("Status must be Pending, In Progress, Resolve Requested, or Resolved")
  ],
  validateRequest,
  updateComplaintStatusHandler
);

module.exports = router;
