const emailContainer = document.getElementById('email-container');
const otpContainer = document.getElementById('otp-container');
const passwordContainer = document.getElementById('password-container');
const emailInput = document.getElementById('email');
const otpInput = document.getElementById('otp');
const passwordInput = document.getElementById('password');
const passwordConfirmInput = document.getElementById('confirmPassword');
const loginError = document.getElementById('login-error');
const loginForm = document.getElementById('loginForm');

// Step 1: Request OTP for Password Reset
function requestOtpForPasswordReset() {
    const email = emailInput.value;

    if (!email) {
        loginError.textContent = "Email is required.";
        return;
    }

    document.querySelector('.login-btn').disabled = true;

    fetch('/auth/forgot-password', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
    })
    .then(response => response.json())
    .then(data => {
        if (data.otpRequired) {
            
            emailContainer.style.display = 'none';
            otpContainer.style.display = 'block';
        } else {
            loginError.textContent = data.message;
        }
    
        document.querySelector('.login-btn').disabled = false;
    })
    .catch(error => {
        console.error('Error during password reset initiation:', error);
        loginError.textContent = 'Server error.';
    });
}

// Step 2: Verify OTP for Password Reset
function verifyOtpForPasswordReset() {
    const email = emailInput.value;
    const otp = otpInput.value;

    if (!otp) {
        loginError.textContent = "OTP is required.";
        return;
    }

    document.querySelector('.login-btn').disabled = true;

    fetch('/auth/verify-reset-password', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, otp })
    })
    .then(response => response.json())
    .then(data => {
        if (data.message === 'OTP verified. You can now reset your password.') {
    
            otpContainer.style.display = 'none';
            passwordContainer.style.display = 'block';
        } else {
            loginError.textContent = data.message;
        }
        document.querySelector('.login-btn').disabled = false;
    })
    .catch(error => {
        console.error('Error during OTP verification for password reset:', error);
        loginError.textContent = 'Server error.';
    });
}

// Step 3: Reset Password
function resetPassword() {
    const newPassword = passwordInput.value;
    const confirmNewPassword = passwordConfirmInput.value;

    if (!newPassword || !confirmNewPassword) {
        loginError.textContent = "Both password fields are required.";
        return;
    }

    if (newPassword !== confirmNewPassword) {
        loginError.textContent = "Passwords do not match.";
        return;
    }

    document.querySelector('.login-btn').disabled = true;

    fetch('/auth/reset-password', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: emailInput.value, newPassword, confirmNewPassword })
    })
    .then(response => response.json())
    .then(data => {
        if (data.message === 'Password has been reset successfully.') {
            loginError.textContent = "Your password has been reset. Redirecting to login...";

            setTimeout(() => {
                window.location.href = '/login.html'; 
            }, 2000); 
        } else {
            loginError.textContent = data.message;
        }
        document.querySelector('.login-btn').disabled = false;
    })
    .catch(error => {
        console.error('Error during password reset:', error);
        loginError.textContent = 'Server error.';
    });
}

loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    if (otpContainer.style.display === 'block') {
        verifyOtpForPasswordReset();
    } else if (passwordContainer.style.display === 'block') {
        resetPassword();
    } else {
        requestOtpForPasswordReset();
    }
});
