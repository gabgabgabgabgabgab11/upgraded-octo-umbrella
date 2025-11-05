const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Ensure uploads/doctors folder exists
const doctorsPhotoDir = path.join(__dirname, 'uploads', 'doctors');
if (!fs.existsSync(doctorsPhotoDir)) {
  fs.mkdirSync(doctorsPhotoDir, { recursive: true });
}

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer config for doctor photos
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, doctorsPhotoDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

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

// --- LANDING PAGE ---
const frontendPath = path.join(__dirname, '..', 'vet-frontend');
app.use('/landing', express.static(frontendPath));
app.get('/landing', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// PUBLIC API: list doctors
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
      display_name: d.display_name,
      photo: d.photo ? `${req.protocol}://${req.get('host')}/uploads/doctors/${d.photo}` : null
    }));
    res.json(safe);
  });
});

// PUBLIC API: list pets
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

// Registration
app.post('/doctors', upload.single('photo'), async (req, res) => {
  const { email, password, display_name } = req.body;
  const photo = req.file ? req.file.filename : null;
  if (!email || !password || !display_name || !photo) {
    return res.status(400).json({ error: 'Fill all fields including photo' });
  }

  db.query('SELECT 1 FROM doctors WHERE email = ?', [email], async (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results && results.length > 0) {
      fs.unlinkSync(path.join(doctorsPhotoDir, photo));
      return res.status(409).json({ error: 'Email already exists' });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    db.query(
      'INSERT INTO doctors (email, password, display_name, photo) VALUES (?, ?, ?, ?)',
      [email, passwordHash, display_name, photo],
      (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        return res.json({
          success: true,
          id: result.insertId,
          display_name,
          email,
          photo: `${req.protocol}://${req.get('host')}/uploads/doctors/${photo}`
        });
      }
    );
  });
});

// Login
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
      display_name: doctor.display_name,
      photo: doctor.photo ? `${req.protocol}://${req.get('host')}/uploads/doctors/${doctor.photo}` : null
    });
  });
});

// Get doctor by id
app.get('/doctors/:id', (req, res) => {
  db.query(
    'SELECT doctor_id, email, display_name, email, specialty, photo FROM doctors WHERE doctor_id = ?',
    [req.params.id],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!results || results.length === 0) return res.status(404).json({ error: 'Doctor not found' });
      const doctor = results[0];
      doctor.photo = doctor.photo
        ? `${req.protocol}://${req.get('host')}/uploads/doctors/${doctor.photo}`
        : null;
      res.json(doctor);
    }
  );
});

// Update doctor profile
app.put('/doctors/:id', upload.single('photo'), async (req, res) => {
  const doctorId = req.params.id;
  const { display_name, email, specialty } = req.body;

  db.query('SELECT photo FROM doctors WHERE doctor_id = ?', [doctorId], async (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!results || results.length === 0)
      return res.status(404).json({ error: 'Doctor not found' });

    let photoFilename = results[0].photo;

    if (req.file) {
      if (photoFilename) {
        const oldPath = path.join(doctorsPhotoDir, photoFilename);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      photoFilename = req.file.filename;
    }

    db.query(
      'UPDATE doctors SET display_name=?, email=?, specialty=?, photo=? WHERE doctor_id=?',
      [display_name, email, specialty, photoFilename, doctorId],
      (err2) => {
        if (err2) return res.status(500).json({ error: err2.message });

        res.json({
          message: 'Profile updated.',
          photo: photoFilename
            ? `${req.protocol}://${req.get('host')}/uploads/doctors/${photoFilename}`
            : null,
        });
      }
    );
  });
});

// Delete a doctor
app.delete('/doctors/:id', (req, res) => {
  db.query('SELECT photo FROM doctors WHERE doctor_id = ?', [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!results || results.length === 0) return res.status(404).json({ error: 'Doctor not found' });
    const photo = results[0].photo;

    db.query('DELETE FROM doctors WHERE doctor_id = ?', [req.params.id], (err2) => {
      if (err2) return res.status(500).json({ error: err2.message });
      if (photo) {
        const photoPath = path.join(doctorsPhotoDir, photo);
        if (fs.existsSync(photoPath)) fs.unlinkSync(photoPath);
      }
      res.json({ success: true });
    });
  });
});

// --- PETS CRUD ---
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
app.delete('/pets/:id', (req, res) => {
  db.query('CALL delete_pet(?)', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// --- OWNERS CRUD ---
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
    if (results.affectedRows === 0) return res.status(404).json({ error: 'Owner not found' });
    res.json({ success: true });
  });
});
app.delete('/owners/:id', (req, res) => {
  db.query('CALL delete_owner(?)', [req.params.id], (err, results) => {
    if (err) return res.status(500).send(err);
    if (results.affectedRows === 0) return res.status(404).json({ error: 'Owner not found' });
    res.json({ success: true });
  });
});

// --- APPOINTMENTS CRUD ---
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
app.delete('/appointments/:id', (req, res) => {
  db.query('CALL delete_appointment(?)', [req.params.id], (err, results) => {
    if (err) return res.status(500).send(err);
    res.json({ success: true });
  });
});

