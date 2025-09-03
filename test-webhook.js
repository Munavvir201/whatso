#!/usr/bin/env node

/**
 * Test script for WhatsApp webhook endpoints
 * This script tests both GET (verification) and POST (message) endpoints
 */

const https = require('https');
const http = require('http');

// Configuration
const BASE_URL = 'http://localhost:9002'; // Adjust based on your dev server
const TEST_USER_ID = 'test-user-123';
const TEST_WEBHOOK_SECRET = 'my_secret_token';

// Test data
const verificationParams = {
  'hub.mode': 'subscribe',
  'hub.verify_token': TEST_WEBHOOK_SECRET,
  'hub.challenge': 'test_challenge_12345'
};



const sampleWhatsAppMessage = {
  object: 'whatsapp_business_account',
  entry: [{
    id: '123456789',
    changes: [{
      value: {
        messaging_product: 'whatsapp',
        metadata: {
          display_phone_number: '15551234567',
          phone_number_id: '123456789'
        },
        messages: [{
          from: '15551234567',
          id: 'wamid.test123',
          timestamp: '1234567890',
          text: {
            body: 'Hello, this is a test message!'
          },
          type: 'text'
        }]
      },
      field: 'messages'
    }]
  }]
};

/**
 * Make HTTP request
 */
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

/**
 * Test webhook verification (GET endpoint)
 */
async function testVerification() {
  console.log('\n🧪 Testing WhatsApp webhook verification (GET)...');
  
  const queryString = new URLSearchParams(verificationParams).toString();
  const url = `${BASE_URL}/api/webhooks/whatsapp/${TEST_USER_ID}?${queryString}`;
  
  try {
    const response = await makeRequest(url, { method: 'GET' });
    
    console.log(`Status: ${response.statusCode}`);
    console.log(`Response: ${response.body}`);
    
    if (response.statusCode === 200 && response.body === verificationParams['hub.challenge']) {
      console.log('✅ Verification test PASSED');
      return true;
    } else {
      console.log('❌ Verification test FAILED');
      return false;
    }
  } catch (error) {
    console.log(`❌ Verification test ERROR: ${error.message}`);
    return false;
  }
}

/**
 * Test webhook message handling (POST endpoint)
 */
async function testMessageHandling() {
  console.log('\n🧪 Testing WhatsApp message handling (POST)...');
  
  const url = `${BASE_URL}/api/webhooks/whatsapp/${TEST_USER_ID}`;
  
  try {
    const response = await makeRequest(url, {
      method: 'POST',
      body: sampleWhatsAppMessage
    });
    
    console.log(`Status: ${response.statusCode}`);
    console.log(`Response: ${response.body}`);
    
    if (response.statusCode === 200) {
      console.log('✅ Message handling test PASSED');
      return true;
    } else {
      console.log('❌ Message handling test FAILED');
      return false;
    }
  } catch (error) {
    console.log(`❌ Message handling test ERROR: ${error.message}`);
    return false;
  }
}

/**
 * Test invalid verification token
 */
async function testInvalidToken() {
  console.log('\n🧪 Testing invalid verification token...');
  
  const invalidParams = {
    ...verificationParams,
    'hub.verify_token': 'invalid_token'
  };
  
  const queryString = new URLSearchParams(invalidParams).toString();
  const url = `${BASE_URL}/api/webhooks/whatsapp/${TEST_USER_ID}?${queryString}`;
  
  try {
    const response = await makeRequest(url, { method: 'GET' });
    
    console.log(`Status: ${response.statusCode}`);
    console.log(`Response: ${response.body}`);
    
    if (response.statusCode === 403) {
      console.log('✅ Invalid token test PASSED');
      return true;
    } else {
      console.log('❌ Invalid token test FAILED');
      return false;
    }
  } catch (error) {
    console.log(`❌ Invalid token test ERROR: ${error.message}`);
    return false;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('🚀 Starting WhatsApp webhook tests...');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Test User ID: ${TEST_USER_ID}`);
  
  const results = [];
  
  // Test 1: Valid verification
  results.push(await testVerification());
  
  // Test 2: Invalid token
  results.push(await testInvalidToken());
  
  // Test 3: Message handling
  results.push(await testMessageHandling());
  
  // Summary
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log(`\n📊 Test Results: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! Your webhook is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please check your webhook implementation.');
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testVerification, testMessageHandling, testInvalidToken };
