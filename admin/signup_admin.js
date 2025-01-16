document.getElementById('signup-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    try {
        const response = await fetch('/admin/signup', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        const result = await response.json();

        if (response.ok) {
            alert('Signup successful! Redirecting to login page...');
            window.location.href = 'admin.html'; // Ensure this is the correct path
        } else {
            document.getElementById('signup-error').textContent = result.message || 'Signup failed';
        }
    } catch (error) {
        document.getElementById('signup-error').textContent = 'An error occurred. Please try again later.';
    }
});
