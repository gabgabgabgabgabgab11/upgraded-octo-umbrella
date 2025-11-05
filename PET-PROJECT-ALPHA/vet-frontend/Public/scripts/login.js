document.addEventListener("DOMContentLoaded", function () {
  // ==== Element References ====
  const loginForm = document.getElementById("loginForm");
  const loginError = document.getElementById("loginError");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");

  const addDoctorModal = document.getElementById("addDoctorModal");
  const showAddDoctorBtn = document.getElementById("showAddDoctorBtn");
  const closeAddDoctorModal = document.getElementById("closeAddDoctorModal");
  const addDoctorForm = document.getElementById("addDoctorForm");
  const addDoctorErrorMsg = document.getElementById("add-doctor-error-message");

  const addDoctorPasswordInput = document.getElementById("addDoctorPassword");

  // ------------------------
  // Eye-toggle snippet (non-disruptive, idempotent)
  // Place this right after the password input references above.
  (function attachEyeToggleSnippet() {
    const EYE_SVG = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false" width="20" height="20">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.6" fill="none"/>
    </svg>`;
    const EYE_OFF_SVG = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false" width="20" height="20">
      <path d="M17.94 17.94A10.68 10.68 0 0 1 12 19c-7 0-11-7-11-7a21.1 21.1 0 0 1 5.6-4.94" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      <path d="M1 1l22 22" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M9.88 9.88A3 3 0 0 0 14.12 14.12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;

    function attachToInput(input) {
      if (!input) return;
      if (input.dataset.eyeAttached === "true") return; // idempotent

      // wrap input in a relative container so we can absolutely position the button
      const wrapper = document.createElement('div');
      wrapper.style.position = 'relative';
      wrapper.style.display = 'block';
      wrapper.style.width = '100%';
      input.style.width = '100%';
      input.style.boxSizing = 'border-box';
      input.parentNode.insertBefore(wrapper, input);
      wrapper.appendChild(input);

      // ensure input has space on the right for the button
      const prevPadding = window.getComputedStyle(input).paddingRight || '0px';
      input.style.paddingRight = (parseFloat(prevPadding) + 40) + 'px';

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.innerHTML = EYE_SVG;
      btn.setAttribute('aria-label', 'Show password');
      btn.title = 'Show password';

      Object.assign(btn.style, {
        position: 'absolute',
        right: '6px',
        top: '50%',
        transform: 'translateY(-50%)',
        width: '32px',
        height: '32px',
        border: 'none',
        background: 'transparent',
        padding: '0',
        margin: '0',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#444'
      });

      btn.addEventListener('click', function () {
        const isPw = input.type === 'password';
        input.type = isPw ? 'text' : 'password';
        btn.innerHTML = isPw ? EYE_OFF_SVG : EYE_SVG;
        btn.setAttribute('aria-label', isPw ? 'Hide password' : 'Show password');
        btn.title = isPw ? 'Hide password' : 'Show password';
        input.focus(); // keep focus on the input
      });

      wrapper.appendChild(btn);
      input.dataset.eyeAttached = "true";
    }

    // Attach to login and register password fields
    attachToInput(passwordInput);
    attachToInput(addDoctorPasswordInput);
  })();
  // ------------------------

  // Password policy: exactly 8 chars, at least one uppercase, one lowercase, one digit, one symbol, no whitespace
  function isValidPassword(pw) {
    if (!pw || typeof pw !== "string") return false;
    if (pw.length !== 8) return false;
    if (/\s/.test(pw)) return false; // no spaces
    if (!/[a-z]/.test(pw)) return false;
    if (!/[A-Z]/.test(pw)) return false;
    if (!/\d/.test(pw)) return false;
    if (!/[!@#$%^&*()_\-+=[\]{};:'",.<>\/?\\|`~]/.test(pw)) return false;
    return true;
  }

  // Live feedback for registration password (disables Register button when invalid)
  (function setupLivePasswordFeedback() {
    if (!addDoctorPasswordInput) return;
    const registerBtn = addDoctorForm.querySelector('button[type="submit"]');
    function validateAndSet() {
      const pw = addDoctorPasswordInput.value;
      if (!pw) {
        addDoctorErrorMsg.innerText = "";
        if (registerBtn) registerBtn.disabled = false;
        return;
      }
      if (!isValidPassword(pw)) {
        addDoctorErrorMsg.innerText = "Password must be exactly 8 chars and include uppercase, lowercase, a number and a symbol. No spaces.";
        if (registerBtn) registerBtn.disabled = true;
      } else {
        addDoctorErrorMsg.innerText = "";
        if (registerBtn) registerBtn.disabled = false;
      }
    }
    addDoctorPasswordInput.addEventListener('input', validateAndSet);
    addDoctorPasswordInput.addEventListener('blur', validateAndSet);
  })();

  // ==== Login form submit ====
  loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    loginError.textContent = "";

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      loginError.textContent = "Please enter both email and password.";
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/doctors/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        loginError.textContent = data.error || "Login failed.";
        return;
      }

      localStorage.setItem("doctorId", data.doctor_id);
      localStorage.setItem("doctorName", data.display_name);
      localStorage.setItem("doctorEmail", data.email);

      window.location.href = "dashboard.html";
    } catch (err) {
      loginError.textContent = "Cannot connect to server. " + err.message;
    }
  });

  // Modal display logic
  showAddDoctorBtn.onclick = () => {
    addDoctorModal.style.display = "block";
    addDoctorErrorMsg.innerText = "";
    addDoctorForm.reset();
    // Re-attach toggle in case inputs were recreated
    // (attach function is idempotent so this is safe)
    // If addDoctorPasswordInput changes (rare), you can call attach again.
  };

  closeAddDoctorModal.onclick = () => {
    addDoctorModal.style.display = "none";
  };

  addDoctorModal.onclick = function (e) {
    if (e.target === addDoctorModal) addDoctorModal.style.display = "none";
  };

  // Registration submit
  addDoctorForm.onsubmit = async function (e) {
    e.preventDefault();
    addDoctorErrorMsg.innerText = "";

    const email = document.getElementById("addDoctorEmail").value.trim();
    const password = document.getElementById("addDoctorPassword").value;
    const display_name = document.getElementById("addDoctorDisplayName").value.trim();

    // Validate password against the required policy (exactly 8 characters)
    if (!isValidPassword(password)) {
      addDoctorErrorMsg.innerText = "Password must be exactly 8 characters and include at least one uppercase letter, one lowercase letter, one number, and one symbol. No spaces allowed.";
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/doctors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, display_name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");
      addDoctorModal.style.display = "none";
      alert("Account created! You may now log in.");
    } catch (e) {
      addDoctorErrorMsg.innerText = e.message;
    }
  };
});