// --- TREATMENTS CRUD ---
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
app.delete('/treatments/:id', (req, res) => {
  db.query('CALL delete_treatment(?)', [req.params.id], (err, results) => {
    if (err) return res.status(500).send(err);
    res.json({ success: true });
  });
});

// --- VACCINATIONS CRUD ---
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
app.delete('/vaccinations/:id', (req, res) => {
  db.query('CALL delete_vaccination(?)', [req.params.id], (err, results) => {
    if (err) return res.status(500).send(err);
    res.json({ success: true });
  });
});

// ============================================
// --- ARCHIVE ENDPOINTS (FIXED) ---
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

// RESTORE ENDPOINTS - FIXED WITH CONSISTENT NAMING
app.post('/api/owners/:id/restore', (req, res) => {
  console.log('Restoring owner:', req.params.id);
  db.query('CALL restore_owner(?)', [req.params.id], (err, result) => {
    if (err) {
      console.error('Error restoring owner:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json({ success: true, message: 'Owner restored successfully' });
  });
});

app.post('/api/pets/:id/restore', (req, res) => {
  console.log('Restoring pet:', req.params.id);
  db.query('CALL restore_pet(?)', [req.params.id], (err, result) => {
    if (err) {
      console.error('Error restoring pet:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json({ success: true, message: 'Pet restored successfully' });
  });
});

app.post('/api/appointments/:id/restore', (req, res) => {
  console.log('Restoring appointment:', req.params.id);
  db.query('CALL restore_appointment(?)', [req.params.id], (err, result) => {
    if (err) {
      console.error('Error restoring appointment:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json({ success: true, message: 'Appointment restored successfully' });
  });
});

app.post('/api/treatments/:id/restore', (req, res) => {
  console.log('Restoring treatment:', req.params.id);
  db.query('CALL restore_treatment(?)', [req.params.id], (err, result) => {
    if (err) {
      console.error('Error restoring treatment:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json({ success: true, message: 'Treatment restored successfully' });
  });
});

app.post('/api/vaccinations/:id/restore', (req, res) => {
  console.log('Restoring vaccination:', req.params.id);
  db.query('CALL restore_vaccination(?)', [req.params.id], (err, result) => {
    if (err) {
      console.error('Error restoring vaccination:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json({ success: true, message: 'Vaccination restored successfully' });
  });
});

// Permanently delete archived item
app.delete('/api/archived/:type/:id/permanent', (req, res) => {
  const { type, id } = req.params;
  
  const tableMap = {
    owner: { table: 'owners', idCol: 'owner_id' },
    pet: { table: 'pets', idCol: 'pet_id' },
    appointment: { table: 'appointments', idCol: 'appt_id' },
    treatment: { table: 'treatments', idCol: 'treatment_id' },
    vaccination: { table: 'vaccinations', idCol: 'vacc_id' }
  };
  
  const config = tableMap[type];
  if (!config) {
    return res.status(400).json({ success: false, error: 'Invalid type' });
  }
  
  db.query(
    `DELETE FROM ${config.table} WHERE ${config.idCol} = ? AND is_archived = TRUE`,
    [id],
    (err, result) => {
      if (err) {
        console.error('Error deleting archived item:', err);
        return res.status(500).json({ success: false, error: err.message });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, error: 'Archived item not found' });
      }
      res.json({ success: true, message: 'Item permanently deleted' });
    }
  );
});

// Cleanup expired archives
app.delete('/api/archived/cleanup', (req, res) => {
  db.query('CALL cleanup_expired_archives()', (err, results) => {
    if (err) {
      console.error('Error cleaning up archives:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
    
    const result = results[0][0];
    res.json({ 
      success: true, 
      deleted: result.total_deleted,
      details: {
        owners: result.owners_deleted,
        pets: result.pets_deleted,
        appointments: result.appointments_deleted,
        treatments: result.treatments_deleted,
        vaccinations: result.vaccinations_deleted
      }
    });
  });
});

// Archive endpoints
app.post('/api/owners/:id/archive', (req, res) => {
  db.query('CALL archive_owner(?)', [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, message: 'Owner archived successfully' });
  });
});

app.post('/api/pets/:id/archive', (req, res) => {
  db.query('CALL archive_pet(?)', [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, message: 'Pet archived successfully' });
  });
});

app.post('/api/appointments/:id/archive', (req, res) => {
  db.query('CALL archive_appointment(?)', [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, message: 'Appointment archived successfully' });
  });
});

app.post('/api/treatments/:id/archive', (req, res) => {
  db.query('CALL archive_treatment(?)', [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, message: 'Treatment archived successfully' });
  });
});

app.post('/api/vaccinations/:id/archive', (req, res) => {
  db.query('CALL archive_vaccination(?)', [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, message: 'Vaccination archived successfully' });
  });
});

// Get archive statistics
app.get('/api/archived/stats', (req, res) => {
  db.query('CALL get_archive_statistics()', (err, results) => {
    if (err) {
      console.error('Error fetching archive stats:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json(results[0][0]);
  });
});

app.listen(5000, () => console.log('Server running on port 5000'));