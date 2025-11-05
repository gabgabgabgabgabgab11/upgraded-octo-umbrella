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
    // Use the default set in your HTML
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
  
    
  });
  document.getElementById('logoutBtn').addEventListener("click", function (e) {
    e.preventDefault();
    localStorage.removeItem("doctorName");
    localStorage.removeItem("doctorPhoto");
    window.location.href = "login.html";
  });
  // --- Pagination ---
  let currentPage = 1;
  const pageSize = 8;
  let allOwners = [];

  // --- Load owners on page load ---
  loadOwners();

  // --- Search Filter ---
  document.getElementById("searchInput").addEventListener("input", function () {
    currentPage = 1; // always reset to first page when searching
    renderOwnersTable();
  });

  // --- Pagination Controls ---
  document.getElementById('prevPage').onclick = function () {
    if (currentPage > 1) {
      currentPage--;
      renderOwnersTable();
    }
  };
  document.getElementById('nextPage').onclick = function () {
    const totalPages = Math.ceil(getFilteredOwners().length / pageSize);
    if (currentPage < totalPages) {
      currentPage++;
      renderOwnersTable();
    }
  };

  // --- Add Owner Modal logic ---
  const addOwnerModal = document.getElementById('addOwnerModal');
  const addOwnerBtn = document.getElementById('addOwnerBtn');
  const closeAddOwnerModal = document.getElementById('closeAddOwnerModal');
  const cancelAddOwnerBtn = document.getElementById('cancelAddOwnerBtn');
  const addOwnerForm = document.getElementById('addOwnerForm');

  addOwnerBtn.onclick = function() {
    addOwnerModal.style.display = 'block';
    addOwnerForm.reset();
  };
  closeAddOwnerModal.onclick = cancelAddOwnerBtn.onclick = function() {
    addOwnerModal.style.display = 'none';
    addOwnerForm.reset();
  };

  // --- Edit Owner Modal logic ---
  const editOwnerModal = document.getElementById('editOwnerModal');
  const closeEditOwnerModal = document.getElementById('closeEditOwnerModal');
  const cancelEditOwnerBtn = document.getElementById('cancelEditOwnerBtn');
  const editOwnerForm = document.getElementById('editOwnerForm');

  closeEditOwnerModal.onclick = cancelEditOwnerBtn.onclick = function() {
    editOwnerModal.style.display = 'none';
    editOwnerForm.reset();
    delete editOwnerForm.dataset.ownerId;
  };

 

            // --- Delete Owner Modal logic (consistent with Vaccination Delete Modal) ---
        const deleteOwnerModal = document.getElementById('deleteOwnerModal');
        const closeDeleteOwnerModal = document.getElementById('closeDeleteOwnerModal');
        const cancelDeleteOwnerBtn = document.getElementById('cancelDeleteOwnerBtn');
        const confirmDeleteOwnerBtn = document.getElementById('confirmDeleteOwnerBtn');
        const deleteOwnerMsg = document.getElementById('deleteOwnerMsg');

        closeDeleteOwnerModal.onclick = cancelDeleteOwnerBtn.onclick = function () {
          deleteOwnerModal.style.display = 'none';
          confirmDeleteOwnerBtn.onclick = null;
        };

        deleteOwnerModal.onclick = function(e) {
          if (e.target === deleteOwnerModal) {
            deleteOwnerModal.style.display = 'none';
            confirmDeleteOwnerBtn.onclick = null;
          }
        };

  // --- PDF Generation ---
  document.getElementById('pdfBtn').addEventListener('click', function() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text('Owner Information', 14, 20);
    
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
    
    // Get filtered owners (respects search)
    const owners = getFilteredOwners();
    
    // Prepare data for PDF
    const tableData = [];
    owners.forEach(owner => {
      tableData.push([
        owner.owner_id,
        owner.name,
        owner.phone || '',
        owner.email || '',
        owner.address || '',
        owner.pet_count != null ? owner.pet_count : (owner.pets != null ? owner.pets : 0)
      ]);
    });
    
    // Create table in PDF
    doc.autoTable({
      startY: 35,
      head: [['ID', 'Name', 'Contact', 'Email', 'Address', 'Pets']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [109, 158, 252], // #6d9efc
        textColor: 255,
        fontStyle: 'bold',
        halign: 'left'
      },
      styles: {
        fontSize: 9,
        cellPadding: 3
      },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 30 },
        2: { cellWidth: 30 },
        3: { cellWidth: 45 },
        4: { cellWidth: 35 },
        5: { cellWidth: 15 }
      }
    });
    
    // Save the PDF
    doc.save('Owner_Information_' + now.getTime() + '.pdf');
  });
        
  // --- Add Owner Form Submit ---
  addOwnerForm.onsubmit = async function(e) {
    e.preventDefault();
    const payload = {
      name: document.getElementById('addOwnerName').value.trim(),
      phone: document.getElementById('addOwnerContact').value.trim(),
      email: document.getElementById('addOwnerEmail').value.trim(),
      address: document.getElementById('addOwnerAddress').value.trim(),
      pets: Number(document.getElementById('addOwnerPets').value.trim()) || 0,
    };
    const res = await fetch('http://localhost:5000/owners', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });
      if (res.ok) {
      addOwnerModal.style.display = 'none';
      addOwnerForm.reset();
      await loadOwners();
  
     // Update navigation access
     if (window.checkNavigationAccess) window.checkNavigationAccess();
}
  };

  // --- Edit Owner Form Submit ---
  editOwnerForm.onsubmit = async function(e) {
    e.preventDefault();
    const ownerId = editOwnerForm.dataset.ownerId;
    const payload = {
      name: document.getElementById('editOwnerName').value.trim(),
      phone: document.getElementById('editOwnerContact').value.trim(), 
      email: document.getElementById('editOwnerEmail').value.trim(),
      address: document.getElementById('editOwnerAddress').value.trim(),
      pets: Number(document.getElementById('editOwnerPets').value.trim()) || 0,
    };
    const res = await fetch(`http://localhost:5000/owners/${ownerId}`, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      editOwnerModal.style.display = 'none';
      editOwnerForm.reset();
      delete editOwnerForm.dataset.ownerId;
      await loadOwners();
    } else {
      alert('Failed to update owner.');
    }
  };

  // --- Helper for Table Rendering and Event Binding ---
  function renderOwnersTable() {
    const owners = getFilteredOwners();
    const tbody = document.querySelector('#ownerTable tbody');
    tbody.innerHTML = '';

    // Pagination
    const totalPages = Math.max(1, Math.ceil(owners.length / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;
    const startIdx = (currentPage - 1) * pageSize;
    const pageOwners = owners.slice(startIdx, startIdx + pageSize);

    pageOwners.forEach(owner => {
      tbody.innerHTML += `
        <tr>
          <td>${owner.owner_id}</td>
          <td>${owner.name}</td>
          <td>${owner.phone || ''}</td>
          <td>${owner.email || ''}</td>
          <td>${owner.address || ''}</td>
          <td>${owner.pet_count != null ? owner.pet_count : (owner.pets != null ? owner.pets : 0)}</td>
          <td class="actions">
            <button class="action-btn edit" title="Edit" data-id="${owner.owner_id}">
              <svg viewBox="0 0 32 32" fill="none">
                <rect x="20" y="10" width="3.8" height="13" rx="1" transform="rotate(45 20 10)" fill="#34a853" fill-opacity="0.18"/>
                <path d="M10 26v-3.7a1 1 0 0 1 .3-.7l13-13a1 1 0 0 1 1.4 0l2.7 2.7a1 1 0 0 1 0 1.4l-13 13a1 1 0 0 1-.7.3H10z" stroke="#34a853" stroke-width="2"/>
              </svg>
            </button>
            <button class="action-btn delete" title="Delete" data-id="${owner.owner_id}">
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

    // Pagination info
    document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${totalPages}`;

    tbody.querySelectorAll('.action-btn.edit').forEach(btn => {
      btn.onclick = () => showEditOwnerModal(allOwners.find(o => o.owner_id == btn.dataset.id));
    });
    tbody.querySelectorAll('.action-btn.delete').forEach(btn => {
      btn.onclick = () => showDeleteOwnerModal(allOwners.find(o => o.owner_id == btn.dataset.id));
    });
  }

  function getFilteredOwners() {
    const q = document.getElementById("searchInput").value.trim().toLowerCase();
    if (!q) return allOwners;
    return allOwners.filter(owner =>
      owner.name.toLowerCase().includes(q)
      || (owner.phone || '').toLowerCase().includes(q)
      || (owner.email || '').toLowerCase().includes(q)
      || (owner.address || '').toLowerCase().includes(q)
    );
  }

  // --- Load Owners from backend ---
async function loadOwners() {
  try {
    const res = await fetch('http://localhost:5000/owners');
    allOwners = (await res.json()) || [];
    renderOwnersTable();
    
    // Update nav access after loading owners
    if (window.checkNavigationAccess) window.checkNavigationAccess();
  } catch (err) {
    allOwners = [];
    renderOwnersTable();
    alert("Failed to load owners. Check your backend.");
  }
}


  // --- Edit Owner Modal ---
  function showEditOwnerModal(owner) {
    document.getElementById('editOwnerName').value = owner.name;
    document.getElementById('editOwnerContact').value = owner.phone || '';
    document.getElementById('editOwnerEmail').value = owner.email || '';
    document.getElementById('editOwnerAddress').value = owner.address || '';
    document.getElementById('editOwnerPets').value = owner.pet_count != null ? owner.pet_count : (owner.pets != null ? owner.pets : 0);
    editOwnerForm.dataset.ownerId = owner.owner_id;
    editOwnerModal.style.display = 'block';
  }

  // --- Delete Owner Modal ---
            function showDeleteOwnerModal(owner) {
          deleteOwnerMsg.textContent = `Are you sure you want to delete "${owner.name}"?`;
          deleteOwnerModal.style.display = 'block';
          confirmDeleteOwnerBtn.onclick = async function() {
            const res = await fetch(`http://localhost:5000/owners/${owner.owner_id}/archive`, { method: 'POST' });
            if (res.ok) {
              deleteOwnerModal.style.display = 'none';
              await loadOwners();
            } else {
              alert('Failed to delete owner.');
            }
            confirmDeleteOwnerBtn.onclick = null;
          };
        }
});