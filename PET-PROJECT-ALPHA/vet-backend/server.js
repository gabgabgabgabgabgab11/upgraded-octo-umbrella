const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const cron = require('node-cron');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// MySQL setup
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'vetclinic'
});

db.connect(err => {
  if (err) throw err;
  console.log('Connected to MySQL');
});

// ============================================
// AUTOMATIC ARCHIVE CLEANUP (Runs daily at 2 AM)
// ============================================
cron.schedule('0 2 * * *', () => {
  console.log('Running automatic archive cleanup...');
  db.query('CALL cleanup_expired_archives()', (err, results) => {
    if (err) {
      console.error('❌ Automatic cleanup failed:', err);
    } else {
      const deleted = results[0][0].total_deleted;
      console.log(`✅ Automatic cleanup completed: ${deleted} items deleted`);
    }
  });
});

// ============================================
// DOCTORS ENDPOINTS
// ============================================

app.get('/api/doctors', (req, res) => {
  db.query('CALL getDoctors()', (err, results) => {
    if (err) {
      console.error('/api/doctors DB error', err);
      return res.status(500).json({ error: err.message });
    }
    const rows = results && results[0] ? results[0] : [];
    const safe = rows.map(d => ({
      doctor_id: d.doctor_id,
      email: d.email,
      display_name: d.display_name
    }));
    res.json(safe);
  });
});

app.get('/api/pets', (req, res) => {
  db.query('CALL get_all_pets()', (err, results) => {
    if (err) {
      console.error('/api/pets DB error', err);
      return res.status(500).json({ error: err.message });
    }
    const rows = results && results[0] ? results[0] : [];
    const publicPets = rows.map(p => ({
      pet_id: p.pet_id,
      name: p.name,
      species: p.species,
      breed: p.breed,
      age: p.age,
      owner: p.owner,
      last_visit: p.last_visit
    }));
    res.json(publicPets);
  });
});

app.post('/doctors', async (req, res) => {
  const { email, password, display_name } = req.body;
  if (!email || !password || !display_name) {
    return res.status(400).json({ error: 'Fill all fields' });
  }

  db.query('SELECT 1 FROM doctors WHERE email = ?', [email], async (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results && results.length > 0) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    db.query(
      'INSERT INTO doctors (email, password, display_name) VALUES (?, ?, ?)',
      [email, passwordHash, display_name],
      (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        return res.json({
          success: true,
          id: result.insertId,
          display_name,
          email
        });
      }
    );
  });
});

app.post('/doctors/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing credentials' });

  db.query('SELECT * FROM doctors WHERE email = ?', [email], async (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!results || results.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const doctor = results[0];
    const passwordMatch = await bcrypt.compare(password, doctor.password);
    if (!passwordMatch) return res.status(401).json({ error: 'Invalid credentials' });

    return res.json({
      doctor_id: doctor.doctor_id,
      email: doctor.email,
      display_name: doctor.display_name
    });
  });
});

app.get('/doctors/:id', (req, res) => {
  db.query(
    'SELECT doctor_id, email, display_name FROM doctors WHERE doctor_id = ?',
    [req.params.id],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!results || results.length === 0) return res.status(404).json({ error: 'Doctor not found' });
      const doctor = results[0];
      res.json(doctor);
    }
  );
});

// ============================================
// PETS CRUD
// ============================================

app.get('/pets', (req, res) => {
  db.query('CALL get_all_pets()', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results[0]);
  });
});

app.get('/pets/:id', (req, res) => {
  db.query('CALL get_pet_by_id(?)', [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!results[0][0]) return res.status(404).json({ error: 'Pet not found' });
    res.json(results[0][0]);
  });
});

app.post('/pets', (req, res) => {
  const { name, species, breed, age, owner_id, medical_notes, last_visit } = req.body;
  db.query('CALL add_pet(?, ?, ?, ?, ?, ?, ?)',
    [name, species, breed, age, owner_id, medical_notes, last_visit || null],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, pet_id: results[0][0].pet_id });
    }
  );
});

app.put('/pets/:id', (req, res) => {
  const { name, species, breed, age, owner_id, medical_notes, last_visit } = req.body;
  db.query('CALL update_pet(?, ?, ?, ?, ?, ?, ?, ?)',
    [req.params.id, name, species, breed, age, owner_id, medical_notes, last_visit || null],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

// Archive Pet (instead of delete)
app.post('/pets/:id/archive', (req, res) => {
  db.query('CALL archive_pet(?)', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, message: 'Pet archived successfully' });
  });
});

// Restore Pet
app.post('/pets/:id/restore', (req, res) => {
  db.query('CALL restore_pet(?)', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, message: 'Pet restored successfully' });
  });
});

