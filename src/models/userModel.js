const { pool } = require("../config/db");

const createUser = async ({ name, email, password, role }) => {
  const [result] = await pool.execute(
    `INSERT INTO users (name, email, password, role)
     VALUES (?, ?, ?, ?)`,
    [name, email, password, role]
  );

  return result.insertId;
};

const getUserByEmail = async (email) => {
  const [rows] = await pool.execute(
    `SELECT id, name, email, password, role
     FROM users
     WHERE email = ?`,
    [email]
  );

  return rows[0] || null;
};

const getUserById = async (id) => {
  const [rows] = await pool.execute(
    `SELECT id, name, email, role
     FROM users
     WHERE id = ?`,
    [id]
  );

  return rows[0] || null;
};

module.exports = {
  createUser,
  getUserByEmail,
  getUserById
};
