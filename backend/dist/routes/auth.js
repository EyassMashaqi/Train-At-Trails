"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
// Ensure JWT secret is available for testing
const JWT_SECRET = process.env.JWT_SECRET || 'train-at-trails-super-secure-test-secret-key-2025';
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
// Register endpoint
router.post('/register', async (req, res) => {
    try {
        const { email, password, fullName, trainName } = req.body;
        // Validate input
        if (!email || !password || !fullName) {
            return res.status(400).json({
                error: 'Email, password, and full name are required'
            });
        }
        if (password.length < 6) {
            return res.status(400).json({
                error: 'Password must be at least 6 characters long'
            });
        }
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });
        if (existingUser) {
            return res.status(400).json({ error: 'User with this email already exists' });
        }
        // Hash password
        const hashedPassword = await bcryptjs_1.default.hash(password, 12);
        // Create user
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                fullName,
                trainName: trainName || `${fullName}'s Train`
            },
            select: {
                id: true,
                email: true,
                fullName: true,
                trainName: true,
                currentStep: true,
                isAdmin: true,
                createdAt: true
            }
        });
        // Generate JWT token
        const token = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({
            message: 'User registered successfully',
            user,
            token
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Failed to register user' });
    }
});
// Login endpoint
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        // Find user
        const user = await prisma.user.findUnique({
            where: { email }
        });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        // Check password
        const isValidPassword = await bcryptjs_1.default.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        // Generate JWT token
        const token = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
        // Return user data without password
        const { password: _, ...userWithoutPassword } = user;
        res.json({
            message: 'Login successful',
            user: userWithoutPassword,
            token
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Failed to login' });
    }
});
// Get current user endpoint
router.get('/me', auth_1.authenticateToken, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                email: true,
                fullName: true,
                trainName: true,
                currentStep: true,
                isAdmin: true,
                createdAt: true,
                updatedAt: true
            }
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ user });
    }
    catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user data' });
    }
});
// Update user profile
router.put('/profile', auth_1.authenticateToken, async (req, res) => {
    try {
        const { fullName, trainName } = req.body;
        const updatedUser = await prisma.user.update({
            where: { id: req.user.id },
            data: {
                ...(fullName && { fullName }),
                ...(trainName && { trainName })
            },
            select: {
                id: true,
                email: true,
                fullName: true,
                trainName: true,
                currentStep: true,
                isAdmin: true,
                createdAt: true,
                updatedAt: true
            }
        });
        res.json({
            message: 'Profile updated successfully',
            user: updatedUser
        });
    }
    catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map