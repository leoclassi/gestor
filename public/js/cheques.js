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
});

// Funções auxiliares
function removerZerosAEsquerda(valor) {
    return valor.replace(/^0+/, '');
}

// Função para carregar os remetentes do servidor e preencher o select
async function carregarRemetentes() {
    try {
        const response = await fetch('/api/remetentes');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const remetentes = await response.json();
        
        const select = document.getElementById('selecionarRemetente');
        select.innerHTML = '<option value="">Selecione um remetente...</option>';
        
        remetentes.forEach(remetente => {
            const option = document.createElement('option');
            option.value = remetente.id;
            option.textContent = remetente.nome;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao carregar remetentes:', error);
        showToast('Erro ao carregar a lista de remetentes', 'error');
    }
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
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type} mb-3`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    toast.innerHTML = `
        <div class="toast-header">
            <i class="${icons[type]} mr-2" style="color: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : type === 'warning' ? '#ffc107' : '#17a2b8'}"></i>
            <strong class="mr-auto">${type.charAt(0).toUpperCase() + type.slice(1)}</strong>
            <button type="button" class="ml-2 mb-1 close" data-dismiss="toast">
                <span aria-hidden="true">&times;</span>
            </button>
        </div>
        <div class="toast-body">
            ${message}
        </div>
    `;

    document.getElementById('toastContainer').appendChild(toast);
    $(toast).toast({ delay: 5000 }).toast('show');

    // Remover o toast depois que ele for fechado
    $(toast).on('hidden.bs.toast', function() {
        $(this).remove();
    });
}