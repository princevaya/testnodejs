const asyncHandler = require("../middleware/asyncHandler");
const { pool } = require("../config/db");

const getDashboardSummary = asyncHandler(async (req, res) => {
  const [[total]] = await pool.execute(`SELECT COUNT(*) AS total_complaints FROM complaints`);

  const [statusWise] = await pool.execute(
    `SELECT status, COUNT(*) AS count
     FROM complaints
     GROUP BY status`
  );

  const [categoryWise] = await pool.execute(
    `SELECT category, COUNT(*) AS count
     FROM complaints
     GROUP BY category`
  );

  const [staffPerformance] = await pool.execute(
    `SELECT s.id AS staff_id, s.name AS staff_name,
      COUNT(a.complaint_id) AS total_assigned,
      SUM(CASE WHEN c.status = 'Resolved' THEN 1 ELSE 0 END) AS resolved_count
     FROM staff s
     LEFT JOIN assignments a ON a.staff_id = s.id
     LEFT JOIN complaints c ON c.id = a.complaint_id
     GROUP BY s.id, s.name
     ORDER BY resolved_count DESC, total_assigned DESC`
  );

  res.status(200).json({
    success: true,
    data: {
      total_complaints: total.total_complaints,
      status_wise: statusWise,
      category_wise: categoryWise,
      staff_performance: staffPerformance
    }
  });
});

module.exports = {
  getDashboardSummary
};
