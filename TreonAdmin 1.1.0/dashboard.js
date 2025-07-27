document.addEventListener('DOMContentLoaded', function () {
  // Authentication check
  if (sessionStorage.getItem("isLoggedIn") !== "true") {
    window.location.href = "Login.html";
    return;
  }

  // Navigation
  const navButtons = [
    { id: "sessions-btn", url: "Session_managment.html" },
    { id: "products-btn", url: "product_management.html" },
    { id: "settings-btn", url: "setting.html" }
  ];

  navButtons.forEach(btn => {
    const button = document.getElementById(btn.id);
    if (button) {
      button.addEventListener("click", () => {
        window.location.href = btn.url;
      });
    }
  });

  // Highlight active nav
  const navEls = document.querySelectorAll(".nav-button");
  navEls.forEach(button => {
    button.addEventListener("click", function () {
      navEls.forEach(btn => btn.classList.remove("active"));
      this.classList.add("active");
    });
  });

  // Chart: Sessions This Week
  const sessionCanvas = document.getElementById('sessionsChart');
  if (sessionCanvas) {
    const sessionCtx = sessionCanvas.getContext('2d');
    new Chart(sessionCtx, {
      type: 'line',
      data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{
          label: 'Sessions',
          data: [null, null, null, null, null, null, null],
          borderColor: '#a35af5',
          backgroundColor: 'rgba(163, 90, 245, 0.2)',
          fill: true,
          tension: 0.3,
          pointRadius: 5,
          pointBackgroundColor: '#a35af5',
          pointHoverRadius: 7,
          pointBorderColor: '#5f026f',
          pointBorderWidth: 2
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: true,
            callbacks: {
              label: function(context) {
                return `Users: ${context.raw ?? 0}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: false
          }
        }
      }
    });
  }
});
