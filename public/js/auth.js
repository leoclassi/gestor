document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');

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
                showError(error.message || 'Erro de login. Por favor, tente novamente.');
                shakeForm();
            }
        });

        // Limpar a mensagem de erro quando o usuário começar a digitar
        document.getElementById('username').addEventListener('input', clearError);
        document.getElementById('password').addEventListener('input', clearError);
    }
});

// Estas funções devem ser definidas globalmente para serem acessíveis
function showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    // Removemos o setTimeout para que a mensagem não desapareça automaticamente
}

function clearError() {
    const errorMessage = document.getElementById('errorMessage');
    errorMessage.style.display = 'none';
}

function shakeForm() {
    const form = document.getElementById('loginForm');
    form.classList.add('shake');
    setTimeout(() => form.classList.remove('shake'), 820);
}