import dotenv from 'dotenv';
dotenv.config();
import bcrypt from 'bcryptjs';
import { initDatabase, getPgPool } from '../server/db.js';

async function check() {
  await initDatabase();
  const pool = getPgPool();
  const users = await pool.query("SELECT * FROM users");
  for (const u of users.rows) {
    console.log(`User ID: ${u.id}, Username: ${u.username}, Email: ${u.email}, Hash: ${u.password_hash}`);
    
    // Candidates to test
    const candidates = [
      'Akky@1234',
      'Akky@12345',
      'akky@1234',
      'akshay',
      'Akshay',
      'akshay123',
      'Akshay@123',
      'Akshay@1234',
      'password',
      '123456',
      '12345678',
      'akshaychavan44.ac@gmail.com',
      'akshaychavan',
      'AkshayChavan'
    ];
    for (const c of candidates) {
      if (await bcrypt.compare(c, u.password_hash)) {
        console.log(`>>> MATCH FOUND for ${u.username}: "${c}"`);
      }
    }
  }
}

check().catch(console.error);