// Permanent delete (for archived items only)
app.delete('/pets/:id', (req, res) => {
  db.query('CALL delete_pet(?)', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// ============================================
// OWNERS CRUD
// ============================================

app.get('/owners', (req, res) => {
  db.query('CALL get_all_owners()', (err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results[0]);
  });
});

app.get('/owners/:id', (req, res) => {
  db.query('CALL get_owner_by_id(?)', [req.params.id], (err, results) => {
    if (err) return res.status(500).send(err);
    if (!results[0][0]) return res.status(404).json({ error: 'Owner not found' });
    res.json(results[0][0]);
  });
});

app.post('/owners', (req, res) => {
  const { name, phone, email, address } = req.body;
  db.query('CALL add_owner(?, ?, ?, ?)', [name, phone, email, address], (err, results) => {
    if (err) return res.status(500).send(err);
    res.json({ success: true, id: results[0][0].owner_id });
  });
});

app.put('/owners/:id', (req, res) => {
  const { name, phone, email, address } = req.body;
  db.query('CALL update_owner(?, ?, ?, ?, ?)', [req.params.id, name, phone, email, address], (err, results) => {
    if (err) return res.status(500).send(err);
    res.json({ success: true });
  });
});

// Archive Owner (instead of delete)
app.post('/owners/:id/archive', (req, res) => {
  db.query('CALL archive_owner(?)', [req.params.id], (err) => {
    if (err) return res.status(500).send(err);
    res.json({ success: true, message: 'Owner archived successfully' });
  });
});

// Restore Owner
app.post('/owners/:id/restore', (req, res) => {
  db.query('CALL restore_owner(?)', [req.params.id], (err) => {
    if (err) return res.status(500).send(err);
    res.json({ success: true, message: 'Owner restored successfully' });
  });
});

// Permanent delete (for archived items only)
app.delete('/owners/:id', (req, res) => {
  db.query('CALL delete_owner(?)', [req.params.id], (err, results) => {
    if (err) return res.status(500).send(err);
    res.json({ success: true });
  });
});

// ============================================
// APPOINTMENTS CRUD
// ============================================

app.get('/appointments', (req, res) => {
  db.query('CALL get_all_appointments()', (err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results[0]);
  });
});

app.get('/appointments/:id', (req, res) => {
  db.query('CALL get_appointment_by_id(?)', [req.params.id], (err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results[0][0]);
  });
});

app.post('/appointments', (req, res) => {
  const { date_time, pet_id, owner_id, type, status, notes } = req.body;
  db.query('CALL add_appointment(?, ?, ?, ?, ?, ?)', [date_time, pet_id, owner_id, type, status, notes], (err, results) => {
    if (err) return res.status(500).send(err);
    res.json({ success: true, id: results[0][0].appt_id });
  });
});

app.put('/appointments/:id', (req, res) => {
  const { date_time, pet_id, owner_id, type, status, notes } = req.body;
  db.query('CALL update_appointment(?, ?, ?, ?, ?, ?, ?)', [req.params.id, date_time, pet_id, owner_id, type, status, notes], (err, results) => {
    if (err) return res.status(500).send(err);
    res.json({ success: true });
  });
});

// Archive Appointment
app.post('/appointments/:id/archive', (req, res) => {
  db.query('CALL archive_appointment(?)', [req.params.id], (err) => {
    if (err) return res.status(500).send(err);
    res.json({ success: true, message: 'Appointment archived successfully' });
  });
});

// Restore Appointment
app.post('/appointments/:id/restore', (req, res) => {
  db.query('CALL restore_appointment(?)', [req.params.id], (err) => {
    if (err) return res.status(500).send(err);
    res.json({ success: true, message: 'Appointment restored successfully' });
  });
});

// Permanent delete
app.delete('/appointments/:id', (req, res) => {
  db.query('CALL delete_appointment(?)', [req.params.id], (err, results) => {
    if (err) return res.status(500).send(err);
    res.json({ success: true });
  });
});

// ============================================
// TREATMENTS CRUD
// ============================================

app.get('/treatments', (req, res) => {
  db.query('CALL get_all_treatments()', (err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results[0]);
  });
});

app.get('/treatments/:id', (req, res) => {
  db.query('CALL get_treatment_by_id(?)', [req.params.id], (err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results[0][0]);
  });
});

app.post('/treatments', (req, res) => {
  const { pet_id, date, diagnosis, treatment, medication, cost } = req.body;
  db.query('CALL add_treatment(?, ?, ?, ?, ?, ?)', [pet_id, date, diagnosis, treatment, medication, cost], (err, results) => {
    if (err) return res.status(500).send(err);
    res.json({ success: true, id: results[0][0].treatment_id });
  });
});

