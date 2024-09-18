document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();
                if (response.ok) {
                    localStorage.setItem('token', data.token);
                    window.location.href = 'backup-management.html'; // Redirecionar para a página de backup
                } else {
                    alert(data.error);
                }
            } catch (error) {
                console.error('Erro ao fazer login:', error);
                alert('Erro ao fazer login. Por favor, tente novamente.');
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            try {
                const response = await fetch('/api/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();
                if (response.ok) {
                    alert('Usuário registrado com sucesso. Faça login.');
                    window.location.href = 'login.html';
                } else {
                    alert(data.error);
                }
            } catch (error) {
                console.error('Erro ao registrar:', error);
                alert('Erro ao registrar. Por favor, tente novamente.');
            }
        });
    }
});