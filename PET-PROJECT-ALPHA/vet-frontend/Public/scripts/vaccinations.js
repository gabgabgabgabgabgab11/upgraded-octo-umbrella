document.addEventListener("DOMContentLoaded", async function () {
  // === PAGE ACCESS CONTROL - Block if no treatments ===
  try {
    const treatmentsRes = await fetch('http://localhost:5000/treatments');
    const treatments = await treatmentsRes.json();
    
    if (!treatments || treatments.length === 0) {
      alert('⚠️ You must add treatments before accessing vaccinations!');
      window.location.href = 'treatments.html';
      return; // Stop executing the rest of the code
    }
  } catch (error) {
    console.error('Error checking treatments:', error);
  }
  // === END PAGE ACCESS CONTROL ===

  // --- Profile Dropdown Logic ---
  const userProfile = document.getElementById("userProfile");
  const dropdownMenu = document.getElementById("profileDropdownMenu");
  const arrow = userProfile.querySelector(".profile-arrow");
  const doctorName = localStorage.getItem('doctorName') || 'Dra.Amante';
  document.getElementById('doctorName').textContent = doctorName;

  // Doctor photo logic
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

  // --- Modal Elements ---
  const addVaccinationBtn = document.getElementById('addVaccinationBtn');
  const addVaccinationModal = document.getElementById('addVaccinationModal');
  const closeAddVaccinationModal = document.getElementById('closeAddVaccinationModal');
  const cancelAddVaccinationBtn = document.getElementById('cancelAddVaccinationBtn');
  const addVaccinationForm = document.getElementById('addVaccinationForm');

  const editVaccinationModal = document.getElementById('editVaccinationModal');
  const closeEditVaccinationModal = document.getElementById('closeEditVaccinationModal');
  const cancelEditVaccinationBtn = document.getElementById('cancelEditVaccinationBtn');
  const editVaccinationForm = document.getElementById('editVaccinationForm');

  const viewVaccinationModal = document.getElementById('viewVaccinationModal');
  const closeViewVaccinationModal = document.getElementById('closeViewVaccinationModal');
  const closeViewVaccinationBtn = document.getElementById('closeViewVaccinationBtn');
  
  const deleteVaccinationModal = document.getElementById('deleteVaccinationModal');
  const closeDeleteVaccinationModal = document.getElementById('closeDeleteVaccinationModal');
  const cancelDeleteVaccinationBtn = document.getElementById('cancelDeleteVaccinationBtn');
  const confirmDeleteVaccinationBtn = document.getElementById('confirmDeleteVaccinationBtn');
  const deleteVaccinationMsg = document.getElementById('deleteVaccinationMsg');
  let deleteVaccId = null;

  // --- Table, Pagination, and Search Logic ---
  let allVaccinations = [];
  let allPets = [];
  let currentPage = 1;
  const pageSize = 8;

  // --- Safe Query Selectors
  const searchVaccinationsInput = document.getElementById("searchVaccinationsInput");
  const vaccinationFilter = document.getElementById('vaccinationFilter');
  const prevVaccPageBtn = document.getElementById("prevVaccPageBtn");
  const nextVaccPageBtn = document.getElementById("nextVaccPageBtn");
  const vaccPageIndicator = document.getElementById("vaccPageIndicator");
  const vaccinationsTableBody = document.getElementById('vaccinationsTableBody');

  // --- Pet Select Helper ---
  async function fetchPets() {
    const res = await fetch('http://localhost:5000/pets');
    allPets = await res.json();
    return allPets;
  }
  function petNameById(pid) {
    const pet = allPets.find(p => String(p.pet_id) === String(pid));
    return pet ? pet.name : '';
  }
  async function populatePetSelect(targetId, selectedPetId = null) {
    await fetchPets();
    const petSelect = document.getElementById(targetId);
    if (!petSelect) return;
    petSelect.innerHTML = '<option value="">Select Pet</option>';
    allPets.forEach(pet => {
      petSelect.innerHTML += `<option value="${pet.pet_id}"${selectedPetId == pet.pet_id ? " selected" : ""}>${pet.name} (${pet.species || ""})</option>`;
    });
  }

  // --- Table Display ---
  function getFilteredVaccinations() {
    const q = (searchVaccinationsInput && searchVaccinationsInput.value) ? searchVaccinationsInput.value.trim().toLowerCase() : "";
    const filter = vaccinationFilter ? vaccinationFilter.value : "All Records";
    return allVaccinations.filter(vacc => {
      // Status filter
      let matchesStatus = true;
      if (filter === "Completed") {
        matchesStatus = vacc.status && vacc.status.toLowerCase() === "completed";
      } else if (filter === "Pending") {
        matchesStatus = vacc.status && vacc.status.toLowerCase() === "pending";
      } else if (filter === "Overdue") {
        matchesStatus = vacc.status && vacc.status.toLowerCase() === "overdue";
      } else if (filter === "Cancelled") {
        matchesStatus = vacc.status && vacc.status.toLowerCase() === "cancelled";
      } else if (filter === "Upcoming/Due") {
        matchesStatus = vacc.status && (vacc.status.toLowerCase() === "upcoming" || vacc.status.toLowerCase() === "due");
      }
      // "All Records" matches everything
      // Search filter
      let matchesSearch =
        (!q ||
          (String(vacc.vacc_id || '').includes(q)) ||
          (vacc.vaccination_type || '').toLowerCase().includes(q) ||
          (vacc.status || '').toLowerCase().includes(q) ||
          (petNameById(vacc.pet_id) || '').toLowerCase().includes(q) ||
          (vacc.administered_by || '').toLowerCase().includes(q)
        );
      return matchesStatus && matchesSearch;
    });
  }
  function renderVaccinationsTable() {
    if (!vaccinationsTableBody) return;
    const vaccinations = getFilteredVaccinations();
    vaccinationsTableBody.innerHTML = '';
    const totalPages = Math.max(1, Math.ceil(vaccinations.length / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;
    const startIdx = (currentPage - 1) * pageSize;
    const pageVaccinations = vaccinations.slice(startIdx, startIdx + pageSize);

    pageVaccinations.forEach(v => {
      vaccinationsTableBody.innerHTML += `
        <tr>
          <td>${v.vacc_id ?? ''}</td>
          <td>${petNameById(v.pet_id) ?? ''}</td>
          <td>${v.vaccination_type ?? ''}</td>
          <td>${v.date_given ? v.date_given.slice(0,10) : ''}</td>
          <td>${v.next_due ? v.next_due.slice(0,10) : ''}</td>
          <td>${v.status ?? ''}</td>
          <td>${v.administered_by ?? ''}</td>
            <td class="actions">
            <button class="action-btn edit-btn" title="Edit" data-id="${v.vacc_id}">
              <svg viewBox="0 0 32 32" fill="none">
                <rect x="20" y="10" width="3.8" height="13" rx="1" transform="rotate(45 20 10)" fill="#34a853" fill-opacity="0.18"/>
                <path d="M10 26v-3.7a1 1 0 0 1 .3-.7l13-13a1 1 0 0 1 1.4 0l2.7 2.7a1 1 0 0 1 0 1.4l-13 13a1 1 0 0 1-.7.3H10z" stroke="#34a853" stroke-width="2"/>
              </svg>
            </button>
            <button class="action-btn delete-btn" title="Delete" data-id="${v.vacc_id}">
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
    if (vaccPageIndicator) vaccPageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;

    // Attach event handlers (after table rendering)
    vaccinationsTableBody.querySelectorAll('.view-btn').forEach(btn => {
      btn.onclick = function () {
        const id = btn.dataset.id;
        const vacc = allVaccinations.find(a => String(a.vacc_id) === String(id));
        if (!vacc) return;
        document.getElementById('viewVaccinationId').textContent = vacc.vacc_id ?? '';
        document.getElementById('viewVaccinationPet').textContent = petNameById(vacc.pet_id) ?? '';
        document.getElementById('viewVaccinationType').textContent = vacc.vaccination_type ?? '';
        document.getElementById('viewVaccinationDateGiven').textContent = vacc.date_given ? vacc.date_given.slice(0,10) : '';
        document.getElementById('viewVaccinationNextDue').textContent = vacc.next_due ? vacc.next_due.slice(0,10) : '';
        document.getElementById('viewVaccinationStatus').textContent = vacc.status ?? '';
        document.getElementById('viewVaccinationAdministeredBy').textContent = vacc.administered_by ?? '';
        viewVaccinationModal.style.display = 'block';
      };
    });

    vaccinationsTableBody.querySelectorAll('.edit-btn').forEach(btn => {
      btn.onclick = async function () {
        const id = btn.dataset.id;
        const vacc = allVaccinations.find(a => String(a.vacc_id) === String(id));
        if (!vacc) return;
        await populatePetSelect('editVaccinationPetSelect', vacc.pet_id);
        document.getElementById('editVaccinationId').value = vacc.vacc_id ?? '';
        document.getElementById('editVaccinationType').value = vacc.vaccination_type ?? '';
        document.getElementById('editVaccinationStatus').value = vacc.status ?? '';
        document.getElementById('editVaccinationAdministeredBy').value = vacc.administered_by ?? '';
        document.getElementById('editVaccinationDateGiven').value = vacc.date_given ? vacc.date_given.slice(0,10) : '';
        document.getElementById('editVaccinationNextDue').value = vacc.next_due ? vacc.next_due.slice(0,10) : '';
        editVaccinationModal.style.display = 'block';
      };
    });

    vaccinationsTableBody.querySelectorAll('.delete-btn').forEach(btn => {
      btn.onclick = function () {
        deleteVaccId = btn.dataset.id;
        deleteVaccinationMsg.textContent = `Are you sure you want to delete vaccination #${btn.dataset.id}?`;
        deleteVaccinationModal.style.display = 'block';
      };
    });
  }

  // --- Search & Pagination ---
  if (searchVaccinationsInput) searchVaccinationsInput.addEventListener("input", function () {
    currentPage = 1;
    renderVaccinationsTable();
  });
  if (vaccinationFilter) vaccinationFilter.addEventListener("change", function () {
    currentPage = 1;
    renderVaccinationsTable();
  });
  if (prevVaccPageBtn) prevVaccPageBtn.onclick = function () {
    if (currentPage > 1) {
      currentPage--;
      renderVaccinationsTable();
    }
  };
  if (nextVaccPageBtn) nextVaccPageBtn.onclick = function () {
    const totalPages = Math.max(1, Math.ceil(getFilteredVaccinations().length / pageSize));
    if (currentPage < totalPages) {
      currentPage++;
      renderVaccinationsTable();
    }
  };

  // --- Modal Logic: Add ---
  if (addVaccinationBtn) addVaccinationBtn.onclick = async () => {
    await populatePetSelect('addVaccinationPetSelect');
    if (addVaccinationModal) addVaccinationModal.style.display = 'block';
    if (addVaccinationForm) addVaccinationForm.reset();
  };
  if (closeAddVaccinationModal) closeAddVaccinationModal.onclick = function () {
    addVaccinationModal.style.display = 'none';
    addVaccinationForm.reset();
  };
  if (cancelAddVaccinationBtn) cancelAddVaccinationBtn.onclick = function () {
    addVaccinationModal.style.display = 'none';
    addVaccinationForm.reset();
  };
  if (addVaccinationModal) addVaccinationModal.onclick = function(e) {
    if (e.target === addVaccinationModal) {
      addVaccinationModal.style.display = 'none';
      addVaccinationForm.reset();
    }
  };
  if (addVaccinationForm) addVaccinationForm.onsubmit = async function(e) {
    e.preventDefault();
    const payload = {
      pet_id: document.getElementById('addVaccinationPetSelect').value,
      vaccination_type: document.getElementById('addVaccinationType').value.trim(),
      date_given: document.getElementById('addVaccinationDateGiven').value,
      next_due: document.getElementById('addVaccinationNextDue').value,
      status: document.getElementById('addVaccinationStatus').value,
      administered_by: document.getElementById('addVaccinationAdministeredBy').value.trim()
    };
    const res = await fetch('http://localhost:5000/vaccinations', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      addVaccinationModal.style.display = 'none';
      addVaccinationForm.reset();
      loadVaccinations();
    } else {
      alert("Failed to add vaccination.");
    }
  };

  // --- Modal Logic: Edit ---
  if (closeEditVaccinationModal) closeEditVaccinationModal.onclick = cancelEditVaccinationBtn.onclick = function () {
    editVaccinationModal.style.display = 'none';
    editVaccinationForm.reset();
  };
  if (editVaccinationModal) editVaccinationModal.onclick = function(e) {
    if (e.target === editVaccinationModal) {
      editVaccinationModal.style.display = 'none';
      editVaccinationForm.reset();
    }
  };
  if (editVaccinationForm) editVaccinationForm.onsubmit = async function(e) {
    e.preventDefault();
    const id = document.getElementById('editVaccinationId').value;
    const payload = {
      pet_id: document.getElementById('editVaccinationPetSelect').value,
      vaccination_type: document.getElementById('editVaccinationType').value.trim(),
      date_given: document.getElementById('editVaccinationDateGiven').value,
      next_due: document.getElementById('editVaccinationNextDue').value,
      status: document.getElementById('editVaccinationStatus').value,
      administered_by: document.getElementById('editVaccinationAdministeredBy').value.trim()
    };
    const res = await fetch(`http://localhost:5000/vaccinations/${id}`, {
      method: 'PUT',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      editVaccinationModal.style.display = 'none';
      editVaccinationForm.reset();
      loadVaccinations();
    } else {
      alert("Failed to update vaccination.");
    }
  };

  // --- Modal Logic: View ---
  if (closeViewVaccinationModal) closeViewVaccinationModal.onclick = closeViewVaccinationBtn.onclick = function () {
    viewVaccinationModal.style.display = 'none';
  };
  if (viewVaccinationModal) viewVaccinationModal.onclick = function(e) {
    if (e.target === viewVaccinationModal) {
      viewVaccinationModal.style.display = 'none';
    }
  };

  // --- Modal Logic: Delete ---
  if (closeDeleteVaccinationModal) closeDeleteVaccinationModal.onclick = cancelDeleteVaccinationBtn.onclick = function () {
    deleteVaccinationModal.style.display = 'none';
    deleteVaccId = null;
  };
  if (deleteVaccinationModal) deleteVaccinationModal.onclick = function(e) {
    if (e.target === deleteVaccinationModal) {
      deleteVaccinationModal.style.display = 'none';
      deleteVaccId = null;
    }
  };
if (confirmDeleteVaccinationBtn) confirmDeleteVaccinationBtn.onclick = async function() {
  if (!deleteVaccId) return;
  const res = await fetch(`http://localhost:5000/vaccinations/${deleteVaccId}/archive`, { method: 'POST' });
  if (res.ok) {
    deleteVaccinationModal.style.display = 'none';
    loadVaccinations();
  } else {
    alert("Failed to archive vaccination.");
  }
  deleteVaccId = null;
};

async function loadVaccinations() {
  await fetchPets();
  try {
    const res = await fetch('http://localhost:5000/vaccinations');
    allVaccinations = (await res.json()) || [];
    renderVaccinationsTable();
    
    // ADD THIS LINE:
    if (window.checkNavigationAccess) window.checkNavigationAccess();
  } catch (err) {
    allVaccinations = [];
    renderVaccinationsTable();
    alert("Failed to load vaccinations. Check your backend.");
  }
}
  // --- Initial Load ---
  loadVaccinations();
  // --- Initial Load ---
  loadVaccinations();

  // --- PDF Generation ---
  document.getElementById('pdfBtn').addEventListener('click', function() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text('Vaccination Information', 14, 20);
    
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
    
    // Get filtered vaccinations (respects search and filter)
    const vaccinations = getFilteredVaccinations();
    
    // Prepare data for PDF
    const tableData = [];
    vaccinations.forEach(v => {
      tableData.push([
        v.vacc_id ?? '',
        petNameById(v.pet_id) ?? '',
        v.vaccination_type ?? '',
        v.date_given ? v.date_given.slice(0,10) : '',
        v.next_due ? v.next_due.slice(0,10) : '',
        v.status ?? '',
        v.administered_by ?? ''
      ]);
    });
    
    // Create table in PDF
    doc.autoTable({
      startY: 35,
      head: [['ID', 'Pet', 'Type', 'Date Given', 'Next Due', 'Status', 'Administered By']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [109, 158, 252],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'left'
      },
      styles: {
        fontSize: 9,
        cellPadding: 2
      },
      columnStyles: {
        0: { cellWidth: 12 },
        1: { cellWidth: 25 },
        2: { cellWidth: 30 },
        3: { cellWidth: 25 },
        4: { cellWidth: 25 },
        5: { cellWidth: 20 },
        6: { cellWidth: 30 }
      }
    });
    
    // Save the PDF
    doc.save('Vaccination_Information_' + now.getTime() + '.pdf');
  });
}); // This is the closing bracket for DOMContentLoaded
