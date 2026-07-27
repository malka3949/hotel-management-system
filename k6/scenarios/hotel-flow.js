import http from 'k6/http';
import { check, sleep } from 'k6';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

export const options = {
  stages: [
    { duration: '1m', target: 100 },
    { duration: '3m', target: 500 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

const CREDENTIALS = [
  { email: 'admin@hotel.co.il', password: 'Admin123!' },
  { email: 'manager@hotel.co.il', password: 'Manager123!' },
  { email: 'reception@hotel.co.il', password: 'Reception123!' },
];

export default function () {
  const cred = CREDENTIALS[randomIntBetween(0, CREDENTIALS.length - 1)];

  // 1. Login
  const loginRes = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({ email: cred.email, password: cred.password }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  check(loginRes, { 'login 200': (r) => r.status === 200 });
  if (loginRes.status !== 200) return;

  const cookies = loginRes.cookies;
  const jar = http.cookieJar();
  jar.set(BASE_URL, 'access_token', cookies['access_token']?.[0]?.value ?? '');

  const headers = { 'Content-Type': 'application/json' };

  // 2. List rooms
  const roomsRes = http.get(`${BASE_URL}/api/v1/rooms`, { headers, jar });
  check(roomsRes, { 'rooms 200': (r) => r.status === 200 });

  // 3. Health check
  const healthRes = http.get(`${BASE_URL}/api/health`);
  check(healthRes, { 'health ok': (r) => r.status === 200 });

  // 4. List reservations
  const resRes = http.get(`${BASE_URL}/api/v1/reservations`, { headers, jar });
  check(resRes, { 'reservations 200': (r) => r.status === 200 });

  sleep(randomIntBetween(1, 3));
}
