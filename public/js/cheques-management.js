document.addEventListener('DOMContentLoaded', () => {
    loadCheques();
    setupEventListeners();
    setupThemeToggle();
});

let chequeToDelete = null;
let mostrandoDepositados = false;

function calcularSomas(cheques) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    return cheques.reduce((somas, cheque) => {
        const valor = parseFloat(cheque.valor);
        const dataCompensacao = new Date(cheque.dataCompensacao);
        dataCompensacao.setHours(0, 0, 0, 0);

        if (cheque.compensado) {
            somas.depositados += valor;
        } else if (dataCompensacao < hoje) {
            somas.vencidos += valor;
        } else {
            somas.aVencer += valor;
        }

        return somas;
    }, { vencidos: 0, aVencer: 0, depositados: 0 });
}

function loadCheques() {
    fetch('/api/cheques')
        .then(response => {
            if (!response.ok) {
                throw new Error('Falha ao carregar cheques');
            }
            return response.json();
        })
        .then(cheques => {
            // Separar cheques em duas categorias
            const chequesNaoDepositados = cheques.filter(cheque => !cheque.compensado);
            const chequesDepositados = cheques.filter(cheque => cheque.compensado);

            // Ordenar cheques não depositados
            chequesNaoDepositados.sort((a, b) => {
                const dataA = new Date(a.dataCompensacao);
                const dataB = new Date(b.dataCompensacao);
                const hoje = new Date();
                hoje.setHours(0, 0, 0, 0);

                const diffDias = (data) => Math.floor((data - hoje) / (1000 * 60 * 60 * 24));
                const diffA = diffDias(dataA);
                const diffB = diffDias(dataB);

                if (diffA < 0 && diffB >= 0) return -1;
                if (diffA >= 0 && diffB < 0) return 1;
                return diffA - diffB;
            });

            const chequesTable = document.getElementById('chequesTable');
            chequesTable.innerHTML = '';

            // Adicionar cheques não depositados
            if (!mostrandoDepositados) {
                chequesNaoDepositados.forEach(cheque => {
                    const row = createChequeRow(cheque);
                    chequesTable.appendChild(row);
                });
            } else {
                // Agrupar cheques depositados por data de compensação
                const chequesDepositadosPorData = chequesDepositados.reduce((grupos, cheque) => {
                    const dataComp = new Date(cheque.dataHoraCompensacao);
                    const dataKey = dataComp.toISOString().split('T')[0];
                    if (!grupos[dataKey]) {
                        grupos[dataKey] = [];
                    }
                    grupos[dataKey].push(cheque);
                    return grupos;
                }, {});

                // Ordenar as datas (mais recentes primeiro)
                const datasOrdenadas = Object.keys(chequesDepositadosPorData).sort((a, b) => new Date(b) - new Date(a));

                // Adicionar cheques depositados agrupados por data
                datasOrdenadas.forEach(data => {
                    // Criar linha de cabeçalho para a data
                    const headerRow = document.createElement('tr');
                    headerRow.classList.add('cheque-depositado', 'data-header');
                    
                    // Formatar a data para o padrão brasileiro, adicionando 1 dia
                    const dataObj = new Date(data);
                    dataObj.setDate(dataObj.getDate() + 1);
                    const dataFormatada = dataObj.toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                    });
                    
                    // Calcular a soma dos cheques do dia
                    const somaChequesData = chequesDepositadosPorData[data].reduce((soma, cheque) => 
                        soma + parseFloat(cheque.valor), 0
                    );
                    
                    const headerStyle = `
                        background-color: #28a745;
                        color: white;
                        font-size: 1.1em;
                        padding: 12px;
                        border-radius: 4px;
                        margin-top: 10px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    `;

                    headerRow.style.cssText = headerStyle;
                    headerRow.innerHTML = `
                        <td colspan="8" class="text-center font-weight-bold">
                            <div style="display: flex; justify-content: center; align-items: center; gap: 10px;">
                                <span style="font-size: 1.2em;">📅</span>
                                <span>Depositados em ${dataFormatada}</span>
                                <span style="margin: 0 10px;">•</span>
                                <span>Total: ${formatarValor(somaChequesData)}</span>
                            </div>
                        </td>
                    `;
                    chequesTable.appendChild(headerRow);

                    // Adicionar os cheques desta data
                    chequesDepositadosPorData[data].forEach(cheque => {
                        const row = createChequeRow(cheque);
                        row.classList.add('cheque-depositado');
                        chequesTable.appendChild(row);
                    });
                });
            }

            // Após renderizar todos os cheques, configure os listeners
            setupCopyJsonListeners();

            // Calcular e exibir as somas
            const somas = calcularSomas(cheques);
            atualizarSomas(somas);
        })
        .catch(error => {
            console.error('Erro ao carregar cheques:', error);
        });
}

