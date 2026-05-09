const { pool } = require("../config/db");

const createComplaint = async (payload) => {
  const {
    user_id,
    title,
    description,
    category,
    priority,
    building,
    floor,
    room,
    image_url,
    status
  } = payload;

  const [result] = await pool.execute(
    `INSERT INTO complaints
     (user_id, title, description, category, priority, building, floor, room, image_url, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [user_id, title, description, category, priority, building, floor, room, image_url, status]
  );

  return result.insertId;
};

const getComplaintById = async (id) => {
  const [rows] = await pool.execute(
    `SELECT c.*, u.name AS user_name, u.email AS user_email,
      s.id AS assigned_staff_id,
      s.name AS assigned_staff_name
     FROM complaints c
     JOIN users u ON c.user_id = u.id
     LEFT JOIN assignments a ON a.complaint_id = c.id
     LEFT JOIN staff s ON s.id = a.staff_id
     WHERE c.id = ?`,
    [id]
  );
  return rows[0] || null;
};

const getAllComplaints = async (filters = {}) => {
  const conditions = [];
  const values = [];

  if (filters.status) {
    conditions.push("c.status = ?");
    values.push(filters.status);
  }

  if (filters.category) {
    conditions.push("c.category = ?");
    values.push(filters.category);
  }

  if (filters.priority) {
    conditions.push("c.priority = ?");
    values.push(filters.priority);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const [rows] = await pool.execute(
    `SELECT c.*, u.name AS user_name,
      s.id AS assigned_staff_id,
      s.name AS assigned_staff_name
     FROM complaints c
     JOIN users u ON c.user_id = u.id
     LEFT JOIN assignments a ON a.complaint_id = c.id
     LEFT JOIN staff s ON s.id = a.staff_id
     ${whereClause}
     ORDER BY c.created_at DESC`,
    values
  );

  return rows;
};

const getComplaintsByUser = async (userId) => {
  const [rows] = await pool.execute(
    `SELECT c.*, s.name AS assigned_staff_name
     FROM complaints c
     LEFT JOIN assignments a ON a.complaint_id = c.id
     LEFT JOIN staff s ON s.id = a.staff_id
     WHERE c.user_id = ?
     ORDER BY c.created_at DESC`,
    [userId]
  );
  return rows;
};

const getAssignedComplaintsForStaff = async (staffUserId) => {
  const [rows] = await pool.execute(
    `SELECT c.*, u.name AS user_name, u.email AS user_email, s.name AS assigned_staff_name
     FROM assignments a
     JOIN staff s ON s.id = a.staff_id
     JOIN complaints c ON c.id = a.complaint_id
     JOIN users u ON u.id = c.user_id
     WHERE s.user_id = ?
     ORDER BY c.created_at DESC`,
    [staffUserId]
  );
  return rows;
};

const updateComplaintStatus = async (complaintId, status) => {
  const resolvedAt = status === "Resolved" ? new Date() : null;

  const [result] = await pool.execute(
    `UPDATE complaints
     SET status = ?, resolved_at = ?
     WHERE id = ?`,
    [status, resolvedAt, complaintId]
  );

  return result.affectedRows > 0;
};

const findPotentialDuplicate = async ({ room, category }) => {
  const [rows] = await pool.execute(
    `SELECT id, title, status
     FROM complaints
     WHERE room = ?
       AND category = ?
       AND status != 'Resolved'
     ORDER BY created_at DESC
     LIMIT 1`,
    [room, category]
  );

  return rows[0] || null;
};

module.exports = {
  createComplaint,
  getComplaintById,
  getAllComplaints,
  getComplaintsByUser,
  getAssignedComplaintsForStaff,
  updateComplaintStatus,
  findPotentialDuplicate
};
