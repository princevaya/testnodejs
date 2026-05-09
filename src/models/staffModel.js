const { pool } = require("../config/db");

const getStaffByUserId = async (userId) => {
  const [rows] = await pool.execute(
    `SELECT id, user_id, name, department
     FROM staff
     WHERE user_id = ?`,
    [userId]
  );

  return rows[0] || null;
};

const getStaffById = async (id) => {
  const [rows] = await pool.execute(
    `SELECT id, user_id, name, department
     FROM staff
     WHERE id = ?`,
    [id]
  );

  return rows[0] || null;
};

const getAllStaff = async () => {
  const [rows] = await pool.execute(
    `SELECT id, user_id, name, department
     FROM staff
     ORDER BY name ASC`
  );

  return rows;
};

module.exports = {
  getStaffByUserId,
  getStaffById,
  getAllStaff
};
