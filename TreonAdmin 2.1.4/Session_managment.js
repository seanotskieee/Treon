document.addEventListener("DOMContentLoaded", function() {
  // Authentication check
  if (sessionStorage.getItem("isLoggedIn") !== "true") {
    window.location.href = "Login.html";
    return;
  }

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
  
  // Enhanced session tracking and calculations for Recent Sessions
  function formatDuration(seconds) {
    if (!seconds || seconds === 0) return "0m 0s";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  }
  
  function formatSessionDetails(session) {
    const brand = session.brand || session.current_brand || "MAC";
    const shadeId = session.shade_id || session.current_shade_id || 1;
    const duration = session.duration_sec ? formatDuration(session.duration_sec) : "0m 0s";
    
    return `${brand} #${shadeId} - ${duration}`;
  }
  
  function formatDateTime(timestamp) {
    if (!timestamp || !timestamp.seconds) return "Unknown Date";
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleString();
  }
  
  // CORRECTED: Calculate daily average session time - ALL SESSIONS FROM TODAY
  function calculateDailyAverage(sessions) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    console.log(`📅 Daily Average - Looking for sessions on: ${today.toDateString()}`);
    
    const todaySessions = sessions.filter(session => {
      // Validate session has required data
      if (!session.start_time || !session.start_time.seconds || !session.duration_sec) {
        return false;
      }
      
      const sessionDate = new Date(session.start_time.seconds * 1000);
      const isToday = sessionDate >= today && sessionDate < tomorrow;
      const hasValidDuration = session.duration_sec > 0;
      
      if (isToday && hasValidDuration) {
        console.log(`   ✅ Today's session: ${sessionDate.toLocaleString()} - ${session.duration_sec}s`);
      }
      
      return isToday && hasValidDuration;
    });
    
    console.log(`📊 Daily Average - Found ${todaySessions.length} valid sessions for today`);
    
    if (todaySessions.length === 0) {
      console.log("📊 Daily Average - No sessions found for today, returning 0");
      return 0;
    }
    
    const totalDuration = todaySessions.reduce((sum, session) => {
      return sum + session.duration_sec;
    }, 0);
    
    const average = totalDuration / todaySessions.length;
    console.log(`📈 Daily Average - ${totalDuration}s total / ${todaySessions.length} sessions = ${average.toFixed(2)}s (${formatDuration(average)})`);
    
    return average;
  }
  
  // CORRECTED: Calculate weekly average session time - ALL SESSIONS FROM LAST 7 DAYS
  function calculateWeeklyAverage(sessions) {
    const now = new Date();
    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    oneWeekAgo.setHours(0, 0, 0, 0);
    
    console.log(`📅 Weekly Average - Looking for sessions from: ${oneWeekAgo.toDateString()} to ${now.toDateString()}`);
    
    const weeklySessions = sessions.filter(session => {
      // Validate session has required data
      if (!session.start_time || !session.start_time.seconds || !session.duration_sec) {
        return false;
      }
      
      const sessionDate = new Date(session.start_time.seconds * 1000);
      const isInLastWeek = sessionDate >= oneWeekAgo && sessionDate <= now;
      const hasValidDuration = session.duration_sec > 0;
      
      if (isInLastWeek && hasValidDuration) {
        console.log(`   ✅ Weekly session: ${sessionDate.toLocaleDateString()} - ${session.duration_sec}s`);
      }
      
      return isInLastWeek && hasValidDuration;
    });
    
    console.log(`📊 Weekly Average - Found ${weeklySessions.length} valid sessions for the week`);
    
    if (weeklySessions.length === 0) {
      console.log("📊 Weekly Average - No sessions found for the week, returning 0");
      return 0;
    }
    
    const totalDuration = weeklySessions.reduce((sum, session) => {
      return sum + session.duration_sec;
    }, 0);
    
    const average = totalDuration / weeklySessions.length;
    console.log(`📈 Weekly Average - ${totalDuration}s total / ${weeklySessions.length} sessions = ${average.toFixed(2)}s (${formatDuration(average)})`);
    
    return average;
  }
  
  // CORRECTED: Calculate overall average session time - ALL SESSIONS
  function calculateOverallAverage(sessions) {
    console.log("📊 Overall Average - Calculating from ALL sessions");
    
    const validSessions = sessions.filter(session => 
      session.duration_sec && session.duration_sec > 0
    );
    
    console.log(`📊 Overall Average - Found ${validSessions.length} valid sessions out of ${sessions.length} total`);
    
    if (validSessions.length === 0) {
      console.log("📊 Overall Average - No valid sessions found, returning 0");
      return 0;
    }
    
    const totalDuration = validSessions.reduce((sum, session) => {
      return sum + session.duration_sec;
    }, 0);
    
    const average = totalDuration / validSessions.length;
    console.log(`📈 Overall Average - ${totalDuration}s total / ${validSessions.length} sessions = ${average.toFixed(2)}s (${formatDuration(average)})`);
    
    return average;
  }
  
  // Count unique users - FIXED to handle sessions without user_id
  function countUniqueUsers(sessions) {
    console.log("👥 Counting unique users...");
    
    // Method 1: Try to use user_id if available
    const usersById = new Set();
    let usersWithId = 0;
    
    sessions.forEach(session => {
      if (session.user_id) {
        usersById.add(session.user_id);
        usersWithId++;
      }
    });
    
    console.log(`   Found ${usersById.size} users by user_id (${usersWithId} sessions with user_id)`);
    
    // If we found users by ID, use that count
    if (usersById.size > 0) {
      return usersById.size;
    }
    
    // Method 2: If no user_id fields, count each session as a unique user
    console.log(`   No user_id fields found, using session count as user count: ${sessions.length}`);
    return sessions.length;
  }
  
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
    
    console.log("🔄 Starting to load sessions from Firebase...");
    
    // Use the same query as dashboard for consistency
    db.collection("sessions").orderBy("start_time", "desc").get()
      .then((querySnapshot) => {
        console.log(`✅ Loaded ${querySnapshot.size} sessions from Firebase`);
        
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
        
        const sessions = [];
        
        // Add session items
        querySnapshot.forEach((doc, index) => {
          const session = { id: doc.id, ...doc.data() };
          sessions.push(session);
          
          const sessionEl = document.createElement('div');
          sessionEl.className = 'session-entry';
          
          const formattedDate = formatDateTime(session.start_time);
          const sessionDetails = formatSessionDetails(session);
          
          sessionEl.innerHTML = `
            <span class="arrow">➢</span>
            <span class="session-time">${formattedDate}</span>
            <span class="session-details">${sessionDetails}</span>
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
        
        updateStatistics(sessions);
      })
      .catch((error) => {
        console.error('❌ Error loading sessions:', error);
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
          <input type="number" id="editShadeId" class="edit-input" min="1" max="30">
        </div>
        <div class="modal-buttons">
          <button id="saveEditBtn">Save</button>
          <button id="cancelEditBtn">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    
    // Set current values with proper defaults
    const currentBrand = session.brand || session.current_brand || "MAC";
    const currentShadeId = session.shade_id || session.current_shade_id || 1;
    
    document.getElementById('editBrand').value = currentBrand;
    document.getElementById('editShadeId').value = currentShadeId;
    
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
  
  // Enhanced session statistics calculation
  function updateStatistics(sessions) {
    try {
      console.log("📊 Starting statistics calculation...");
      console.log(`📋 Total sessions loaded: ${sessions.length}`);
      
      // Count unique users with fallback
      const totalUsers = countUniqueUsers(sessions);
      document.getElementById('total-user').textContent = totalUsers;
      
      console.log(`👥 Final User Count: ${totalUsers} users`);
      
      // Calculate average session times with proper validation
      const dailyAvgSeconds = calculateDailyAverage(sessions);
      const weeklyAvgSeconds = calculateWeeklyAverage(sessions);
      const overallAvgSeconds = calculateOverallAverage(sessions);
      
      // Format average session times
      document.getElementById('avg-daily').textContent = formatDuration(dailyAvgSeconds);
      document.getElementById('avg-weekly').textContent = formatDuration(overallAvgSeconds); // Use overall average for weekly display
      
      // Additional validation statistics
      const sessionsWithValidData = sessions.filter(s => 
        s.start_time && s.start_time.seconds && s.duration_sec > 0
      ).length;
      
      console.log(`✅ Validation: ${sessionsWithValidData}/${sessions.length} sessions have valid timestamps and duration`);
      console.log(`📈 Final Results - Daily: ${formatDuration(dailyAvgSeconds)}, Overall: ${formatDuration(overallAvgSeconds)}`);

    } catch (error) {
      console.error('❌ Error in statistics calculation:', error);
      document.getElementById('total-user').textContent = '0';
      document.getElementById('avg-daily').textContent = '0m 0s';
      document.getElementById('avg-weekly').textContent = '0m 0s';
    }
  }

  // Initialize
  console.log("🚀 Initializing Session Management...");
  loadSessions();
  
  // Set up real-time listener for sessions
  console.log("🔔 Setting up real-time session listener...");
  db.collection("sessions").orderBy("start_time", "desc")
    .onSnapshot((querySnapshot) => {
      console.log("🔄 Real-time update received from Firebase");
      
      const sessions = [];
      querySnapshot.forEach((doc) => {
        sessions.push({ id: doc.id, ...doc.data() });
      });
      
      console.log(`📥 Processed ${sessions.length} sessions in real-time update`);
      
      // Update the sessions list
      const sessionsList = document.getElementById('sessions-list');
      sessionsList.innerHTML = '';
      
      if (sessions.length === 0) {
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
      sessions.forEach((session, index) => {
        const sessionEl = document.createElement('div');
        sessionEl.className = 'session-entry';
        
        const formattedDate = formatDateTime(session.start_time);
        const sessionDetails = formatSessionDetails(session);
        
        sessionEl.innerHTML = `
          <span class="arrow">➢</span>
          <span class="session-time">${formattedDate}</span>
          <span class="session-details">${sessionDetails}</span>
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
      
      updateStatistics(sessions);
    }, (error) => {
      console.error('❌ Error in real-time listener:', error);
    });
});