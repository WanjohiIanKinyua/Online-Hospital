const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'hospital.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // Users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      fullName TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      phone TEXT,
      role TEXT DEFAULT 'patient',
      dateOfBirth TEXT,
      gender TEXT,
      address TEXT,
      resetTokenHash TEXT,
      resetTokenExpiresAt INTEGER,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Appointments table
  db.run(`
    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      patientId TEXT NOT NULL,
      doctorName TEXT DEFAULT 'Dr. Merceline',
      appointmentDate TEXT NOT NULL,
      appointmentTime TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      approvalStatus TEXT DEFAULT 'pending',
      approvalReason TEXT,
      meetingLink TEXT,
      paymentStatus TEXT DEFAULT 'pending',
      consultationFee INTEGER DEFAULT 500,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patientId) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS doctors (
      id TEXT PRIMARY KEY,
      fullName TEXT NOT NULL UNIQUE,
      specialty TEXT DEFAULT 'General Medicine',
      isActive INTEGER DEFAULT 1,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS availability_slots (
      id TEXT PRIMARY KEY,
      slotDate TEXT NOT NULL,
      slotTime TEXT NOT NULL,
      isActive INTEGER DEFAULT 1,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(slotDate, slotTime)
    )
  `);

  // Payments table
  db.run(`
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      appointmentId TEXT NOT NULL,
      patientId TEXT NOT NULL,
      amount INTEGER NOT NULL,
      paymentMethod TEXT,
      transactionId TEXT UNIQUE,
      status TEXT DEFAULT 'completed',
      paymentDate TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (appointmentId) REFERENCES appointments(id),
      FOREIGN KEY (patientId) REFERENCES users(id)
    )
  `);

  // Prescriptions table
  db.run(`
    CREATE TABLE IF NOT EXISTS prescriptions (
      id TEXT PRIMARY KEY,
      appointmentId TEXT NOT NULL,
      patientId TEXT NOT NULL,
      doctorName TEXT,
      medications TEXT,
      dosageInstructions TEXT,
      medicalNotes TEXT,
      followUpRecommendations TEXT,
      issuedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (appointmentId) REFERENCES appointments(id),
      FOREIGN KEY (patientId) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      appointmentId TEXT NOT NULL,
      senderId TEXT NOT NULL,
      senderRole TEXT NOT NULL,
      senderName TEXT NOT NULL,
      message TEXT NOT NULL,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (appointmentId) REFERENCES appointments(id),
      FOREIGN KEY (senderId) REFERENCES users(id)
    )
  `);

  db.all(`PRAGMA table_info(appointments)`, (tableErr, columns) => {
    if (tableErr) {
      console.error('Failed to inspect appointments table:', tableErr.message);
      return;
    }

    const columnNames = columns.map((col) => col.name);
    if (!columnNames.includes('approvalStatus')) {
      db.run(`ALTER TABLE appointments ADD COLUMN approvalStatus TEXT DEFAULT 'pending'`);
    }
    if (!columnNames.includes('approvalReason')) {
      db.run(`ALTER TABLE appointments ADD COLUMN approvalReason TEXT`);
    }
  });

  db.all(`PRAGMA table_info(users)`, (userTableErr, columns) => {
    if (userTableErr) {
      console.error('Failed to inspect users table:', userTableErr.message);
      return;
    }

    const userColumnNames = columns.map((col) => col.name);
    if (!userColumnNames.includes('resetTokenHash')) {
      db.run(`ALTER TABLE users ADD COLUMN resetTokenHash TEXT`);
    }
    if (!userColumnNames.includes('resetTokenExpiresAt')) {
      db.run(`ALTER TABLE users ADD COLUMN resetTokenExpiresAt INTEGER`);
    }
  });

  db.get(`SELECT COUNT(*) as count FROM doctors`, (doctorCountErr, row) => {
    if (doctorCountErr) {
      console.error('Failed to inspect doctors table:', doctorCountErr.message);
      return;
    }

    if ((row?.count || 0) === 0) {
      const seedDoctorId = 'doctor-merceline';
      db.run(
        `INSERT INTO doctors (id, fullName, specialty, isActive) VALUES (?, ?, ?, 1)`,
        [seedDoctorId, 'Dr. Merceline', 'General Medicine']
      );
    }
  });

  console.log('Database tables initialized successfully');
});

module.exports = db;
