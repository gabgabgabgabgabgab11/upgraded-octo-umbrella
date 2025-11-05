document.addEventListener('DOMContentLoaded', function() {
  // ======== MODAL CLOSE (redirect to dashboard.html) ========
  document.querySelector('.settings-close').addEventListener('click', function() {
    if (document.referrer) {
      window.history.back();
    } else {
      window.location.href = 'dashboard.html';
    }
  });

  // ======== SIDEBAR TAB SWITCHING ========
  const sidebarItems = document.querySelectorAll('.settings-sidebar li');
  const tabs = document.querySelectorAll('.settings-tab');
  const tabIds = ['tab-general', 'tab-account', 'tab-archive', 'tab-notifications', 'tab-appearance', 'tab-privacy'];

  sidebarItems.forEach((item, idx) => {
    item.addEventListener('click', function() {
      sidebarItems.forEach(li => li.classList.remove('active'));
      tabs.forEach(tab => tab.classList.remove('active'));
      item.classList.add('active');
      
      if (tabIds[idx]) {
        document.getElementById(tabIds[idx]).classList.add('active');
        
        // Load archived items when Archive tab is clicked
        if (tabIds[idx] === 'tab-archive') {
          loadArchivedItems();
        }
      }
    });
  });

  // ======== CANCEL BUTTONS ========
  document.querySelectorAll('.cancel-btn, .btn-cancel, .cancel-btn-notifications, .cancel-btn-appearance, .cancel-btn-privacy').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      const form = btn.closest('form');
      if (form) form.reset();
    });
  });

  // ======== ACCOUNT TAB PROFILE LOGIC ========
  const doctorId = localStorage.getItem("doctorId");
  const profileForm = document.querySelector(".profile-form");
  const doctorNameInput = document.getElementById("doctorName");
  const emailInput = document.getElementById("emailAddress");
  const specialtyInput = document.getElementById("specialty");
  const avatarDiv = document.querySelector(".profile-avatar");
  const photoBtn = document.querySelector(".profile-photo-btn");

  let fileInput = document.createElement('input');
  fileInput.type = "file";
  fileInput.accept = "image/*";
  fileInput.style.display = "none";
  document.body.appendChild(fileInput);

  if (doctorId && profileForm) {
    fetch(`http://localhost:5000/doctors/${doctorId}`)
      .then(res => res.json())
      .then(data => {
        if (data.display_name) doctorNameInput.value = data.display_name;
        if (data.email) emailInput.value = data.email;
        if (data.specialty) specialtyInput.value = data.specialty;
        if (data.photo) {
          avatarDiv.innerHTML = '';
          const img = document.createElement('img');
          img.src = data.photo;
          img.alt = "Profile Photo";
          img.width = img.height = 72;
          img.style.borderRadius = "50%";
          avatarDiv.appendChild(img);
        }
      })
      .catch(err => console.error('Error loading profile:', err));
  }

  if (photoBtn) {
    photoBtn.onclick = () => fileInput.click();
  }

  fileInput.onchange = function () {
    const file = this.files[0];
    if (file) {
      let img = avatarDiv.querySelector('img');
      if (!img) {
        img = document.createElement('img');
        img.width = img.height = 72;
        img.style.borderRadius = "50%";
        avatarDiv.innerHTML = '';
        avatarDiv.appendChild(img);
      }
      img.src = URL.createObjectURL(file);
    }
  };

  if (profileForm) {
    profileForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const display_name = doctorNameInput.value;
      const email = emailInput.value;
      const specialty = specialtyInput.value;
      const hasPhoto = fileInput.files.length > 0;
      
      let body = new FormData();
      body.append("display_name", display_name);
      body.append("email", email);
      body.append("specialty", specialty);
      if (hasPhoto) {
        body.append("photo", fileInput.files[0]);
      }

      try {
        const res = await fetch(`http://localhost:5000/doctors/${doctorId}`, {
          method: "PUT",
          body
        });
        const data = await res.json();
        showSaveToast(data.message || "Profile updated!");
        if (data.photo) {
          let img = avatarDiv.querySelector('img');
          if (!img) {
            img = document.createElement('img');
            img.width = img.height = 72;
            img.style.borderRadius = "50%";
            avatarDiv.innerHTML = '';
            avatarDiv.appendChild(img);
          }
          img.src = data.photo;
          fileInput.value = "";
        }
      } catch (error) {
        console.error('Error updating profile:', error);
        showSaveToast('Error updating profile', 'error');
      }
    });
  }

  // ======== SAVE BUTTONS ========
  document.querySelectorAll('.save-btn, .btn-save, .save-btn-notifications, .save-btn-appearance, .save-btn-privacy').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      showSaveToast();
    });
  });

  // ======== THEME PICKER (Appearance Tab) ========
  const THEME_KEY = 'site-theme'; 
  const themePicker = document.getElementById('themePicker');
  
  function applyTheme(theme) {
    document.body.classList.remove('theme-dark', 'theme-auto', 'theme-light');
    if(theme === 'dark') {
      document.body.classList.add('theme-dark');
    } else if(theme === 'auto') {
      document.body.classList.add('theme-auto');
      if(window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.body.classList.add('theme-dark');
      }
    } else {
      document.body.classList.add('theme-light');
    }
    localStorage.setItem(THEME_KEY, theme);
  }

  const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
  applyTheme(savedTheme);

  if (themePicker) {
    const options = themePicker.querySelectorAll('.theme-option-appearance');
    
    function selectThemeOption(theme) {
      options.forEach(option => {
        if(option.getAttribute('data-theme') === theme) {
          option.classList.add('selected');
        } else {
          option.classList.remove('selected');
        }
      });
    }
    selectThemeOption(savedTheme);

    options.forEach(option => {
      option.addEventListener('click', function() {
        const theme = option.getAttribute('data-theme');
        applyTheme(theme);
        selectThemeOption(theme);
      });
    });

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
      if(localStorage.getItem(THEME_KEY) === 'auto') {
        applyTheme('auto');
      }
    });
  }

  // ======== CHANGE PASSWORD FUNCTIONALITY ========
  let passwordModal = null;
  const passwordBtn = document.querySelector('.profile-password-btn');
  
  if(passwordBtn) {
    passwordBtn.addEventListener('click', function() {
      if(passwordModal) passwordModal.remove();
      passwordModal = document.createElement('div');
      passwordModal.style.position = 'fixed';
      passwordModal.style.inset = '0';
      passwordModal.style.background = 'rgba(0,0,0,0.24)';
      passwordModal.style.zIndex = '99999';
      passwordModal.innerHTML = `
        <div style="
          background:#fff;
          max-width:420px;
          margin:9vh auto 0 auto;
          border-radius:18px;
          box-shadow:0 4px 32px #2224;
          padding:32px 32px 24px 32px;
          position:relative;
        ">
          <h2 style="margin-top:0;margin-bottom:24px;font-size:1.23em;">Change Password</h2>
          <form id="changePasswordForm">
            <div style="margin-bottom:18px;">
              <label style="display:block;font-weight:600;margin-bottom:6px;">Current Password</label>
              <input type="password" name="current" style="width:100%;padding:10px 15px;border-radius:8px;border:1.3px solid #dde2ef;font-size:1em;" required>
            </div>
            <div style="margin-bottom:18px;">
              <label style="display:block;font-weight:600;margin-bottom:6px;">New Password</label>
              <input type="password" name="new" style="width:100%;padding:10px 15px;border-radius:8px;border:1.3px solid #dde2ef;font-size:1em;" required>
            </div>
            <div style="margin-bottom:22px;">
              <label style="display:block;font-weight:600;margin-bottom:6px;">Confirm New Password</label>
              <input type="password" name="confirm" style="width:100%;padding:10px 15px;border-radius:8px;border:1.3px solid #dde2ef;font-size:1em;" required>
            </div>
            <div style="display:flex;justify-content:flex-end;gap:12px;">
              <button type="button" id="cancelPwdBtn" style="padding:10px 27px;border-radius:20px;border:1.2px solid #e1e8fa;background:#fff;color:#23272e;font-weight:600;cursor:pointer;">Cancel</button>
              <button type="submit" style="padding:10px 27px;border-radius:20px;background:#6d9efc;color:#fff;border:none;font-weight:700;cursor:pointer;">Save</button>
            </div>
          </form>
        </div>
      `;
      document.body.appendChild(passwordModal);
      
      passwordModal.addEventListener('click', function(e){
        if(e.target === passwordModal) passwordModal.remove();
      });
      
      passwordModal.querySelector('#cancelPwdBtn').addEventListener('click',function(){
        passwordModal.remove();
      });

      passwordModal.querySelector('#changePasswordForm').addEventListener('submit',function(e){
        e.preventDefault();
        const current = this.current.value;
        const newPwd = this.new.value;
        const confirm = this.confirm.value;
        
        if(newPwd !== confirm) {
          alert('New passwords do not match!');
          return;
        }
        if(!current || !newPwd){
          alert('Please fill all fields.');
          return;
        }
        
        passwordModal.remove();
        showSaveToast('Password changed!');
      });
    });
  }

  // ======== DELETE ALL DATA FUNCTIONALITY ========
  const deleteBtn = document.getElementById('deleteDataBtn');
  if(deleteBtn) {
    deleteBtn.addEventListener('click', function() {
      if (confirm('Are you absolutely sure? This will delete all your data in the app (localStorage will be cleared)!')) {
        localStorage.clear();
        showSaveToast('All data deleted!');
        setTimeout(()=>{ location.reload(); }, 1100);
      }
    });
  }

  // ======== EXPORT DATA BUTTON ========
  const exportBtn = document.getElementById('exportDataBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', function() {
      showSaveToast('Export started!');
    });
  }

  // ======== ARCHIVE FUNCTIONALITY ========
  let currentArchivedItems = [];
  let currentFilter = 'all';

  // Load archived items from server
  async function loadArchivedItems() {
    const container = document.getElementById('archivedItemsList');
    container.innerHTML = `
      <div class="archive-empty-state">
        <div class="archive-empty-state-icon">⏳</div>
        <h3>Loading archived items...</h3>
      </div>
    `;

    try {
      const response = await fetch('http://localhost:5000/api/archived/all');
      if (!response.ok) throw new Error('Failed to fetch archived items');
      
      currentArchivedItems = await response.json();
      updateArchiveStats();
      displayArchivedItems(currentFilter);
    } catch (error) {
      console.error('Error loading archived items:', error);
      container.innerHTML = `
        <div class="archive-empty-state">
          <div class="archive-empty-state-icon">❌</div>
          <h3>Error loading archived items</h3>
          <p>${error.message}</p>
        </div>
      `;
      showSaveToast('Failed to load archived items', 'error');
    }
  }

  // Update archive statistics
  function updateArchiveStats() {
    const totalCount = currentArchivedItems.length;
    const expiringSoon = currentArchivedItems.filter(item => 
      item.days_left !== null && item.days_left <= 7 && item.days_left > 0
    ).length;
    
    document.getElementById('totalArchivedCount').textContent = totalCount;
    document.getElementById('expiringSoonCount').textContent = expiringSoon;
  }

  // Display archived items based on filter
  function displayArchivedItems(filter) {
    const container = document.getElementById('archivedItemsList');
    
    let filteredItems = currentArchivedItems;
    if (filter !== 'all') {
      filteredItems = currentArchivedItems.filter(item => item.type === filter);
    }
    
    if (filteredItems.length === 0) {
      container.innerHTML = `
        <div class="archive-empty-state">
          <div class="archive-empty-state-icon">🗑️</div>
          <h3>No archived items</h3>
          <p>${filter === 'all' ? 'Your archive is empty' : `No archived ${filter}s found`}</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = filteredItems.map(item => {
      const icon = getItemIcon(item.type);
      const badgeClass = item.days_left <= 7 ? 'danger' : item.days_left <= 14 ? 'warning' : 'safe';
      const archivedDate = new Date(item.archived_at).toLocaleDateString();
      
      return `
        <div class="archived-item" data-type="${item.type}" data-id="${item.id}">
          <div class="archived-item-left">
            <div class="archived-item-icon ${item.type}">
              ${icon}
            </div>
            <div class="archived-item-info">
              <div class="archived-item-title">${escapeHtml(item.title)}</div>
              <div class="archived-item-subtitle">${escapeHtml(item.subtitle)}</div>
            </div>
          </div>
          <div class="archived-item-middle">
            <div class="archived-item-badge ${badgeClass}">
              ${item.days_left > 0 ? `${item.days_left} days left` : 'Expired'}
            </div>
            <div class="archived-item-date">Archived: ${archivedDate}</div>
          </div>
          <div class="archived-item-actions">
            <button class="restore-btn-archive" data-type="${item.type}" data-id="${item.id}" data-title="${escapeHtml(item.title)}">
              Restore
            </button>
            <button class="delete-btn-archive" data-type="${item.type}" data-id="${item.id}" data-title="${escapeHtml(item.title)}">
              Delete
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Add event listeners to restore and delete buttons
    container.querySelectorAll('.restore-btn-archive').forEach(btn => {
      btn.addEventListener('click', function() {
        restoreItem(this.dataset.type, this.dataset.id, this.dataset.title);
      });
    });

    container.querySelectorAll('.delete-btn-archive').forEach(btn => {
      btn.addEventListener('click', function() {
        permanentlyDeleteItem(this.dataset.type, this.dataset.id, this.dataset.title);
      });
    });
  }

  // Get icon based on item type
  function getItemIcon(type) {
    const icons = {
      owner: '👤',
      pet: '🐾',
      appointment: '📅',
      treatment: '💊',
      vaccination: '💉'
    };
    return icons[type] || '📄';
  }

  // Escape HTML to prevent XSS
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // --- RESTORE ARCHIVED ITEM, READ RESPONSE ONLY ONCE ---

  async function restoreItem(type, id, title) {
  if (!confirm(`Restore "${title}"?`)) return;

  try {
    const typeToEndpoint = {
      owner: 'owners',
      pet: 'pets',
      appointment: 'appointments',
      treatment: 'treatments',
      vaccination: 'vaccinations'
    };
    const endpoint = typeToEndpoint[type];
    if (!endpoint) {
      showSaveToast('Invalid item type', 'error');
      return;
    }

    const url = `http://localhost:5000/api/${endpoint}/${id}/restore`;

    // Changed method from GET to POST
    const response = await fetch(url, {
      method: 'POST'
    });

    let result;
    const ct = response.headers.get('content-type') || "";
    if (ct.includes('application/json')) {
      try {
        result = await response.json();
      } catch (e) {
        result = { error: 'Invalid JSON response from server' };
      }
    } else {
      result = { error: await response.text() };
    }

    if (response.ok && result.success) {
      showSaveToast(`${title} restored successfully!`);
      loadArchivedItems();
    } else {
      showSaveToast(result.error || result.message || 'Failed to restore item', 'error');
    }
  } catch (error) {
    showSaveToast(`Error restoring item: ${error.message}`, 'error');
  }
}


  // Permanently delete archived item
  async function permanentlyDeleteItem(type, id, title) {
    if (!confirm(`PERMANENTLY DELETE "${title}"?\n\nThis action cannot be undone!`)) return;
    
    try {
      const response = await fetch(`http://localhost:5000/api/archived/${type}/${id}/permanent`, {
        method: 'DELETE'
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        showSaveToast(`${title} permanently deleted`);
        loadArchivedItems();
      } else {
        console.error('Delete failed:', result);
        showSaveToast(result.error || 'Failed to delete item', 'error');
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      showSaveToast('Error deleting item', 'error');
    }
  }

  // Cleanup expired archives
  async function cleanupExpiredArchives() {
    if (!confirm('This will permanently delete all items archived for more than 30 days.\n\nContinue?')) return;
    
    try {
      const response = await fetch('http://localhost:5000/api/archived/cleanup', {
        method: 'DELETE'
      });
      
      const result = await response.json();
      
      if (result.success) {
        showSaveToast(`Successfully deleted ${result.deleted} expired items`);
        loadArchivedItems();
      } else {
        showSaveToast('Failed to cleanup archives', 'error');
      }
    } catch (error) {
      console.error('Error cleaning up archives:', error);
      showSaveToast('Error cleaning up archives', 'error');
    }
  }

  // Filter button event listeners
  document.querySelectorAll('.archive-filter-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.archive-filter-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      currentFilter = this.getAttribute('data-filter');
      displayArchivedItems(currentFilter);
    });
  });

  // Cleanup button event listener
  const cleanupBtn = document.getElementById('cleanupBtn');
  if (cleanupBtn) {
    cleanupBtn.addEventListener('click', cleanupExpiredArchives);
  }

  // ======== TOAST NOTIFICATION ========
  function showSaveToast(msg = "Settings saved!", type = "success") {
    let toast = document.createElement('div');
    toast.textContent = msg;
    toast.style.position = 'fixed';
    toast.style.bottom = '40px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.background = type === 'error' ? '#ea4335' : '#6d9efc';
    toast.style.color = '#fff';
    toast.style.padding = '13px 36px';
    toast.style.fontSize = '1.08em';
    toast.style.borderRadius = '20px';
    toast.style.boxShadow = '0 2px 12px #b5cfff';
    toast.style.zIndex = '99999';
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '1'; }, 10);
    setTimeout(() => { toast.style.opacity = '0'; }, 2600);
    setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 3000);
  }
});