app.put('/treatments/:id', (req, res) => {
  const { pet_id, date, diagnosis, treatment, medication, cost } = req.body;
  db.query('CALL update_treatment(?, ?, ?, ?, ?, ?, ?)', [req.params.id, pet_id, date, diagnosis, treatment, medication, cost], (err, results) => {
    if (err) return res.status(500).send(err);
    res.json({ success: true });
  });
});

// Archive Treatment
app.post('/treatments/:id/archive', (req, res) => {
  db.query('CALL archive_treatment(?)', [req.params.id], (err) => {
    if (err) return res.status(500).send(err);
    res.json({ success: true, message: 'Treatment archived successfully' });
  });
});

// Restore Treatment
app.post('/treatments/:id/restore', (req, res) => {
  db.query('CALL restore_treatment(?)', [req.params.id], (err) => {
    if (err) return res.status(500).send(err);
    res.json({ success: true, message: 'Treatment restored successfully' });
  });
});

// Permanent delete
app.delete('/treatments/:id', (req, res) => {
  db.query('CALL delete_treatment(?)', [req.params.id], (err, results) => {
    if (err) return res.status(500).send(err);
    res.json({ success: true });
  });
});

// ============================================
// VACCINATIONS CRUD
// ============================================

app.get('/vaccinations', (req, res) => {
  db.query('CALL get_all_vaccinations()', (err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results[0]);
  });
});

app.get('/vaccinations/:id', (req, res) => {
  db.query('CALL get_vaccination_by_id(?)', [req.params.id], (err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results[0][0]);
  });
});

app.post('/vaccinations', (req, res) => {
  const { pet_id, vaccination_type, date_given, next_due, status, administered_by } = req.body;
  db.query('CALL add_vaccination(?, ?, ?, ?, ?, ?)', [pet_id, vaccination_type, date_given, next_due, status, administered_by], (err, results) => {
    if (err) return res.status(500).send(err);
    res.json({ success: true, id: results[0][0].vacc_id });
  });
});

app.put('/vaccinations/:id', (req, res) => {
  const { pet_id, vaccination_type, date_given, next_due, status, administered_by } = req.body;
  db.query('CALL update_vaccination(?, ?, ?, ?, ?, ?, ?)', [req.params.id, pet_id, vaccination_type, date_given, next_due, status, administered_by], (err, results) => {
    if (err) return res.status(500).send(err);
    res.json({ success: true });
  });
});

// Archive Vaccination
app.post('/vaccinations/:id/archive', (req, res) => {
  db.query('CALL archive_vaccination(?)', [req.params.id], (err) => {
    if (err) return res.status(500).send(err);
    res.json({ success: true, message: 'Vaccination archived successfully' });
  });
});

// Restore Vaccination
app.post('/vaccinations/:id/restore', (req, res) => {
  db.query('CALL restore_vaccination(?)', [req.params.id], (err) => {
    if (err) return res.status(500).send(err);
    res.json({ success: true, message: 'Vaccination restored successfully' });
  });
});

// Permanent delete
app.delete('/vaccinations/:id', (req, res) => {
  db.query('CALL delete_vaccination(?)', [req.params.id], (err, results) => {
    if (err) return res.status(500).send(err);
    res.json({ success: true });
  });
});

// ============================================
// ARCHIVE MANAGEMENT ENDPOINTS
// ============================================

// Get all archived items
app.get('/api/archived/all', (req, res) => {
  db.query('CALL get_all_archived()', (err, results) => {
    if (err) {
      console.error('Error fetching archived items:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json(results[0]);
  });
});

// Permanently delete archived item
app.delete('/api/archived/:type/:id/permanent', (req, res) => {
  const { type, id } = req.params;
  let procedure;
  
  switch(type) {
    case 'owner': procedure = 'delete_owner'; break;
    case 'pet': procedure = 'delete_pet'; break;
    case 'appointment': procedure = 'delete_appointment'; break;
    case 'treatment': procedure = 'delete_treatment'; break;
    case 'vaccination': procedure = 'delete_vaccination'; break;
    default: return res.status(400).json({ error: 'Invalid type' });
  }
  
  db.query(`CALL ${procedure}(?)`, [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, message: 'Item permanently deleted' });
  });
});

// Manual cleanup of expired archives
app.delete('/api/archived/cleanup', (req, res) => {
  db.query('CALL cleanup_expired_archives()', (err, results) => {
    if (err) {
      console.error('Error cleaning up archives:', err);
      return res.status(500).json({ error: err.message });
    }
    const deleted = results[0][0].total_deleted;
    res.json({ 
      success: true, 
      deleted: deleted,
      message: `Deleted ${deleted} expired items` 
    });
  });
});

// Start server
app.listen(5000, () => console.log('Server running on port 5000'));