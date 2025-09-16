import { db } from './firebase-init.js';
import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  deleteDoc, 
  doc, 
  updateDoc 
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { monitorAuthState } from './auth-service.js';

document.addEventListener("DOMContentLoaded", function() {
  // Authentication check
  monitorAuthState((user) => {
    if (!user) {
      window.location.href = "Login.html";
      return;
    }
  });
  
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
      // Query Firestore for sessions
      const sessionsQuery = query(collection(db, "sessions"), orderBy("datetime", "desc"));
      const sessionsSnapshot = await getDocs(sessionsQuery);
      const sessions = sessionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
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
      sessions.forEach(session => {
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
      
      // Update statistics with the loaded sessions
      updateStatistics(sessions);
      
    } catch (error) {
      console.error('Error loading sessions:', error);
      sessionsList.innerHTML = `
        <div class="placeholder-table">
          <i class="fas fa-exclamation-triangle fa-2x"></i>
          <p>Error loading sessions</p>
          <p>${error.message}</p>
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
  async function saveSessionEdit(sessionId) {
    const brand = document.getElementById('editBrand').value;
    const shadeId = parseInt(document.getElementById('editShadeId').value);
    
    try {
      await updateDoc(doc(db, "sessions", sessionId), {
        brand: brand,
        shade_id: shadeId
      });
      
      document.body.removeChild(document.getElementById('editModal'));
      loadSessions(); // Reload sessions to show updated data
    } catch (error) {
      alert('Error updating session: ' + error.message);
    }
  }
  
  // Delete session
  async function deleteSession(sessionId) {
    if (confirm('Are you sure you want to delete this session?')) {
      try {
        await deleteDoc(doc(db, "sessions", sessionId));
        loadSessions(); // Reload sessions to show updated data
      } catch (error) {
        alert('Error deleting session: ' + error.message);
      }
    }
  }
  
  // Calculate and update session statistics
  function updateStatistics(sessions) {
    if (!sessions || sessions.length === 0) {
      // Reset all stats if no sessions
      document.getElementById('total-sessions').textContent = '0';
      document.getElementById('daily-avg-time').textContent = '0m 0s';
      document.getElementById('weekly-avg-time').textContent = '0m 0s';
      document.getElementById('peak-session').textContent = '0 users';
      return;
    }
    
    // Total sessions
    document.getElementById('total-sessions').textContent = sessions.length;
    
    // Calculate average session time
    let totalSeconds = 0;
    let validSessions = 0;
    
    sessions.forEach(session => {
      const duration = session.duration;
      if (duration && duration !== '0m 0s') {
        const parts = duration.split(' ');
        let minutes = 0, seconds = 0;
        
        if (parts.length >= 2) {
          minutes = parseInt(parts[0].replace('m', '')) || 0;
          seconds = parseInt(parts[1].replace('s', '')) || 0;
        }
        
        totalSeconds += minutes * 60 + seconds;
        validSessions++;
      }
    });
    
    const avgSeconds = validSessions > 0 ? Math.round(totalSeconds / validSessions) : 0;
    const avgMinutes = Math.floor(avgSeconds / 60);
    const remainingSeconds = avgSeconds % 60;
    
    const avgTimeStr = `${avgMinutes}m ${remainingSeconds}s`;
    document.getElementById('daily-avg-time').textContent = avgTimeStr;
    document.getElementById('weekly-avg-time').textContent = avgTimeStr;
    
    // For now, set peak sessions to a fixed value
    // In a real application, you would calculate this based on session timestamps
    document.getElementById('peak-session').textContent = '5 users';
  }

  // Initialize
  loadSessions();
});