const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.join(__dirname, 'hospital.db');
const db = new sqlite3.Database(dbPath);

// Demo user accounts
const demoData = {
  users: [
    {
      id: uuidv4(),
      fullName: 'John Patient',
      email: 'patient@example.com',
      password: bcrypt.hashSync('password', 10),
      phone: '+254712345678',
      role: 'patient',
      dateOfBirth: '1990-05-15',
      gender: 'male',
      address: 'Nairobi, Kenya'
    },
    {
      id: uuidv4(),
      fullName: 'Admin User',
      email: 'admin@example.com',
      password: bcrypt.hashSync('password', 10),
      phone: '+254712345679',
      role: 'admin',
      dateOfBirth: '1985-03-20',
      gender: 'male',
      address: 'Nairobi, Kenya'
    },
    {
      id: uuidv4(),
      fullName: 'Sarah Johnson',
      email: 'sarah@example.com',
      password: bcrypt.hashSync('password', 10),
      phone: '+254712345680',
      role: 'patient',
      dateOfBirth: '1992-07-22',
      gender: 'female',
      address: 'Westlands, Nairobi'
    }
  ]
};

console.log('🌱 Seeding demo data into database...\n');

db.serialize(() => {
  // Clear existing users (optional, comment out to keep existing data)
  // db.run(`DELETE FROM users WHERE role = 'patient' OR (role = 'admin' AND email = 'admin@example.com')`);

  // Insert demo users
  demoData.users.forEach((user, index) => {
    db.run(
      `INSERT OR IGNORE INTO users (id, fullName, email, password, phone, role, dateOfBirth, gender, address) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [user.id, user.fullName, user.email, user.password, user.phone, user.role, user.dateOfBirth, user.gender, user.address],
      (err) => {
        if (err) {
          console.log(`❌ Error inserting user ${index + 1}:`, err.message);
        } else {
          console.log(`✅ User ${index + 1} added: ${user.email} (Role: ${user.role})`);
        }
      }
    );
  });

  setTimeout(() => {
    console.log('\n✨ Demo data seeding complete!');
    console.log('\n📝 Demo Credentials:');
    console.log('━'.repeat(50));
    console.log('Patient Account:');
    console.log('  Email: patient@example.com');
    console.log('  Password: password');
    console.log('');
    console.log('Admin Account:');
    console.log('  Email: admin@example.com');
    console.log('  Password: password');
    console.log('━'.repeat(50));
    console.log('\n✨ You can now start the application!');
    process.exit(0);
  }, 1000);
});
