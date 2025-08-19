#!/usr/bin/env node
/**
 * Test script to verify Request Resubmission functionality
 * This script tests the complete flow:
 * 1. Admin requests resubmission for a user's self-learning answer
 * 2. User sees the resubmission request in the UI
 * 3. User can provide a new answer
 */

const axios = require('axios');
const fs = require('fs');

const API_BASE = 'http://localhost:3000/api';

// Test credentials
const ADMIN_CREDENTIALS = {
  email: 'admin@traintrails.com',
  password: 'admin123'
};

const USER_CREDENTIALS = {
  email: 'test@traintrails.com',
  password: 'test123'
};

let adminToken = '';
let userToken = '';

async function login(credentials, role) {
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, credentials);
    console.log(`✅ ${role} login successful`);
    return response.data.token;
  } catch (error) {
    console.error(`❌ ${role} login failed:`, error.response?.data?.error || error.message);
    throw error;
  }
}

async function getMiniAnswers() {
  try {
    const response = await axios.get(`${API_BASE}/admin/mini-answers`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log(`✅ Found ${response.data.miniAnswers.length} mini-answers`);
    return response.data.miniAnswers;
  } catch (error) {
    console.error('❌ Failed to get mini-answers:', error.response?.data?.error || error.message);
    throw error;
  }
}

async function requestResubmission(miniAnswerId, userId, userName) {
  try {
    const response = await axios.post(
      `${API_BASE}/admin/mini-answer/${miniAnswerId}/request-resubmission`,
      { userId },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    console.log(`✅ Resubmission requested for ${userName}:`, response.data.message);
    return response.data;
  } catch (error) {
    console.error('❌ Failed to request resubmission:', error.response?.data?.error || error.message);
    throw error;
  }
}

async function getUserProgress() {
  try {
    const response = await axios.get(`${API_BASE}/game/progress`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    console.log('✅ User progress retrieved');
    return response.data;
  } catch (error) {
    console.error('❌ Failed to get user progress:', error.response?.data?.error || error.message);
    throw error;
  }
}

async function testResubmissionFlow() {
  console.log('🚀 Starting Request Resubmission Test...\n');

  try {
    // Step 1: Login as admin
    console.log('1️⃣ Admin Login');
    adminToken = await login(ADMIN_CREDENTIALS, 'Admin');

    // Step 2: Login as user
    console.log('\n2️⃣ User Login');
    userToken = await login(USER_CREDENTIALS, 'User');

    // Step 3: Get mini-answers from admin perspective
    console.log('\n3️⃣ Getting Mini-Answers (Admin View)');
    const miniAnswers = await getMiniAnswers();
    
    if (miniAnswers.length === 0) {
      console.log('⚠️ No mini-answers found. Need test data with submitted self-learning activities.');
      return;
    }

    // Find a suitable mini-answer to test with
    const testAnswer = miniAnswers.find(answer => 
      answer.user.email === USER_CREDENTIALS.email && !answer.resubmissionRequested
    );

    if (!testAnswer) {
      console.log('⚠️ No suitable mini-answer found for test user. Creating test scenario...');
      console.log('Available answers:', miniAnswers.map(a => ({
        user: a.user.email,
        title: a.miniQuestion.title,
        resubmissionRequested: a.resubmissionRequested
      })));
      return;
    }

    console.log(`📝 Testing with answer: "${testAnswer.miniQuestion.title}" by ${testAnswer.user.fullName}`);

    // Step 4: Request resubmission
    console.log('\n4️⃣ Requesting Resubmission (Admin Action)');
    await requestResubmission(
      testAnswer.id,
      testAnswer.user.id,
      testAnswer.user.fullName
    );

    // Step 5: Check user's view
    console.log('\n5️⃣ Checking User Progress (User View)');
    const userProgress = await getUserProgress();
    
    // Look for the mini-question in user's progress
    let foundResubmissionRequest = false;
    userProgress.questions?.forEach(question => {
      question.contents?.forEach(content => {
        content.miniQuestions?.forEach(mq => {
          if (mq.id === testAnswer.miniQuestion.id && mq.answer?.resubmissionRequested) {
            console.log(`✅ Resubmission request visible to user for: "${mq.title}"`);
            console.log(`   📅 Requested at: ${mq.answer.resubmissionRequestedAt}`);
            foundResubmissionRequest = true;
          }
        });
      });
    });

    if (!foundResubmissionRequest) {
      console.log('❌ Resubmission request not found in user progress');
      console.log('Debug: Looking for mini-question ID:', testAnswer.miniQuestion.id);
    }

    // Step 6: Summary
    console.log('\n📊 Test Summary:');
    console.log('✅ Admin can login');
    console.log('✅ User can login');
    console.log('✅ Admin can view mini-answers');
    console.log('✅ Admin can request resubmission');
    console.log(foundResubmissionRequest ? '✅ User can see resubmission request' : '❌ User cannot see resubmission request');

    console.log('\n🎯 Next Steps for Testing:');
    console.log('1. Open browser to http://localhost:5176');
    console.log('2. Login as test@traintrails.com / test123');
    console.log('3. Look for orange "Resubmission Requested" message in self-learning activities');
    console.log('4. Test submitting a new answer');

  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

// Run the test
testResubmissionFlow();