function createChequeRow(cheque) {
    const row = document.createElement('tr');
    if (cheque.compensado) {
        row.classList.add('cheque-depositado');
        row.style.display = mostrandoDepositados ? '' : 'none';
    }
    const estadoCheque = cheque.compensado ? `<span class="text-success">Compensado em <br>${formatDateTime(cheque.dataHoraCompensacao)}</span>` : calcularEstadoCheque(cheque.dataCompensacao);
    const temAnotacoes = cheque.anotacoes && cheque.anotacoes.trim() !== '';
    
    // Transformando o nome do remetente para maiúsculas
    const remetenteMaiusculas = (cheque.remetente || '').toUpperCase();

    // Escapar o JSON do cheque adequadamente
    const chequeJson = JSON.stringify(cheque).replace(/'/g, "&#39;").replace(/"/g, "&quot;");

    row.innerHTML = `
        <td class="text-center-custom">${cheque.numeroCheque || ''}</td>
        <td class="text-center-custom">${formatarValor(cheque.valor)}</td>
        <td class="text-center-custom">${remetenteMaiusculas}</td>
        <td class="text-center-custom">${cheque.dataCompensacao ? formatarDataBrasilia(cheque.dataCompensacao) : ''}</td>
        <td class="text-center-custom">${estadoCheque}</td>
        <td class="text-center-custom">${temAnotacoes ? '<span title="' + cheque.anotacoes.replace(/"/g, '&quot;') + '">📝 ' + cheque.anotacoes.substring(0, 20) + (cheque.anotacoes.length > 20 ? '...' : '') + '</span>' : ''}</td>
        <td class="actions-column">
            <button class="btn btn-sm btn-outline-${cheque.compensado ? 'success' : 'primary'} deposit-cheque" data-id="${cheque.id}" title="${cheque.compensado ? 'Desmarcar como Compensado' : 'Marcar como Compensado'}">
                ${cheque.compensado ? '✅' : '💰'}
            </button>
            <button class="btn btn-sm btn-outline-warning edit-cheque" data-id="${cheque.id}" title="Editar">✏️</button>
            <button class="btn btn-sm btn-outline-info note-cheque" data-id="${cheque.id}" title="Anotações">📝</button>
            <button class="btn btn-sm btn-outline-info copy-json" data-cheque='${chequeJson}' title="Copiar JSON">
                <i class="fas fa-code"></i>
            </button>
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

    if (searchInput) {
        searchInput.addEventListener('input', filterCheques);
    }

    if (searchByNumberInput) {
        searchByNumberInput.addEventListener('input', filterCheques);
    }

    if (newChequeBtn) {
        newChequeBtn.addEventListener('click', openNewChequeForm);
    }

    const chequesTable = document.getElementById('chequesTable');
    if (chequesTable) {
        chequesTable.addEventListener('click', (e) => {
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
    }

    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', confirmDeleteCheque);
    }

    const saveEditCheque = document.getElementById('saveEditCheque');
    if (saveEditCheque) {
        saveEditCheque.addEventListener('click', saveEditedCheque);
    }

    setupNotesEventListeners();

    const toggleDepositadosBtn = document.getElementById('toggleDepositadosBtn');
    if (toggleDepositadosBtn) {
        toggleDepositadosBtn.addEventListener('click', toggleChequesDepositados);
    }

    // Adicionar listener para o botão de importar JSON
    document.getElementById('importJsonButton').addEventListener('click', () => {
        $('#importJsonModal').modal('show');
    });

    // Adicionar listener para o botão de confirmar importação
    document.getElementById('importJsonConfirm').addEventListener('click', importChequeFromJson);
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

function formatarValor(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function setupNotesEventListeners() {
    const chequesTable = document.getElementById('chequesTable');
    if (chequesTable) {
        chequesTable.addEventListener('click', (e) => {
            if (e.target.classList.contains('note-cheque')) {
                const chequeId = e.target.getAttribute('data-id');
                openNotesModal(chequeId);
            }
        });
    }

    const saveNotesBtn = document.getElementById('saveNotes');
    if (saveNotesBtn) {
        saveNotesBtn.addEventListener('click', saveNotes);
    }
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

// Adicione esta nova função para animar a contagem dos números
function animateValue(element, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const current = Math.floor(progress * (end - start) + start);
        element.textContent = formatarValor(current);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

// Modifique a função atualizarSomas para usar a animação
function atualizarSomas(somas) {
    const duration = 1000; // Duração da animação em milissegundos

    animateValue(document.getElementById('somaVencidos'), 0, somas.vencidos, duration);
    animateValue(document.getElementById('somaAVencer'), 0, somas.aVencer, duration);
    animateValue(document.getElementById('somaDepositados'), 0, somas.depositados, duration);
}

function toggleChequesDepositados() {
    const btn = document.getElementById('toggleDepositadosBtn');
    mostrandoDepositados = !mostrandoDepositados;
    
    if (mostrandoDepositados) {
        btn.innerHTML = '<i class="fas fa-eye-slash"></i> Não Depositados';
        btn.classList.remove('btn-info', 'text-white');
        btn.classList.add('btn-warning', 'text-white');
    } else {
        btn.innerHTML = '<i class="fas fa-eye"></i> Depositados';
        btn.classList.remove('btn-warning', 'text-white');
        btn.classList.add('btn-info', 'text-white');
    }

    // Recarrega os cheques após mudar o estado
    loadCheques();
}

// Função para importar cheque do JSON
async function importChequeFromJson() {
    try {
        const jsonInput = document.getElementById('jsonInput').value;
        
        // Validar se o input está vazio
        if (!jsonInput.trim()) {
            showNotification('Por favor, insira um JSON válido', 'warning');
            return;
        }

        // Tentar fazer o parse do JSON
        let chequeData;
        try {
            chequeData = JSON.parse(jsonInput);
        } catch (e) {
            showNotification('JSON inválido. Por favor, verifique o formato', 'error');
            return;
        }

        // Preparar os dados do cheque
        const newCheque = {
            ...chequeData,
            id: undefined, // Remover ID para que um novo seja gerado
            compensado: false,
            dataHoraCompensacao: null
        };

        // Enviar o novo cheque para o servidor
        const response = await fetch('/api/cheques', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(newCheque)
        });

        if (!response.ok) {
            throw new Error('Erro ao importar cheque');
        }

        // Fechar o modal
        $('#importJsonModal').modal('hide');

        // Limpar o textarea
        document.getElementById('jsonInput').value = '';

        // Mostrar notificação de sucesso
        showNotification('Cheque importado com sucesso!', 'success');
        
        // Recarregar a lista de cheques
        loadCheques();

    } catch (error) {
        console.error('Erro ao importar cheque:', error);
        showNotification('Erro ao importar cheque. Por favor, verifique os dados e tente novamente.', 'error');
    }
}

// Adicione a função showNotification se ainda não existir
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} notification`;
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.zIndex = '9999';
    notification.style.padding = '10px 20px';
    notification.style.borderRadius = '4px';
    notification.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Adicione esta nova função
function setupCopyJsonListeners() {
    document.querySelectorAll('.copy-json').forEach(button => {
        button.removeEventListener('click', handleCopyJson); // Remove listeners antigos
        button.addEventListener('click', handleCopyJson);
    });
}

// Função para lidar com o clique no botão de copiar JSON
function handleCopyJson(e) {
    e.stopPropagation();
    const chequeData = this.getAttribute('data-cheque')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
    
    try {
        const cheque = JSON.parse(chequeData);
        const formattedJson = JSON.stringify(cheque, null, 2);
        
        // Usar o método mais compatível
        const tempTextArea = document.createElement('textarea');
        tempTextArea.value = formattedJson;
        document.body.appendChild(tempTextArea);
        tempTextArea.select();
        document.execCommand('copy');
        document.body.removeChild(tempTextArea);
        showNotification('JSON copiado com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao processar JSON:', error);
        showNotification('Erro ao processar JSON', 'error');
    }
}

document.head.insertAdjacentHTML('beforeend', `
    <style>
        .dark-theme .data-header {
            background-color: #1e7e34 !important;
            color: white !important;
        }
        
        .data-header {
            transition: background-color 0.3s ease;
        }
        
        /* Estilo para as linhas dos cheques depositados */
        .cheque-depositado:not(.data-header) {
            background-color: rgba(40, 167, 69, 0.05);
        }
        
        .dark-theme .cheque-depositado:not(.data-header) {
            background-color: rgba(30, 126, 52, 0.1);
        }

        .table th:last-child,
        .table td:last-child {
            width: 220px; /* Aumentado de 180px para 220px */
            max-width: 220px;
            white-space: nowrap;
        }

        /* Ajuste para os botões de ação */
        .table td:last-child .btn {
            padding: 0.2rem 0.4rem; /* Reduzido de 0.25rem 0.5rem */
            font-size: 0.8rem; /* Reduzido de 0.875rem */
            line-height: 1.4;
            margin-right: 1px; /* Reduzido de 2px */
            width: 32px; /* Reduzido de 38px */
            height: 32px; /* Reduzido de 38px */
        }

        /* Ajuste para o ícone dentro dos botões */
        .table td:last-child .btn i {
            font-size: 0.75rem; /* Reduzido de 0.8rem */
        }

        .actions-column {
            text-align: center !important; /* Mudado de left para center */
            padding: 4px !important; /* Adicionado padding menor */
        }
    </style>
`);