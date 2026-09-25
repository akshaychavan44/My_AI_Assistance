async function testFileUpload() {
  const base = 'http://127.0.0.1:3003/api';

  console.log('Logging in...');
  const loginRes = await fetch(base + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'testuser', password: 'password123' })
  }).then(r => r.json());
  const token = loginRes.token;

  console.log('Testing File Upload with FormData...');
  const formData = new FormData();
  const fileContent = 'Graduation Certificate of Excellence\nThis certifies that Alex has completed Bachelor of Science in Computer Science.\nIssued: 2024';
  const blob = new Blob([fileContent], { type: 'text/plain' });
  formData.append('files', blob, 'Degree_Certificate_2024.txt');

  const uploadRes = await fetch(base + '/files/upload', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token },
    body: formData
  }).then(r => r.json());

  console.log('Upload Result:', uploadRes.message, 'Uploaded count:', uploadRes.files?.length);
  const uploadedId = uploadRes.files[0].id;

  console.log('\nSearching for "certificate"...');
  const searchRes = await fetch(base + '/search?q=certificate', {
    headers: { 'Authorization': 'Bearer ' + token }
  }).then(r => r.json());
  console.log('Matches for "certificate":', searchRes.count);
  searchRes.results.forEach(r => console.log(' -> Found:', r.original_name));

  console.log('\nTesting File Deletion for ID:', uploadedId);
  const delRes = await fetch(base + '/files/' + uploadedId, {
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer ' + token }
  }).then(r => r.json());
  console.log('Delete Result:', delRes.message);

  console.log('\nRe-searching for "certificate" after deletion...');
  const searchAfterDel = await fetch(base + '/search?q=certificate', {
    headers: { 'Authorization': 'Bearer ' + token }
  }).then(r => r.json());
  console.log('Matches remaining:', searchAfterDel.count);
  searchAfterDel.results.forEach(r => console.log(' -> Remaining:', r.original_name));

  console.log('\n✅ UPLOAD, SEARCH & DELETION TESTS COMPLETE!');
}

testFileUpload().catch(console.error);
