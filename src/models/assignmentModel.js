const { pool } = require("../config/db");

const assignComplaint = async ({ complaintId, staffId }) => {
  await pool.execute(
    `INSERT INTO assignments (complaint_id, staff_id)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE staff_id = VALUES(staff_id), assigned_at = CURRENT_TIMESTAMP`,
    [complaintId, staffId]
  );
};

module.exports = {
  assignComplaint
};
