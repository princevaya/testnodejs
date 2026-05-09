const asyncHandler = require("../middleware/asyncHandler");
const {
  createComplaint,
  getComplaintById,
  getAllComplaints,
  getComplaintsByUser,
  getAssignedComplaintsForStaff,
  updateComplaintStatus,
  findPotentialDuplicate
} = require("../models/complaintModel");
const { assignComplaint } = require("../models/assignmentModel");
const { getStaffById, getStaffByUserId, getAllStaff } = require("../models/staffModel");
const { detectCategory, detectPriority } = require("../utils/smartRules");
const { canAssignComplaint, validateStatusTransition } = require("../utils/workflowRules");
const { appendComplaintToSheet } = require("../services/googleSheetsService");
const { sendComplaintCreatedEmail, sendStatusUpdatedEmail } = require("../services/emailService");

const createComplaintHandler = asyncHandler(async (req, res) => {
  const { title, description, building, floor, room } = req.body;

  const category = detectCategory(description);
  const priority = detectPriority(description);

  const duplicate = await findPotentialDuplicate({ room, category });
  if (duplicate) {
    return res.status(409).json({
      success: false,
      message: "A similar unresolved complaint already exists for this room and category",
      duplicate
    });
  }

  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

  const complaintId = await createComplaint({
    user_id: req.user.id,
    title,
    description,
    category,
    priority,
    building,
    floor,
    room,
    image_url: imageUrl,
    status: "Pending"
  });

  const complaint = await getComplaintById(complaintId);

  await appendComplaintToSheet(complaint);
  await sendComplaintCreatedEmail({ to: req.user.email, complaint });

  res.status(201).json({
    success: true,
    message: "Complaint created successfully",
    data: complaint
  });
});

const getAllComplaintsHandler = asyncHandler(async (req, res) => {
  const { status, category, priority } = req.query;
  const complaints = await getAllComplaints({ status, category, priority });

  res.status(200).json({
    success: true,
    data: complaints
  });
});

const getMyComplaintsHandler = asyncHandler(async (req, res) => {
  const complaints = await getComplaintsByUser(req.user.id);

  res.status(200).json({
    success: true,
    data: complaints
  });
});

const getAssignedComplaintsHandler = asyncHandler(async (req, res) => {
  const staff = await getStaffByUserId(req.user.id);
  if (!staff) {
    return res.status(404).json({ success: false, message: "Staff profile not found" });
  }

  const complaints = await getAssignedComplaintsForStaff(req.user.id);

  res.status(200).json({
    success: true,
    data: complaints
  });
});

const getStaffListHandler = asyncHandler(async (req, res) => {
  const staff = await getAllStaff();

  res.status(200).json({
    success: true,
    data: staff
  });
});

const assignComplaintHandler = asyncHandler(async (req, res) => {
  const { complaint_id, staff_id } = req.body;

  const complaint = await getComplaintById(complaint_id);
  if (!complaint) {
    return res.status(404).json({ success: false, message: "Complaint not found" });
  }

  const staff = await getStaffById(staff_id);
  if (!staff) {
    return res.status(404).json({ success: false, message: "Staff not found" });
  }

  if (!canAssignComplaint(complaint.status)) {
    return res.status(400).json({ success: false, message: "Resolved complaints cannot be assigned" });
  }

  await assignComplaint({ complaintId: complaint_id, staffId: staff_id });

  if (complaint.status === "Pending") {
    await updateComplaintStatus(complaint_id, "In Progress");
  }

  res.status(200).json({
    success: true,
    message: "Complaint assigned successfully",
    data: await getComplaintById(complaint_id)
  });
});

const updateComplaintStatusHandler = asyncHandler(async (req, res) => {
  const { complaint_id, status } = req.body;

  const complaint = await getComplaintById(complaint_id);
  if (!complaint) {
    return res.status(404).json({ success: false, message: "Complaint not found" });
  }

  let isAssigned = true;
  if (req.user.role === "Staff") {
    const staffComplaints = await getAssignedComplaintsForStaff(req.user.id);
    isAssigned = staffComplaints.some((item) => item.id === Number(complaint_id));
    if (!isAssigned) {
      return res.status(403).json({ success: false, message: "You can only update your assigned complaints" });
    }
  }

  const validation = validateStatusTransition({
    currentStatus: complaint.status,
    nextStatus: status,
    role: req.user.role,
    isAssignedToStaff: isAssigned,
    hasAssignee: Boolean(complaint.assigned_staff_id)
  });

  if (!validation.valid) {
    return res.status(400).json({ success: false, message: validation.message });
  }

  await updateComplaintStatus(complaint_id, status);
  const updatedComplaint = await getComplaintById(complaint_id);

  await sendStatusUpdatedEmail({ to: updatedComplaint.user_email, complaint: updatedComplaint });

  res.status(200).json({
    success: true,
    message: "Complaint status updated successfully",
    data: updatedComplaint
  });
});

module.exports = {
  createComplaintHandler,
  getAllComplaintsHandler,
  getMyComplaintsHandler,
  getAssignedComplaintsHandler,
  getStaffListHandler,
  assignComplaintHandler,
  updateComplaintStatusHandler
};
