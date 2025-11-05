// Optional modular chat + public API file.
// If you prefer modular approach, create this file and in server.js require it:
//   require('./server.chat-snippet')(app, db);
// This file re-implements the landing mount, /api/doctors, /api/pets and /api/chat endpoints.

const https = require('https');
const path = require('path');
const express = require('express');

module.exports = function(app, db) {
  const frontendPath = path.join(__dirname, '..', 'vet-frontend');

  app.use('/landing', express.static(frontendPath));
  app.get('/landing', (req, res) => res.sendFile(path.join(frontendPath, 'index.html')));

  app.get('/api/doctors', (req, res) => {
    db.query('CALL getDoctors()', (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      const rows = results && results[0] ? results[0] : [];
      res.json(rows.map(d => ({
        doctor_id: d.doctor_id,
        username: d.username,
        display_name: d.display_name,
        photo: d.photo ? `${req.protocol}://${req.get('host')}/uploads/doctors/${d.photo}` : null
      })));
    });
  });

  app.get('/api/pets', (req, res) => {
    db.query('CALL get_all_pets()', (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      const rows = results && results[0] ? results[0] : [];
      res.json(rows.map(p => ({
        pet_id: p.pet_id, name: p.name, species: p.species, breed: p.breed, age: p.age, owner: p.owner, last_visit: p.last_visit
      })));
    });
  });

  app.post('/api/chat', express.json(), (req, res) => {
    const userMessage = (req.body && req.body.message) ? String(req.body.message) : '';
    if (!userMessage) return res.status(400).json({ error: 'Missing message' });

    const key = process.env.OPENAI_API_KEY;
    if (key) {
      const payload = { model:'gpt-3.5-turbo', messages:[{role:'system',content:'You are a friendly vet clinic assistant.'},{role:'user',content:userMessage}], max_tokens:400, temperature:0.3};
      const body = JSON.stringify(payload);
      const opts = { hostname:'api.openai.com', path:'/v1/chat/completions', method:'POST', headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body),'Authorization':`Bearer ${key}`}};
      const r = https.request(opts, rr => { let d=''; rr.on('data',c=>d+=c); rr.on('end',()=> { try{ const p=JSON.parse(d); const reply = p.choices?.[0]?.message?.content?.trim() || "Sorry — couldn't get answer."; res.json({reply}); }catch(e){res.status(500).json({error:'AI parse error'});} }); });
      r.on('error',(e)=>res.status(500).json({ error:'AI request failed'})); r.write(body); r.end(); return;
    }

    // fallback
    const m = userMessage.toLowerCase();
    if (m.includes('hour')||m.includes('open')||m.includes('time')) return res.json({reply:'We are open Mon–Fri 9:00–18:00.'});
    if (m.includes('book')||m.includes('appointment')) return res.json({reply:'To book an appointment, use our booking form or call the clinic.'});
    return res.json({reply:"Thanks — I got that. For more details contact the clinic directly."});
  });
};