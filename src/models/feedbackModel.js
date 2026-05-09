const { pool } = require("../config/db");

const addFeedback = async ({ complaint_id, rating, comment }) => {
  await pool.execute(
    `INSERT INTO feedback (complaint_id, rating, comment)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE rating = VALUES(rating), comment = VALUES(comment), created_at = CURRENT_TIMESTAMP`,
    [complaint_id, rating, comment]
  );
};

module.exports = {
  addFeedback
};
