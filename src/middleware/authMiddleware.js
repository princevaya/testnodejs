const jwt = require("jsonwebtoken");
const asyncHandler = require("./asyncHandler");
const { getUserById } = require("../models/userModel");

const protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    const error = new Error("Access denied. Token missing.");
    error.statusCode = 401;
    throw error;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await getUserById(decoded.id);

    if (!user) {
      const error = new Error("User not found.");
      error.statusCode = 401;
      throw error;
    }

    req.user = user;
    next();
  } catch (err) {
    const error = new Error("Invalid or expired token.");
    error.statusCode = 401;
    throw error;
  }
});

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    const error = new Error("Access forbidden for this role.");
    error.statusCode = 403;
    throw error;
  }
  next();
};

module.exports = {
  protect,
  authorize
};
