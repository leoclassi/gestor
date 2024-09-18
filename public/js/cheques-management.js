document.addEventListener('DOMContentLoaded', () => {
    loadCheques();
    setupEventListeners();
    setupThemeToggle();
    setupCheckboxes();
});

let chequeToDelete = null;

function loadCheques() {
    fetch('/api/cheques')
        .then(response => {
            if (!response.ok) {
                throw new Error('Falha ao carregar cheques');
            }
            return response.json();
        })
        .then(cheques => {
            // Ordenar os cheques
            cheques.sort((a, b) => {
                const dataA = new Date(a.dataCompensacao);
                const dataB = new Date(b.dataCompensacao);
                const hoje = new Date();
                hoje.setHours(0, 0, 0, 0);

                // Função para calcular a diferença em dias
                const diffDias = (data) => Math.floor((data - hoje) / (1000 * 60 * 60 * 24));

                // Cheques compensados vão para o final
                if (a.compensado && !b.compensado) return 1;
                if (!a.compensado && b.compensado) return -1;
                if (a.compensado && b.compensado) return 0;

                // Ordenar por data de compensação
                const diffA = diffDias(dataA);
                const diffB = diffDias(dataB);

                // Cheques vencidos primeiro
                if (diffA < 0 && diffB >= 0) return -1;
                if (diffA >= 0 && diffB < 0) return 1;

                // Ordenar por proximidade da data de compensação
                return diffA - diffB;
            });

            const chequesTable = document.getElementById('chequesTable');
            chequesTable.innerHTML = '';
            cheques.forEach(cheque => {
                const row = createChequeRow(cheque);
                chequesTable.appendChild(row);
            });
        })
        .catch(error => {
            console.error('Erro ao carregar cheques:', error);
        });
}

function createChequeRow(cheque) {
    const row = document.createElement('tr');
    const estadoCheque = cheque.compensado ? `<span class="text-success">Compensado em <br>${formatDateTime(cheque.dataHoraCompensacao)}</span>` : calcularEstadoCheque(cheque.dataCompensacao);
    const temAnotacoes = cheque.anotacoes && cheque.anotacoes.trim() !== '';
    
    // Transformando o nome do remetente para maiúsculas
    const remetenteMaiusculas = (cheque.remetente || '').toUpperCase();

    row.innerHTML = `
        <td><input type="checkbox" class="cheque-checkbox" data-id="${cheque.id}" data-valor="${cheque.valor}"></td>
        <td>${cheque.numeroCheque || ''}</td>
        <td>${formatarValor(cheque.valor)}</td>
        <td>${remetenteMaiusculas}</td>
        <td>${cheque.dataCompensacao ? formatarDataBrasilia(cheque.dataCompensacao) : ''}</td>
        <td>${estadoCheque}</td>
        <td>${temAnotacoes ? '<span title="' + cheque.anotacoes.replace(/"/g, '&quot;') + '">📝 ' + cheque.anotacoes.substring(0, 20) + (cheque.anotacoes.length > 20 ? '...' : '') + '</span>' : ''}</td>
        <td>
            <button class="btn btn-sm btn-outline-${cheque.compensado ? 'success' : 'primary'} deposit-cheque" data-id="${cheque.id}" title="${cheque.compensado ? 'Desmarcar como Compensado' : 'Marcar como Compensado'}">
                ${cheque.compensado ? '✅' : '💰'}
            </button>
            <button class="btn btn-sm btn-outline-warning edit-cheque" data-id="${cheque.id}" title="Editar">✏️</button>
            <button class="btn btn-sm btn-outline-info note-cheque" data-id="${cheque.id}" title="Anotações">📝</button>
            <button class="btn btn-sm btn-outline-danger delete-cheque" data-id="${cheque.id}" title="Excluir">🗑️</button>
        </td>
    `;
    return row;
}

