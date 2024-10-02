document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            try {
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    localStorage.setItem('token', data.token);
                    window.location.href = data.redirectTo;
                } else {
                    throw new Error(data.message || 'Falha na autenticação');
                }
            } catch (error) {
                console.error('Erro de login:', error);
                // Exiba uma mensagem de erro para o usuário
                alert('Erro de login: ' + error.message);
            }
        });
    }

    // Remova o código de registro se não for necessário
});