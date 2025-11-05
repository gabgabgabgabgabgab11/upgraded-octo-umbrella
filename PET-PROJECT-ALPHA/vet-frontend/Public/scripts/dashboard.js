document.addEventListener("DOMContentLoaded", function () {
  // --- Active nav link logic ---
  const navLinks = document.querySelectorAll('.nav a');
  const currentPage = location.pathname.split('/').pop();
  navLinks.forEach(link => {
    const linkPage = link.getAttribute('href').split('/').pop();
    if (linkPage === currentPage) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });


  // --- Profile Dropdown Logic ---
  const userProfile = document.getElementById("userProfile");
  const dropdownMenu = document.getElementById("profileDropdownMenu");
  const arrow = userProfile.querySelector(".profile-arrow");
  const doctorName = localStorage.getItem('doctorName') || 'Dra.Amante';
  document.getElementById('doctorName').textContent = doctorName;
  const doctorPhotoElem = document.getElementById('doctorPhoto');
  if (doctorPhotoElem) {
    let photoUrl = localStorage.getItem('doctorPhoto');
    if (!photoUrl || photoUrl.trim() === "" || photoUrl === "null" || photoUrl === "undefined") {
      photoUrl = doctorPhotoElem.getAttribute('src');
    }
    doctorPhotoElem.src = photoUrl;
  }
  userProfile.addEventListener("click", function (e) {
    e.stopPropagation();
    dropdownMenu.classList.toggle("show");
    userProfile.classList.toggle("active");
    arrow.style.transform = dropdownMenu.classList.contains("show") ? "rotate(180deg)" : "rotate(0)";
  });
  document.addEventListener("click", function () {
    dropdownMenu.classList.remove("show");
    userProfile.classList.remove("active");
    arrow.style.transform = "rotate(0)";
  });
  dropdownMenu.addEventListener("click", function (e) {
    e.stopPropagation();
  });
  document.getElementById('profileSettings').addEventListener("click", function (e) {});
  document.getElementById('logoutBtn').addEventListener("click", function (e) {
    e.preventDefault();
    localStorage.removeItem("doctorName");
    localStorage.removeItem("doctorPhoto");
    window.location.href = "login.html";
  });

  // --- Modal Logic ---
  // Add Pet Modal
  const addPetBtn = document.getElementById('addPetBtn');
  const addPetModal = document.getElementById('addPetModal');
  const closeAddPetModal = document.getElementById('closeAddPetModal');
  const cancelAddPetBtn = document.getElementById('cancelAddPetBtn');
  const addPetForm = document.getElementById('addPetForm');
  addPetBtn.onclick = () => {
    addPetModal.style.display = 'block';
    populateOwnerAutocomplete();
  };
  closeAddPetModal.onclick = cancelAddPetBtn.onclick = () => {
    addPetModal.style.display = 'none';
    addPetForm.reset();
  };

  // Add Appointment Modal
  const addAppointmentBtn = document.getElementById('addAppointmentBtn');
  const addAppointmentModal = document.getElementById('addAppointmentModal');
  const closeAddAppointmentModal = document.getElementById('closeAddAppointmentModal');
  const cancelAddAppointmentBtn = document.getElementById('cancelAddAppointmentBtn');
  const addAppointmentForm = document.getElementById('addAppointmentForm');
  addAppointmentBtn.onclick = async () => {
    await populatePetSelect();
    addAppointmentModal.style.display = 'block';
  };
  closeAddAppointmentModal.onclick = cancelAddAppointmentBtn.onclick = () => {
    addAppointmentModal.style.display = 'none';
    addAppointmentForm.reset();
  };

  // View Pet Modal
  document.getElementById('closeViewModal').onclick =
    document.getElementById('closeViewPetBtn').onclick = function () {
      document.getElementById('viewPetModal').style.display = 'none';
    };

  // Edit Pet Modal
  const closeEditModal = document.getElementById('closeEditModal');
  const editPetModal = document.getElementById('editPetModal');
  const cancelEditBtn = document.getElementById('cancelEditBtn');
  const editPetForm = document.getElementById('editPetForm');
  closeEditModal.onclick = cancelEditBtn.onclick = () => {
    editPetModal.style.display = 'none';
    editPetForm.reset();
  };

  // Delete Pet Modal
  const closeDeletePetModal = document.getElementById('closeDeletePetModal');
  const deletePetModal = document.getElementById('deletePetModal');
  const cancelDeletePetBtn = document.getElementById('cancelDeletePetBtn');
  const confirmDeletePetBtn = document.getElementById('confirmDeletePetBtn');
  closeDeletePetModal.onclick = cancelDeletePetBtn.onclick = () => {
    deletePetModal.style.display = 'none';
    if (confirmDeletePetBtn) confirmDeletePetBtn.onclick = null;
  };

  // View Appointment Modal
  document.getElementById('closeViewAppointmentModal').onclick =
    document.getElementById('closeViewAppointmentBtn').onclick = function () {
      document.getElementById('viewAppointmentModal').style.display = 'none';
    };

  // Edit Appointment Modal
  const closeEditAppointmentModal = document.getElementById('closeEditAppointmentModal');
  const editAppointmentModal = document.getElementById('editAppointmentModal');
  const cancelEditAppointmentBtn = document.getElementById('cancelEditAppointmentBtn');
  const editAppointmentForm = document.getElementById('editAppointmentForm');
  closeEditAppointmentModal.onclick = cancelEditAppointmentBtn.onclick = () => {
    editAppointmentModal.style.display = 'none';
    editAppointmentForm.reset();
  };

  // Delete Appointment Modal
  const closeDeleteAppointmentModal = document.getElementById('closeDeleteAppointmentModal');
  const deleteAppointmentModal = document.getElementById('deleteAppointmentModal');
  const cancelDeleteAppointmentBtn = document.getElementById('cancelDeleteAppointmentBtn');
  const confirmDeleteAppointmentBtn = document.getElementById('confirmDeleteAppointmentBtn');
  closeDeleteAppointmentModal.onclick = cancelDeleteAppointmentBtn.onclick = () => {
    deleteAppointmentModal.style.display = 'none';
    if (confirmDeleteAppointmentBtn) confirmDeleteAppointmentBtn.onclick = null;
  };

  // Modal click-outside-to-close for all modals
  document.addEventListener('mousedown', function (e) {
    [
      addPetModal, addAppointmentModal,
      document.getElementById('viewPetModal'),
      editPetModal,
      deletePetModal,
      editAppointmentModal,
      deleteAppointmentModal,
      document.getElementById('viewAppointmentModal')
    ].forEach(modal => {
      if (modal && modal.style.display === 'block' && e.target === modal) {
        modal.style.display = 'none';
        if (modal === addPetModal) addPetForm.reset();
        if (modal === addAppointmentModal) addAppointmentForm.reset();
      }
    });
  });

  // --- Add Pet Form submit ---
  addPetForm.onsubmit = async function(e) {
    e.preventDefault();
    const ownerName = document.getElementById('ownerName').value.trim();
    const ownerPhone = document.getElementById('ownerPhone').value.trim();
    const ownerEmail = document.getElementById('ownerEmail').value.trim();
    const ownerAddress = document.getElementById('ownerAddress').value.trim();
    let owner_id = await findOrCreateOwner(ownerName, ownerPhone, ownerEmail, ownerAddress);
    if (!owner_id) {
      alert("Failed to add or find owner");
      return;
    }
    const payload = {
      name: document.getElementById('petName').value.trim(),
      species: document.getElementById('species').value.trim(),
      breed: document.getElementById('breed').value.trim(),
      age: document.getElementById('age').value.trim(),
      owner: ownerName,
      owner_id,
      medical_notes: document.getElementById('medicalNotes').value.trim()
    };
    const res = await fetch('http://localhost:5000/pets', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      addPetModal.style.display = 'none';
      addPetForm.reset();
      loadPatients();
      loadStats();
      loadAppointments();
    } else {
      alert('Failed to add pet.');
    }
  };

  // --- Add Appointment Form logic ---
  document.getElementById('appointmentPetSelect').onchange = async function() {
    const petId = this.value;
    if (!petId) {
      document.getElementById('appointmentOwner').value = "";
      return;
    }
    const pet = await fetchPet(petId);
    document.getElementById('appointmentOwner').value = pet.owner || "";
  };
  addAppointmentForm.onsubmit = async function(e) {
    e.preventDefault();
    const petId = document.getElementById('appointmentPetSelect').value;
    const pet = await fetchPet(petId);
    const ownerName = pet.owner;
    let ownersList = await fetch(`http://localhost:5000/owners`).then(r=>r.json());
    let owner = ownersList.find(o => o.name === ownerName);
    let owner_id = owner ? owner.owner_id : null;
    if (!owner_id) {
      alert("Owner for this pet not found!");
      return;
    }
    const payload = {
      pet_id: petId,
      owner_id,
      date_time: document.getElementById('appointmentDateTime').value,
      type: document.getElementById('appointmentType').value.trim(),
      status: document.getElementById('appointmentStatus').value,
      notes: document.getElementById('appointmentNotes').value.trim()
    };
    const res = await fetch('http://localhost:5000/appointments', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      addAppointmentModal.style.display = 'none';
      addAppointmentForm.reset();
      loadAppointments();
      loadStats();
    } else {
      alert('Failed to add appointment.');
    }
  };

  // Owner autocomplete for Add Pet Modal
  function populateOwnerAutocomplete() {
    let datalist = document.getElementById('ownerNameList');
    if (!datalist) {
      datalist = document.createElement('datalist');
      datalist.id = 'ownerNameList';
      document.body.appendChild(datalist);
    }
    const ownerInput = document.getElementById('ownerName');
    ownerInput.setAttribute('list', 'ownerNameList');
    fetch('http://localhost:5000/owners')
      .then(res => res.json())
      .then(owners => {
        datalist.innerHTML = '';
        owners.forEach(o => {
          const opt = document.createElement('option');
          opt.value = o.name;
          datalist.appendChild(opt);
        });
      });
  }

  // Patient Modal Logic
  window.showViewPetModal = function(pet) {
    document.getElementById('viewPetName').value = pet.name;
    document.getElementById('viewSpecies').value = pet.species;
    document.getElementById('viewBreed').value = pet.breed;
    document.getElementById('viewAge').value = pet.age;
    document.getElementById('viewOwner').value = pet.owner || '';
    document.getElementById('viewNotes').value = pet.medical_notes || '';
    document.getElementById('viewPetModal').style.display = 'block';
  };

  async function populateEditOwnerSelect(selectedOwnerId) {
    const res = await fetch('http://localhost:5000/owners');
    const owners = await res.json();
    const select = document.getElementById('editOwner');
    select.innerHTML = '<option value="">Select Owner</option>';
    owners.forEach(owner => {
      const opt = document.createElement('option');
      opt.value = owner.owner_id;
      opt.textContent = owner.name;
      select.appendChild(opt);
    });
    if (selectedOwnerId) select.value = selectedOwnerId;
  }

  window.showEditPetModal = async function(pet) {
    await populateEditOwnerSelect(pet.owner_id);
    document.getElementById('editPetName').value = pet.name;
    document.getElementById('editSpecies').value = pet.species;
    document.getElementById('editBreed').value = pet.breed;
    document.getElementById('editAge').value = pet.age;
    document.getElementById('editNotes').value = pet.medical_notes || '';
    document.getElementById('editLastVisit').value = pet.last_visit
      ? new Date(pet.last_visit).toISOString().slice(0, 10)
      : '';
    editPetForm.dataset.petId = pet.pet_id;
    editPetModal.style.display = 'block';
  };

  window.showDeletePetModal = function(pet) {
    document.getElementById('deletePetMsg').textContent = `Are you sure you want to delete "${pet.name}"?`;
    deletePetModal.style.display = 'block';
    confirmDeletePetBtn.onclick = async function() {
      const res = await fetch(`http://localhost:5000/pets/${pet.pet_id}`, { method: 'DELETE' });
      if (res.ok) {
        deletePetModal.style.display = 'none';
        loadPatients();
        loadStats();
      } else {
        alert('Failed to delete pet.');
      }
      confirmDeletePetBtn.onclick = null;
    };
  };

  editPetForm.onsubmit = async function(e) {
    e.preventDefault();
    const pet_id = editPetForm.dataset.petId;
    const owner_id = document.getElementById('editOwner').value;
    const payload = {
      name: document.getElementById('editPetName').value.trim(),
      species: document.getElementById('editSpecies').value.trim(),
      breed: document.getElementById('editBreed').value.trim(),
      age: Number(document.getElementById('editAge').value.trim()),
      owner_id,
      medical_notes: document.getElementById('editNotes').value.trim(),
      last_visit: document.getElementById('editLastVisit').value
    };
    const res = await fetch(`http://localhost:5000/pets/${pet_id}`, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      editPetModal.style.display = 'none';
      loadPatients();
      loadStats();
    } else {
      alert('Failed to update pet.');
    }
  };

  // APPOINTMENT MODALS
  window.showEditAppointmentModal = async function(appt) {
    await populateEditAppointmentPetSelect(appt.pet_id);
    document.getElementById('editAppointmentPetSelect').value = appt.pet_id;
    document.getElementById('editAppointmentOwner').value = appt.owner || '';
    document.getElementById('editAppointmentDateTime').value = appt.date_time ? appt.date_time.slice(0, 16) : '';
    document.getElementById('editAppointmentType').value = appt.type || '';
    document.getElementById('editAppointmentStatus').value = appt.status || '';
    document.getElementById('editAppointmentNotes').value = appt.notes || '';
    editAppointmentForm.dataset.apptId = appt.appt_id;
    editAppointmentModal.style.display = 'block';
  };

  window.showDeleteAppointmentModal = function(appt) {
    document.getElementById('deleteAppointmentMsg').textContent = `Are you sure you want to delete this appointment?`;
    deleteAppointmentModal.style.display = 'block';
    confirmDeleteAppointmentBtn.onclick = async function() {
      await fetch(`http://localhost:5000/appointments/${appt.appt_id}`, {method: 'DELETE'});
      deleteAppointmentModal.style.display = 'none';
      loadAppointments();
      loadStats();
      confirmDeleteAppointmentBtn.onclick = null;
    };
  };

  editAppointmentForm.onsubmit = async function(e) {
    e.preventDefault();
    const appt_id = editAppointmentForm.dataset.apptId;
    const payload = {
      pet_id: document.getElementById('editAppointmentPetSelect').value,
      owner_id: null, // You can populate if needed
      date_time: document.getElementById('editAppointmentDateTime').value,
      type: document.getElementById('editAppointmentType').value.trim(),
      status: document.getElementById('editAppointmentStatus').value,
      notes: document.getElementById('editAppointmentNotes').value.trim()
    };
    const res = await fetch(`http://localhost:5000/appointments/${appt_id}`, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      editAppointmentModal.style.display = 'none';
      loadAppointments();
      loadStats();
    } else {
      alert('Failed to update appointment.');
    }
  };

  async function populateEditAppointmentPetSelect(selectedId) {
    let res = await fetch('http://localhost:5000/pets');
    let pets = await res.json();
    let petSelect = document.getElementById('editAppointmentPetSelect');
    petSelect.innerHTML = `<option value="">Select Pet</option>`;
    pets.forEach(pet => {
      petSelect.innerHTML += `<option value="${pet.pet_id}">${pet.name} (${pet.species})</option>`;
    });
    if (selectedId) petSelect.value = selectedId;
  }

  // --- Attach modal triggers to recent patients after loading ---
  async function loadPatients() {
    let res = await fetch('http://localhost:5000/pets');
    let pets = await res.json();
    pets.sort((a, b) => b.pet_id - a.pet_id);
    let patientsList = document.getElementById('patientsList');
    patientsList.innerHTML = '';
    pets.slice(0, 3).forEach(pet => {
      let initials = pet.name ? pet.name[0].toUpperCase() : '?';
      let extra = pet.last_visit ? `Last Visit: ${formatDateOnly(pet.last_visit)}` : '';
      patientsList.innerHTML += `
        <li>
          <span class="icon">${initials}</span>
          <div class="details">
            <b>${pet.name} (${pet.species})</b><br>
            ${extra} - ${pet.medical_notes || ''}
          </div>
          <div class="actions">
            <button class="action-btn view" title="View" data-id="${pet.pet_id}">
              <svg fill="none" stroke="#4285f4" stroke-width="2" viewBox="0 0 24 24"><ellipse cx="12" cy="12" rx="7" ry="4.5"/><circle cx="12" cy="12" r="2.2"/></svg>
            </button>
            <button class="action-btn edit" title="Edit" data-id="${pet.pet_id}">
              <svg fill="none" stroke="#111" stroke-width="2" viewBox="0 0 24 24"><rect x="15.5" y="7.5" width="2.8" height="8" rx="1" transform="rotate(45 15.5 7.5)"/><path d="M7 20v-3.2a1 1 0 0 1 .3-.7l9-9a1 1 0 0 1 1.4 0l1.5 1.5a1 1 0 0 1 0 1.4l-9 9a1 1 0 0 1-.7.3H7z"/></svg>
            </button>
            <button class="action-btn delete" title="Delete" data-id="${pet.pet_id}">
              <svg fill="none" stroke="#ea4335" stroke-width="2" viewBox="0 0 24 24"><rect x="7" y="11" width="10" height="7" rx="1.5"/><line x1="10" y1="15" x2="10" y2="17"/><line x1="14" y1="15" x2="14" y2="17"/><line x1="5" y1="11" x2="19" y2="11"/><rect x="9" y="7" width="6" height="4" rx="1"/></svg>
            </button>
          </div>
        </li>
      `;
    });
    // Attach modal handlers
    patientsList.querySelectorAll('.action-btn.view').forEach(btn => {
      btn.onclick = async function () {
        const petId = btn.getAttribute('data-id');
        const pet = await fetchPet(petId);
        showViewPetModal(pet);
      };
    });
    patientsList.querySelectorAll('.action-btn.edit').forEach(btn => {
      btn.onclick = async function () {
        const petId = btn.getAttribute('data-id');
        const pet = await fetchPet(petId);
        showEditPetModal(pet);
      };
    });
    patientsList.querySelectorAll('.action-btn.delete').forEach(btn => {
      btn.onclick = async function () {
        const petId = btn.getAttribute('data-id');
        const pet = await fetchPet(petId);
        showDeletePetModal(pet);
      };
    });
  }

  // --- Attach modal triggers to appointments after loading ---
  async function loadAppointments() {
    let res = await fetch('http://localhost:5000/appointments');
    let appts = await res.json();
    appts = appts.sort((a, b) => a.date_time.localeCompare(b.date_time));
    const todayStr = new Date().toISOString().split('T')[0];
    appts = appts.filter(a => a.date_time && a.date_time.startsWith(todayStr));
    let appointmentsList = document.getElementById('appointmentsList');
    appointmentsList.innerHTML = '';
    appts.forEach(a => {
      appointmentsList.innerHTML += `
        <li>
          <span class="time">${a.date_time ? new Date(a.date_time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : ''}</span>
          <div>
            <b>${a.pet || ''}</b><br>
            Owner: ${a.owner || ''} - ${a.type || ''}
          </div>
          <div class="actions">
            <button class="action-btn view" data-id="${a.appt_id}" title="View">
              <svg fill="none" stroke="#4285f4" stroke-width="2" viewBox="0 0 24 24"><ellipse cx="12" cy="12" rx="7" ry="4.5"/><circle cx="12" cy="12" r="2.2"/></svg>
            </button>
            <button class="action-btn edit" data-id="${a.appt_id}" title="Edit">
              <svg fill="none" stroke="#3b8d1b" stroke-width="2" viewBox="0 0 24 24"><rect x="15.5" y="7.5" width="2.8" height="8" rx="1" transform="rotate(45 15.5 7.5)"/><path d="M7 20v-3.2a1 1 0 0 1 .3-.7l9-9a1 1 0 0 1 1.4 0l1.5 1.5a1 1 0 0 1 0 1.4l-9 9a1 1 0 0 1-.7.3H7z"/></svg>
            </button>
            <button class="action-btn delete" data-id="${a.appt_id}" title="Delete">
              <svg fill="none" stroke="#ea4335" stroke-width="2" viewBox="0 0 24 24"><rect x="7" y="11" width="10" height="7" rx="1.5"/><line x1="10" y1="15" x2="10" y2="17"/><line x1="14" y1="15" x2="14" y2="17"/><line x1="5" y1="11" x2="19" y2="11"/><rect x="9" y="7" width="6" height="4" rx="1"/></svg>
            </button>
          </div>
        </li>
      `;
    });

    // Attach modal handlers for appointments (WORKING VIEW MODAL)
 appointmentsList.querySelectorAll('.action-btn.view').forEach(btn => {
  btn.onclick = async function () {
    const apptId = btn.getAttribute('data-id');
    const appt = await fetch(`http://localhost:5000/appointments/${apptId}`).then(r => r.json());

    // Safely get pet and owner name
    let petName = appt.pet || '';
    let ownerName = appt.owner || '';

    // If missing, fetch using IDs
    if ((!petName || !ownerName) && appt.pet_id) {
      const pet = await fetch(`http://localhost:5000/pets/${appt.pet_id}`).then(r => r.json());
      petName = pet.name || '';
      ownerName = ownerName || pet.owner || '';
      if (!ownerName && pet.owner_id) {
        const owner = await fetch(`http://localhost:5000/owners/${pet.owner_id}`).then(r => r.json());
        ownerName = owner.name || '';
      }
    }
    if (!ownerName && appt.owner_id) {
      const owner = await fetch(`http://localhost:5000/owners/${appt.owner_id}`).then(r => r.json());
      ownerName = owner.name || '';
    }

    // Set the values in the modal
    document.getElementById('viewAppointmentPet').value = petName;
    document.getElementById('viewAppointmentOwner').value = ownerName;
      const dt = appt.date_time ? new Date(appt.date_time) : null;
    document.getElementById('viewAppointmentDateTime').value =
      dt
        ? dt.toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          })
        : '';
    document.getElementById('viewAppointmentType').value = appt.type || '';
    document.getElementById('viewAppointmentStatus').value = appt.status || '';
    document.getElementById('viewAppointmentNotes').value = appt.notes || '';
    document.getElementById('viewAppointmentModal').style.display = 'block';
  };
});
    appointmentsList.querySelectorAll('.action-btn.edit').forEach(btn => {
      btn.onclick = async function () {
        const apptId = btn.getAttribute('data-id');
        const appt = await fetch(`http://localhost:5000/appointments/${apptId}`).then(r=>r.json());
        showEditAppointmentModal(appt);
      };
    });
    appointmentsList.querySelectorAll('.action-btn.delete').forEach(btn => {
      btn.onclick = async function () {
        const apptId = btn.getAttribute('data-id');
        const appt = await fetch(`http://localhost:5000/appointments/${apptId}`).then(r=>r.json());
        showDeleteAppointmentModal(appt);
      };
    });
  }

  // --- Stats ---
