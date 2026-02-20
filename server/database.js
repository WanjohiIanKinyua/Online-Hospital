require('dotenv').config();
const { Pool } = require('pg');

const rawConnectionString = process.env.DATABASE_URL;

const isPlaceholderConnectionString = (value) => {
  if (!value) return true;
  return /:\/\/user:password@host(\/|\?|$)/i.test(value);
};

const withCompatSslMode = (value) => {
  if (!value) return value;
  if (!/sslmode=require/i.test(value)) return value;
  if (/uselibpqcompat=/i.test(value)) return value;
  return value.includes('?')
    ? `${value}&uselibpqcompat=true`
    : `${value}?uselibpqcompat=true`;
};

const connectionString = withCompatSslMode(rawConnectionString);
const hasValidDatabaseUrl = !isPlaceholderConnectionString(connectionString);

const pool = new Pool({
  connectionString: hasValidDatabaseUrl ? connectionString : undefined,
  ssl: hasValidDatabaseUrl ? { rejectUnauthorized: false } : false
});

let sharedClientPromise = null;
const getClient = async () => {
  if (!sharedClientPromise) {
    sharedClientPromise = pool.connect();
  }
  return sharedClientPromise;
};

const toPgSql = (sql, params = []) => {
  let text = String(sql || '');

  // SQLite -> PostgreSQL compatibility transforms.
  if (/insert\s+or\s+ignore/i.test(text)) {
    text = text.replace(/insert\s+or\s+ignore/i, 'INSERT');
    text = `${text} ON CONFLICT DO NOTHING`;
  }
  text = text.replace(/date\('now'\)/gi, 'CURRENT_DATE');

  // Convert ? placeholders to $1, $2, ...
  let index = 0;
  text = text.replace(/\?/g, () => {
    index += 1;
    return `$${index}`;
  });

  return { text, values: params };
};

const normalizeArgs = (params, callback) => {
  if (typeof params === 'function') {
    return { values: [], cb: params };
  }
  return { values: Array.isArray(params) ? params : [], cb: callback };
};

const keyMap = {
  fullname: 'fullName',
  dateofbirth: 'dateOfBirth',
  createdat: 'createdAt',
  resettokenhash: 'resetTokenHash',
  resettokenexpiresat: 'resetTokenExpiresAt',
  patientid: 'patientId',
  patientname: 'patientName',
  patientemail: 'patientEmail',
  doctorname: 'doctorName',
  appointmentdate: 'appointmentDate',
  appointmenttime: 'appointmentTime',
  approvalstatus: 'approvalStatus',
  approvalreason: 'approvalReason',
  meetinglink: 'meetingLink',
  paymentstatus: 'paymentStatus',
  consultationfee: 'consultationFee',
  slotdate: 'slotDate',
  slottime: 'slotTime',
  isactive: 'isActive',
  appointmentid: 'appointmentId',
  paymentmethod: 'paymentMethod',
  transactionid: 'transactionId',
  paymentdate: 'paymentDate',
  dosageinstructions: 'dosageInstructions',
  medicalnotes: 'medicalNotes',
  followuprecommendations: 'followUpRecommendations',
  issuedat: 'issuedAt',
  senderid: 'senderId',
  senderrole: 'senderRole',
  sendername: 'senderName'
};

const normalizeRowKeys = (row) => {
  if (!row || typeof row !== 'object') return row;
  const normalized = {};
  Object.keys(row).forEach((key) => {
    const mappedKey = keyMap[key] || key;
    normalized[mappedKey] = row[key];
  });
  return normalized;
};

