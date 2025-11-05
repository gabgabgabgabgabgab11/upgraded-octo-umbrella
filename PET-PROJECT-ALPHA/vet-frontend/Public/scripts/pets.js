document.addEventListener("DOMContentLoaded", function () {
  // --- Profile Dropdown Logic ---
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
    // Settings functionality
  });
  document.getElementById('logoutBtn').addEventListener("click", function (e) {
    e.preventDefault();
    localStorage.removeItem("doctorName");
    localStorage.removeItem("doctorPhoto");
    window.location.href = "login.html";
  });

  // --- MODAL VARIABLES ---
  const addPetModal = document.getElementById('addPetModal');
  const addPetBtn = document.getElementById('addPetBtn');
  const closeAddPetModal = document.getElementById('closeAddPetModal');
  const cancelAddPetBtn = document.getElementById('cancelAddPetBtn');
  const addPetForm = document.getElementById('addPetForm');

  const editPetModal = document.getElementById('editPetModal');
  const closeEditPetModal = document.getElementById('closeEditPetModal');
  const cancelEditPetBtn = document.getElementById('cancelEditPetBtn');
  const editPetForm = document.getElementById('editPetForm');

  const viewPetModal = document.getElementById('viewPetModal');
  const closeViewPetModal = document.getElementById('closeViewPetModal');
  const closeViewPetBtn = document.getElementById('closeViewPetBtn');

  const deletePetModal = document.getElementById('deletePetModal');
  const closeDeletePetModal = document.getElementById('closeDeletePetModal');
  const cancelDeletePetBtn = document.getElementById('cancelDeletePetBtn');
  const confirmDeletePetBtn = document.getElementById('confirmDeletePetBtn');
  const deletePetMsg = document.getElementById('deletePetMsg');
  let deletePetId = null;

  // --- TABLE, SEARCH, PAGINATION ---
  let allPets = [];
  let allOwners = [];
  let currentPage = 1;
  const pageSize = 8;
  const searchPetsInput = document.getElementById("searchPetsInput");
  const prevPetsPageBtn = document.getElementById("prevPetsPageBtn");
  const nextPetsPageBtn = document.getElementById("nextPetsPageBtn");
  const petsPageIndicator = document.getElementById("petsPageIndicator");
  const petsTableBody = document.getElementById('petsTableBody');

  // --- OWNER LOGIC ---
  async function fetchOwners() {
    const r = await fetch('http://localhost:5000/owners');
    allOwners = await r.json();
    return allOwners;
  }
  function ownerNameById(owner_id) {
    const owner = allOwners.find(o => Number(o.owner_id) === Number(owner_id));
    return owner ? owner.name : '';
  }
  function populateOwnerSelect(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    select.innerHTML = '<option value="">Select Owner</option>';
    allOwners.forEach(owner => {
      select.innerHTML += `<option value="${owner.owner_id}">${owner.name}</option>`;
    });
  }

  // --- MODAL LOGIC: ADD ---
  if (addPetBtn) addPetBtn.onclick = async function () {
    await fetchOwners();
    populateOwnerSelect('addPetOwnerSelect');
    addPetModal.style.display = 'block';
    addPetForm.reset();
  };
  if (closeAddPetModal) closeAddPetModal.onclick = function () {
    addPetModal.style.display = 'none';
    addPetForm.reset();
  };
  if (cancelAddPetBtn) cancelAddPetBtn.onclick = function () {
    addPetModal.style.display = 'none';
    addPetForm.reset();
  };
  if (addPetModal) addPetModal.onclick = function(e) {
    if (e.target === addPetModal) {
      addPetModal.style.display = 'none';
      addPetForm.reset();
    }
  };
  if (addPetForm) addPetForm.onsubmit = async function(e) {
    e.preventDefault();
    const owner_id = Number(document.getElementById('addPetOwnerSelect').value);
    const name = document.getElementById('addPetName').value.trim();
    const species = document.getElementById('addPetSpecies').value.trim();
    const breed = document.getElementById('addPetBreed').value.trim();
    const age = Number(document.getElementById('addPetAge').value);
    const last_visit = document.getElementById('addVisit').value;
    const medical_notes = document.getElementById('addPetNotes') ? document.getElementById('addPetNotes').value.trim() : "";

    let errors = [];
    if (!name) errors.push("Name is required.");
    if (!species) errors.push("Species is required.");
    if (!breed) errors.push("Breed is required.");
    if (!owner_id) errors.push("Owner is required.");
    if (!age) errors.push("Age is required.");
    if (isNaN(age) || age < 0) errors.push("Age must be a positive number.");
    if (!last_visit) errors.push("Last visit date is required.");

    const payload = {
      name,
      species,
      breed,
      age,
      owner_id,
      last_visit,
      medical_notes
    };

    if (errors.length > 0) {
      alert("Please fix the following errors:\n" + errors.join("\n"));
      return;
    }
    const res = await fetch('http://localhost:5000/pets', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      addPetModal.style.display = 'none';
      addPetForm.reset();
      
      // Update navigation access
      if (window.checkNavigationAccess) window.checkNavigationAccess();
      
      loadPets();
    } else {
      let errMsg = "Failed to add pet.";
      try {
        const errData = await res.json();
        if (errData && errData.error) {
          errMsg += "\n" + errData.error;
        }
      } catch (ex) {}
      alert(errMsg);
    }
  };

  // --- MODAL LOGIC: EDIT ---
  if (closeEditPetModal) closeEditPetModal.onclick = cancelEditPetBtn.onclick = function () {
    editPetModal.style.display = 'none';
    editPetForm.reset();
  };
  if (editPetModal) editPetModal.onclick = function(e) {
    if (e.target === editPetModal) {
      editPetModal.style.display = 'none';
      editPetForm.reset();
    }
  };
  if (editPetForm) editPetForm.onsubmit = async function(e) {
    e.preventDefault();
    const id = document.getElementById('editPetId').value;
    const owner_id = Number(document.getElementById('editPetOwnerSelect').value);
    const name = document.getElementById('editPetName').value.trim();
    const species = document.getElementById('editPetSpecies').value.trim();
    const breed = document.getElementById('editPetBreed').value.trim();
    const age = Number(document.getElementById('editPetAge').value);
    const last_visit = document.getElementById('editVisit').value;
    const medical_notes = document.getElementById('editPetNotes') ? document.getElementById('editPetNotes').value.trim() : "";

    let errors = [];
    if (!name) errors.push("Name is required.");
    if (!species) errors.push("Species is required.");
    if (!breed) errors.push("Breed is required.");
    if (!owner_id) errors.push("Owner is required.");
    if (!age) errors.push("Age is required.");
    if (isNaN(age) || age < 0) errors.push("Age must be a positive number.");
    if (!last_visit) errors.push("Last visit date is required.");

    const payload = {
      name,
      species,
      breed,
      age,
      owner_id,
      last_visit,
      medical_notes
    };

    if (errors.length > 0) {
      alert("Please fix the following errors:\n" + errors.join("\n"));
      return;
    }
    const res = await fetch(`http://localhost:5000/pets/${id}`, {
      method: 'PUT',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      editPetModal.style.display = 'none';
      editPetForm.reset();
      loadPets();
    } else {
      let errMsg = "Failed to update pet.";
      try {
        const errData = await res.json();
        if (errData && errData.error) {
          errMsg += "\n" + errData.error;
        }
      } catch (ex) {}
      alert(errMsg);
    }
  };

  // --- MODAL LOGIC: VIEW ---
  function showViewPetModal(pet) {
    document.getElementById('viewPetName').textContent = pet.name || '';
    document.getElementById('viewPetSpecies').textContent = pet.species || '';
    document.getElementById('viewPetBreed').textContent = pet.breed || '';
    document.getElementById('viewPetOwner').textContent = ownerNameById(pet.owner_id) || '';
    document.getElementById('viewPetAge').textContent = pet.age || '';
    document.getElementById('viewVisit').textContent = (pet.last_visit || '').slice(0, 10);
    document.getElementById('viewPetNotes').textContent = pet.medical_notes || '';
    viewPetModal.style.display = 'block';
  }
  
  if (closeViewPetModal) closeViewPetModal.onclick = closeViewPetBtn.onclick = function () {
    viewPetModal.style.display = 'none';
  };
  if (viewPetModal) viewPetModal.onclick = function(e) {
    if (e.target === viewPetModal) {
      viewPetModal.style.display = 'none';
    }
  };

  // --- MODAL LOGIC: DELETE (ARCHIVE) ---
  if (closeDeletePetModal) closeDeletePetModal.onclick = cancelDeletePetBtn.onclick = function () {
    deletePetModal.style.display = 'none';
    deletePetId = null;
  };
  if (deletePetModal) deletePetModal.onclick = function(e) {
    if (e.target === deletePetModal) {
      deletePetModal.style.display = 'none';
      deletePetId = null;
    }
  };
  if (confirmDeletePetBtn) confirmDeletePetBtn.onclick = async function() {
    if (!deletePetId) return;
    // Use archive endpoint instead of delete
    const res = await fetch(`http://localhost:5000/pets/${deletePetId}/archive`, { method: 'POST' });
    if (res.ok) {
      deletePetModal.style.display = 'none';
      loadPets();
    } else {
      alert("Failed to archive pet.");
    }
    deletePetId = null;
  };

  // --- TABLE DISPLAY HELPERS ---
  function getFilteredPets() {
    const q = (searchPetsInput && searchPetsInput.value) ? searchPetsInput.value.trim().toLowerCase() : "";
    return allPets.filter(pet =>
      (!q ||
        (pet.name || '').toLowerCase().includes(q) ||
        (pet.species || '').toLowerCase().includes(q) ||
        (pet.breed || '').toLowerCase().includes(q) ||
        (ownerNameById(pet.owner_id) || '').toLowerCase().includes(q) ||
        (pet.last_visit || '').toLowerCase().includes(q) ||
        (pet.medical_notes || '').toLowerCase().includes(q)
      )
    );
  }
  
  function renderPetsTable() {
    if (!petsTableBody) return;
    const pets = getFilteredPets();
    petsTableBody.innerHTML = '';
    const totalPages = Math.max(1, Math.ceil(pets.length / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;
    const startIdx = (currentPage - 1) * pageSize;
    const pagePets = pets.slice(startIdx, startIdx + pageSize);

    pagePets.forEach(pet => {
      // Format last_visit as "M/D/YYYY, h:mm:ss AM/PM"
      let lastVisitStr = '';
      if (pet.last_visit) {
        const date = new Date(pet.last_visit);
        if (!isNaN(date)) {
          lastVisitStr = date.toLocaleString('en-US', {
            month: 'numeric',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
          });
        } else {
          lastVisitStr = pet.last_visit.replace('T', ' ').slice(0, 16);
        }
      }

      petsTableBody.innerHTML += `
        <tr>
          <td>${pet.pet_id || ''}</td>
          <td>${pet.name || ''}</td>
          <td>${pet.species || ''}</td>
          <td>${pet.breed || ''}</td>
          <td>${ownerNameById(pet.owner_id) || ''}</td>
          <td>${pet.age || ''}</td>
          <td>${lastVisitStr}</td>
          <td>${pet.medical_notes || ''}</td>
          <td class="actions">
            <button class="action-btn edit-btn" title="Edit" data-id="${pet.pet_id}">
              <svg viewBox="0 0 32 32" fill="none">
                <rect x="20" y="10" width="3.8" height="13" rx="1" transform="rotate(45 20 10)" fill="#34a853" fill-opacity="0.18"/>
                <path d="M10 26v-3.7a1 1 0 0 1 .3-.7l13-13a1 1 0 0 1 1.4 0l2.7 2.7a1 1 0 0 1 0 1.4l-13 13a1 1 0 0 1-.7.3H10z" stroke="#34a853" stroke-width="2"/>
              </svg>
            </button>
            <button class="action-btn delete-btn" title="Archive" data-id="${pet.pet_id}">
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
    if (petsPageIndicator) petsPageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;

    petsTableBody.querySelectorAll('.edit-btn').forEach(btn => {
      btn.onclick = async function () {
        const id = btn.dataset.id;
        const pet = allPets.find(p => p.pet_id == id);
        if (!pet) return;
        await fetchOwners();
        populateOwnerSelect('editPetOwnerSelect');
        document.getElementById('editPetId').value = pet.pet_id;
        document.getElementById('editPetName').value = pet.name || '';
        document.getElementById('editPetSpecies').value = pet.species || '';
        document.getElementById('editPetBreed').value = pet.breed || '';
        document.getElementById('editPetOwnerSelect').value = pet.owner_id || '';
        document.getElementById('editPetAge').value = pet.age || '';
        document.getElementById('editVisit').value = pet.last_visit ? pet.last_visit.slice(0, 16) : '';
        document.getElementById('editPetNotes').value = pet.medical_notes || '';
        editPetModal.style.display = 'block';
      };
    });
    
    petsTableBody.querySelectorAll('.delete-btn').forEach(btn => {
      btn.onclick = function () {
        deletePetId = btn.dataset.id;
        deletePetMsg.textContent = `Are you sure you want to archive pet #${btn.dataset.id}? This will also archive all related appointments, treatments, and vaccinations.`;
        deletePetModal.style.display = 'block';
      };
    });
  }

  async function loadPets() {
    try {
      const res = await fetch('http://localhost:5000/pets');
      allPets = (await res.json()) || [];
      renderPetsTable();
      
      // Update nav access after loading pets
      if (window.checkNavigationAccess) window.checkNavigationAccess();
    } catch (err) {
      allPets = [];
      renderPetsTable();
      alert("Failed to load pets. Check your backend.");
    }
  }

  // --- SEARCH FILTER EVENT ---
  searchPetsInput.addEventListener("input", function () {
    currentPage = 1;
    renderPetsTable();
  });

  // --- PAGINATION ---
  prevPetsPageBtn.onclick = function () {
    if (currentPage > 1) {
      currentPage--;
      renderPetsTable();
    }
  };
  nextPetsPageBtn.onclick = function () {
    const pets = getFilteredPets();
    const totalPages = Math.max(1, Math.ceil(pets.length / pageSize));
    if (currentPage < totalPages) {
      currentPage++;
      renderPetsTable();
    }
  };

  // --- INITIAL LOAD ---
  loadPets();

  // --- PDF Generation ---
  document.getElementById('pdfBtn').addEventListener('click', function() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text('Pet Information', 14, 20);
    
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
    
    // Get filtered pets (respects search)
    const pets = getFilteredPets();
    
    // Prepare data for PDF
    const tableData = [];
    pets.forEach(pet => {
      let lastVisitStr = '';
      if (pet.last_visit) {
        const date = new Date(pet.last_visit);
        if (!isNaN(date)) {
          lastVisitStr = date.toLocaleString('en-US', {
            month: 'numeric',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
          });
        }
      }
      
      tableData.push([
        pet.pet_id || '',
        pet.name || '',
        pet.species || '',
        pet.breed || '',
        ownerNameById(pet.owner_id) || '',
        pet.age || '',
        lastVisitStr,
        pet.medical_notes || ''
      ]);
    });
    
    // Create table in PDF
    doc.autoTable({
      startY: 35,
      head: [['ID', 'Name', 'Species', 'Breed', 'Owner', 'Age', 'Last Visit', 'Notes']],
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
        1: { cellWidth: 25 },
        2: { cellWidth: 20 },
        3: { cellWidth: 20 },
        4: { cellWidth: 25 },
        5: { cellWidth: 12 },
        6: { cellWidth: 35 },
        7: { cellWidth: 30 }
      }
    });
    
    // Save the PDF
    doc.save('Pet_Information_' + now.getTime() + '.pdf');
  });
});