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
  
  // Load sessions function using Firebase
  function loadSessions() {
    const sessionsList = document.getElementById('sessions-list');
    
    // Show loading state
    sessionsList.innerHTML = `
      <div class="placeholder-table">
        <i class="fas fa-spinner fa-spin fa-2x"></i>
        <p>Loading sessions...</p>
      </div>
    `;
    
    db.collection("sessions").orderBy("start_time", "desc").get()
      .then((querySnapshot) => {
        sessionsList.innerHTML = '';
        
        if (querySnapshot.empty) {
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
        
        // Add session items
        querySnapshot.forEach((doc) => {
          const session = doc.data();
          const sessionEl = document.createElement('div');
          sessionEl.className = 'session-entry';
          
          // Format the date for display
          const startTime = new Date(session.start_time.seconds * 1000);
          const formattedDate = startTime.toLocaleString();
          
          sessionEl.innerHTML = `
            <span class="arrow">➢</span>
            <span class="session-time">${formattedDate}</span>
            <span class="session-details">${session.brand || 'Unknown'} #${session.shade_id || 'N/A'} - ${session.duration || '0m 0s'}</span>
            <div class="session-actions">
              <button class="edit-btn" data-id="${doc.id}">
                <i class="fas fa-edit"></i>
              </button>
              <button class="delete-btn" data-id="${doc.id}">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          `;
          sessionsList.appendChild(sessionEl);
          
          // Add event listeners
          sessionEl.querySelector('.edit-btn').addEventListener('click', () => {
            createEditModal({ id: doc.id, ...session });
          });
          
          sessionEl.querySelector('.delete-btn').addEventListener('click', () => {
            deleteSession(doc.id);
          });
        });
        
        updateStatistics();
      })
      .catch((error) => {
        console.error('Error loading sessions:', error);
        sessionsList.innerHTML = `
          <div class="placeholder-table">
            <i class="fas fa-exclamation-triangle fa-2x"></i>
            <p>Error loading sessions</p>
            <p>Make sure Firebase is properly configured</p>
          </div>
        `;
      });
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
    
    document.getElementById('editBrand').value = session.brand || 'MAC';
    document.getElementById('editShadeId').value = session.shade_id || 1;
    
    document.getElementById('saveEditBtn').addEventListener('click', () => {
      saveSessionEdit(session.id);
    });
    
    document.getElementById('cancelEditBtn').addEventListener('click', () => {
      document.body.removeChild(modal);
    });
  }
  
  // Save session edits to Firebase
  function saveSessionEdit(sessionId) {
    const brand = document.getElementById('editBrand').value;
    const shadeId = parseInt(document.getElementById('editShadeId').value);
    
    db.collection("sessions").doc(sessionId).update({
      brand: brand,
      shade_id: shadeId
    })
    .then(() => {
      document.body.removeChild(document.getElementById('editModal'));
      loadSessions();
    })
    .catch((error) => {
      alert('Error updating session: ' + error.message);
    });
  }
  
  // Delete session from Firebase
  function deleteSession(sessionId) {
    if (confirm('Are you sure you want to delete this session?')) {
      db.collection("sessions").doc(sessionId).delete()
        .then(() => {
          loadSessions();
        })
        .catch((error) => {
          alert('Error deleting session: ' + error.message);
        });
    }
  }
  
  // Load session statistics from Firebase
  async function updateStatistics() {
    try {
      const sessionsSnapshot = await db.collection("sessions").get();
      const sessions = [];
      sessionsSnapshot.forEach((doc) => {
        sessions.push(doc.data());
      });
      
      // Calculate statistics
      const totalSessions = sessions.length;
      document.getElementById('total-sessions').textContent = totalSessions;
      
      // Calculate average session time
      let totalDuration = 0;
      let sessionCount = 0;
      
      sessions.forEach(session => {
        if (session.duration_sec) {
          totalDuration += session.duration_sec;
          sessionCount++;
        }
      });
      
      const avgDuration = sessionCount > 0 ? Math.round(totalDuration / sessionCount) : 0;
      const avgMinutes = Math.floor(avgDuration / 60);
      const avgSeconds = avgDuration % 60;
      
      // Format average session times
      const dailyAvg = `${avgMinutes}m ${avgSeconds}s`;
      const weeklyAvg = `${avgMinutes}m ${avgSeconds}s`; // Same for demo purposes
      
      document.getElementById('avg-daily').textContent = dailyAvg;
      document.getElementById('avg-weekly').textContent = weeklyAvg;
      
      // Get peak sessions (for demo, just use total sessions)
      const peakSessions = totalSessions;
      document.getElementById('peak-session').textContent = `${peakSessions} users`;
      
    } catch (error) {
      console.error('Error loading statistics:', error);
      document.querySelectorAll('.stat-card span:last-child').forEach(span => {
        span.textContent = span.textContent.includes('users') ? '0 users' : '0';
      });
    }
  }

  loadSessions();
  
  // Set up real-time listener for sessions
  db.collection("sessions").orderBy("start_time", "desc")
    .onSnapshot((querySnapshot) => {
      loadSessions();
    });
});