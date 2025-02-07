document.addEventListener("DOMContentLoaded", function () {
    function fetchUsers() {
        fetch("/admin/users")
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json(); 
            })
            .then(users => {
                console.log("Users fetched:", users); 
                const userListContainer = document.getElementById("user-list-container");
                userListContainer.innerHTML = ""; 
    
                users.forEach(user => {
                    const userCard = document.createElement("div");
                    userCard.classList.add("user-card");
    
                    userCard.innerHTML = `
                        <h3>${user.first_name} ${user.last_name}</h3>
                        <p>Email: ${user.email}</p>
                        <p>Total Bookings: ${user.total_bookings}</p>
                        <p>Canceled Bookings: ${user.canceled_bookings}</p>
                        <button class="view-reviews" data-user="${user.id}">View Ratings & Reviews</button>
                        <button class="remove-user" data-user="${user.id}">Remove User</button>
                    `;
    
                    userListContainer.appendChild(userCard);
                });
    
                document.querySelectorAll(".remove-user").forEach(button => {
                    button.addEventListener("click", function () {
                        const userId = this.getAttribute("data-user");
                        removeUser(userId);
                    });
                });
    
                document.querySelectorAll(".view-reviews").forEach(button => {
                    button.addEventListener("click", function () {
                        const userId = this.getAttribute("data-user");
                        viewReviews(userId);
                    });
                });
            })
            .catch(error => {
                console.error("Error fetching users:", error);
                alert("Error fetching user list. Check console for details.");
            });
    }
    

    function removeUser(userId) {
        if (confirm("Are you sure you want to delete this user?")) {
            fetch(`/admin/delete-user/${userId}`, { method: "DELETE" })
                .then(response => response.json())
                .then(data => {
                    alert(data.message);
                    fetchUsers(); // Refresh user list
                })
                .catch(error => console.error("Error deleting user:", error));
        }
    }

    function viewReviews(userId) {
        alert(`Viewing reviews for user ID: ${userId}`);
        
    }

    fetchUsers(); // Load users on page load
});
