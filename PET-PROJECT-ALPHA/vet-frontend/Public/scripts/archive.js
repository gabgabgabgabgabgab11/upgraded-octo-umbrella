document.addEventListener("DOMContentLoaded", async function () {
  // Profile dropdown logic
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
  
  document.getElementById('logoutBtn').addEventListener("click", function (e) {
    e.preventDefault();
    localStorage.removeItem("doctorName");
    localStorage.removeItem("doctorPhoto");
    window.location.href = "login.html";
  });

  // Archive data
  let allArchived = [];
  let currentFilter = 'all';
  let currentRestoreItem = null;
  let currentDeleteItem = null;

  // Create modals if they don't exist
  createRestoreModal();
  createDeleteModal();

  // Filter buttons
  const filterButtons = document.querySelectorAll('.filter-btn');
  filterButtons.forEach(btn => {
    btn.addEventListener('click', function() {
      filterButtons.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      currentFilter = this.dataset.filter;
      renderArchivedItems();
    });
  });

  // Create Restore Modal
  function createRestoreModal() {
    const modalHTML = `
      <div id="restoreModal" class="modal" style="display: none;">
        <div class="modal-content">
          <div class="modal-header">
            <h2>Restore Item</h2>
            <span class="close" id="closeRestoreModal">&times;</span>
          </div>
          <div class="modal-body">
            <p id="restoreMessage"></p>
            <div id="restoreCascadeInfo" style="margin-top: 15px; padding: 12px; background: #e8f5e9; border-radius: 8px; display: none;">
              <strong style="color: #2e7d32;">✅ This will also restore:</strong>
              <ul id="restoreCascadeList" style="margin: 8px 0 0 20px; color: #2e7d32;"></ul>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" id="cancelRestore">Cancel</button>
            <button class="btn-primary" id="confirmRestore">Restore</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = document.getElementById('restoreModal');
    const closeBtn = document.getElementById('closeRestoreModal');
    const cancelBtn = document.getElementById('cancelRestore');
    const confirmBtn = document.getElementById('confirmRestore');

    closeBtn.onclick = cancelBtn.onclick = () => {
      modal.style.display = 'none';
      currentRestoreItem = null;
    };

    modal.onclick = (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
        currentRestoreItem = null;
      }
    };

    confirmBtn.onclick = async () => {
      if (currentRestoreItem) {
        await performRestore(currentRestoreItem.type, currentRestoreItem.id);
        modal.style.display = 'none';
        currentRestoreItem = null;
      }
    };
  }

  // Create Delete Modal
  function createDeleteModal() {
    const modalHTML = `
      <div id="deleteModal" class="modal" style="display: none;">
        <div class="modal-content">
          <div class="modal-header" style="background: #ffebee;">
            <h2 style="color: #c62828;">⚠️ Permanent Delete</h2>
            <span class="close" id="closeDeleteModal">&times;</span>
          </div>
          <div class="modal-body">
            <p id="deleteMessage" style="color: #d32f2f; font-weight: 600;"></p>
            <p style="margin-top: 10px;">This action CANNOT be undone!</p>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" id="cancelDelete">Cancel</button>
            <button class="btn-danger" id="confirmDelete">Delete Permanently</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = document.getElementById('deleteModal');
    const closeBtn = document.getElementById('closeDeleteModal');
    const cancelBtn = document.getElementById('cancelDelete');
    const confirmBtn = document.getElementById('confirmDelete');

    closeBtn.onclick = cancelBtn.onclick = () => {
      modal.style.display = 'none';
      currentDeleteItem = null;
    };

    modal.onclick = (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
        currentDeleteItem = null;
      }
    };

    confirmBtn.onclick = async () => {
      if (currentDeleteItem) {
        await performDelete(currentDeleteItem.type, currentDeleteItem.id);
        modal.style.display = 'none';
        currentDeleteItem = null;
      }
    };
  }

  // Load archived items
  async function loadArchivedItems() {
    try {
      const res = await fetch('http://localhost:5000/api/archived/all');
      allArchived = await res.json();
      
      // Update statistics
      const statsRes = await fetch('http://localhost:5000/api/archived/stats');
      const stats = await statsRes.json();
      
      const totalArchived = stats.archived_owners + stats.archived_pets + 
                           stats.archived_appointments + stats.archived_treatments + 
                           stats.archived_vaccinations;
      
      document.getElementById('totalArchivedCount').textContent = totalArchived;
      document.getElementById('expiringSoonCount').textContent = stats.expiring_soon_owners || 0;
      
      renderArchivedItems();
    } catch (err) {
      console.error('Error loading archived items:', err);
      alert('Failed to load archived items');
    }
  }

  // Render archived items based on filter
  function renderArchivedItems() {
    const container = document.getElementById('archivedItemsContainer');
    
    let filtered = allArchived;
    if (currentFilter !== 'all') {
      filtered = allArchived.filter(item => item.type === currentFilter);
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 60px 20px; color: #6c757d;">
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none" style="opacity: 0.3; margin-bottom: 20px;">
            <path d="M40 10 L70 25 L70 55 L40 70 L10 55 L10 25 Z" stroke="currentColor" stroke-width="2" fill="none"/>
            <circle cx="40" cy="40" r="15" stroke="currentColor" stroke-width="2" fill="none"/>
          </svg>
          <h3>No archived items</h3>
          <p>Your archive is empty</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(item => {
      const daysLeft = item.days_left;
      const isExpiringSoon = daysLeft <= 7;
      const statusColor = isExpiringSoon ? '#ea4335' : '#6c757d';
      
      return `
        <div class="archive-card" data-type="${item.type}" data-id="${item.id}">
          <div class="archive-card-header">
            <div class="archive-type-badge ${item.type}">${item.type.toUpperCase()}</div>
            <div class="archive-days-left" style="color: ${statusColor}">
              ${daysLeft} days left
              ${isExpiringSoon ? ' ⚠️' : ''}
            </div>
          </div>
          <h3 class="archive-card-title">${item.title}</h3>
          <p class="archive-card-subtitle">${item.subtitle}</p>
          <div class="archive-card-footer">
            <small style="color: #6c757d">
              Archived: ${new Date(item.archived_at).toLocaleDateString()}
            </small>
            <div class="archive-card-actions">
              <button class="restore-btn" data-type="${item.type}" data-id="${item.id}" data-title="${item.title}">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2v4m0 0L6 4m2 2l2-2M8 14v-4m0 0l-2 2m2-2l2 2" stroke="currentColor" stroke-width="1.5"/>
                  <circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1"/>
                </svg>
                Restore
              </button>
              <button class="delete-permanent-btn" data-type="${item.type}" data-id="${item.id}" data-title="${item.title}">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="3" y="5" width="10" height="8" rx="1" stroke="currentColor" stroke-width="1.5"/>
                  <path d="M5 7v4m3-4v4m3-4v4M4 3h8M6 3v-1h4v1" stroke="currentColor" stroke-width="1.5"/>
                </svg>
                Delete
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Attach event listeners to buttons
    attachButtonListeners();
  }

  // Attach event listeners to restore and delete buttons
  function attachButtonListeners() {
    // Restore buttons
    document.querySelectorAll('.restore-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const type = this.dataset.type;
        const id = this.dataset.id;
        const title = this.dataset.title;
        showRestoreModal(type, id, title);
      });
    });

    // Delete buttons
    document.querySelectorAll('.delete-permanent-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const type = this.dataset.type;
        const id = this.dataset.id;
        const title = this.dataset.title;
        showDeleteModal(type, id, title);
      });
    });
  }

  // Show restore modal
  function showRestoreModal(type, id, title) {
    const modal = document.getElementById('restoreModal');
    const message = document.getElementById('restoreMessage');
    const cascadeInfo = document.getElementById('restoreCascadeInfo');
    const cascadeList = document.getElementById('restoreCascadeList');

    message.textContent = `Are you sure you want to restore "${title}"?`;

    // Show cascade information for owners and pets
    if (type === 'owner' || type === 'pet') {
      cascadeInfo.style.display = 'block';
      
      if (type === 'owner') {
        cascadeList.innerHTML = `
          <li>All associated pets</li>
          <li>All associated appointments</li>
          <li>All associated treatments</li>
          <li>All associated vaccinations</li>
        `;
      } else if (type === 'pet') {
        cascadeList.innerHTML = `
          <li>All associated appointments</li>
          <li>All associated treatments</li>
          <li>All associated vaccinations</li>
        `;
      }
    } else {
      cascadeInfo.style.display = 'none';
    }

    currentRestoreItem = { type, id, title };
    modal.style.display = 'block';
  }

  // Show delete modal
  function showDeleteModal(type, id, title) {
    const modal = document.getElementById('deleteModal');
    const message = document.getElementById('deleteMessage');

    message.textContent = `Are you sure you want to PERMANENTLY delete "${title}"?`;
    
    currentDeleteItem = { type, id, title };
    modal.style.display = 'block';
  }

  // Perform restore
  async function performRestore(type, id) {
    try {
      const res = await fetch(`http://localhost:5000/api/archived/${type}/${id}/restore`, {
        method: 'POST'
      });
      
      if (res.ok) {
        alert(`✅ ${type.charAt(0).toUpperCase() + type.slice(1)} restored successfully!`);
        await loadArchivedItems();
      } else {
        const error = await res.json();
        alert(`Failed to restore: ${error.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error restoring item:', err);
      alert('Failed to restore item. Please check your connection.');
    }
  }

  // Perform delete
  async function performDelete(type, id) {
    try {
      const res = await fetch(`http://localhost:5000/api/archived/${type}/${id}/permanent`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        alert('✅ Item permanently deleted');
        await loadArchivedItems();
      } else {
        const error = await res.json();
        alert(`Failed to delete: ${error.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error deleting item:', err);
      alert('Failed to delete item. Please check your connection.');
    }
  }

  // Cleanup expired archives
  document.getElementById('cleanupExpiredBtn')?.addEventListener('click', async function() {
    if (!confirm('⚠️ This will PERMANENTLY delete all items that have been archived for more than 30 days.\n\nContinue?')) {
      return;
    }
    
    try {
      const res = await fetch('http://localhost:5000/api/archived/cleanup', {
        method: 'DELETE'
      });
      
      const data = await res.json();
      if (res.ok) {
        alert(`✅ Cleanup complete!\n\n${data.deleted} expired items were permanently deleted.`);
        await loadArchivedItems();
      } else {
        alert(`Failed to cleanup: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error during cleanup:', err);
      alert('Failed to cleanup expired archives');
    }
  });

  // Initial load
  await loadArchivedItems();
});