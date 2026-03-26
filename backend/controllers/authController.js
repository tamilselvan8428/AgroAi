import mongoose from "mongoose";
import { hashPassword, comparePassword, generateToken } from "../utils/auth.js";
import { config } from "../config/index.js";

// User Schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
});

const User = mongoose.model("User", userSchema);

// Mock Users for demonstration if DB is not connected
const mockUsers = [];

export const signup = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!config.mongodbUri) {
      // Mock Signup
      const existing = mockUsers.find(u => u.email === email);
      if (existing) return res.status(400).json({ message: "User already exists (Mock)" });
      const newUser = { email, password, name, _id: Date.now().toString() };
      mockUsers.push(newUser);
      const token = "mock-token-" + newUser._id;
      return res.status(201).json({ token, user: { email, name } });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await hashPassword(password);
    const user = new User({ email, password: hashedPassword, name });
    await user.save();

    const token = generateToken({ userId: user._id });
    res.status(201).json({ token, user: { email, name } });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Error creating user" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!config.mongodbUri) {
      // Mock Login
      const user = mockUsers.find(u => u.email === email && u.password === password);
      if (!user) return res.status(400).json({ message: "Invalid credentials (Mock Mode)" });
      const token = "mock-token-" + user._id;
      return res.json({ token, user: { email: user.email, name: user.name } });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = generateToken({ userId: user._id });
    res.json({ token, user: { email: user.email, name: user.name } });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Error logging in" });
  }
};
