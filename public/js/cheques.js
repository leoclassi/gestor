document.addEventListener('DOMContentLoaded', () => {
    const chequeForm = document.getElementById('chequeForm');
    const cancelarBtn = document.getElementById('cancelarBtn');
    const limparBtn = document.getElementById('limparBtn');
    const successPopup = document.getElementById('successPopup');
    const themeToggle = document.getElementById('themeToggle');
    const valorInput = document.getElementById('valor');

    // Aplicar tema escuro se estiver armazenado no localStorage
    const body = document.body;
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme) {
        body.classList.add(currentTheme);
    }

    // Função para alternar entre temas
    themeToggle.addEventListener('click', () => {
        if (body.classList.contains('dark-theme')) {
            body.classList.remove('dark-theme');
            localStorage.removeItem('theme');
        } else {
            body.classList.add('dark-theme');
            localStorage.setItem('theme', 'dark-theme');
        }
    });

    // Função para definir a data atual no campo de data de emissão
    function setCurrentDate() {
        const today = new Date();
        const day = String(today.getDate()).padStart(2, '0');
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const year = today.getFullYear();
        document.getElementById('dataEmissao').value = `${year}-${month}-${day}`;
    }

    // Definir a data atual no campo de data de emissão ao carregar a página
    setCurrentDate();

    chequeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const chequeData = {
            numeroCheque: document.getElementById('numeroCheque')?.value || '',
            banco: document.getElementById('banco')?.value || '',
            agencia: document.getElementById('agencia')?.value || '',
            contaCorrente: document.getElementById('contaCorrente')?.value || '',
            valor: valorInput ? parseFloat(valorInput.value.replace(',', '.')) : 0,
            dataEmissao: document.getElementById('dataEmissao')?.value || '',
            remetente: document.getElementById('remetente')?.value || '',
            dataCompensacao: document.getElementById('dataCompensacao')?.value || ''
        };

        try {
            const response = await fetch('/api/cheques', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(chequeData),
            });

            if (response.ok) {
                // Cheque salvo com sucesso, redirecionar para a página de gerenciamento
                window.location.href = 'cheques-management.html';
            } else {
                throw new Error('Erro ao salvar o cheque');
            }
        } catch (error) {
            console.error('Erro:', error);
            alert('Ocorreu um erro ao salvar o cheque. Por favor, tente novamente.');
        }
    });

    // Adicionar evento de clique ao botão Cancelar
    document.getElementById('cancelarBtn').addEventListener('click', () => {
        window.location.href = 'cheques-management.html';
    });

    limparBtn.addEventListener('click', () => {
        chequeForm.reset();
        setCurrentDate();
    });

    const preencherChequeBtn = document.getElementById('preencherCheque');
    const chequeJsonTextarea = document.getElementById('chequeJson');

    preencherChequeBtn.addEventListener('click', () => {
        try {
            const chequeData = JSON.parse(chequeJsonTextarea.value);
            if (Array.isArray(chequeData) && chequeData.length > 0) {
                const cheque = chequeData[0];
                document.getElementById('numeroCheque').value = removerZerosAEsquerda(cheque.numeroCheque || '');
                document.getElementById('banco').value = removerZerosAEsquerda(cheque.banco || '');
                document.getElementById('agencia').value = removerZerosAEsquerda(cheque.agencia || '');
                document.getElementById('contaCorrente').value = removerZerosAEsquerda(cheque.contaCorrente || '');
                document.getElementById('valor').value = cheque.valor ? parseFloat(cheque.valor).toFixed(2) : '';
                document.getElementById('dataEmissao').value = formatarData(cheque.dataEmissao);
                document.getElementById('remetente').value = cheque.remetente || ''; // Alterado de 'beneficiario' para 'remetente'
                document.getElementById('dataCompensacao').value = formatarData(cheque.dataCompensacao);

                $('#autoPreencherModal').modal('hide');
            } else {
                throw new Error('Formato JSON inválido');
            }
        } catch (error) {
            alert('Erro ao processar o JSON. Verifique o formato e tente novamente.');
        }
    });

    function formatarData(dataString) {
        if (!dataString) return '';
        const partes = dataString.split('/');
        if (partes.length === 3) {
            // Garante que o ano tenha 4 dígitos
            const ano = partes[2].length === 2 ? '20' + partes[2] : partes[2];
            return `${ano}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
        }
        return dataString; // Retorna a string original se não conseguir formatar
    }

    function showSuccessPopup() {
        successPopup.style.display = 'flex';
        setTimeout(() => {
            successPopup.style.display = 'none';
        }, 3000);
    }

    // Função para remover zeros à esquerda
    function removerZerosAEsquerda(valor) {
        return valor.replace(/^0+/, '');
    }

    // Formatação do campo de valor
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

    // Remover zeros à esquerda de todos os campos de texto
    const textInputs = document.querySelectorAll('input[type="text"]');
    textInputs.forEach(input => {
        input.addEventListener('blur', function(e) {
            e.target.value = removerZerosAEsquerda(e.target.value);
        });
    });
});