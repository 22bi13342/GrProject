document.getElementById('signup-form').addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData);

    // Validate email format
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(data.email)) {
        document.getElementById('signup-error').textContent = 'Please enter a valid email address.';
        return;
    }

    if (data.password !== data.confirmPassword) {
        document.getElementById('signup-error').textContent = 'Passwords do not match.';
        return;
    }

    try {
        const response = await fetch('/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        const result = await response.json();

        if (response.ok) {
            document.getElementById('otp-container').style.display = 'block';
            alert('OTP sent to your email. Please verify to complete signup.');
        } else {
            document.getElementById('signup-error').textContent = result.message || 'Signup failed';
        }
    } catch (error) {
        console.error('Error during signup:', error);
        document.getElementById('signup-error').textContent = 'An error occurred. Please try again later.';
    }
});

// Verify Signup OTP
async function verifyOtpSignup() {
    const otp = document.getElementById('otp').value.trim();
    const email = document.getElementById('email').value.trim();

    if (!otp) {
        alert('Please enter the OTP');
        return;
    }

    try {
        const response = await fetch('/auth/verify-signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp }),
        });

        const result = await response.json();

        if (response.ok) {
            alert('Signup successful! Redirecting...');
            window.location.href = '/hotel.html';
        } else {
            alert(result.message || 'OTP verification failed');
        }
    } catch (error) {
        console.error('Error verifying OTP:', error);
        alert('An error occurred. Please try again later.');
    }
}