function calcularEstadoCheque(dataCompensacao) {
    if (!dataCompensacao) return 'Data não definida';

    const dataComp = new Date(dataCompensacao + 'T00:00:00');
    const agora = new Date();
    agora.setHours(0, 0, 0, 0);

    const diferencaDias = Math.floor((dataComp - agora) / (1000 * 60 * 60 * 24));

    if (diferencaDias < 0) {
        return `<span class="text-danger">Vencido há ${Math.abs(diferencaDias)} dia(s)</span>`;
    } else if (diferencaDias === 0) {
        return '<span class="text-warning">Vence hoje</span>';
    } else {
        return `<span class="text-primary">Falta(m) ${diferencaDias} dia(s)</span>`;
    }
}

function setupEventListeners() {
    const searchInput = document.getElementById('search');
    const searchByNumberInput = document.getElementById('searchByNumber');
    const newChequeBtn = document.getElementById('newChequeBtn');
    const selectNonCompensatedBtn = document.getElementById('selectNonCompensatedBtn');

    searchInput.addEventListener('input', filterCheques);
    searchByNumberInput.addEventListener('input', filterCheques);
    newChequeBtn.addEventListener('click', openNewChequeForm);
    selectNonCompensatedBtn.addEventListener('click', toggleNonCompensatedSelection);

    document.getElementById('chequesTable').addEventListener('click', (e) => {
        if (e.target.classList.contains('edit-cheque')) {
            const chequeId = e.target.getAttribute('data-id');
            openEditChequeForm(chequeId);
        } else if (e.target.classList.contains('delete-cheque')) {
            const chequeId = e.target.getAttribute('data-id');
            deleteCheque(chequeId);
        } else if (e.target.classList.contains('deposit-cheque')) {
            const chequeId = e.target.getAttribute('data-id');
            markChequeAsDeposited(chequeId);
        }
    });

    document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDeleteCheque);
    document.getElementById('saveEditCheque').addEventListener('click', saveEditedCheque);
    setupNotesEventListeners();
}

function filterCheques() {
    const searchTerm = document.getElementById('search').value.toLowerCase();
    const searchByNumber = document.getElementById('searchByNumber').value.toLowerCase();
    const rows = document.getElementById('chequesTable').getElementsByTagName('tr');

    for (let row of rows) {
        // Ajustando o índice para acessar a célula do remetente corretamente após a remoção da coluna Banco
        const remetente = row.cells[3].textContent.toLowerCase(); // Novo índice após remoção da coluna Banco
        const chequeNumber = row.cells[1].textContent.toLowerCase();
        const matchesSearch = remetente.includes(searchTerm);
        const matchesNumber = chequeNumber.includes(searchByNumber);
        row.style.display = (matchesSearch && matchesNumber) ? '' : 'none';
    }
}

function openNewChequeForm() {
    window.location.href = 'cheques.html';
}

function openEditChequeForm(chequeId) {
    fetch(`/api/cheques/${chequeId}`)
        .then(response => response.json())
        .then(cheque => {
            console.log('Dados do cheque recebidos:', cheque); // Log para depuração

            const setFieldValue = (id, value) => {
                const field = document.getElementById(id);
                if (field) {
                    field.value = value || '';
                } else {
                    console.warn(`Campo não encontrado: ${id}`);
                }
            };

            setFieldValue('editChequeId', cheque.id);
            setFieldValue('editNumeroCheque', cheque.numeroCheque);
            setFieldValue('editBanco', cheque.banco);
            setFieldValue('editValor', cheque.valor);
            setFieldValue('editRemetente', cheque.remetente || '');
            setFieldValue('editDataCompensacao', cheque.dataCompensacao);

            const compensadoSelect = document.getElementById('editCompensado');
            if (compensadoSelect) {
                compensadoSelect.value = cheque.compensado ? 'true' : 'false';
            } else {
                console.warn('Campo editCompensado não encontrado');
            }

            $('#editChequeModal').modal('show');
        })
        .catch(error => {
            console.error('Erro ao carregar dados do cheque:', error);
        });
}

