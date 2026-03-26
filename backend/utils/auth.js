import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../config/index.js";

export const hashPassword = async (password) => {
  try {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
  } catch (error) {
    console.error("Password hashing error:", error.message);
    throw error;
  }
};

export const comparePassword = async (password, hash) => {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    console.error("Password comparison error:", error.message);
    throw error;
  }
};

export const generateToken = (payload) => {
  try {
    return jwt.sign(payload, config.jwtSecret, { expiresIn: '24h' });
  } catch (error) {
    console.error("Token generation error:", error.message);
    throw error;
  }
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch (error) {
    console.error("Token verification error:", error.message);
    throw error;
  }
};
