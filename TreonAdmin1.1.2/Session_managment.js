document.addEventListener("DOMContentLoaded", function() {
  // Navigation functionality
  document.getElementById("dashboard-btn").addEventListener("click", () => {
    window.location.href = "dashboard.html";
  });
  
  document.getElementById("products-btn").addEventListener("click", () => {
    window.location.href = "product_management.html";
  });
  
  document.getElementById("settings-btn").addEventListener("click", () => {
    window.location.href = "setting.html";
  });
  
  // Active button highlight
  document.querySelectorAll(".nav-button").forEach(button => {
    button.addEventListener("click", function() {
      document.querySelectorAll(".nav-button").forEach(btn => {
        btn.classList.remove("active");
      });
      this.classList.add("active");
    });
  });
  
  // Load sessions function
  async function loadSessions() {
    const sessionsList = document.getElementById('sessions-list');
    
    // Show loading state
    sessionsList.innerHTML = `
      <div class="placeholder-table">
        <i class="fas fa-spinner fa-spin fa-2x"></i>
        <p>Loading sessions...</p>
      </div>
    `;
    
    try {
      const response = await fetch('http://127.0.0.1:5500/get_sessions');
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }
      
      const sessions = await response.json();
      
      sessionsList.innerHTML = '';
      
      if (!sessions || sessions.length === 0) {
        sessionsList.innerHTML = `
          <div class="placeholder-table">
            <i class="fas fa-clock fa-2x"></i>
            <p>No sessions recorded yet</p>
            <p>Try capturing an image first</p>
          </div>
        `;
        return;
      }
      
      // Create title for the list
      const title = document.createElement('div');
      title.className = 'session-title';
      title.textContent = '[ Date / Time ]';
      sessionsList.appendChild(title);
      
      // Add session items (show newest first)
      sessions.reverse().forEach(session => {
        const sessionEl = document.createElement('div');
        sessionEl.className = 'session-entry';
        
        sessionEl.innerHTML = `
          <span class="arrow">➢</span>
          <span class="session-time">${session.formatted_datetime}</span>
          <span class="session-details">${session.brand} #${session.shade_id} - ${session.duration}</span>
          <div class="session-actions">
            <button class="edit-btn" data-id="${session.id}">
              <i class="fas fa-edit"></i>
            </button>
            <button class="delete-btn" data-id="${session.id}">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        `;
        sessionsList.appendChild(sessionEl);
        
        // Add event listeners
        sessionEl.querySelector('.edit-btn').addEventListener('click', () => {
          createEditModal(session);
        });
        
        sessionEl.querySelector('.delete-btn').addEventListener('click', () => {
          deleteSession(session.id);
        });
      });
      
    } catch (error) {
      console.error('Error loading sessions:', error);
      sessionsList.innerHTML = `
        <div class="placeholder-table">
          <i class="fas fa-exclamation-triangle fa-2x"></i>
          <p>${error.message || 'Error loading sessions'}</p>
          <p>Make sure the server is running at http://127.0.0.1:5500</p>
        </div>
      `;
    }
  }
  
  // Create edit modal
  function createEditModal(session) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'editModal';
    modal.innerHTML = `
      <div class="modal-content">
        <h3>Edit Session</h3>
        <div class="form-group">
          <label>Brand:</label>
          <select id="editBrand" class="edit-input">
            <option value="MAC">MAC</option>
            <option value="NARS">NARS</option>
            <option value="Maybelline">Maybelline</option>
            <option value="Loreal">Loreal</option>
            <option value="Avon">Avon</option>
          </select>
        </div>
        <div class="form-group">
          <label>Shade ID:</label>
          <input type="number" id="editShadeId" class="edit-input" min="1" max="25">
        </div>
        <div class="modal-buttons">
          <button id="saveEditBtn">Save</button>
          <button id="cancelEditBtn">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    
    document.getElementById('editBrand').value = session.brand;
    document.getElementById('editShadeId').value = session.shade_id;
    
    document.getElementById('saveEditBtn').addEventListener('click', () => {
      saveSessionEdit(session.id);
    });
    
    document.getElementById('cancelEditBtn').addEventListener('click', () => {
      document.body.removeChild(modal);
    });
  }
  
  // Save session edits
  function saveSessionEdit(sessionId) {
    const brand = document.getElementById('editBrand').value;
    const shadeId = parseInt(document.getElementById('editShadeId').value);
    
    fetch('http://127.0.0.1:5500/update_session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: sessionId, brand: brand, shade_id: shadeId })
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        document.body.removeChild(document.getElementById('editModal'));
        loadSessions();
      } else {
        alert('Error updating session: ' + (data.error || 'Unknown error'));
      }
    })
    .catch(error => {
      alert('Error updating session: ' + error.message);
    });
  }
  
  // Delete session
  function deleteSession(sessionId) {
    if (confirm('Are you sure you want to delete this session?')) {
      fetch('http://127.0.0.1:5500/delete_session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: sessionId })
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          loadSessions();
        } else {
          alert('Error deleting session: ' + (data.error || 'Unknown error'));
        }
      })
      .catch(error => {
        alert('Error deleting session: ' + error.message);
      });
    }
  }
  
  // Load session statistics
  async function updateStatistics() {
    try {
      const response = await fetch('http://127.0.0.1:5500/get_session_stats');
      if (!response.ok) throw new Error('Failed to load statistics');
      const stats = await response.json();
      
      // Update statistics display
      document.querySelector('.stat-card:nth-child(1) span:last-child').textContent = stats.total_sessions;
      document.querySelector('.stat-card:nth-child(2) span:last-child').textContent = stats.daily_avg;
      document.querySelector('.stat-card:nth-child(3) span:last-child').textContent = stats.weekly_avg;
      document.querySelector('.stat-card:nth-child(4) span:last-child').textContent = `${stats.peak_sessions} users`;
      
    } catch (error) {
      console.error('Error loading statistics:', error);
      document.querySelectorAll('.stat-card span:last-child').forEach(span => {
        span.textContent = span.textContent.includes('users') ? '0 users' : '0';
      });
    }
  }

  loadSessions();
  updateStatistics();
});