document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.getElementById('login-form');

    if (loginForm) {
        console.log('Login form found');
        loginForm.addEventListener('submit', loginUser);
    } else {
        console.error('Login form not found!');
    }
});

async function loginUser(event) {
    event.preventDefault(); // Prevent default form submission
    console.log('Submitting login form'); // Debug message

    const admin_name = document.getElementById('admin_name').value.trim();
    const admin_pass = document.getElementById('admin_pass').value.trim();

    if (!admin_name || !admin_pass) {
        alert('Please enter both admin name and password');
        return;
    }

    console.log('Login Data:', { admin_name, admin_pass });

    try {
        const response = await fetch('/admin/login', { // Update the endpoint to match your admin login API
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ admin_name, admin_pass }),
        });

        const result = await response.json();

        if (response.ok) {
            // Save admin data or token to local storage if needed
            if (result.admin) {
                localStorage.setItem('loggedInAdmin', JSON.stringify(result.admin));
            } else {
                console.warn('No admin data received from server, but login was successful.');
            }

            alert('Login successful! Redirecting...');
            window.location.href = '/admin.html'; // Adjust the redirection URL as needed
        } else {
            alert(result.message || 'Login failed');
        }
    } catch (error) {
        console.error('Error during login:', error);
        alert('An error occurred. Please try again later.');
    }
}
