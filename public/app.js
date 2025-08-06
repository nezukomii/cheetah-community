document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('form-login');
    const registerForm = document.getElementById('form-register');
    const messageContainer = document.getElementById('message-container');

    const showMessage = (message, isError = false) => {
        messageContainer.textContent = message;
        messageContainer.className = isError ? 'message error' : 'message success';
    };

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('register-username').value;
        const password = document.getElementById('register-password').value;

        const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        const data = await res.json();
        showMessage(data.message || data.error, !data.success);
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;

        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        const data = await res.json();
        if (data.success) {
            // Guardamos los datos del usuario y redirigimos
            localStorage.setItem('chat-username', data.username);
            localStorage.setItem('chat-userid', data.userId);
            window.location.href = '/dashboard.html';
        } else {
            showMessage(data.error, true);
        }
    });
});