async function loadStats() {
  let [appts, pets, owners, vaccs] = await Promise.all([
    fetch('http://localhost:5000/appointments').then(r=>r.json()),
    fetch('http://localhost:5000/pets').then(r=>r.json()),
    fetch('http://localhost:5000/owners').then(r=>r.json()),
    fetch('http://localhost:5000/vaccinations').then(r=>r.json()),
  ]);
  const todayStr = new Date().toISOString().split('T')[0];
  document.getElementById('todayAppointmentsCount').textContent =
    appts.filter(a => a.date_time && a.date_time.startsWith(todayStr)).length;
  document.getElementById('totalPetsCount').textContent = pets.length;
  document.getElementById('registeredOwnersCount').textContent = owners.length;
  document.getElementById('pendingVaccinationsCount').textContent =
    vaccs.filter(v => v.status && v.status.toLowerCase().includes('pending')).length;
  
  // Update nav access after stats load
  if (window.checkNavigationAccess) window.checkNavigationAccess();
}
  // --- Helpers ---
  window.fetchPet = async function(pet_id) {
    let res = await fetch(`http://localhost:5000/pets/${pet_id}`);
    return await res.json();
  };
  async function findOrCreateOwner(name, phone, email, address) {
    let res = await fetch(`http://localhost:5000/owners`);
    let owners = await res.json();
    let owner = owners.find(o => o.name.toLowerCase() === name.toLowerCase());
    if (owner) return owner.owner_id;
    let createRes = await fetch('http://localhost:5000/owners', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({name, phone, email, address})
    });
    if (!createRes.ok) return null;
    let data = await createRes.json();
    return data.id;
  }
  async function populatePetSelect() {
    let res = await fetch('http://localhost:5000/pets');
    let pets = await res.json();
    let petSelect = document.getElementById('appointmentPetSelect');
    petSelect.innerHTML = `<option value="">Select Pet</option>`;
    pets.forEach(pet => {
      petSelect.innerHTML += `<option value="${pet.pet_id}">${pet.name} (${pet.species})</option>`;
    });
  }
  function formatDateOnly(dateString) {
    if (!dateString) return '';
    const dt = new Date(dateString);
    if (isNaN(dt.getTime())) return dateString;
    return dt.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    });
  }

  // Initial load
  loadStats();
  loadAppointments();
  loadPatients();
});