function saveEditedCheque() {
    console.log('Iniciando saveEditedCheque'); // Log para depuração

    const getFieldValue = (id) => {
        const field = document.getElementById(id);
        if (!field) {
            console.warn(`Campo não encontrado: ${id}`);
            return null;
        }
        return field.value;
    };

    const chequeId = getFieldValue('editChequeId');
    if (!chequeId) {
        console.error('ID do cheque não encontrado');
        return;
    }

    const chequeData = {
        numeroCheque: getFieldValue('editNumeroCheque'),
        banco: getFieldValue('editBanco'),
        valor: parseFloat(getFieldValue('editValor') || '0'),
        remetente: getFieldValue('editRemetente'),
        dataCompensacao: getFieldValue('editDataCompensacao'),
        compensado: getFieldValue('editCompensado') === 'true'
    };

    console.log('Dados do cheque a serem salvos:', chequeData); // Log para depuração

    fetch(`/api/cheques/${chequeId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(chequeData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Falha ao salvar as alterações');
        }
        return response.json();
    })
    .then(data => {
        $('#editChequeModal').modal('hide');
        loadCheques();
    })
    .catch(error => {
        console.error('Erro ao salvar as alterações:', error);
    });
}

function deleteCheque(chequeId) {
    chequeToDelete = chequeId;
    $('#deleteConfirmModal').modal('show');
}

function confirmDeleteCheque() {
    if (chequeToDelete) {
        fetch(`/api/cheques/${chequeToDelete}`, { method: 'DELETE' })
            .then(response => {
                if (response.ok) {
                    return response.json();
                } else {
                    throw new Error(`Falha ao excluir o cheque: ${response.status}`);
                }
            })
            .then(data => {
                $('#deleteConfirmModal').modal('hide');
                loadCheques();
            })
            .catch(error => {
                console.error('Erro ao excluir cheque:', error);
            })
            .finally(() => {
                chequeToDelete = null;
            });
    }
}

function markChequeAsDeposited(chequeId) {
    const button = document.querySelector(`button.deposit-cheque[data-id="${chequeId}"]`);
    const isCompensado = button.textContent.trim() === '✅';

    fetch(`/api/cheques/${chequeId}/deposit`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ compensado: !isCompensado })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            button.textContent = isCompensado ? '💰' : '✅';
            button.title = isCompensado ? 'Marcar como Compensado' : 'Desmarcar como Compensado';
            button.classList.toggle('btn-success');
            button.classList.toggle('btn-primary');
            loadCheques(); // Recarrega a lista de cheques
        } else {
            throw new Error(data.message);
        }
    })
    .catch(error => {
        console.error('Erro ao atualizar o estado do cheque:', error);
        alert('Ocorreu um erro ao atualizar o estado do cheque. Por favor, tente novamente.');
    });
}

function setupThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    const body = document.body;

    // Verifica se há uma preferência de tema salva
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
}

// Função para formatar valores no formato R$ 00.000,00
function formatarValor(valor) {
    if (valor == null || isNaN(valor)) {
        return 'R$ 0,00';
    }
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarDataBrasilia(dataISO) {
    if (!dataISO) return '';
    const [ano, mes, dia] = dataISO.split('-');
    return `${dia}/${mes}/${ano}`;
}

function setupCheckboxes() {
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const selectNonCompensatedBtn = document.getElementById('selectNonCompensatedBtn');

    selectAllCheckbox.addEventListener('change', function() {
        const checkboxes = document.querySelectorAll('.cheque-checkbox');
        checkboxes.forEach(checkbox => checkbox.checked = this.checked);
        updateSomaCheques();
        updateSelectNonCompensatedButton();
    });

    selectNonCompensatedBtn.addEventListener('click', toggleNonCompensatedSelection);

    // Adicionar evento de mudança para cada checkbox individual
    document.getElementById('chequesTable').addEventListener('change', function(e) {
        if (e.target.classList.contains('cheque-checkbox')) {
            updateSomaCheques();
            updateSelectAllCheckbox();
            updateSelectNonCompensatedButton();
        }
    });
}

function updateSomaCheques() {
    const checkboxes = document.querySelectorAll('.cheque-checkbox:checked');
    let soma = 0;
    checkboxes.forEach(checkbox => {
        soma += parseFloat(checkbox.dataset.valor) || 0;
    });
    document.getElementById('somaCheques').textContent = formatarValor(soma);
}

function updateSelectAllCheckbox() {
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const checkboxes = document.querySelectorAll('.cheque-checkbox');
    const checkedCheckboxes = document.querySelectorAll('.cheque-checkbox:checked');
    selectAllCheckbox.checked = checkboxes.length === checkedCheckboxes.length && checkboxes.length > 0;
}

function toggleNonCompensatedSelection() {
    const btn = document.getElementById('selectNonCompensatedBtn');
    const isSelecting = btn.textContent.includes('Selecionar');

    if (isSelecting) {
        const anySelected = selectNonCompensatedCheques();
        if (anySelected) {
            btn.innerHTML = '<i class="fas fa-times-circle"></i> Desmarcar Seleção';
            btn.classList.remove('btn-info');
            btn.classList.add('btn-secondary');
        }
    } else {
        deselectAllCheques();
        btn.innerHTML = '<i class="fas fa-check-square"></i> Selecionar Não Compensados';
        btn.classList.remove('btn-secondary');
        btn.classList.add('btn-info');
    }
    updateSomaCheques();
}

function selectNonCompensatedCheques() {
    const checkboxes = document.querySelectorAll('.cheque-checkbox');
    let anySelected = false;
    checkboxes.forEach(checkbox => {
        const row = checkbox.closest('tr');
        const depositButton = row.querySelector('.deposit-cheque');
        const isCompensado = depositButton.textContent.trim() === '✅';
        checkbox.checked = !isCompensado;
        if (!isCompensado) {
            anySelected = true;
        }
    });
    updateSomaCheques();
    updateSelectAllCheckbox();
    return anySelected;
}

function deselectAllCheques() {
    const checkboxes = document.querySelectorAll('.cheque-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    updateSomaCheques();
    updateSelectAllCheckbox();
}

function updateSelectNonCompensatedButton() {
    const btn = document.getElementById('selectNonCompensatedBtn');
    const anyChecked = document.querySelector('.cheque-checkbox:checked');
    if (anyChecked) {
        btn.innerHTML = '<i class="fas fa-times-circle"></i> Desmarcar Seleção';
        btn.classList.remove('btn-info');
        btn.classList.add('btn-secondary');
    } else {
        btn.innerHTML = '<i class="fas fa-check-square"></i> Selecionar Não Compensados';
        btn.classList.remove('btn-secondary');
        btn.classList.add('btn-info');
    }
}

function setupNotesEventListeners() {
    document.getElementById('chequesTable').addEventListener('click', (e) => {
        if (e.target.classList.contains('note-cheque')) {
            const chequeId = e.target.getAttribute('data-id');
            openNotesModal(chequeId);
        }
    });

    document.getElementById('saveNotes').addEventListener('click', saveNotes);
}

function openNotesModal(chequeId) {
    fetch(`/api/cheques/${chequeId}`)
        .then(response => response.json())
        .then(cheque => {
            document.getElementById('chequeNotes').value = cheque.anotacoes || '';
            document.getElementById('saveNotes').setAttribute('data-id', chequeId);
            $('#notesModal').modal('show');
        })
        .catch(error => {
            console.error('Erro ao carregar anotações:', error);
        });
}

function saveNotes() {
    const chequeId = document.getElementById('saveNotes').getAttribute('data-id');
    const notes = document.getElementById('chequeNotes').value;
    
    fetch(`/api/cheques/${chequeId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ anotacoes: notes })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(() => {
        $('#notesModal').modal('hide');
        loadCheques(); // Recarrega a tabela para atualizar o indicador de anotações
    })
    .catch(error => {
        console.error('Erro ao salvar anotações:', error);
        alert('Ocorreu um erro ao salvar as anotações. Por favor, tente novamente.');
    });
}

function formatDateTime(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleString(); // Formata a data e hora no formato local
}