const express = require("express");
const { getDashboardSummary } = require("../controllers/dashboardController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/summary", protect, authorize("Admin"), getDashboardSummary);

module.exports = router;
