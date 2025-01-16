document.addEventListener('DOMContentLoaded', function () {
    const navRight = document.getElementById('nav-right');

    // Function to update the navbar for logged-in users
    function updateNavForLoggedInUser(user) {
        navRight.innerHTML = `
            <div class="dropdown">
                <span class="drop-text" id="userDropText">Welcome, ${user.firstName} ${user.lastName}</span>
                <div class="dropdown-content" id="userDropdown">
                    <a href="/profile.html">Profile</a>
                    <a href="#" id="logout">Logout</a>
                </div>
            </div>
        `;

        // Toggle dropdown visibility when clicking the text
        const dropText = document.getElementById('userDropText');
        const dropdown = document.getElementById('userDropdown');

        dropText.addEventListener('click', function (e) {
            e.stopPropagation(); // Prevent immediate closure
            dropdown.classList.toggle('show');
        });

        // Close dropdown if clicking outside
        window.addEventListener('click', function () {
            dropdown.classList.remove('show');
        });

        // Add logout functionality
        document.getElementById('logout').addEventListener('click', function () {
            logoutUser();
        });
    }

    // Function to reset navbar to default state
    function resetNavbarToDefault() {
        navRight.innerHTML = `
            <a href="login.html" class="login">Đăng nhập</a>
            <span class="divider">/</span>
            <a href="#" class="flag">🇻🇳</a>
            <span class="lang">EN</span>
        `;
    }

    // Function to handle user logout
    function logoutUser() {
        localStorage.removeItem('loggedInUser');
        resetNavbarToDefault();
        alert('You have been logged out.');
        window.location.href = '/hotel.html';
    }

    // Check if user is logged in
    const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));

    if (loggedInUser) {
        updateNavForLoggedInUser(loggedInUser);
    } else {
        resetNavbarToDefault();
    }
});
