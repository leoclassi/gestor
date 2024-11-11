function applyTheme() {
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme) {
        document.body.classList.add(currentTheme);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Verificação de token
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // Referências aos elementos
    const valorInput = document.getElementById('valor');
    const logoutButton = document.getElementById('logoutButton');
    const selecionarRemetente = document.getElementById('selecionarRemetente');
    const salvarRemetente = document.getElementById('salvarRemetente');
    const gerenciarRemetentesBtn = document.getElementById('gerenciarRemetentesBtn');
    const salvarEdicaoRemetente = document.getElementById('salvarEdicaoRemetente');

    // Event Listeners
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            localStorage.removeItem('token');
            window.location.href = 'login.html';
        });
    }

    if (valorInput) {
        valorInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            value = (parseInt(value, 10) / 100).toFixed(2);
            e.target.value = value;
        });

        valorInput.addEventListener('blur', function(e) {
            let value = e.target.value;
            value = parseFloat(value).toFixed(2);
            e.target.value = value;
        });
    }

    // Carregar remetentes inicialmente
    carregarRemetentes();

    if (selecionarRemetente) {
        selecionarRemetente.addEventListener('change', async function(e) {
            const remetenteId = e.target.value;
            if (!remetenteId) return;
            
            try {
                const response = await fetch(`/api/remetentes/${remetenteId}`);
                const remetente = await response.json();
                
                document.getElementById('banco').value = remetente.banco;
                document.getElementById('agencia').value = remetente.agencia;
                document.getElementById('contaCorrente').value = remetente.conta;
                document.getElementById('remetente').value = remetente.nome;
            } catch (error) {
                console.error('Erro ao carregar dados do remetente:', error);
                alert('Erro ao carregar dados do remetente');
            }
        });
    }

    if (salvarRemetente) {
        salvarRemetente.addEventListener('click', async function() {
            const nome = document.getElementById('nomeRemetente').value;
            const banco = document.getElementById('bancoRemetente').value;
            const agencia = document.getElementById('agenciaRemetente').value;
            const conta = document.getElementById('contaRemetente').value;

            if (!nome || !banco || !agencia || !conta) {
                showToast('Por favor, preencha todos os campos', 'warning');
                return;
            }

            try {
                const response = await fetch('/api/remetentes', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ nome, banco, agencia, conta })
                });

                if (!response.ok) {
                    throw new Error('Erro ao salvar remetente');
                }

                await carregarRemetentes();
                $('#cadastrarRemetenteModal').modal('hide');
                document.getElementById('remetenteForm').reset();
                showToast('Remetente cadastrado com sucesso!', 'success');
            } catch (error) {
                console.error('Erro ao salvar remetente:', error);
                showToast('Erro ao salvar o remetente', 'error');
            }
        });
    }

    if (gerenciarRemetentesBtn) {
        gerenciarRemetentesBtn.addEventListener('click', () => {
            window.atualizarTabelaRemetentes();
            $('#gerenciarRemetentesModal').modal('show');
        });
    }

    if (salvarEdicaoRemetente) {
        salvarEdicaoRemetente.addEventListener('click', async () => {
            const id = document.getElementById('editRemetenteId').value;
            const nome = document.getElementById('editNomeRemetente').value;
            const banco = document.getElementById('editBancoRemetente').value;
            const agencia = document.getElementById('editAgenciaRemetente').value;
            const conta = document.getElementById('editContaRemetente').value;

            if (!nome || !banco || !agencia || !conta) {
                showToast('Por favor, preencha todos os campos', 'warning');
                return;
            }

            try {
                const response = await fetch(`/api/remetentes/${id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ nome, banco, agencia, conta })
                });

                if (!response.ok) {
                    throw new Error('Erro ao atualizar remetente');
                }

                await window.atualizarTabelaRemetentes();
                await carregarRemetentes();
                $('#editarRemetenteModal').modal('hide');
                showToast('Remetente atualizado com sucesso!', 'success');
            } catch (error) {
                console.error('Erro ao atualizar remetente:', error);
                showToast('Erro ao atualizar o remetente', 'error');
            }
        });
    }

    // Remover zeros à esquerda de todos os campos de texto
    const textInputs = document.querySelectorAll('input[type="text"]');
    textInputs.forEach(input => {
        input.addEventListener('blur', function(e) {
            e.target.value = removerZerosAEsquerda(e.target.value);
        });
    });

    // Aplicar tema escuro se estiver armazenado no localStorage
    const body = document.body;
    const themeToggle = document.getElementById('themeToggle');
    applyTheme();

    // Função para alternar entre temas
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            if (body.classList.contains('dark-theme')) {
                body.classList.remove('dark-theme');
                localStorage.removeItem('theme');
            } else {
                body.classList.add('dark-theme');
                localStorage.setItem('theme', 'dark-theme');
            }
        });
    }

    // Adicionar data atual no campo de data de emissão
    const dataEmissao = document.getElementById('dataEmissao');
    if (dataEmissao) {
        const hoje = new Date();
        const dataFormatada = hoje.toISOString().split('T')[0];
        dataEmissao.value = dataFormatada;
    }

    // Função para validar entrada apenas de números e pontuações
    function validarEntradaNumerica(event) {
        // Permite: backspace, delete, tab, escape, enter, ponto e hífen
        if (event.key === 'Backspace' || 
            event.key === 'Delete' || 
            event.key === 'Tab' || 
            event.key === 'Escape' || 
            event.key === 'Enter' || 
            event.key === '.' || 
            event.key === '-') {
            return true;
        }
        
        // Bloqueia qualquer tecla que não seja número
        if (!/[0-9]/.test(event.key)) {
            event.preventDefault();
            return false;
        }
    }

    // Aplicar validação nos campos específicos
    const camposNumericos = [
        'banco',
        'agencia',
        'contaCorrente',
        'bancoRemetente',
        'agenciaRemetente',
        'contaRemetente',
        'editBancoRemetente',
        'editAgenciaRemetente',
        'editContaRemetente'
    ];

    camposNumericos.forEach(campo => {
        const elemento = document.getElementById(campo);
        if (elemento) {
            // Previne entrada de caracteres não numéricos
            elemento.addEventListener('keydown', validarEntradaNumerica);
            
            // Remove qualquer caractere não numérico (exceto ponto e hífen) no blur
            elemento.addEventListener('blur', function(e) {
                let valor = e.target.value;
                // Mantém apenas números, pontos e hífens
                valor = valor.replace(/[^\d.-]/g, '');
                e.target.value = valor;
            });

            // Previne colar (paste) de texto não numérico
            elemento.addEventListener('paste', function(e) {
                e.preventDefault();
                const texto = (e.clipboardData || window.clipboardData).getData('text');
                const textoFiltrado = texto.replace(/[^\d.-]/g, '');
                this.value = textoFiltrado;
            });
        }
    });

    // Adicionar evento de submit ao formulário
    const chequeForm = document.getElementById('chequeForm');
    if (chequeForm) {
        chequeForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            // Validar campos obrigatórios
            const campos = ['numeroCheque', 'agencia', 'contaCorrente', 'valor', 'dataEmissao', 'remetente', 'dataCompensacao'];
            for (const campo of campos) {
                const elemento = document.getElementById(campo);
                if (!elemento.value.trim()) {
                    showToast(`O campo ${campo} é obrigatório`, 'warning');
                    elemento.focus();
                    return;
                }
            }

            // Formatar valor corretamente
            const valorStr = document.getElementById('valor').value;
            const valor = parseFloat(valorStr.replace(',', '.'));
            
            if (isNaN(valor)) {
                showToast('Valor inválido', 'warning');
                return;
            }

            const cheque = {
                numeroCheque: document.getElementById('numeroCheque').value.trim(),
                banco: document.getElementById('banco').value.trim() || null,
                agencia: document.getElementById('agencia').value.trim(),
                contaCorrente: document.getElementById('contaCorrente').value.trim(),
                valor: valor,
                dataEmissao: document.getElementById('dataEmissao').value,
                remetente: document.getElementById('remetente').value.trim(),
                dataCompensacao: document.getElementById('dataCompensacao').value,
                id: Date.now().toString(),
                compensado: false
            };

            try {
                const response = await fetch('/api/cheques', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify(cheque)
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Erro ao salvar cheque');
                }

                showToast('Cheque cadastrado com sucesso!', 'success');
                // Redirecionar imediatamente
                window.location.href = 'cheques-management.html';

            } catch (error) {
                console.error('Erro:', error);
                showToast(error.message || 'Erro ao cadastrar cheque', 'error');
            }
        });
    }

    // Adicione estas funções
    function setupMultipleCheques() {
        const addAnotherBtn = document.getElementById('addAnotherCheque');
        const form = document.getElementById('chequeForm');

        // Mostrar botão após o primeiro cheque ser salvo
        form.addEventListener('submit', async function(e) {
            e.preventDefault();

            // ... código existente do submit ...

            try {
                const response = await fetch('/api/cheques', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify(cheque)
                });

                if (!response.ok) {
                    throw new Error('Erro ao salvar cheque');
                }

                showToast('Cheque cadastrado com sucesso!', 'success');
                
                // Mostrar botão de adicionar outro cheque
                addAnotherBtn.style.display = 'inline-block';
                
                // Limpar apenas os campos específicos
                document.getElementById('numeroCheque').value = '';
                document.getElementById('valor').value = '';
                document.getElementById('dataCompensacao').value = '';
                
                // Focar no campo número do cheque
                document.getElementById('numeroCheque').focus();

            } catch (error) {
                console.error('Erro:', error);
                showToast(error.message || 'Erro ao cadastrar cheque', 'error');
            }
        });

        // Configurar botão de adicionar outro cheque
        addAnotherBtn.addEventListener('click', function() {
            // Limpar apenas os campos específicos
            document.getElementById('numeroCheque').value = '';
            document.getElementById('valor').value = '';
            document.getElementById('dataCompensacao').value = '';
            
            // Focar no campo número do cheque
            document.getElementById('numeroCheque').focus();
        });
    }

    // Adicione a chamada da função no DOMContentLoaded
    setupMultipleCheques();
});

// Funções auxiliares
function removerZerosAEsquerda(valor) {
    return valor.replace(/^0+/, '');
}

// Adicionar estas funções
let remetentesLista = []; // Array para armazenar todos os remetentes

async function carregarRemetentes() {
    try {
        const response = await fetch('/api/remetentes');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        remetentesLista = await response.json();
        
        // Configurar o campo de pesquisa
        setupPesquisaRemetente();
    } catch (error) {
        console.error('Erro ao carregar remetentes:', error);
        showToast('Erro ao carregar a lista de remetentes', 'error');
    }
}

function setupPesquisaRemetente() {
    const pesquisaInput = document.getElementById('pesquisaRemetente');
    const resultadosDiv = document.getElementById('resultadosPesquisa');

    pesquisaInput.addEventListener('input', (e) => {
        const termo = e.target.value.toLowerCase();
        if (termo.length < 2) {
            resultadosDiv.classList.remove('show');
            return;
        }

        const resultados = remetentesLista.filter(rem => 
            rem.nome.toLowerCase().includes(termo)
        ).slice(0, 10); // Limita a 10 resultados

        mostrarResultados(resultados);
    });

    // Fechar resultados quando clicar fora
    document.addEventListener('click', (e) => {
        if (!pesquisaInput.contains(e.target) && !resultadosDiv.contains(e.target)) {
            resultadosDiv.classList.remove('show');
        }
    });
}

function mostrarResultados(resultados) {
    const resultadosDiv = document.getElementById('resultadosPesquisa');
    const pesquisaInput = document.getElementById('pesquisaRemetente');
    const rect = pesquisaInput.getBoundingClientRect();

    // Posicionar a lista abaixo do input
    resultadosDiv.style.top = `${rect.bottom + window.scrollY}px`;
    resultadosDiv.style.left = `${rect.left}px`;
    resultadosDiv.style.width = `${rect.width}px`;

    resultadosDiv.innerHTML = '';

    if (resultados.length === 0) {
        resultadosDiv.innerHTML = '<div class="resultado-item">Nenhum resultado encontrado</div>';
        resultadosDiv.classList.add('show');
        return;
    }

    resultados.forEach(rem => {
        const div = document.createElement('div');
        div.className = 'resultado-item';
        div.textContent = rem.nome;
        div.addEventListener('click', () => selecionarRemetente(rem));
        resultadosDiv.appendChild(div);
    });

    resultadosDiv.classList.add('show');
}

function selecionarRemetente(remetente) {
    const pesquisaInput = document.getElementById('pesquisaRemetente');
    const resultadosDiv = document.getElementById('resultadosPesquisa');

    pesquisaInput.value = remetente.nome;
    resultadosDiv.classList.remove('show');

    // Preencher os campos bancários
    document.getElementById('banco').value = remetente.banco || '';
    document.getElementById('agencia').value = remetente.agencia || '';
    document.getElementById('contaCorrente').value = remetente.conta || '';
    document.getElementById('remetente').value = remetente.nome;
}

// Adicione esta função ao escopo global
window.atualizarTabelaRemetentes = async function() {
    try {
        const response = await fetch('/api/remetentes');
        const remetentes = await response.json();
        
        const tbody = document.getElementById('remetentesTableBody');
        tbody.innerHTML = '';
        
        remetentes.forEach(remetente => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${remetente.nome}</td>
                <td>${remetente.banco}</td>
                <td>${remetente.agencia}</td>
                <td>${remetente.conta}</td>
                <td class="text-center">
                    <div class="btn-group">
                        <button class="btn btn-info btn-sm" onclick="editarRemetente('${remetente.id}')" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="excluirRemetente('${remetente.id}')" title="Excluir">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('Erro ao atualizar tabela:', error);
        alert('Erro ao carregar remetentes');
    }
}

// Certifique-se de que as funções editarRemetente e excluirRemetente também estejam no escopo global
window.editarRemetente = async function(id) {
    try {
        const response = await fetch(`/api/remetentes/${id}`);
        const remetente = await response.json();
        
        document.getElementById('editRemetenteId').value = remetente.id;
        document.getElementById('editNomeRemetente').value = remetente.nome;
        document.getElementById('editBancoRemetente').value = remetente.banco;
        document.getElementById('editAgenciaRemetente').value = remetente.agencia;
        document.getElementById('editContaRemetente').value = remetente.conta;
        
        $('#editarRemetenteModal').modal('show');
    } catch (error) {
        console.error('Erro ao carregar remetente:', error);
        showToast('Erro ao carregar dados do remetente', 'error');
    }
}

window.excluirRemetente = async function(id) {
    if (!confirm('Tem certeza que deseja excluir este remetente?')) return;
    
    try {
        const response = await fetch(`/api/remetentes/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            await window.atualizarTabelaRemetentes();
            await carregarRemetentes();
            alert('Remetente excluído com sucesso');
        } else {
            throw new Error('Erro ao excluir remetente');
        }
    } catch (error) {
        console.error('Erro ao excluir:', error);
        alert('Erro ao excluir remetente');
    }
}

// Adicione esta função para mostrar as notificações
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type} mb-3`;
    toast.style.position = 'fixed';
    toast.style.top = '20px';
    toast.style.right = '20px';
    toast.style.zIndex = '9999';
    toast.innerHTML = `
        <div class="toast-header">
            <i class="fas fa-info-circle mr-2"></i>
            <strong class="mr-auto">${type}</strong>
            <button type="button" class="ml-2 mb-1 close" onclick="this.parentElement.parentElement.remove()">
                <span aria-hidden="true">&times;</span>
            </button>
        </div>
        <div class="toast-body">${message}</div>
    `;

    document.body.appendChild(toast);
    
    // Remover após 3 segundos sem animação
    setTimeout(() => toast.remove(), 3000);
}

// Adicionar estas funções
let chequesLista = [];

function adicionarChequeALista() {
    const numeroCheque = document.getElementById('numeroCheque').value;
    const valor = document.getElementById('valor').value;
    const dataCompensacao = document.getElementById('dataCompensacao').value;
    const remetente = document.getElementById('remetente').value;
    const banco = document.getElementById('banco').value;
    const agencia = document.getElementById('agencia').value;
    const contaCorrente = document.getElementById('contaCorrente').value;
    const dataEmissao = document.getElementById('dataEmissao').value;

    if (!numeroCheque || !valor || !dataCompensacao || !remetente) {
        showToast('Preencha todos os campos obrigatórios', 'warning');
        return;
    }

    const cheque = {
        numeroCheque,
        valor: parseFloat(valor),
        dataCompensacao,
        remetente,
        banco,
        agencia,
        contaCorrente,
        dataEmissao,
        id: Date.now().toString(),
        compensado: false
    };

    chequesLista.push(cheque);
    atualizarTabelaCheques();
    limparCamposCheque();
}

function limparCamposCheque() {
    document.getElementById('numeroCheque').value = '';
    document.getElementById('valor').value = '';
    document.getElementById('dataCompensacao').value = '';
    document.getElementById('numeroCheque').focus();
}

function atualizarTabelaCheques() {
    const tbody = document.getElementById('chequesListaBody');
    tbody.innerHTML = '';

    chequesLista.forEach((cheque, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${cheque.numeroCheque}</td>
            <td>R$ ${cheque.valor.toFixed(2)}</td>
            <td>${formatarData(cheque.dataCompensacao)}</td>
            <td>
                <button class="btn btn-danger btn-sm" onclick="removerCheque(${index})" title="Remover">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function removerCheque(index) {
    chequesLista.splice(index, 1);
    atualizarTabelaCheques();
}

async function salvarTodosCheques() {
    if (chequesLista.length === 0) {
        showToast('Adicione pelo menos um cheque à lista', 'warning');
        return;
    }

    try {
        for (const cheque of chequesLista) {
            const response = await fetch('/api/cheques', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(cheque)
            });

            if (!response.ok) {
                throw new Error(`Erro ao salvar cheque ${cheque.numeroCheque}`);
            }
        }

        showToast(`${chequesLista.length} cheques salvos com sucesso!`, 'success');
        setTimeout(() => {
            window.location.href = 'cheques-management.html';
        }, 1500);
    } catch (error) {
        console.error('Erro:', error);
        showToast(error.message, 'error');
    }
}

function formatarData(data) {
    return new Date(data).toLocaleDateString('pt-BR');
}

// Adicionar event listeners
document.getElementById('adicionarCheque').addEventListener('click', adicionarChequeALista);
document.getElementById('salvarTodosCheques').addEventListener('click', salvarTodosCheques);