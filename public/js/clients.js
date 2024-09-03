document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('addClientForm');
    const clientTable = document.getElementById('clientTable');
    const searchInput = document.getElementById('search');
    const deleteSelectedButton = document.getElementById('deleteSelected');
    const selectAllCheckbox = document.getElementById('selectAll');
    const themeToggle = document.getElementById('themeToggle');
    const tipoClienteSelect = document.getElementById('tipoCliente');
    const cpfField = document.getElementById('cpfField');
    const cnpjField = document.getElementById('cnpjField');
    let editingClient = null;
    let clients = [];

    // Theme toggle functionality
    const body = document.body;
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme) {
        body.classList.add(currentTheme);
    }

    themeToggle.addEventListener('click', () => {
        if (body.classList.contains('dark-theme')) {
            body.classList.remove('dark-theme');
            localStorage.setItem('theme', '');
        } else {
            body.classList.add('dark-theme');
            localStorage.setItem('theme', 'dark-theme');
        }
    });

    // Show/hide CPF and CNPJ fields based on client type
    tipoClienteSelect.addEventListener('change', () => {
        if (tipoClienteSelect.value === 'Pessoa Física') {
            cpfField.style.display = 'block';
            cnpjField.style.display = 'none';
        } else if (tipoClienteSelect.value === 'Pessoa Jurídica') {
            cpfField.style.display = 'none';
            cnpjField.style.display = 'block';
        } else {
            cpfField.style.display = 'none';
            cnpjField.style.display = 'none';
        }
    });

    // Fetch existing clients from the server
    fetch('/api/clients')
        .then(response => response.json())
        .then(data => {
            clients = data;
            clients.forEach(client => {
                addClientToTable(client);
            });
        });

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const tipoCliente = document.getElementById('tipoCliente').value;
            const nome = document.getElementById('nome').value;
            const email = document.getElementById('email').value;
            const telefone = document.getElementById('telefone').value;
            const cpf = document.getElementById('cpf').value;
            const cnpj = document.getElementById('cnpj').value;
            const cep = document.getElementById('cep').value;
            const logradouro = document.getElementById('logradouro').value;
            const numero = document.getElementById('numero').value;
            const bairro = document.getElementById('bairro').value;
            const cidade = document.getElementById('cidade').value;
            const uf = document.getElementById('uf').value;

            const newClient = {
                id: editingClient ? editingClient.id : Date.now().toString(),
                tipoCliente,
                nome,
                email,
                telefone,
                cpf: tipoCliente === 'Pessoa Física' ? cpf : '',
                cnpj: tipoCliente === 'Pessoa Jurídica' ? cnpj : '',
                endereco: {
                    cep,
                    logradouro,
                    numero,
                    bairro,
                    cidade,
                    uf
                },
                dataCadastro: editingClient ? editingClient.dataCadastro : new Date().toLocaleString()
            };

            if (editingClient) {
                // Update existing client
                fetch(`/api/clients/${editingClient.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(newClient)
                })
                .then(response => response.json())
                .then(updatedClient => {
                    updateClientInTable(updatedClient);
                    form.reset();
                    $('#addClientModal').modal('hide');
                    editingClient = null;
                });
            } else {
                // Add new client
                fetch('/api/clients', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(newClient)
                })
                .then(response => response.json())
                .then(client => {
                    clients.push(client);
                    addClientToTable(client);
                    form.reset();
                    $('#addClientModal').modal('hide');
                });
            }
        });
    }

    function addClientToTable(client) {
        const newRow = document.createElement('tr');
        newRow.innerHTML = `
            <td><input type="checkbox" class="select-client" value="${client.id}"></td>
            <td>${client.id}</td>
            <td>${client.nome}</td>
            <td>${client.email}</td>
            <td>${client.telefone}</td>
            <td>${client.dataCadastro}</td>
            <td>
                <button class="btn btn-primary btn-sm edit-btn">✏️ Editar</button>
                <button class="btn btn-danger btn-sm delete-btn">🗑️ Excluir</button>
            </td>
        `;
        clientTable.appendChild(newRow);

        newRow.querySelector('.edit-btn').addEventListener('click', () => {
            editingClient = client;
            document.getElementById('tipoCliente').value = client.tipoCliente;
            document.getElementById('nome').value = client.nome;
            document.getElementById('email').value = client.email;
            document.getElementById('telefone').value = client.telefone;
            document.getElementById('cpf').value = client.cpf;
            document.getElementById('cnpj').value = client.cnpj;
            document.getElementById('cep').value = client.endereco.cep;
            document.getElementById('logradouro').value = client.endereco.logradouro;
            document.getElementById('numero').value = client.endereco.numero;
            document.getElementById('bairro').value = client.endereco.bairro;
            document.getElementById('cidade').value = client.endereco.cidade;
            document.getElementById('uf').value = client.endereco.uf;
            $('#addClientModal').modal('show');
            tipoClienteSelect.dispatchEvent(new Event('change'));
        });

        newRow.querySelector('.delete-btn').addEventListener('click', () => {
            fetch(`/api/clients/${client.id}`, {
                method: 'DELETE'
            })
            .then(() => {
                clients = clients.filter(c => c.id !== client.id);
                clientTable.removeChild(newRow);
            });
        });

        newRow.querySelector('.select-client').addEventListener('change', toggleDeleteSelectedButton);
    }

    function updateClientInTable(client) {
        const row = clientTable.querySelector(`tr:has(input[value="${client.id}"])`);
        if (row) {
            row.innerHTML = `
                <td><input type="checkbox" class="select-client" value="${client.id}"></td>
                <td>${client.id}</td>
                <td>${client.nome}</td>
                <td>${client.email}</td>
                <td>${client.telefone}</td>
                <td>${client.dataCadastro}</td>
                <td>
                    <button class="btn btn-primary btn-sm edit-btn">✏️ Editar</button>
                    <button class="btn btn-danger btn-sm delete-btn">🗑️ Excluir</button>
                </td>
            `;

            row.querySelector('.edit-btn').addEventListener('click', () => {
                editingClient = client;
                document.getElementById('tipoCliente').value = client.tipoCliente;
                document.getElementById('nome').value = client.nome;
                document.getElementById('email').value = client.email;
                document.getElementById('telefone').value = client.telefone;
                document.getElementById('cpf').value = client.cpf;
                document.getElementById('cnpj').value = client.cnpj;
                document.getElementById('cep').value = client.endereco.cep;
                document.getElementById('logradouro').value = client.endereco.logradouro;
                document.getElementById('numero').value = client.endereco.numero;
                document.getElementById('bairro').value = client.endereco.bairro;
                document.getElementById('cidade').value = client.endereco.cidade;
                document.getElementById('uf').value = client.endereco.uf;
                $('#addClientModal').modal('show');
                tipoClienteSelect.dispatchEvent(new Event('change'));
            });

            row.querySelector('.delete-btn').addEventListener('click', () => {
                fetch(`/api/clients/${client.id}`, {
                    method: 'DELETE'
                })
                .then(() => {
                    clients = clients.filter(c => c.id !== client.id);
                    clientTable.removeChild(row);
                });
            });

            row.querySelector('.select-client').addEventListener('change', toggleDeleteSelectedButton);
        }
    }

    function toggleDeleteSelectedButton() {
        const selectedCheckboxes = document.querySelectorAll('.select-client:checked');
        deleteSelectedButton.style.display = selectedCheckboxes.length > 0 ? 'inline-block' : 'none';
    }

    selectAllCheckbox.addEventListener('change', () => {
        const checkboxes = document.querySelectorAll('.select-client');
        checkboxes.forEach(checkbox => {
            checkbox.checked = selectAllCheckbox.checked;
        });
        toggleDeleteSelectedButton();
    });

    deleteSelectedButton.addEventListener('click', () => {
        const selectedIds = Array.from(document.querySelectorAll('.select-client:checked'))
            .map(checkbox => checkbox.value);

        if (selectedIds.length > 0) {
            if (confirm(`Tem certeza que deseja excluir ${selectedIds.length} cliente(s)?`)) {
                Promise.all(selectedIds.map(id =>
                    fetch(`/api/clients/${id}`, { method: 'DELETE' })
                ))
                .then(() => {
                    selectedIds.forEach(id => {
                        const row = clientTable.querySelector(`tr:has(input[value="${id}"])`);
                        if (row) {
                            clientTable.removeChild(row);
                        }
                    });
                    clients = clients.filter(client => !selectedIds.includes(client.id));
                    toggleDeleteSelectedButton();
                });
            }
        }
    });

    searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.toLowerCase();
        const filteredClients = clients.filter(client =>
            client.nome.toLowerCase().includes(searchTerm) ||
            client.email.toLowerCase().includes(searchTerm) ||
            client.telefone.includes(searchTerm)
        );
        renderClientTable(filteredClients);
    });

    function renderClientTable(clients) {
        clientTable.innerHTML = '';
        clients.forEach(client => {
            addClientToTable(client);
        });
    }
});