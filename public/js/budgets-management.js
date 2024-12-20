document.addEventListener('DOMContentLoaded', () => {
    const budgetsTableBody = document.querySelector('#budgetsTable');
    const searchInput = document.getElementById('search');
    const searchByNumberInput = document.getElementById('searchByNumber');
    const monthYearSelector = document.getElementById('monthYearSelector');
    const themeToggle = document.getElementById('themeToggle');
    const paginationContainer = document.getElementById('pagination');
    let budgets = [];
    let currentPage = 1;
    const budgetsPerPage = 100;
    let selectedMonthYear = '';

    // Aplicar tema escuro se estiver armazenado no localStorage
    const body = document.body;
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme) {
        body.classList.add(currentTheme);
    }

    // Inicializar o flatpickr no campo de entrada
    flatpickr(monthYearSelector, {
        dateFormat: "m/Y",
        defaultDate: new Date(),
        locale: {
            firstDayOfWeek: 1,
            weekdays: {
                shorthand: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
                longhand: ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'],
            },
            months: {
                shorthand: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
                longhand: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
            },
        },
        plugins: [
            new monthSelectPlugin({
                shorthand: true, // Use shorthand month names (e.g. "Jan" instead of "January")
                dateFormat: "m/Y", // Format the date as month/year
                altFormat: "F Y", // Display the full month name and year
                theme: "light" // Use the light theme
            })
        ],
        onChange: (selectedDates, dateStr) => {
            const [month, year] = dateStr.split('/');
            selectedMonthYear = `${year}-${month}`;
            currentPage = 1;
            renderBudgetsTable();
        }
    });

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

    // Função para buscar os orçamentos
    function fetchBudgets() {
        fetch('/api/budgets')
            .then(response => response.json())
            .then(data => {
                // Ordenar primeiro pelo número e depois pela data, ambos em ordem decrescente
                budgets = data.sort((a, b) => {
                    // Primeiro tenta ordenar pelo número
                    const numDiff = parseInt(b.numero) - parseInt(a.numero);
                    if (numDiff !== 0) return numDiff;
                    
                    // Se os números forem iguais, ordena pela data
                    return new Date(b.data) - new Date(a.data);
                });
                organizeBudgetsByMonthYear();
                if (!selectedMonthYear) {
                    setCurrentMonthYear(); // Apenas define o mês atual se nenhum mês estiver selecionado
                }
                renderBudgetsTable();
            })
            .catch(error => console.error('Erro ao buscar orçamentos:', error));
    }

    // Função para organizar os orçamentos por mês e ano
    function organizeBudgetsByMonthYear() {
        const budgetsByMonthYear = {};
        budgets.forEach(budget => {
            const [year, month] = budget.data.split('-');
            const key = `${year}-${month}`;
            if (!budgetsByMonthYear[key]) {
                budgetsByMonthYear[key] = [];
            }
            budgetsByMonthYear[key].push(budget);
        });
        budgets = budgetsByMonthYear;
    }

    // Função para definir o mês e ano atuais no seletor
    function setCurrentMonthYear() {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear().toString();
        const currentMonth = (currentDate.getMonth() + 1).toString().padStart(2, '0');
        const currentMonthYear = `${currentYear}-${currentMonth}`;
        monthYearSelector._flatpickr.setDate(currentDate);
        selectedMonthYear = currentMonthYear;
    }

    // Função para filtrar os orçamentos do mês e ano selecionados
    function getSelectedMonthYearBudgets() {
        if (!selectedMonthYear) {
            const allBudgets = Object.values(budgets).flat().filter(budget => budget);
            return allBudgets;
        }
        return (budgets[selectedMonthYear] || []).filter(budget => budget);
    }

    // Função para paginar os orçamentos
    function paginateBudgets(budgetsArray, page) {
        const startIndex = (page - 1) * budgetsPerPage;
        return budgetsArray.slice(startIndex, startIndex + budgetsPerPage);
    }

    // Função para renderizar a tabela de orçamentos
    function renderBudgetsTable() {
        const filteredBudgets = filterBudgets(getSelectedMonthYearBudgets());
        const paginatedBudgets = paginateBudgets(filteredBudgets, currentPage);
        const tableBody = document.getElementById('budgetsTable');
        tableBody.innerHTML = '';

        paginatedBudgets.forEach(budget => {
            const row = document.createElement('tr');
            
            // Calcular o valor total com desconto dos produtos
            const valorTotalProdutos = budget.produtos.reduce((total, produto) => {
                let subtotal = produto.quantidade * produto.valor;
                if (produto.descontoTipo === 'percentage') {
                    subtotal *= (1 - produto.desconto / 100);
                } else {
                    subtotal -= produto.desconto;
                }
                return total + subtotal;
            }, 0);

            // Aplicar o desconto total do orçamento
            let valorFinal = valorTotalProdutos;
            if (budget.descontoTotal) {
                if (budget.descontoTotal.tipo === 'percentage') {
                    valorFinal *= (1 - budget.descontoTotal.valor / 100);
                } else {
                    valorFinal -= budget.descontoTotal.valor;
                }
            }

            // Determinar a situação e o estilo com base no status de pagamento
            let situacao = budget.situacao;
            let situacaoStyle = '';

            if (budget.paga) {
                situacao = 'Recebido';
                situacaoStyle = 'background-color: #28a745; color: white; border-radius: 3px; padding: 2px 4px; font-size: 0.85em; font-weight: bold; display: inline-block;';
            } else if (situacao === 'Concretizada') {
                situacaoStyle = 'background-color: #00dcea; color: white; border-radius: 3px; padding: 2px 4px; font-size: 0.85em; font-weight: bold; display: inline-block;';
            } else if (situacao === 'Em Aberto') {
                situacaoStyle = 'background-color: #ff8300; color: white; border-radius: 3px; padding: 2px 4px; font-size: 0.85em; font-weight: bold; display: inline-block;';
            } else if (situacao === 'Aprovado') {
                situacaoStyle = 'background-color: #28a745; color: white; border-radius: 3px; padding: 2px 4px; font-size: 0.85em; font-weight: bold; display: inline-block;';
            } else if (situacao === 'Recusado') {
                situacaoStyle = 'background-color: #dc3545; color: white; border-radius: 3px; padding: 2px 4px; font-size: 0.85em; font-weight: bold; display: inline-block;';
            }

            row.innerHTML = `
                <td>${budget.numero}</td>
                <td class="text-truncate" style="max-width: 300px;" title="${budget.cliente}">${budget.cliente}</td>
                <td class="text-center align-middle"><span style="${situacaoStyle}">${situacao}</span></td>
                <td>${formatDate(budget.data)}</td>
                <td>${formatarMoeda(valorFinal)}</td>
                <td>
                    <a href="view-budget.html?id=${budget.id}" target="_blank" class="btn btn-sm btn-outline-info" title="Imprimir">
                        <i class="fas fa-print"></i> 
                    </a>
                    <button class="btn btn-sm btn-outline-warning action-button generate-sale-btn" data-id="${budget.id}" title="Gerar Venda">
                        <i class="fas fa-file-invoice-dollar"></i> 
                    </button>
                    <button class="btn btn-sm btn-outline-primary edit-budget" data-id="${budget.id}" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-info copy-json" data-budget='${JSON.stringify(budget)}' title="Copiar JSON">
                        <i class="fas fa-code"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger delete-budget" data-id="${budget.id}" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });

        addEventListeners();
        renderPagination(filteredBudgets.length);
    }

    // Função para formatar a data considerando o fuso horário do Brasil (GMT-3)
    function formatDate(dateString) {
        const options = { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'America/Sao_Paulo' };
        // Adiciona 'T00:00:00' para garantir que a data é interpretada como meia-noite no fuso horário local
        const date = new Date(dateString + 'T00:00:00');
        return date.toLocaleDateString('pt-BR', options);
    }

    // Função para formatar o valor monetário
    function formatarMoeda(valor) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(valor);
    }

    // Função para calcular o valor total do orçamento
    function calculateTotalValue(produtos) {
        return produtos.reduce((total, produto) => total + (produto.valor * produto.quantidade), 0);
    }

    // Função para filtrar os orçamentos
    function filterBudgets(budgetsArray) {
        const searchTerm = searchInput.value.toLowerCase();
        const searchNumber = searchByNumberInput.value.toLowerCase();
        
        // Garantir que budgetsArray é um array e filtrar itens undefined
        const validBudgets = Array.isArray(budgetsArray) ? budgetsArray.filter(budget => budget) : [];
        
        return validBudgets.filter(budget => 
            // Verificar se budget e suas propriedades existem antes de usar toLowerCase()
            (budget.cliente?.toLowerCase() || '').includes(searchTerm) &&
            (budget.numero?.toLowerCase() || '').includes(searchNumber)
        );
    }

    // Função para renderizar a paginação
    function renderPagination(totalBudgets) {
        const totalPages = Math.ceil(totalBudgets / budgetsPerPage);
        paginationContainer.innerHTML = '';

        for (let i = 1; i <= totalPages; i++) {
            const pageButton = document.createElement('button');
            pageButton.textContent = i;
            pageButton.classList.add('btn', 'btn-sm', 'mx-1');
            pageButton.classList.toggle('btn-primary', i === currentPage);
            pageButton.classList.toggle('btn-outline-primary', i !== currentPage);
            pageButton.addEventListener('click', () => {
                currentPage = i;
                renderBudgetsTable();
            });
            paginationContainer.appendChild(pageButton);
        }
    }

    // Event listeners
    searchInput.addEventListener('input', () => {
        currentPage = 1;
        renderBudgetsTable();
    });

    searchByNumberInput.addEventListener('input', () => {
        currentPage = 1;
        renderBudgetsTable();
    });

    // Função para adicionar event listeners aos botões de editar e excluir
    function addEventListeners() {
        document.querySelectorAll('.edit-budget').forEach(button => {
            button.addEventListener('click', () => {
                const budgetId = button.getAttribute('data-id');
                window.location.href = `budgets.html?id=${budgetId}`;
            });
        });

        document.querySelectorAll('.delete-budget').forEach(button => {
            button.addEventListener('click', () => {
                const budgetId = button.getAttribute('data-id');
                
                // Encontrar a linha do orçamento
                const budgetRow = button.closest('tr');
                const budgetNumber = budgetRow.querySelector('td:nth-child(2)').textContent;
                const clientName = budgetRow.querySelector('td:nth-child(3)').textContent;
                
                // Atualizar o modal com as informações do orçamento
                document.getElementById('deleteModalBudgetNumber').textContent = budgetNumber;
                document.getElementById('deleteModalClientName').textContent = clientName;
                
                // Armazena o ID do orçamento a ser excluído
                budgetToDeleteId = budgetId;
                
                // Mostra o modal de confirmação
                $('#deleteConfirmModal').modal('show');
            });
        });

        document.querySelectorAll('.mark-paid').forEach(button => {
            button.addEventListener('click', () => {
                const budgetId = button.getAttribute('data-id');
                markBudgetAsPaid(budgetId);
            });
        });

        document.querySelectorAll('.generate-sale-btn').forEach(button => {
            button.addEventListener('click', async () => {
                const budgetId = button.getAttribute('data-id');
                try {
                    const response = await fetch(`/api/generate-sale/${budgetId}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        }
                    });

                    const data = await response.json();
                    
                    if (data.success) {
                        showNotification('Venda gerada com sucesso!', 'success');
                        fetchBudgets(); // Atualiza a lista de orçamentos
                    } else {
                        throw new Error(data.message || 'Erro ao gerar venda');
                    }
                } catch (error) {
                    console.error('Erro ao gerar venda:', error);
                    showNotification(`Erro ao gerar venda: ${error.message}`, 'error');
                }
            });
        });

        // Adicionar listeners para os botões de copiar JSON
        document.querySelectorAll('.copy-json').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const budgetData = button.getAttribute('data-budget');
                
                try {
                    const budget = JSON.parse(budgetData);
                    const formattedJson = JSON.stringify(budget, null, 2);
                    
                    // Criar um elemento temporário
                    const tempTextArea = document.createElement('textarea');
                    tempTextArea.value = formattedJson;
                    document.body.appendChild(tempTextArea);
                    
                    // Selecionar e copiar o texto
                    tempTextArea.select();
                    document.execCommand('copy');
                    
                    // Remover o elemento temporário
                    document.body.removeChild(tempTextArea);
                    
                    showNotification('JSON copiado com sucesso!', 'success');
                } catch (error) {
                    console.error('Erro ao processar JSON:', error);
                    showNotification('Erro ao processar JSON', 'error');
                }
            });
        });
    }

    // Função para excluir um orçamento
    function deleteBudget(id) {
        fetch(`/api/budgets/${id}`, { method: 'DELETE' })
            .then(response => {
                if (response.ok) {
                    fetchBudgets(); // Atualiza a lista de orçamentos após a exclusão
                } else {
                    throw new Error('Erro ao excluir o orçamento');
                }
            })
            .catch(error => console.error('Erro:', error));
    }

    // Função para marcar o orçamento como pago
    function markBudgetAsPaid(budgetId) {
        const button = document.querySelector(`button.mark-paid[data-id="${budgetId}"]`);
        const icon = button.querySelector('i');
        const isPaga = icon.classList.contains('fa-money-bill-wave');

        fetch(`/api/budgets/${budgetId}/pay`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ paga: !isPaga })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                icon.classList.toggle('fa-money-bill-wave');
                icon.classList.toggle('fa-hand-holding-usd');
                button.title = isPaga ? 'Marcar como Paga' : 'Desmarcar como Paga';
                fetchBudgets(); // Recarrega a lista de orçamentos sem redefinir o mês
            } else {
                throw new Error(data.message);
            }
        })
        .catch(error => {
            console.error('Erro ao atualizar o estado do orçamento:', error);
            alert('Ocorreu um erro ao atualizar o estado do orçamento. Por favor, tente novamente.');
        });
    }

    // Função para gerar uma venda a partir de um orçamento
    function generateSale(budgetId) {
        fetch(`/api/generate-sale/${budgetId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('Venda gerada com sucesso!', 'success');
                fetchBudgets();
            } else {
                throw new Error(data.message || 'Erro ao gerar venda');
            }
        })
        .catch(error => {
            console.error('Erro ao gerar venda:', error);
            showNotification(`Erro ao gerar venda: ${error.message}`, 'error');
        });
    }

    // Função para mostrar uma notificação
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `alert alert-${type} notification`;
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.zIndex = '9999';
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // Função para importar JSON
    async function importBudgetFromJson() {
        try {
            const jsonInput = document.getElementById('jsonInput').value;
            
            // Validar se o input está vazio
            if (!jsonInput.trim()) {
                showNotification('Por favor, insira um JSON válido', 'warning');
                return;
            }

            // Tentar fazer o parse do JSON
            let budgetData;
            try {
                budgetData = JSON.parse(jsonInput);
            } catch (e) {
                showNotification('JSON inválido. Por favor, verifique o formato', 'error');
                return;
            }

            // Buscar todos os orçamentos existentes para determinar o próximo número
            const response = await fetch('/api/budgets');
            const allBudgets = await response.json();
            
            // Encontrar o maior número de orçamento
            const maxNumber = allBudgets.reduce((max, budget) => {
                const currentNumber = parseInt(budget.numero) || 0;
                return currentNumber > max ? currentNumber : max;
            }, 0);

            // Próximo número será o maior número + 1
            const nextNumber = (maxNumber + 1).toString();

            // Preparar os dados do orçamento
            const newBudget = {
                ...budgetData,
                id: undefined, // Remover ID para que um novo seja gerado
                numero: nextNumber, // Usar o próximo número calculado
                data: new Date().toISOString().split('T')[0], // Data atual
                situacao: 'Em Aberto',
                paga: false
            };

            // Enviar o novo orçamento para o servidor
            const saveResponse = await fetch('/api/budgets', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newBudget)
            });

            if (!saveResponse.ok) {
                throw new Error('Erro ao importar orçamento');
            }

            // Fechar o modal
            $('#importJsonModal').modal('hide');

            // Limpar o textarea
            document.getElementById('jsonInput').value = '';

            // Mostrar notificação de sucesso
            showNotification('Orçamento importado com sucesso!', 'success');
            
            // Recarregar a lista de orçamentos
            fetchBudgets();

        } catch (error) {
            console.error('Erro ao importar orçamento:', error);
            showNotification('Erro ao importar orçamento. Por favor, verifique os dados e tente novamente.', 'error');
        }
    }

    // Inicializar a página
    fetchBudgets();

    // Adicionar listener para o botão de confirmar exclusão no modal
    document.getElementById('confirmDelete').addEventListener('click', () => {
        if (budgetToDeleteId) {
            deleteBudget(budgetToDeleteId);
            $('#deleteConfirmModal').modal('hide');
            budgetToDeleteId = null; // Limpa o ID após a exclusão
        }
    });

    // Adicionar listener para o botão de importar JSON
    document.getElementById('importJsonButton').addEventListener('click', () => {
        $('#importJsonModal').modal('show');
    });

    // Adicionar listener para o botão de confirmar importação
    document.getElementById('importJsonConfirm').addEventListener('click', importBudgetFromJson);

    // Adicione este estilo no início do arquivo ou em uma tag <style> no HTML
    const style = document.createElement('style');
    style.textContent = `
        .btn-outline-warning.action-button:hover {
            color: #ffffff !important;
        }
        .btn-outline-warning.action-button:hover i {
            color: #ffffff !important;
        }
    `;
    document.head.appendChild(style);
});