#!/usr/bin/env node

/**
 * Debug script for WhatsApp webhook verification
 * This script helps debug webhook verification issues
 */

const https = require('https');
const http = require('http');

// Configuration - Update these values
const BASE_URL = 'https://whatso.vercel.app'; // Your production URL
const TEST_USER_ID = 'iAcgFJStySc2hQVQ7LvCboz2Wl02'; // Your user ID from the URL
const TEST_WEBHOOK_SECRET = 'your_webhook_secret_here'; // Replace with your actual secret

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
 * Test webhook verification with different scenarios
 */
async function testWebhookVerification() {
  console.log('🔍 Testing WhatsApp webhook verification...');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`User ID: ${TEST_USER_ID}`);
  console.log(`Webhook Secret: ${TEST_WEBHOOK_SECRET}`);
  
  // Test 1: Valid verification request
  console.log('\n📋 Test 1: Valid verification request');
  const validParams = {
    'hub.mode': 'subscribe',
    'hub.verify_token': TEST_WEBHOOK_SECRET,
    'hub.challenge': 'test_challenge_12345'
  };
  
  const queryString = new URLSearchParams(validParams).toString();
  const url = `${BASE_URL}/api/webhooks/whatsapp/${TEST_USER_ID}?${queryString}`;
  
  console.log(`Request URL: ${url}`);
  
  try {
    const response = await makeRequest(url, { method: 'GET' });
    console.log(`Status: ${response.statusCode}`);
    console.log(`Response: ${response.body}`);
    
    if (response.statusCode === 200) {
      console.log('✅ Valid verification test PASSED');
    } else {
      console.log('❌ Valid verification test FAILED');
    }
  } catch (error) {
    console.log(`❌ Valid verification test ERROR: ${error.message}`);
  }
  
  // Test 2: Missing hub.mode
  console.log('\n📋 Test 2: Missing hub.mode');
  const missingModeParams = {
    'hub.verify_token': TEST_WEBHOOK_SECRET,
    'hub.challenge': 'test_challenge_12345'
  };
  
  const missingModeQuery = new URLSearchParams(missingModeParams).toString();
  const missingModeUrl = `${BASE_URL}/api/webhooks/whatsapp/${TEST_USER_ID}?${missingModeQuery}`;
  
  try {
    const response = await makeRequest(missingModeUrl, { method: 'GET' });
    console.log(`Status: ${response.statusCode}`);
    console.log(`Response: ${response.body}`);
  } catch (error) {
    console.log(`❌ Missing mode test ERROR: ${error.message}`);
  }
  
  // Test 3: Missing hub.verify_token
  console.log('\n📋 Test 3: Missing hub.verify_token');
  const missingTokenParams = {
    'hub.mode': 'subscribe',
    'hub.challenge': 'test_challenge_12345'
  };
  
  const missingTokenQuery = new URLSearchParams(missingTokenParams).toString();
  const missingTokenUrl = `${BASE_URL}/api/webhooks/whatsapp/${TEST_USER_ID}?${missingTokenQuery}`;
  
  try {
    const response = await makeRequest(missingTokenUrl, { method: 'GET' });
    console.log(`Status: ${response.statusCode}`);
    console.log(`Response: ${response.body}`);
  } catch (error) {
    console.log(`❌ Missing token test ERROR: ${error.message}`);
  }
  
  // Test 4: Missing hub.challenge
  console.log('\n📋 Test 4: Missing hub.challenge');
  const missingChallengeParams = {
    'hub.mode': 'subscribe',
    'hub.verify_token': TEST_WEBHOOK_SECRET
  };
  
  const missingChallengeQuery = new URLSearchParams(missingChallengeParams).toString();
  const missingChallengeUrl = `${BASE_URL}/api/webhooks/whatsapp/${TEST_USER_ID}?${missingChallengeQuery}`;
  
  try {
    const response = await makeRequest(missingChallengeUrl, { method: 'GET' });
    console.log(`Status: ${response.statusCode}`);
    console.log(`Response: ${response.body}`);
  } catch (error) {
    console.log(`❌ Missing challenge test ERROR: ${error.message}`);
  }
  
  // Test 5: Wrong hub.mode
  console.log('\n📋 Test 5: Wrong hub.mode');
  const wrongModeParams = {
    'hub.mode': 'unsubscribe',
    'hub.verify_token': TEST_WEBHOOK_SECRET,
    'hub.challenge': 'test_challenge_12345'
  };
  
  const wrongModeQuery = new URLSearchParams(wrongModeParams).toString();
  const wrongModeUrl = `${BASE_URL}/api/webhooks/whatsapp/${TEST_USER_ID}?${wrongModeQuery}`;
  
  try {
    const response = await makeRequest(wrongModeUrl, { method: 'GET' });
    console.log(`Status: ${response.statusCode}`);
    console.log(`Response: ${response.body}`);
  } catch (error) {
    console.log(`❌ Wrong mode test ERROR: ${error.message}`);
  }
}

