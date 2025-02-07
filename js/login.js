document.getElementById('loginForm').addEventListener('submit', async function (event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!email || !password) {
        document.getElementById('login-error').textContent = 'Please enter both email and password.';
        return;
    }

    try {
        const response = await fetch('/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        const result = await response.json();

        if (response.ok) {
            document.getElementById('otp-container').style.display = 'block';
            alert('OTP sent to your email. Please verify to complete login.');
        } else {
            document.getElementById('login-error').textContent = result.message || 'Login failed.';
        }
    } catch (error) {
        document.getElementById('login-error').textContent = 'An error occurred. Please try again.';
    }
});

async function verifyOtp() {
    const otp = document.getElementById('otp').value.trim();
    const email = document.getElementById('email').value.trim();

    if (!otp) {
        alert('Please enter the OTP.');
        return;
    }

    try {
        const response = await fetch('/auth/verify-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp }),
        });

        const result = await response.json();

        if (response.ok) {
            localStorage.setItem('loggedInUser', JSON.stringify(result.user));
            alert('Login successful!');
            window.location.href = '/hotel.html';
        } else {
            alert(result.message || 'OTP verification failed.');
        }
    } catch (error) {
        alert('An error occurred. Please try again.');
    }
}
