document.addEventListener('DOMContentLoaded', () => {
    const userTable = document.getElementById('userTable');
    const searchInput = document.getElementById('search');
    const addUserForm = document.getElementById('addUserForm');
    const saveUserBtn = document.getElementById('saveUser');
    const logoutButton = document.getElementById('logoutButton');
    let editingUserId = null;

    const isAdminCheckbox = document.getElementById('isAdmin');
    const permissionsSection = document.getElementById('permissionsSection');

    isAdminCheckbox.addEventListener('change', () => {
        if (isAdminCheckbox.checked) {
            permissionsSection.style.display = 'none';
        } else {
            permissionsSection.style.display = 'block';
        }
    });

    // Função para carregar a lista de usuários
    async function loadUsers() {
        try {
            const response = await fetch('/api/admin/users', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.status === 403) {
                window.location.href = 'index.html';
                return;
            }
            
            if (!response.ok) {
                throw new Error('Falha ao carregar usuários');
            }
            
            const users = await response.json();
            console.log('Usuários carregados:', users); // Log para depuração

            userTable.innerHTML = users.map(user => `
                <tr>
                    <td class="text-center">${user.id}</td>
                    <td>${user.username}</td>
                    <td class="text-center">${user.isAdmin ? '✅' : '❌'}</td>
                    <td>${formatPermissions(user)}</td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-primary edit-user" data-id="${user.id}">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="btn btn-sm btn-danger delete-user" data-id="${user.id}">
                            <i class="fas fa-trash"></i> Excluir
                        </button>
                        <button class="btn btn-sm btn-warning revoke-token" data-id="${user.id}">
                            <i class="fas fa-ban"></i> Revogar Token
                        </button>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Erro ao carregar usuários:', error);
            alert('Erro ao carregar usuários. Verifique o console para mais detalhes.');
        }
    }

    function formatPermissions(user) {
        if (user.isAdmin) {
            return '<span class="badge badge-success">Todas</span>';
        }
        if (user.permissions && Array.isArray(user.permissions) && user.permissions.length > 0) {
            return user.permissions.map(perm => `<span class="badge badge-info">${perm}</span>`).join(' ');
        }
        return '<span class="badge badge-secondary">Nenhuma</span>';
    }

    // Carregar usuários ao iniciar a página
    loadUsers();

    // Função para mostrar mensagem de erro no modal
    function showErrorMessage(message) {
        const errorDiv = document.getElementById('errorMessage');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }

    // Função para limpar mensagem de erro
    function clearErrorMessage() {
        const errorDiv = document.getElementById('errorMessage');
        errorDiv.textContent = '';
        errorDiv.style.display = 'none';
    }

    // Função para adicionar ou atualizar usuário
    async function saveUser(event) {
        event.preventDefault();
        clearErrorMessage();

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const isAdmin = document.getElementById('isAdmin').checked;
        const permissions = isAdmin ? ['all'] : Array.from(document.querySelectorAll('.permission-checkbox:checked')).map(cb => cb.value);

        if (!/^[a-zA-Z0-9]+$/.test(username)) {
            showErrorMessage('O nome de usuário deve conter apenas caracteres alfanuméricos.');
            return;
        }

        const userData = { username, isAdmin, permissions };
        
        if (!editingUserId && !password) {
            showErrorMessage('A senha é obrigatória ao adicionar um novo usuário.');
            return;
        }
        
        if (password) {
            if (password.length < 5) {
                showErrorMessage('A senha deve ter no mínimo 5 caracteres.');
                return;
            }
            userData.password = password;
        }

        const url = editingUserId ? `/api/users/${editingUserId}` : '/api/register';
        const method = editingUserId ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(userData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro desconhecido');
            }

            const data = await response.json();
            $('#addUserModal').modal('hide');
            showPopup(editingUserId ? 'Usuário atualizado com sucesso!' : 'Usuário adicionado com sucesso!');
            document.getElementById('addUserForm').reset();
            loadUsers();
            editingUserId = null;
        } catch (error) {
            console.error('Erro:', error);
            showErrorMessage(`Erro ao processar a solicitação: ${error.message}`);
        }
    }

    // Adicionar novo usuário
    async function addUser(event) {
        event.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const isAdmin = document.getElementById('isAdmin').checked;

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ username, password, isAdmin })
            });

            if (response.ok) {
                showPopup('Usuário adicionado com sucesso!');
                document.getElementById('addUserForm').reset();
                loadUsers();
                $('#addUserModal').modal('hide');
            } else {
                const data = await response.json();
                showPopup(`Erro ao adicionar usuário: ${data.error}`);
            }
        } catch (error) {
            console.error('Erro:', error);
            showPopup('Erro ao adicionar usuário. Verifique o console para mais detalhes.');
        }
    }

    // Função para mostrar o popup
    function showPopup(message) {
        const popup = document.createElement('div');
        popup.className = 'popup';
        popup.innerHTML = `
            <div class="popup-content">
                <p>${message}</p>
            </div>
        `;
        document.body.appendChild(popup);

        setTimeout(() => {
            popup.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(popup);
            }, 500);
        }, 3000);
    }

    // Deletar usuário
    userTable.addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-user') || e.target.closest('.delete-user')) {
            const userId = e.target.closest('.delete-user').dataset.id;
            if (confirm('Tem certeza que deseja excluir este usuário?')) {
                try {
                    const response = await fetch(`/api/users/${userId}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        }
                    });

                    if (response.status === 403) {
                        showPopup('Você não tem permissão para excluir usuários.');
                        return;
                    }

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'Falha ao excluir usuário');
                    }

                    showPopup('Usuário excluído com sucesso!');
                    loadUsers();
                } catch (error) {
                    console.error('Erro:', error);
                    showPopup(`Erro ao excluir usuário: ${error.message}`);
                }
            }
        }
    });

    // Editar usuário
    userTable.addEventListener('click', async (e) => {
        if (e.target.classList.contains('edit-user') || e.target.closest('.edit-user')) {
            const userId = e.target.closest('.edit-user').dataset.id;
            editingUserId = userId;
            
            try {
                const response = await fetch(`/api/users/${userId}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Falha ao carregar dados do usuário');
                }
                
                const user = await response.json();
                
                document.getElementById('username').value = user.username;
                document.getElementById('password').value = '';
                document.getElementById('isAdmin').checked = user.isAdmin;
                
                if (user.isAdmin) {
                    permissionsSection.style.display = 'none';
                } else {
                    permissionsSection.style.display = 'block';
                    document.querySelectorAll('.permission-checkbox').forEach(cb => {
                        cb.checked = user.permissions.includes(cb.value);
                    });
                }
                
                document.getElementById('addUserModalLabel').textContent = 'Editar Usuário';
                $('#addUserModal').modal('show');
            } catch (error) {
                console.error('Erro:', error);
                showErrorMessage(`Erro ao carregar dados do usuário: ${error.message}`);
            }
        }
    });

    // Adicionar evento de clique para adicionar novo usuário
    if (saveUserBtn) {
        saveUserBtn.addEventListener('click', addUser);
    }

    // Adicionar evento de submit para adicionar novo usuário
    if (addUserForm) {
        addUserForm.addEventListener('submit', saveUser);
    }

    // Adicionar evento de clique para o botão de logout
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            try {
                const response = await fetch('/api/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });

                if (response.ok) {
                    localStorage.removeItem('token');
                    window.location.href = 'login.html';
                } else {
                    console.error('Erro ao fazer logout');
                }
            } catch (error) {
                console.error('Erro ao fazer logout:', error);
            }
        });
    }

    // Adicionar evento para resetar o modal quando for fechado
    $('#addUserModal').on('hidden.bs.modal', function () {
        document.getElementById('addUserForm').reset();
        document.getElementById('addUserModalLabel').textContent = 'Adicionar Usuário';
        editingUserId = null;
        clearErrorMessage(); // Limpa mensagens de erro ao fechar o modal
    });

    // Event listener para o botão de revogar todos os tokens
    document.getElementById('revokeAllTokens').addEventListener('click', () => {
        if (confirm('Tem certeza que deseja revogar todos os tokens? Todos os usuários serão deslogados.')) {
            revokeAllTokens();
        }
    });

    // Event listener para os botões de revogar token individual
    userTable.addEventListener('click', (e) => {
        if (e.target.classList.contains('revoke-token') || e.target.closest('.revoke-token')) {
            const userId = e.target.closest('.revoke-token').dataset.id;
            if (confirm('Tem certeza que deseja revogar o token deste usuário? Ele será deslogado.')) {
                revokeUserToken(userId);
            }
        }
    });

    // Adicione estas novas funções para lidar com a revogação de tokens
    async function revokeUserToken(userId) {
        try {
            const response = await fetch(`/api/users/${userId}/revoke-token`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Falha ao revogar token');
            }

            showPopup('Token revogado com sucesso!');
            loadUsers(); // Recarrega a lista de usuários
        } catch (error) {
            console.error('Erro ao revogar token:', error);
            showErrorMessage(`Erro ao revogar token: ${error.message}`);
        }
    }

    async function revokeAllTokens() {
        try {
            const response = await fetch('/api/users/revoke-all-tokens', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Falha ao revogar todos os tokens');
            }

            showPopup('Todos os tokens foram revogados com sucesso!');
            loadUsers(); // Recarrega a lista de usuários
        } catch (error) {
            console.error('Erro ao revogar todos os tokens:', error);
            showErrorMessage(`Erro ao revogar tokens: ${error.message}`);
        }
    }
});