const db = {
  query: async (sql, params = []) => {
    const q = toPgSql(sql, params);
    const client = await getClient();
    const result = await client.query(q.text, q.values);
    return {
      ...result,
      rows: Array.isArray(result.rows) ? result.rows.map(normalizeRowKeys) : result.rows
    };
  },

  run(sql, params, callback) {
    const { values, cb } = normalizeArgs(params, callback);
    const q = toPgSql(sql, values);
    getClient()
      .then((client) => client.query(q.text, q.values))
      .then((result) => {
        if (cb) cb.call({ changes: result.rowCount || 0, lastID: null }, null);
      })
      .catch((err) => {
        if (cb) cb(err);
      });
  },

  get(sql, params, callback) {
    const { values, cb } = normalizeArgs(params, callback);
    const q = toPgSql(sql, values);
    getClient()
      .then((client) => client.query(q.text, q.values))
      .then((result) => {
        const row = result.rows && result.rows.length > 0 ? normalizeRowKeys(result.rows[0]) : undefined;
        if (cb) cb(null, row);
      })
      .catch((err) => {
        if (cb) cb(err);
      });
  },

  all(sql, params, callback) {
    const { values, cb } = normalizeArgs(params, callback);
    const q = toPgSql(sql, values);
    getClient()
      .then((client) => client.query(q.text, q.values))
      .then((result) => {
        if (cb) cb(null, (result.rows || []).map(normalizeRowKeys));
      })
      .catch((err) => {
        if (cb) cb(err);
      });
  },

  serialize(fn) {
    if (typeof fn === 'function') fn();
  },

  prepare(sql) {
    let pending = 0;
    let finalizeRequested = false;
    let finalizeCb = null;

    const maybeFinalize = () => {
      if (finalizeRequested && pending === 0 && finalizeCb) {
        finalizeCb(null);
      }
    };

    return {
      run(params, callback) {
        pending += 1;
        db.run(sql, params, function onRun(err) {
          pending -= 1;
          if (callback) callback.call(this, err);
          maybeFinalize();
        });
      },
      finalize(callback) {
        finalizeRequested = true;
        finalizeCb = callback;
        maybeFinalize();
      }
    };
  },

  pool
};

const initializeDatabase = async () => {
  if (!hasValidDatabaseUrl) {
    console.error(
      'DATABASE_URL is missing or using placeholder host. Set a real PostgreSQL URL in server/.env before starting backend.'
    );
    return;
  }

  try {
    await pool.query(`
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
        resetTokenExpiresAt BIGINT,
        createdAt TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id TEXT PRIMARY KEY,
        patientId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        doctorName TEXT DEFAULT 'Dr. Merceline',
        appointmentDate TEXT NOT NULL,
        appointmentTime TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        approvalStatus TEXT DEFAULT 'pending',
        approvalReason TEXT,
        meetingLink TEXT,
        paymentStatus TEXT DEFAULT 'pending',
        consultationFee INTEGER DEFAULT 500,
        createdAt TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS doctors (
        id TEXT PRIMARY KEY,
        fullName TEXT NOT NULL UNIQUE,
        specialty TEXT DEFAULT 'General Medicine',
        isActive INTEGER DEFAULT 1,
        createdAt TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS availability_slots (
        id TEXT PRIMARY KEY,
        slotDate TEXT NOT NULL,
        slotTime TEXT NOT NULL,
        isActive INTEGER DEFAULT 1,
        createdAt TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(slotDate, slotTime)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        appointmentId TEXT NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
        patientId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount INTEGER NOT NULL,
        paymentMethod TEXT,
        transactionId TEXT UNIQUE,
        status TEXT DEFAULT 'completed',
        paymentDate TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS prescriptions (
        id TEXT PRIMARY KEY,
        appointmentId TEXT NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
        patientId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        doctorName TEXT,
        medications TEXT,
        dosageInstructions TEXT,
        medicalNotes TEXT,
        followUpRecommendations TEXT,
        issuedAt TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        appointmentId TEXT NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
        senderId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        senderRole TEXT NOT NULL,
        senderName TEXT NOT NULL,
        message TEXT NOT NULL,
        createdAt TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await pool.query(
      `
      INSERT INTO doctors (id, fullName, specialty, isActive)
      VALUES ($1, $2, $3, 1)
      ON CONFLICT DO NOTHING
      `,
      ['doctor-merceline', 'Dr. Merceline', 'General Medicine']
    );

    console.log('PostgreSQL tables initialized successfully');
  } catch (err) {
    console.error('Failed to initialize PostgreSQL schema:', err.message);
  }
};

initializeDatabase();

module.exports = db;
