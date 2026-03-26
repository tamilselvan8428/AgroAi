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
const mockUsers = [
  {
    email: "test@agroai.com",
    password: "test123",
    name: "Test User",
    _id: "mock-user-1"
  }
];

export const signup = async (req, res) => {
  try {
    const { email, password, name } = req.body;
    console.log("🔐 Signup attempt:", { email, name });

    if (!config.mongodbUri) {
      console.log("📝 Using mock authentication mode");
      // Mock Signup
      const existing = mockUsers.find(u => u.email === email);
      if (existing) return res.status(400).json({ message: "User already exists (Mock Mode)" });
      
      const newUser = { email, password, name, _id: "mock-" + Date.now() };
      mockUsers.push(newUser);
      const token = "mock-token-" + newUser._id;
      
      console.log("✅ Mock signup successful:", { email, name });
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

export const testAuth = async (req, res) => {
  try {
    console.log("🧪 Testing authentication system...");
    
    const testResults = {
      mongodb: {
        configured: !!config.mongodbUri,
        connected: false
      },
      jwt: {
        configured: !!config.jwtSecret,
        secretPreview: config.jwtSecret ? "configured" : "using fallback"
      },
      mockMode: {
        enabled: !config.mongodbUri,
        userCount: mockUsers.length,
        users: mockUsers.map(u => ({ email: u.email, name: u.name }))
      }
    };
    
    // Test MongoDB connection if configured
    if (config.mongodbUri) {
      try {
        await mongoose.connection.db.admin().ping();
        testResults.mongodb.connected = true;
      } catch (error) {
        testResults.mongodb.error = error.message;
      }
    }
    
    console.log("✅ Auth test results:", testResults);
    res.json({
      success: true,
      message: "Authentication system test completed",
      ...testResults
    });
  } catch (error) {
    console.error("❌ Auth test error:", error);
    res.status(500).json({
      success: false,
      message: "Auth test failed",
      error: error.message
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("🔐 Login attempt:", { email });

    if (!config.mongodbUri) {
      console.log("📝 Using mock authentication mode");
      console.log("📋 Available mock users:", mockUsers.map(u => ({ email: u.email, name: u.name })));
      
      // Mock Login
      const user = mockUsers.find(u => u.email === email && u.password === password);
      if (!user) {
        console.log("❌ Mock login failed - invalid credentials");
        return res.status(400).json({ message: "Invalid credentials. Use test@agroai.com / test123 for demo" });
      }
      
      const token = "mock-token-" + user._id;
      console.log("✅ Mock login successful:", { email: user.email, name: user.name });
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
