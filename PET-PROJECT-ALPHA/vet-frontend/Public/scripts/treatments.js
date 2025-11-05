document.addEventListener("DOMContentLoaded", async function () {
  // === PAGE ACCESS CONTROL - Block if no appointments ===
  try {
    const appointmentsRes = await fetch('http://localhost:5000/appointments');
    const appointments = await appointmentsRes.json();
    
    if (!appointments || appointments.length === 0) {
      alert('⚠️ You must add appointments before accessing treatments!');
      window.location.href = 'appointments.html';
      return; // Stop executing the rest of the code
    }
  } catch (error) {
    console.error('Error checking appointments:', error);
  }
  // === END PAGE ACCESS CONTROL ===

  /// --- Profile Dropdown Logic ---
  const userProfile = document.getElementById("userProfile");
  const dropdownMenu = document.getElementById("profileDropdownMenu");
  const arrow = userProfile.querySelector(".profile-arrow");
  const doctorName = localStorage.getItem('doctorName') || 'Dra.Amante';
  document.getElementById('doctorName').textContent = doctorName;

  // Doctor photo logic (safe fallback for null/"null"/"undefined")
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
  document.getElementById('profileSettings').addEventListener("click", function (e) {
    // alert("Settings coming soon!"); // Removed
  });
  document.getElementById('logoutBtn').addEventListener("click", function (e) {
    e.preventDefault();
    localStorage.removeItem("doctorName");
    localStorage.removeItem("doctorPhoto");
    window.location.href = "login.html";
  });

  // --- MODAL VARIABLES ---
  const addTreatmentModal = document.getElementById('addTreatmentModal');
  const addTreatmentBtn = document.getElementById('addTreatmentBtn');
  const closeAddTreatmentModal = document.getElementById('closeAddTreatmentModal');
  const cancelAddTreatmentBtn = document.getElementById('cancelAddTreatmentBtn');
  const addTreatmentForm = document.getElementById('addTreatmentForm');

  const editTreatmentModal = document.getElementById('editTreatmentModal');
  const closeEditTreatmentModal = document.getElementById('closeEditTreatmentModal');
  const cancelEditTreatmentBtn = document.getElementById('cancelEditTreatmentBtn');
  const editTreatmentForm = document.getElementById('editTreatmentForm');

  const viewTreatmentModal = document.getElementById('viewTreatmentModal');
  const closeViewTreatmentModal = document.getElementById('closeViewTreatmentModal');
  const closeViewTreatmentBtn = document.getElementById('closeViewTreatmentBtn');

  const deleteTreatmentModal = document.getElementById('deleteTreatmentModal');
  const closeDeleteTreatmentModal = document.getElementById('closeDeleteTreatmentModal');
  const cancelDeleteTreatmentBtn = document.getElementById('cancelDeleteTreatmentBtn');
  const confirmDeleteTreatmentBtn = document.getElementById('confirmDeleteTreatmentBtn');
  const deleteTreatmentMsg = document.getElementById('deleteTreatmentMsg');
  let deleteTreatmentId = null;

  // --- TABLE, SEARCH, PAGINATION ---
  let allTreatments = [];
  let allPets = [];
  let currentPage = 1;
  const pageSize = 8;
  const searchInput = document.getElementById("searchInput");
  const prevPageBtn = document.getElementById("prevPageBtn");
  const nextPageBtn = document.getElementById("nextPageBtn");
  const pageIndicator = document.getElementById("pageIndicator");
  const treatmentTableBody = document.getElementById('treatmentTableBody');

  // --- PET LOGIC ---
  async function fetchPets() {
    const r = await fetch('http://localhost:5000/pets');
    allPets = await r.json();
    return allPets;
  }
  function petNameById(pet_id) {
    const pet = allPets.find(p => Number(p.pet_id) === Number(pet_id));
    return pet ? pet.name : '';
  }
  function petIdByName(name) {
    const pet = allPets.find(p => p.name.trim().toLowerCase() === name.trim().toLowerCase());
    return pet ? pet.pet_id : null;
  }
  function populatePetSelect(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    select.innerHTML = '<option value="">Select Pet</option>';
    allPets.forEach((pet) => {
      select.innerHTML += `<option value="${pet.pet_id}">${pet.name} (${pet.species})</option>`;
    });
  }

  // --- MODAL LOGIC: ADD ---
  if (addTreatmentBtn) addTreatmentBtn.onclick = async function () {
    await fetchPets();
    populatePetSelect('addTreatmentPetSelect');
    addTreatmentModal.style.display = 'block';
    addTreatmentForm.reset();
  };
  if (closeAddTreatmentModal) closeAddTreatmentModal.onclick = function () {
    addTreatmentModal.style.display = 'none';
    addTreatmentForm.reset();
  };
  if (cancelAddTreatmentBtn) cancelAddTreatmentBtn.onclick = function () {
    addTreatmentModal.style.display = 'none';
    addTreatmentForm.reset();
  };
  if (addTreatmentModal) addTreatmentModal.onclick = function(e) {
    if (e.target === addTreatmentModal) {
      addTreatmentModal.style.display = 'none';
      addTreatmentForm.reset();
    }
  };
  if (addTreatmentForm) addTreatmentForm.onsubmit = async function(e) {
    e.preventDefault();
    await fetchPets();
    const pet_id = document.getElementById('addTreatmentPetSelect').value;
    if (!pet_id) {
      alert("Please select a pet.");
      return;
    }
    const payload = {
      date: document.getElementById('addTreatmentDate').value,
      pet_id: pet_id,
      diagnosis: document.getElementById('addTreatmentDiagnosis').value.trim(),
      treatment: document.getElementById('addTreatmentName').value.trim(),
      medication: document.getElementById('addTreatmentMedication').value.trim(),
      cost: document.getElementById('addTreatmentCost').value
    };
    const res = await fetch('http://localhost:5000/treatments', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    if (res.ok) {
  addTreatmentModal.style.display = 'none';
  addTreatmentForm.reset();
  
  // Update navigation access
  if (window.checkNavigationAccess) window.checkNavigationAccess();
  
  loadTreatments();
}
  };

  // --- MODAL LOGIC: EDIT ---
  if (closeEditTreatmentModal) closeEditTreatmentModal.onclick = cancelEditTreatmentBtn.onclick = function () {
    editTreatmentModal.style.display = 'none';
    editTreatmentForm.reset();
  };
  if (editTreatmentModal) editTreatmentModal.onclick = function(e) {
    if (e.target === editTreatmentModal) {
      editTreatmentModal.style.display = 'none';
      editTreatmentForm.reset();
    }
  };
  if (editTreatmentForm) editTreatmentForm.onsubmit = async function(e) {
    e.preventDefault();
    await fetchPets();
    const id = document.getElementById('editTreatmentId').value;
    const pet_id = document.getElementById('editTreatmentPetSelect').value;
    if (!pet_id) {
      alert("Please select a pet.");
      return;
    }
    const payload = {
      date: document.getElementById('editTreatmentDate').value,
      pet_id: pet_id,
      diagnosis: document.getElementById('editTreatmentDiagnosis').value.trim(),
      treatment: document.getElementById('editTreatmentName').value.trim(),
      medication: document.getElementById('editTreatmentMedication').value.trim(),
      cost: document.getElementById('editTreatmentCost').value
    };
    const res = await fetch(`http://localhost:5000/treatments/${id}`, {
      method: 'PUT',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      editTreatmentModal.style.display = 'none';
      editTreatmentForm.reset();
      loadTreatments();
      // alert("Treatment updated!"); // Removed
    } else {
      alert("Failed to update treatment.");
    }
  };

  // --- MODAL LOGIC: VIEW ---
  function showViewTreatmentModal(treatment) {
    document.getElementById('viewTreatmentDate').textContent = (treatment.date || '').slice(0, 10);
    document.getElementById('viewTreatmentPet').textContent = petNameById(treatment.pet_id) || '';
    document.getElementById('viewTreatmentDiagnosis').textContent = treatment.diagnosis || '';
    document.getElementById('viewTreatmentName').textContent = treatment.treatment || '';
    document.getElementById('viewTreatmentMedication').textContent = treatment.medication || '';
    document.getElementById('viewTreatmentCost').textContent = treatment.cost !== undefined && treatment.cost !== null ? `₱${parseFloat(treatment.cost).toFixed(2)}` : '';
    viewTreatmentModal.style.display = 'block';
  }
  if (closeViewTreatmentModal) 
    closeViewTreatmentModal.onclick = closeViewTreatmentBtn.onclick = function () {
    viewTreatmentModal.style.display = 'none';
  };

  if (viewTreatmentModal) {
    viewTreatmentModal.onclick = function(e) {
      if (e.target === viewTreatmentModal)
        viewTreatmentModal.style.display = 'none';
    };
  }

  // --- MODAL LOGIC: DELETE ---
  if (closeDeleteTreatmentModal) closeDeleteTreatmentModal.onclick = cancelDeleteTreatmentBtn.onclick = function () {
    deleteTreatmentModal.style.display = 'none';
    deleteTreatmentId = null;
  };
  if (deleteTreatmentModal) deleteTreatmentModal.onclick = function(e) {
    if (e.target === deleteTreatmentModal) {
      deleteTreatmentModal.style.display = 'none';
      deleteTreatmentId = null;
    }
  };
 if (confirmDeleteTreatmentBtn) confirmDeleteTreatmentBtn.onclick = async function() {
  if (!deleteTreatmentId) return;
  const res = await fetch(`http://localhost:5000/treatments/${deleteTreatmentId}/archive`, { method: 'POST' });
  if (res.ok) {
    deleteTreatmentModal.style.display = 'none';
    loadTreatments();
  } else {
    alert("Failed to archive treatment.");
  }
  deleteTreatmentId = null;
};


  // --- TABLE DISPLAY HELPERS ---
  function getFilteredTreatments() {
    const q = (searchInput && searchInput.value) ? searchInput.value.trim().toLowerCase() : "";
    return allTreatments.filter(treatment =>
      (!q ||
        (String(treatment.id || treatment.treatment_id).toLowerCase().includes(q)) ||
        (petNameById(treatment.pet_id) || '').toLowerCase().includes(q) ||
        (treatment.date || '').toLowerCase().includes(q) ||
        (treatment.diagnosis || '').toLowerCase().includes(q) ||
        (treatment.treatment || '').toLowerCase().includes(q) ||
        (treatment.medication || '').toLowerCase().includes(q) ||
        (String(treatment.cost || '').toLowerCase().includes(q))
      )
    );
  }
  function renderTreatmentsTable() {
    if (!treatmentTableBody) return;
    const treatments = getFilteredTreatments();
    treatmentTableBody.innerHTML = '';
    const totalPages = Math.max(1, Math.ceil(treatments.length / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;
    const startIdx = (currentPage - 1) * pageSize;
    const pageTreatments = treatments.slice(startIdx, startIdx + pageSize);

    pageTreatments.forEach(treatment => {
      treatmentTableBody.innerHTML += `
        <tr>
          <td>${treatment.id || treatment.treatment_id || ''}</td>
          <td>${(treatment.date || '').slice(0, 10)}</td>
          <td>${petNameById(treatment.pet_id) || ''}</td>
          <td>${treatment.diagnosis || ''}</td>
          <td>${treatment.treatment || ''}</td>
          <td>${treatment.medication || ''}</td>
          <td>${treatment.cost !== undefined && treatment.cost !== null ? `₱${parseFloat(treatment.cost).toFixed(2)}` : ''}</td>
           <td class="actions">
            <button class="action-btn edit-btn" title="Edit" data-id="${treatment.id || treatment.treatment_id}">
              <svg viewBox="0 0 32 32" fill="none">
                <rect x="20" y="10" width="3.8" height="13" rx="1" transform="rotate(45 20 10)" fill="#34a853" fill-opacity="0.18"/>
                <path d="M10 26v-3.7a1 1 0 0 1 .3-.7l13-13a1 1 0 0 1 1.4 0l2.7 2.7a1 1 0 0 1 0 1.4l-13 13a1 1 0 0 1-.7.3H10z" stroke="#34a853" stroke-width="2"/>
              </svg>
            </button>
            <button class="action-btn delete-btn" title="Delete" data-id="${treatment.id || treatment.treatment_id}">
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

    // Button logic
    treatmentTableBody.querySelectorAll('.view-btn').forEach(btn => {
      btn.onclick = function () {
        const id = btn.dataset.id;
        const treatment = allTreatments.find(t => (t.id || t.treatment_id) == id);
        if (!treatment) return;
        showViewTreatmentModal(treatment);
      };
    });
    treatmentTableBody.querySelectorAll('.edit-btn').forEach(btn => {
      btn.onclick = async function () {
        const id = btn.dataset.id;
        const treatment = allTreatments.find(t => (t.id || t.treatment_id) == id);
        if (!treatment) return;
        await fetchPets();
        populatePetSelect('editTreatmentPetSelect');
        document.getElementById('editTreatmentId').value = treatment.id || treatment.treatment_id;
        document.getElementById('editTreatmentDate').value = treatment.date ? treatment.date.slice(0, 10) : '';  
        document.getElementById('editTreatmentPetSelect').value = treatment.pet_id || '';
        document.getElementById('editTreatmentDiagnosis').value = treatment.diagnosis || '';
        document.getElementById('editTreatmentName').value = treatment.treatment || '';
        document.getElementById('editTreatmentMedication').value = treatment.medication || '';
        document.getElementById('editTreatmentCost').value = treatment.cost !== undefined && treatment.cost !== null ? treatment.cost : '';
        editTreatmentModal.style.display = 'block';
      };
    });
    treatmentTableBody.querySelectorAll('.delete-btn').forEach(btn => {
      btn.onclick = function () {
        deleteTreatmentId = btn.dataset.id;
        deleteTreatmentMsg.textContent = `Are you sure you want to delete treatment #${btn.dataset.id}?`;
        deleteTreatmentModal.style.display = 'block';
      };
    });
  }
async function loadTreatments() {
  await fetchPets();
  try {
    const res = await fetch('http://localhost:5000/treatments');
    allTreatments = (await res.json()) || [];
    renderTreatmentsTable();
    
    // Update nav access
    if (window.checkNavigationAccess) window.checkNavigationAccess();
  } catch (err) {
    allTreatments = [];
    renderTreatmentsTable();
    alert("Failed to load treatments. Check your backend.");
  }
}
  // --- SEARCH FILTER EVENT ---
  searchInput.addEventListener("input", function () {
    currentPage = 1;
    renderTreatmentsTable();
  });

  // --- PAGINATION ---
  prevPageBtn.onclick = function () {
    if (currentPage > 1) {
      currentPage--;
      renderTreatmentsTable();
    }
  };
  nextPageBtn.onclick = function () {
    const treatments = getFilteredTreatments();
    const totalPages = Math.max(1, Math.ceil(treatments.length / pageSize));
    if (currentPage < totalPages) {
      currentPage++;
      renderTreatmentsTable();
    }
  };

  // --- INITIAL LOAD ---
  loadTreatments();
  // --- INITIAL LOAD ---
  loadTreatments();

  // --- PDF Generation ---
  document.getElementById('pdfBtn').addEventListener('click', function() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text('Treatment Information', 14, 20);
    
    // Add generated date
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
    
    // Get filtered treatments (respects search)
    const treatments = getFilteredTreatments();
    
    // Prepare data for PDF
    const tableData = [];
    treatments.forEach(treatment => {
      const costStr = treatment.cost !== undefined && treatment.cost !== null ? `₱${parseFloat(treatment.cost).toFixed(2)}` : '';
      
      tableData.push([
        treatment.id || treatment.treatment_id || '',
        (treatment.date || '').slice(0, 10),
        petNameById(treatment.pet_id) || '',
        treatment.diagnosis || '',
        treatment.treatment || '',
        treatment.medication || '',
        costStr
      ]);
    });
    
    // Create table in PDF
    doc.autoTable({
      startY: 35,
      head: [['ID', 'Date', 'Pet', 'Diagnosis', 'Treatment', 'Medication', 'Cost']],
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
        1: { cellWidth: 22 },
        2: { cellWidth: 25 },
        3: { cellWidth: 30 },
        4: { cellWidth: 30 },
        5: { cellWidth: 30 },
        6: { cellWidth: 20 }
      }
    });
    
    // Save the PDF
    doc.save('Treatment_Information_' + now.getTime() + '.pdf');
  });
}); // This is the closing bracket for DOMContentLoaded
