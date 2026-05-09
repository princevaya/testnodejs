const express = require("express");
const authRoutes = require("./authRoutes");
const complaintRoutes = require("./complaintRoutes");
const feedbackRoutes = require("./feedbackRoutes");
const dashboardRoutes = require("./dashboardRoutes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/complaints", complaintRoutes);
router.use("/feedback", feedbackRoutes);
router.use("/dashboard", dashboardRoutes);

module.exports = router;
