const asyncHandler = require("../middleware/asyncHandler");
const { addFeedback } = require("../models/feedbackModel");
const { getComplaintById } = require("../models/complaintModel");

const addFeedbackHandler = asyncHandler(async (req, res) => {
  const { complaint_id, rating, comment } = req.body;

  const complaint = await getComplaintById(complaint_id);
  if (!complaint) {
    return res.status(404).json({ success: false, message: "Complaint not found" });
  }

  if (complaint.user_id !== req.user.id) {
    return res.status(403).json({ success: false, message: "You can only submit feedback for your complaint" });
  }

  if (complaint.status !== "Resolved") {
    return res.status(400).json({ success: false, message: "Feedback can only be added after resolution" });
  }

  await addFeedback({ complaint_id, rating, comment });

  res.status(201).json({
    success: true,
    message: "Feedback submitted successfully"
  });
});

module.exports = {
  addFeedbackHandler
};
