"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.releaseQuestion = exports.startQuestionScheduler = void 0;
const cron = __importStar(require("node-cron"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const startQuestionScheduler = () => {
    console.log('🕒 Starting question release scheduler...');
    // Run every hour to check if new questions should be released
    cron.schedule('0 * * * *', async () => {
        try {
            console.log('🔍 Checking for questions to release...');
            // Get game config
            const config = await prisma.gameConfig.findUnique({
                where: { id: 'singleton' }
            });
            if (!config) {
                console.log('⚠️ Game configuration not found');
                return;
            }
            // Get the latest released question
            const latestQuestion = await prisma.question.findFirst({
                where: { isActive: true },
                orderBy: { questionNumber: 'desc' }
            });
            // Calculate when the next question should be released
            let nextReleaseTime;
            if (latestQuestion && latestQuestion.releaseDate) {
                nextReleaseTime = new Date(latestQuestion.releaseDate.getTime() +
                    (config.questionReleaseIntervalHours * 60 * 60 * 1000));
            }
            else {
                // First question should be released based on game start date
                nextReleaseTime = new Date(config.gameStartDate.getTime() +
                    (config.questionReleaseIntervalHours * 60 * 60 * 1000));
            }
            // Check if it's time to release the next question
            const now = new Date();
            if (now >= nextReleaseTime) {
                // Find the next question to release
                const nextQuestionNumber = latestQuestion ? latestQuestion.questionNumber + 1 : 1;
                if (nextQuestionNumber <= config.totalQuestions) {
                    const questionToRelease = await prisma.question.findUnique({
                        where: { questionNumber: nextQuestionNumber }
                    });
                    if (questionToRelease && !questionToRelease.isActive) {
                        // Release the question
                        await prisma.question.update({
                            where: { id: questionToRelease.id },
                            data: {
                                isActive: true,
                                releaseDate: now
                            }
                        });
                        console.log(`🎯 Released question ${nextQuestionNumber}: ${questionToRelease.title}`);
                    }
                    else if (!questionToRelease) {
                        console.log(`⚠️ Question ${nextQuestionNumber} not found in database`);
                    }
                    else {
                        console.log(`ℹ️ Question ${nextQuestionNumber} is already active`);
                    }
                }
                else {
                    console.log('🏁 All questions have been released');
                }
            }
            else {
                const hoursUntilNext = (nextReleaseTime.getTime() - now.getTime()) / (1000 * 60 * 60);
                console.log(`⏰ Next question release in ${hoursUntilNext.toFixed(1)} hours`);
            }
        }
        catch (error) {
            console.error('❌ Error in question scheduler:', error);
        }
    });
    console.log('✅ Question release scheduler started');
};
exports.startQuestionScheduler = startQuestionScheduler;
// Helper function to manually release a question (for testing)
const releaseQuestion = async (questionNumber) => {
    try {
        const question = await prisma.question.findUnique({
            where: { questionNumber }
        });
        if (!question) {
            throw new Error(`Question ${questionNumber} not found`);
        }
        if (question.isActive) {
            console.log(`Question ${questionNumber} is already active`);
            return question;
        }
        const updatedQuestion = await prisma.question.update({
            where: { id: question.id },
            data: {
                isActive: true,
                releaseDate: new Date()
            }
        });
        console.log(`✅ Manually released question ${questionNumber}`);
        return updatedQuestion;
    }
    catch (error) {
        console.error('❌ Error releasing question:', error);
        throw error;
    }
};
exports.releaseQuestion = releaseQuestion;
//# sourceMappingURL=questionScheduler.js.map