/**
 * Generate test URLs for manual testing
 */
function generateTestUrls() {
  console.log('\n🔗 Manual Test URLs:');
  console.log('Copy and paste these URLs in your browser to test:');
  
  const baseUrl = `${BASE_URL}/api/webhooks/whatsapp/${TEST_USER_ID}`;
  
  console.log('\n1. Valid verification:');
  console.log(`${baseUrl}?hub.mode=subscribe&hub.verify_token=${TEST_WEBHOOK_SECRET}&hub.challenge=test123`);
  
  console.log('\n2. Missing hub.mode:');
  console.log(`${baseUrl}?hub.verify_token=${TEST_WEBHOOK_SECRET}&hub.challenge=test123`);
  
  console.log('\n3. Missing hub.verify_token:');
  console.log(`${baseUrl}?hub.mode=subscribe&hub.challenge=test123`);
  
  console.log('\n4. Missing hub.challenge:');
  console.log(`${baseUrl}?hub.mode=subscribe&hub.verify_token=${TEST_WEBHOOK_SECRET}`);
  
  console.log('\n5. Wrong hub.mode:');
  console.log(`${baseUrl}?hub.mode=unsubscribe&hub.verify_token=${TEST_WEBHOOK_SECRET}&hub.challenge=test123`);
}

/**
 * Test the debug endpoint first
 */
async function testDebugEndpoint() {
  console.log('\n🔍 Testing debug endpoint...');
  
  const debugUrl = `${BASE_URL}/api/webhook-debug?hub.mode=subscribe&hub.verify_token=test123&hub.challenge=challenge456`;
  
  try {
    const response = await makeRequest(debugUrl, { method: 'GET' });
    console.log(`Debug endpoint status: ${response.statusCode}`);
    console.log('Debug response:', JSON.stringify(JSON.parse(response.body), null, 2));
  } catch (error) {
    console.log(`❌ Debug endpoint error: ${error.message}`);
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 WhatsApp Webhook Debug Tool');
  console.log('================================');
  
  // Test debug endpoint first
  await testDebugEndpoint();
  
  if (TEST_WEBHOOK_SECRET === 'your_webhook_secret_here') {
    console.log('\n⚠️  Please update TEST_WEBHOOK_SECRET in this script with your actual webhook secret');
    console.log('   You can find this in your app settings or Firebase user document');
    console.log('\n📋 To find your webhook secret:');
    console.log('1. Go to your app: https://whatso.vercel.app/settings/whatsapp');
    console.log('2. Check the "Webhook Verify Token" field');
    console.log('3. Or check your Firebase userSettings document');
    return;
  }
  
  await testWebhookVerification();
  generateTestUrls();
  
  console.log('\n📝 Next Steps:');
  console.log('1. Check your Vercel function logs for detailed error information');
  console.log('2. Verify your webhook secret matches what you configured in Meta');
  console.log('3. Ensure your user has WhatsApp credentials configured in Firebase');
  console.log('4. Check that your Firebase Admin SDK is properly configured');
  console.log('\n🔗 Debug URLs:');
  console.log(`Debug endpoint: ${BASE_URL}/api/webhook-debug?hub.mode=subscribe&hub.verify_token=test&hub.challenge=123`);
}

// Run if this script is executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testWebhookVerification, generateTestUrls };
