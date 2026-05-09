const bcrypt = require("bcryptjs");
const asyncHandler = require("../middleware/asyncHandler");
const { createUser, getUserByEmail } = require("../models/userModel");
const { pool } = require("../config/db");
const { generateToken } = require("../utils/tokenUtils");

const register = asyncHandler(async (req, res) => {
  const { name, email, password, role = "User", department } = req.body;

  const existingUser = await getUserByEmail(email);
  if (existingUser) {
    return res.status(409).json({ success: false, message: "Email is already registered" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const normalizedRole = ["User", "Admin", "Staff"].includes(role) ? role : "User";

  const userId = await createUser({
    name,
    email,
    password: hashedPassword,
    role: normalizedRole
  });

  if (normalizedRole === "Staff") {
    await pool.execute(
      `INSERT INTO staff (user_id, name, department)
       VALUES (?, ?, ?)`,
      [userId, name, department || "General"]
    );
  }

  const token = generateToken({ id: userId, role: normalizedRole });

  res.status(201).json({
    success: true,
    message: "Registered successfully",
    data: {
      token,
      user: {
        id: userId,
        name,
        email,
        role: normalizedRole
      }
    }
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await getUserByEmail(email);
  if (!user) {
    return res.status(401).json({ success: false, message: "Invalid email or password" });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ success: false, message: "Invalid email or password" });
  }

  const token = generateToken({ id: user.id, role: user.role });

  res.status(200).json({
    success: true,
    message: "Login successful",
    data: {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    }
  });
});

module.exports = {
  register,
  login
};
