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

    // Função para mostrar/esconder campos CPF e CNPJ
    function toggleDocumentFields() {
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
    }

    // Adicionar evento de mudança ao select de tipo de cliente
    tipoClienteSelect.addEventListener('change', toggleDocumentFields);

    // Chamar a função inicialmente para configurar o estado correto
    toggleDocumentFields();

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

            if (!nome.trim()) {
                alert('Por favor, preencha o campo Nome.');
                return;
            }

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

    document.getElementById('buscarCNPJ').addEventListener('click', buscarDadosCNPJ);

    function buscarDadosCNPJ() {
        const cnpj = document.getElementById('cnpj').value.replace(/[^\d]/g, '');
        if (cnpj.length !== 14) {
            alert('CNPJ inválido. Por favor, insira um CNPJ válido com 14 dígitos.');
            return;
        }

        fetch(`/api/cnpj/${cnpj}`)
            .then(response => response.json())
            .then(data => {
                if (data.status === 'ERROR') {
                    alert(data.message);
                    return;
                }
                
                // Função auxiliar para preencher o campo se ele existir
                const preencherCampo = (id, valor) => {
                    const campo = document.getElementById(id);
                    if (campo) {
                        campo.value = valor;
                    } else {
                        console.warn(`Campo com id '${id}' não encontrado.`);
                    }
                };

                preencherCampo('nome', data.nome);
                preencherCampo('email', data.email);
                preencherCampo('cep', data.cep);
                preencherCampo('logradouro', data.logradouro);
                preencherCampo('numero', data.numero);
                preencherCampo('bairro', data.bairro);
                preencherCampo('cidade', data.municipio);
                preencherCampo('uf', data.uf);
                preencherCampo('telefone', data.telefone);

                console.log('Dados do CNPJ preenchidos com sucesso.');
            })
            .catch(error => {
                console.error('Erro ao buscar dados do CNPJ:', error);
                alert('Erro ao buscar dados do CNPJ. Por favor, tente novamente.');
            });
    }

    function formatDocument(input) {
        let value = input.value.replace(/\D/g, '');
        let formattedValue = '';

        if (input.id === 'cpf') {
            // Formatação para CPF
            if (value.length <= 3) {
                formattedValue = value;
            } else if (value.length <= 6) {
                formattedValue = value.slice(0, 3) + '.' + value.slice(3);
            } else if (value.length <= 9) {
                formattedValue = value.slice(0, 3) + '.' + value.slice(3, 6) + '.' + value.slice(6);
            } else {
                formattedValue = value.slice(0, 3) + '.' + value.slice(3, 6) + '.' + value.slice(6, 9) + '-' + value.slice(9, 11);
            }
        } else if (input.id === 'cnpj') {
            // Formatação para CNPJ
            if (value.length <= 2) {
                formattedValue = value;
            } else if (value.length <= 5) {
                formattedValue = value.slice(0, 2) + '.' + value.slice(2);
            } else if (value.length <= 8) {
                formattedValue = value.slice(0, 2) + '.' + value.slice(2, 5) + '.' + value.slice(5);
            } else if (value.length <= 12) {
                formattedValue = value.slice(0, 2) + '.' + value.slice(2, 5) + '.' + value.slice(5, 8) + '/' + value.slice(8);
            } else {
                formattedValue = value.slice(0, 2) + '.' + value.slice(2, 5) + '.' + value.slice(5, 8) + '/' + value.slice(8, 12) + '-' + value.slice(12, 14);
            }
        }

        input.value = formattedValue;
    }

    // Adicione os event listeners para os campos de CPF e CNPJ
    const cpfInput = document.getElementById('cpf');
    const cnpjInput = document.getElementById('cnpj');

    if (cpfInput) {
        cpfInput.addEventListener('input', () => formatDocument(cpfInput));
    }

    if (cnpjInput) {
        cnpjInput.addEventListener('input', () => formatDocument(cnpjInput));
    }

    // Adicione esta função no início do arquivo
    function buscarCEP(cep) {
        fetch(`/api/cep/${cep}`)
            .then(response => response.json())
            .then(data => {
                if (data.erro) {
                    alert('CEP não encontrado');
                } else {
                    document.getElementById('logradouro').value = data.logradouro || '';
                    document.getElementById('bairro').value = data.bairro || '';
                    document.getElementById('cidade').value = data.localidade || '';
                    document.getElementById('uf').value = data.uf || '';
                    
                    // Limpar o campo número, já que a API não fornece essa informação
                    document.getElementById('numero').value = '';
                    
                    // Focar no campo número para que o usuário possa preenchê-lo
                    document.getElementById('numero').focus();
                }
            })
            .catch(error => {
                console.error('Erro ao buscar CEP:', error);
                alert('Erro ao buscar CEP. Por favor, tente novamente.');
            });
    }

    // Adicione este event listener após a declaração da variável 'form'
    const cepInput = document.getElementById('cep');
    cepInput.addEventListener('blur', () => {
        const cep = cepInput.value.replace(/\D/g, '');
        if (cep.length === 8) {
            buscarCEP(cep);
        }
    });

    function formatCEP(input) {
        let value = input.value.replace(/\D/g, '');
        if (value.length > 5) {
            value = value.slice(0, 5) + '-' + value.slice(5, 8);
        }
        input.value = value;
    }

    cepInput.addEventListener('input', () => formatCEP(cepInput));

    const cidadeInput = document.getElementById('cidade');
    const ufInput = document.getElementById('uf');

    if (cidadeInput) {
        $(cidadeInput).autocomplete({
            source: function(request, response) {
                $.ajax({
                    url: "/api/cidades",
                    dataType: "json",
                    data: {
                        termo: request.term
                    },
                    success: function(data) {
                        console.log("Dados recebidos:", data);
                        response(data.map(item => ({
                            label: `${item.nome} - ${item.uf}`,
                            value: item.nome,
                            uf: item.uf
                        })));
                    },
                    error: function(xhr, status, error) {
                        console.error("Erro na requisição:", error);
                    }
                });
            },
            minLength: 3,
            select: function(event, ui) {
                cidadeInput.value = ui.item.value;
                if (ufInput) {
                    ufInput.value = ui.item.uf;
                }
                return false;
            },
            open: function() {
                $(this).autocomplete('widget').css('z-index', 2000);
                
                // Aplicar o tema escuro se necessário
                if (document.body.classList.contains('dark-theme')) {
                    $(this).autocomplete('widget').addClass('dark-theme');
                } else {
                    $(this).autocomplete('widget').removeClass('dark-theme');
                }

                // Posicionar o menu de autocompletar
                const inputOffset = $(this).offset();
                const inputHeight = $(this).outerHeight();
                $(this).autocomplete('widget').css({
                    'top': inputOffset.top + inputHeight + 'px',
                    'left': inputOffset.left + 'px',
                    'width': $(this).outerWidth() + 'px'
                });
            }
        }).autocomplete("instance")._renderItem = function(ul, item) {
            return $("<li>")
                .append(`<div>${item.label}</div>`)
                .appendTo(ul);
        };
    }

    // Adicione este evento para debug
    if (cidadeInput) {
        cidadeInput.addEventListener('input', function() {
            console.log("Valor atual:", this.value);
        });
    }

    // Atualizar o tema do autocomplete quando o tema geral for alterado
    themeToggle.addEventListener('click', () => {
        // ... (código existente para alternar o tema) ...

        // Atualizar o tema do autocomplete
        if (cidadeInput) {
            const autocompleteWidget = $(cidadeInput).autocomplete('widget');
            if (body.classList.contains('dark-theme')) {
                autocompleteWidget.addClass('dark-theme');
            } else {
                autocompleteWidget.removeClass('dark-theme');
            }
        }
    });

    const editButtons = document.querySelectorAll('.edit-btn');
    editButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            event.preventDefault();
            const clientId = button.getAttribute('data-id');
            editingClient = clients.find(client => client.id === clientId);
            if (editingClient) {
                document.getElementById('tipoCliente').value = editingClient.tipoCliente;
                document.getElementById('nome').value = editingClient.nome;
                document.getElementById('email').value = editingClient.email;
                document.getElementById('telefone').value = editingClient.telefone;
                document.getElementById('cpf').value = editingClient.cpf;
                document.getElementById('cnpj').value = editingClient.cnpj;
                document.getElementById('cep').value = editingClient.endereco.cep;
                document.getElementById('logradouro').value = editingClient.endereco.logradouro;
                document.getElementById('numero').value = editingClient.endereco.numero;
                document.getElementById('bairro').value = editingClient.endereco.bairro;
                document.getElementById('cidade').value = editingClient.endereco.cidade;
                document.getElementById('uf').value = editingClient.endereco.uf;
                
                // Use JavaScript puro para abrir o modal
                const modal = document.getElementById('addClientModal');
                modal.style.display = 'block';
                modal.classList.add('show');
                document.body.classList.add('modal-open');
                
                tipoClienteSelect.dispatchEvent(new Event('change'));
            }
        });
    });

    // Adicione um evento para fechar o modal
    const closeModalButtons = document.querySelectorAll('[data-dismiss="modal"]');
    closeModalButtons.forEach(button => {
        button.addEventListener('click', () => {
            const modal = document.getElementById('addClientModal');
            modal.style.display = 'none';
            modal.classList.remove('show');
            document.body.classList.remove('modal-open');
        });
    });
});