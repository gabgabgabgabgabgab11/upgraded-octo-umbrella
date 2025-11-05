document.addEventListener("DOMContentLoaded", function () {
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

  const addAppointmentBtn = document.getElementById('addAppointmentBtn');
  const addAppointmentModal = document.getElementById('addAppointmentModal');
  const closeAddAppointmentModal = document.getElementById('closeAddAppointmentModal');
  const cancelAddAppointmentBtn = document.getElementById('cancelAddAppointmentBtn');
  const addAppointmentForm = document.getElementById('addAppointmentForm');

  const editAppointmentModal = document.getElementById('editAppointmentModal');
  const closeEditAppointmentModal = document.getElementById('closeEditAppointmentModal');
  const cancelEditAppointmentBtn = document.getElementById('cancelEditAppointmentBtn');
  const editAppointmentForm = document.getElementById('editAppointmentForm');

  const deleteAppointmentModal = document.getElementById('deleteAppointmentModal');
  const closeDeleteAppointmentModal = document.getElementById('closeDeleteAppointmentModal');
  const cancelDeleteAppointmentBtn = document.getElementById('cancelDeleteAppointmentBtn');
  const confirmDeleteAppointmentBtn = document.getElementById('confirmDeleteAppointmentBtn');
  const deleteAppointmentMsg = document.getElementById('deleteAppointmentMsg');
  let deleteApptId = null;

  let allAppointments = [];
  let currentPage = 1;
  const pageSize = 8;

  const searchInput = document.getElementById("searchInput");
  const apptTypeFilter = document.getElementById("apptTypeFilter");
  const prevPageBtn = document.getElementById('prevPageBtn');
  const nextPageBtn = document.getElementById('nextPageBtn');
  const pageIndicator = document.getElementById('pageIndicator');
  const apptTableBody = document.getElementById('apptTableBody');

  if (searchInput) searchInput.addEventListener("input", function () {
    currentPage = 1;
    renderAppointmentsTable();
  });
  if (apptTypeFilter) apptTypeFilter.addEventListener("change", function () {
    currentPage = 1;
    renderAppointmentsTable();
  });
  if (prevPageBtn) prevPageBtn.onclick = function () {
    if (currentPage > 1) {
      currentPage--;
      renderAppointmentsTable();
    }
  };
  if (nextPageBtn) nextPageBtn.onclick = function () {
    const totalPages = Math.max(1, Math.ceil(getFilteredAppointments().length / pageSize));
    if (currentPage < totalPages) {
      currentPage++;
      renderAppointmentsTable();
    }
  };

  if (addAppointmentBtn) addAppointmentBtn.onclick = async () => {
    await populatePetSelect('appointmentPetSelect');
    const ownerField = document.getElementById('appointmentOwner');
    if (ownerField) ownerField.value = '';
    if (addAppointmentModal) addAppointmentModal.style.display = 'block';
    if (addAppointmentForm) addAppointmentForm.reset();
  };
  if (closeAddAppointmentModal) closeAddAppointmentModal.onclick = function () {
    addAppointmentModal.style.display = 'none';
    addAppointmentForm.reset();
  };
  if (cancelAddAppointmentBtn) cancelAddAppointmentBtn.onclick = function () {
    addAppointmentModal.style.display = 'none';
    addAppointmentForm.reset();
  };
  if (addAppointmentModal) addAppointmentModal.onclick = function(e) {
    if (e.target === addAppointmentModal) {
      addAppointmentModal.style.display = 'none';
      addAppointmentForm.reset();
    }
  };
  const appointmentPetSelect = document.getElementById('appointmentPetSelect');
  if (appointmentPetSelect) appointmentPetSelect.onchange = async function() {
    const petId = this.value;
    const ownerField = document.getElementById('appointmentOwner');
    if (!petId) {
      if (ownerField) ownerField.value = "";
      return;
    }
    const pet = await fetchPet(petId);
    if (ownerField) {
      if (pet.owner) {
        ownerField.value = pet.owner;
      } else if (pet.owner_id) {
        const owners = await fetchOwners();
        const o = owners.find(o => o.owner_id == pet.owner_id);
        ownerField.value = o ? o.name : "";
      } else {
        ownerField.value = "";
      }
    }
  };
  if (addAppointmentForm) addAppointmentForm.onsubmit = async function(e) {
    e.preventDefault();
    const petId = document.getElementById('appointmentPetSelect').value;
    if (!petId) { alert("Select a pet!"); return; }
    const pet = await fetchPet(petId);
    let ownerName = document.getElementById('appointmentOwner').value;
    let owner_id = pet.owner_id;
    if (!owner_id && ownerName) {
      const allOwners = await fetchOwners();
      const owner = allOwners.find(o => o.name === ownerName);
      owner_id = owner ? owner.owner_id : null;
    }
    if (!owner_id) { alert("Owner not found!"); return; }
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
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      addAppointmentModal.style.display = 'none';
      addAppointmentForm.reset();
      
      if (window.checkNavigationAccess) window.checkNavigationAccess();
      
      loadAppointments();
    } else {
      alert("Failed to add appointment.");
    }
  };

  if (closeEditAppointmentModal) closeEditAppointmentModal.onclick = cancelEditAppointmentBtn.onclick = function () {
    editAppointmentModal.style.display = 'none';
    editAppointmentForm.reset();
  };
  if (editAppointmentModal) editAppointmentModal.onclick = function(e) {
    if (e.target === editAppointmentModal) {
      editAppointmentModal.style.display = 'none';
      editAppointmentForm.reset();
    }
  };
  if (editAppointmentForm) editAppointmentForm.onsubmit = async function(e) {
    e.preventDefault();
    const apptId = document.getElementById('editApptId').value;
    const petId = document.getElementById('editAppointmentPetSelect').value;
    const pet = await fetchPet(petId);
    let ownerName = document.getElementById('editAppointmentOwner').value;
    let owner_id = pet.owner_id;
    if (!owner_id && ownerName) {
      const allOwners = await fetchOwners();
      const owner = allOwners.find(o => o.name === ownerName);
      owner_id = owner ? owner.owner_id : null;
    }
    if (!owner_id) { alert("Owner not found!"); return; }
    const payload = {
      pet_id: petId,
      owner_id,
      date_time: document.getElementById('editAppointmentDateTime').value,
      type: document.getElementById('editAppointmentType').value.trim(),
      status: document.getElementById('editAppointmentStatus').value,
      notes: document.getElementById('editAppointmentNotes').value.trim()
    };
    const res = await fetch(`http://localhost:5000/appointments/${apptId}`, {
      method: 'PUT',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      editAppointmentModal.style.display = 'none';
      editAppointmentForm.reset();
      loadAppointments();
    } else {
      alert("Failed to update appointment.");
    }
  };

  if (closeDeleteAppointmentModal) closeDeleteAppointmentModal.onclick = cancelDeleteAppointmentBtn.onclick = function () {
    deleteAppointmentModal.style.display = 'none';
    deleteApptId = null;
  };
  if (deleteAppointmentModal) deleteAppointmentModal.onclick = function(e) {
    if (e.target === deleteAppointmentModal) {
      deleteAppointmentModal.style.display = 'none';
      deleteApptId = null;
    }
  };
  if (confirmDeleteAppointmentBtn) confirmDeleteAppointmentBtn.onclick = async function() {
    if (!deleteApptId) return;
    const res = await fetch(`http://localhost:5000/appointments/${deleteApptId}/archive`, { method: 'POST' });
    if (res.ok) {
      deleteAppointmentModal.style.display = 'none';
      loadAppointments();
    } else {
      alert("Failed to archive appointment.");
    }
    deleteApptId = null;
  };

  async function fetchPet(pet_id) {
    if (!pet_id) return {};
    const res = await fetch(`http://localhost:5000/pets/${pet_id}`);
    return await res.json();
  }
  async function fetchOwners() {
    const res = await fetch('http://localhost:5000/owners');
    return await res.json();
  }
  async function populatePetSelect(targetId = 'appointmentPetSelect', selectedPetId = null) {
    const petSelect = document.getElementById(targetId);
    if (!petSelect) return;
    petSelect.innerHTML = '<option value="">Select Pet</option>';
    try {
      const res = await fetch('http://localhost:5000/pets');
      const pets = await res.json();
      pets.forEach(pet => {
        petSelect.innerHTML += `<option value="${pet.pet_id}"${selectedPetId == pet.pet_id ? " selected" : ""}>${pet.name} (${pet.species || ""})</option>`;
      });
    } catch (e) {
      petSelect.innerHTML = '<option value="">Error loading pets</option>';
    }
  }

  function getFilteredAppointments() {
    const q = (searchInput && searchInput.value) ? searchInput.value.trim().toLowerCase() : "";
    const status = (apptTypeFilter && apptTypeFilter.value) ? apptTypeFilter.value : "all";
    return allAppointments.filter(appt =>
      (!q ||
        (appt.pet || '').toLowerCase().includes(q) ||
        (appt.owner || '').toLowerCase().includes(q) ||
        (appt.type || '').toLowerCase().includes(q) ||
        (appt.status || '').toLowerCase().includes(q) ||
        (appt.notes || '').toLowerCase().includes(q)
      ) &&
      (status === "all" || (appt.status && appt.status.toLowerCase() === status.toLowerCase()))
    );
  }
  
  function renderAppointmentsTable() {
    if (!apptTableBody) return;
    const appointments = getFilteredAppointments();
    apptTableBody.innerHTML = '';
    const totalPages = Math.max(1, Math.ceil(appointments.length / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;
    const startIdx = (currentPage - 1) * pageSize;
    const pageAppointments = appointments.slice(startIdx, startIdx + pageSize);
    pageAppointments.forEach(appt => {
      const dateTimeStr = appt.date_time ? new Date(appt.date_time).toLocaleString() : '';
      apptTableBody.innerHTML += `
        <tr>
          <td>${appt.appt_id || ''}</td>
          <td>${dateTimeStr}</td>
          <td>${appt.pet || ''}</td>
          <td>${appt.owner || ''}</td>
          <td>${appt.type || ''}</td>
          <td>${appt.status || ''}</td>
          <td>${appt.notes || ''}</td>
          <td class="actions">
            <button class="action-btn edit-btn" title="Edit" data-id="${appt.appt_id}">
              <svg viewBox="0 0 32 32" fill="none">
                <rect x="20" y="10" width="3.8" height="13" rx="1" transform="rotate(45 20 10)" fill="#34a853" fill-opacity="0.18"/>
                <path d="M10 26v-3.7a1 1 0 0 1 .3-.7l13-13a1 1 0 0 1 1.4 0l2.7 2.7a1 1 0 0 1 0 1.4l-13 13a1 1 0 0 1-.7.3H10z" stroke="#34a853" stroke-width="2"/>
              </svg>
            </button>
            <button class="action-btn delete-btn" title="Delete" data-id="${appt.appt_id}">
              <svg viewBox="0 0 32 32" fill="none">
                <rect x="10" y="14" width="12" height="10" rx="2" stroke="#ea4335" stroke-width="2"/>
                <path d="M14 18v4m4-4v4M12 10v4h8v-4" stroke="#ea4335" stroke-width="2"/>
                <path d="M8 14h16" stroke="#ea4335" stroke-width="2"/>
              </svg>
            </button>
          </td>
        </tr>
      `;
    });
    if (pageIndicator) pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.onclick = () => openEditModal(btn.dataset.id);
    });
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.onclick = () => openDeleteModal(btn.dataset.id);
    });
  }

  async function openEditModal(apptId) {
    const appt = allAppointments.find(a => a.appt_id == apptId);
    if (!appt) return;
    await populatePetSelect('editAppointmentPetSelect', appt.pet_id);
    document.getElementById('editApptId').value = appt.appt_id;
    document.getElementById('editAppointmentType').value = appt.type || '';
    document.getElementById('editAppointmentStatus').value = appt.status || '';
    document.getElementById('editAppointmentNotes').value = appt.notes || '';
    document.getElementById('editAppointmentDateTime').value = appt.date_time ? appt.date_time.slice(0,16) : '';
    if (appt.pet_id) {
      const pet = await fetchPet(appt.pet_id);
      if (pet.owner) {
        document.getElementById('editAppointmentOwner').value = pet.owner;
      } else if (pet.owner_id) {
        const owners = await fetchOwners();
        const o = owners.find(o => o.owner_id == pet.owner_id);
        document.getElementById('editAppointmentOwner').value = o ? o.name : "";
      } else {
        document.getElementById('editAppointmentOwner').value = "";
      }
    } else {
      document.getElementById('editAppointmentOwner').value = appt.owner || '';
    }
    document.getElementById('editAppointmentPetSelect').onchange = async function() {
      const petId = this.value;
      if (!petId) {
        document.getElementById('editAppointmentOwner').value = "";
        return;
      }
      const pet = await fetchPet(petId);
      if (pet.owner) {
        document.getElementById('editAppointmentOwner').value = pet.owner;
      } else if (pet.owner_id) {
        const owners = await fetchOwners();
        const o = owners.find(o => o.owner_id == pet.owner_id);
        document.getElementById('editAppointmentOwner').value = o ? o.name : "";
      } else {
        document.getElementById('editAppointmentOwner').value = "";
      }
    };
    if (editAppointmentModal) editAppointmentModal.style.display = 'block';
  }
  function openDeleteModal(apptId) {
    deleteApptId = apptId;
    if (deleteAppointmentMsg) deleteAppointmentMsg.textContent = `Are you sure you want to archive appointment #${apptId}?`;
    if (deleteAppointmentModal) deleteAppointmentModal.style.display = 'block';
  }

  async function loadAppointments() {
    try {
      const res = await fetch('http://localhost:5000/appointments');
      allAppointments = (await res.json()) || [];
      renderAppointmentsTable();
      
      if (window.checkNavigationAccess) window.checkNavigationAccess();
    } catch (err) {
      allAppointments = [];
      renderAppointmentsTable();
      alert("Failed to load appointments. Check your backend.");
    }
  }

  loadAppointments();

  document.getElementById('pdfBtn').addEventListener('click', function() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('Appointment Information', 14, 20);
    
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { 
      month: '2-digit', 
      day: '2-digit', 
      year: 'numeric' 
    }) + ', ' + now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    doc.setFontSize(10);
    doc.text('Generated: ' + dateStr, 14, 28);
    
    const appointments = getFilteredAppointments();
    
    const tableData = [];
    appointments.forEach(appt => {
      const dateTimeStr = appt.date_time ? new Date(appt.date_time).toLocaleString() : '';
      
      tableData.push([
        appt.appt_id || '',
        dateTimeStr,
        appt.pet || '',
        appt.owner || '',
        appt.type || '',
        appt.status || '',
        appt.notes || ''
      ]);
    });
    
    doc.autoTable({
      startY: 35,
      head: [['ID', 'Date & Time', 'Pet', 'Owner', 'Type', 'Status', 'Notes']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [109, 158, 252],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'left'
      },
      styles: {
        fontSize: 8,
        cellPadding: 2
      },
      columnStyles: {
        0: { cellWidth: 12 },
        1: { cellWidth: 35 },
        2: { cellWidth: 25 },
        3: { cellWidth: 25 },
        4: { cellWidth: 25 },
        5: { cellWidth: 20 },
        6: { cellWidth: 35 }
      }
    });
    
    doc.save('Appointment_Information_' + now.getTime() + '.pdf');
  });
});