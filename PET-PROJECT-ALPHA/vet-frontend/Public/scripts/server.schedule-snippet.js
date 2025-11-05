// Optional modular schedule endpoint implementation.
// Usage in server.js after db.connect:
//   require('./server.schedule-snippet')(app, db);

const express = require('express');

module.exports = function(app, db) {
  app.post('/api/schedule', express.json(), (req, res) => {
    const { name, email, phone, pet_type, preferred_date, message } = req.body || {};
    if (!name || !email || !phone) return res.status(400).json({ error: 'Name, email and phone required' });

    const address = '';
    db.query('CALL add_owner(?, ?, ?, ?)', [name, phone, email, address], (err, ownerResults) => {
      if (err) return res.status(500).json({ error: 'DB error creating owner' });

      const ownerRow = ownerResults?.[0]?.[0];
      let owner_id = ownerRow?.owner_id || ownerRow?.insertId || ownerResults?.insertId || null;
      if (!owner_id) return res.status(500).json({ error: 'Could not determine owner id' });

      const date_time = preferred_date ? (preferred_date + ' 09:00:00') : new Date().toISOString().slice(0,19).replace('T',' ');
      const pet_id = null;
      const type = pet_type || 'General';
      const status = 'pending';
      const notes = message || '';

      db.query('CALL add_appointment(?, ?, ?, ?, ?, ?)', [date_time, pet_id, owner_id, type, status, notes], (err2, apptResults) => {
        if (err2) return res.status(500).json({ error: 'DB error creating appointment' });
        const apptRow = apptResults?.[0]?.[0];
        const appt_id = apptRow?.appt_id || apptRow?.insertId || apptResults?.insertId || null;
        return res.json({ success: true, owner_id, appt_id });
      });
    });
  });
};