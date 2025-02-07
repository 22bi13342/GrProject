document.addEventListener("DOMContentLoaded", function () {
    const filterDropdown = document.getElementById("filterDropdown");
  
    function fetchAnalytics(days = 30) {
      fetch(`/admin/analytics?days=${days}`)
        .then(response => response.json())
        .then(data => {
          document.getElementById("totalBookings").innerText = data.total_bookings;
          document.getElementById("recentBookings").innerText = data.recent_bookings;
          document.getElementById("canceledBookings").innerText = data.canceled_bookings;
          document.getElementById("successBookings").innerText = data.success_bookings;
          document.getElementById("totalRevenue").innerText = data.total_revenue ;
          document.getElementById("totalUsers").innerText = data.total_users;
          document.getElementById("newUsers").innerText = data.new_users;
          document.getElementById("totalReviews").innerText = data.total_reviews;
        })
        .catch(error => console.error("Error fetching analytics:", error));
    }
  
    // Initial Load
    fetchAnalytics();
  
    // Update data when filter changes
    filterDropdown.addEventListener("change", function () {
      fetchAnalytics(this.value);
    });
  });
  