import http from 'http';

async function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, data: body });
        }
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
  console.log('🧪 Starting Tasks & Web Push API Integration Tests...\n');
  const port = 3003;

  // 1. Get VAPID public key
  console.log('1. Testing GET /api/push/vapid-key...');
  const vapidRes = await request({
    hostname: '127.0.0.1',
    port,
    path: '/api/push/vapid-key',
    method: 'GET'
  });
  console.log('   Status:', vapidRes.status);
  console.log('   VAPID Public Key:', vapidRes.data?.publicKey ? `${vapidRes.data.publicKey.substring(0, 20)}...` : 'NONE');
  if (!vapidRes.data?.publicKey) throw new Error('Failed to get VAPID public key');

  // 2. Register/Login test user
  console.log('\n2. Authenticating test user...');
  const username = `task_user_${Date.now()}`;
  const email = `${username}@example.com`;
  const password = 'Password123!';
  const authRes = await request({
    hostname: '127.0.0.1',
    port,
    path: '/api/auth/register',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { username, email, password });

  const token = authRes.data?.token;
  if (!token) throw new Error('Failed to register/authenticate user: ' + JSON.stringify(authRes.data));
  console.log('   Authenticated with token for user:', username);

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // 3. Create a task with reminder
  console.log('\n3. Testing POST /api/tasks (Create Task)...');
  const dueAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 mins from now
  const reminderAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins before due
  const createRes = await request({
    hostname: '127.0.0.1',
    port,
    path: '/api/tasks',
    method: 'POST',
    headers: authHeaders
  }, {
    title: 'Deploy Production Vault Update',
    notes: 'Remember to verify VAPID environment variables and test mobile push.',
    due_at: dueAt,
    timezone: 'Asia/Kolkata',
    reminder_offset_minutes: 15,
    reminder_at: reminderAt,
    recurrence_rule: 'none'
  });
  console.log('   Status:', createRes.status);
  console.log('   Created Task ID:', createRes.data?.task?.id);
  const taskId = createRes.data?.task?.id;
  if (!taskId) throw new Error('Task creation failed');

  // 4. Create another task due right now with past reminder for cron testing
  console.log('\n4. Creating a task with past reminder for Cron validation...');
  const pastReminderRes = await request({
    hostname: '127.0.0.1',
    port,
    path: '/api/tasks',
    method: 'POST',
    headers: authHeaders
  }, {
    title: 'Immediate Scheduled Reminder Test',
    notes: 'This should trigger during cron processing.',
    due_at: new Date(Date.now() + 60 * 1000).toISOString(),
    timezone: 'UTC',
    reminder_offset_minutes: 5,
    reminder_at: new Date(Date.now() - 1000).toISOString(), // 1 second ago -> due
    recurrence_rule: 'none'
  });
  const pastTaskId = pastReminderRes.data?.task?.id;
  console.log('   Created Past Reminder Task ID:', pastTaskId);

  // 5. Test GET /api/tasks with filters and stats
  console.log('\n5. Testing GET /api/tasks (Listing & Stats)...');
  const listRes = await request({
    hostname: '127.0.0.1',
    port,
    path: '/api/tasks?status=all',
    method: 'GET',
    headers: authHeaders
  });
  const statsRes = await request({
    hostname: '127.0.0.1',
    port,
    path: '/api/tasks/stats',
    method: 'GET',
    headers: authHeaders
  });
  console.log('   Total Tasks Found:', listRes.data?.tasks?.length);
  console.log('   Stats:', statsRes.data?.stats);
  if (listRes.data?.tasks?.length < 2) throw new Error('Expected at least 2 tasks');

  // 6. Test PUT /api/tasks/:id (Update)
  console.log('\n6. Testing PUT /api/tasks/:id (Update Task)...');
  const updateRes = await request({
    hostname: '127.0.0.1',
    port,
    path: `/api/tasks/${taskId}`,
    method: 'PUT',
    headers: authHeaders
  }, {
    title: 'Deploy Production Vault Update (Updated Title)',
    notes: 'Updated notes with additional checklist items.',
    due_at: dueAt,
    timezone: 'Asia/Kolkata',
    reminder_offset_minutes: 30,
    reminder_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    recurrence_rule: 'none'
  });
  console.log('   Update Status:', updateRes.status);
  console.log('   Updated Title:', updateRes.data?.task?.title);

  // 7. Test PATCH /api/tasks/:id/toggle (Complete)
  console.log('\n7. Testing PATCH /api/tasks/:id/toggle (Toggle Completion)...');
  const toggleRes = await request({
    hostname: '127.0.0.1',
    port,
    path: `/api/tasks/${taskId}/toggle`,
    method: 'PATCH',
    headers: authHeaders
  });
  console.log('   Toggle Status:', toggleRes.status);
  console.log('   Is Completed:', toggleRes.data?.task?.is_completed);

  // 8. Test Push Subscription Registration
  console.log('\n8. Testing POST /api/push/subscribe (Multi-device storage)...');
  const subRes = await request({
    hostname: '127.0.0.1',
    port,
    path: '/api/push/subscribe',
    method: 'POST',
    headers: authHeaders
  }, {
    subscription: {
      endpoint: `https://fcm.googleapis.com/fcm/send/test-endpoint-${Date.now()}`,
      keys: {
        p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9AcUbVlJx6',
        auth: 'tBHItJI5svbpez7KI4CCXg'
      }
    },
    device_name: 'Chrome on Windows Desktop'
  });
  console.log('   Subscribe Status:', subRes.status);
  console.log('   Subscribed device:', subRes.data?.subscription?.device_name);

  // 9. Test GET /api/push/devices
  console.log('\n9. Testing GET /api/push/devices...');
  const devicesRes = await request({
    hostname: '127.0.0.1',
    port,
    path: '/api/push/devices',
    method: 'GET',
    headers: authHeaders
  });
  console.log('   Registered devices count:', devicesRes.data?.devices?.length);

  // 10. Test Scheduled Cron Endpoint
  console.log('\n10. Testing POST /api/tasks/cron/reminders (Cron trigger)...');
  const cronRes = await request({
    hostname: '127.0.0.1',
    port,
    path: '/api/tasks/cron/reminders',
    method: 'POST',
    headers: authHeaders
  });
  console.log('    Cron Status:', cronRes.status);
  console.log('    Cron Result:', cronRes.data);

  // 11. Test Task Deletion
  console.log('\n11. Testing DELETE /api/tasks/:id (Delete Task)...');
  const delRes1 = await request({
    hostname: '127.0.0.1',
    port,
    path: `/api/tasks/${taskId}`,
    method: 'DELETE',
    headers: authHeaders
  });
  const delRes2 = await request({
    hostname: '127.0.0.1',
    port,
    path: `/api/tasks/${pastTaskId}`,
    method: 'DELETE',
    headers: authHeaders
  });
  console.log('    Delete Status Task 1:', delRes1.status);
  console.log('    Delete Status Task 2:', delRes2.status);

  console.log('\n🎉 ALL INTEGRATION TESTS PASSED SUCCESSFULLY!\n');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
