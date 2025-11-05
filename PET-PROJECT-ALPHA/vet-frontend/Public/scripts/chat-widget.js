(function(){
  const toggle = document.getElementById('cw-toggle');
  const modal = document.getElementById('cw-modal');
  const closeBtn = document.getElementById('cw-close');
  const minimizeBtn = document.getElementById('cw-minimize');
  const messagesEl = document.getElementById('cw-body');
  const form = document.getElementById('cw-form');
  const input = document.getElementById('cw-input');
  const sendBtn = document.getElementById('cw-send');

  if (!toggle || !modal || !messagesEl || !form || !input || !sendBtn) {
    console.warn('Chat widget elements not found. Make sure chat markup is present and the script is loaded.');
    return;
  }

  const escapeHtml = s => String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const scroll = () => { messagesEl.scrollTop = messagesEl.scrollHeight; };

  function addUserMessage(text){
    const d = document.createElement('div');
    d.className = 'user msg';
    d.innerHTML = escapeHtml(text).replace(/\n/g,'<br>');
    messagesEl.appendChild(d);
    scroll();
  }

  function addBotMessage(text, opts = {}) {
    const d = document.createElement('div');
    d.className = 'bot msg' + (opts.card ? ' card' : '');
    d.innerHTML = text;
    messagesEl.appendChild(d);
    scroll();
    return d;
  }

  function addTyping(){
    const wrap = document.createElement('div');
    wrap.className = 'bot msg';
    const t = document.createElement('div');
    t.className = 'cw-typing';
    t.innerHTML = '<span class="cw-dot"></span><span class="cw-dot"></span><span class="cw-dot"></span>';
    wrap.appendChild(t);
    messagesEl.appendChild(wrap);
    scroll();
    return wrap;
  }

  function openModal(){ modal.classList.add('open'); modal.setAttribute('aria-hidden','false'); input.focus(); }
  function closeModal(){ modal.classList.remove('open'); modal.setAttribute('aria-hidden','true'); }
  function toggleModal(){ modal.classList.toggle('open'); modal.setAttribute('aria-hidden', modal.classList.contains('open') ? 'false' : 'true'); }

  toggle.addEventListener('click', () => {
    if (modal.classList.contains('open')) closeModal();
    else openModal();
  });

  closeBtn?.addEventListener('click', closeModal);
  minimizeBtn?.addEventListener('click', toggleModal);

  async function sendMessage(text){
    if (!text) return;
    input.value = '';
    addUserMessage(text);
    const typing = addTyping();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ message: text })
      });

      if (!res.ok) throw new Error('Chat API failed');
      const data = await res.json();
      typing.remove();
      const reply = data?.reply || "Sorry — I couldn't get a response.";
      addBotMessage(`<div>${escapeHtml(reply).replace(/\n/g,'<br>')}</div>`, { card: true });
    } catch (err) {
      typing.remove();
      const m = text.toLowerCase();
      let fallback = "Thanks — I got that. For more details contact the clinic.";
      if (m.includes('hour')||m.includes('open')||m.includes('time')) fallback = 'We are open Mon–Fri 9:00–18:00. Call to confirm weekend hours.';
      else if (m.includes('book')||m.includes('appointment')) fallback = 'To book an appointment, use the booking form or call our clinic.';
      else if (m.includes('vaccine')||m.includes('vaccin')) fallback = 'We offer vaccinations. See the Vaccinations page for details.';
      addBotMessage(`<div>${escapeHtml(fallback)}</div>`, { card: true });
    } finally {
      sendBtn.disabled = false;
      input.disabled = false;
      input.focus();
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    sendBtn.disabled = true;
    input.disabled = true;
    sendMessage(text);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeModal(); }
  });

  // seed greeting
  addBotMessage('<div>Hello! 👋 I’m your Purrfect Assistant. Ask me about appointments, services, or pet care.</div>', { card: true });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
  });
})();