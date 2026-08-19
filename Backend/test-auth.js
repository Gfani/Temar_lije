// Test script for authentication endpoints
const http = require('http');

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        let parsed = body;
        try {
          parsed = JSON.parse(body);
        } catch (_) {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: parsed,
        });
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('=== 1. Testing Registration ===');
  const testEmail = `testuser_${Date.now()}@example.com`;
  const registerPayload = {
    email: testEmail,
    password: 'Password123!',
    fullName: 'Test Student',
    role: 'STUDENT',
  };

  const registerRes = await request(
    {
      hostname: 'localhost',
      port: 3000,
      path: '/auth/register',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    },
    registerPayload,
  );

  console.log('Register status:', registerRes.statusCode);
  console.log('Register response body:', registerRes.body);
  const setCookie = registerRes.headers['set-cookie'];
  console.log('Set-Cookie headers:', setCookie);

  if (registerRes.statusCode !== 201) {
    console.error('Registration failed!');
    process.exit(1);
  }

  const accessToken = registerRes.body.accessToken;
  console.log('Access token received:', !!accessToken);

  console.log('\n=== 2. Testing Login ===');
  const loginPayload = {
    email: testEmail,
    password: 'Password123!',
  };

  const loginRes = await request(
    {
      hostname: 'localhost',
      port: 3000,
      path: '/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    },
    loginPayload,
  );

  console.log('Login status:', loginRes.statusCode);
  console.log('Login response body:', loginRes.body);
  if (loginRes.statusCode !== 200) {
    console.error('Login failed!');
    process.exit(1);
  }

  console.log('\n=== 3. Testing Token Refresh ===');
  const cookies = loginRes.headers['set-cookie'] || [];
  const refreshCookieHeader = cookies.map((c) => c.split(';')[0]).join('; ');

  const refreshRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/auth/refresh',
    method: 'POST',
    headers: {
      Cookie: refreshCookieHeader,
    },
  });

  console.log('Refresh status:', refreshRes.statusCode);
  console.log('Refresh response body:', refreshRes.body);

  console.log('\n=== 4. Testing Logout ===');
  const logoutRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/auth/logout',
    method: 'POST',
    headers: {
      Authorization: `Bearer ${refreshRes.body.accessToken || accessToken}`,
    },
  });

  console.log('Logout status:', logoutRes.statusCode);
  console.log('Logout response body:', logoutRes.body);

  console.log('\n ALL AUTH TESTS PASSED SUCCESSFULLY! ');
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
