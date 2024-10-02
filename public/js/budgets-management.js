document.addEventListener('DOMContentLoaded', () => {
    const budgetsTableBody = document.querySelector('#budgetsTable');
    const searchInput = document.getElementById('search');
    const searchByNumberInput = document.getElementById('searchByNumber');
    const monthYearSelector = document.getElementById('monthYearSelector');
    const themeToggle = document.getElementById('themeToggle');
    const selectAllCheckbox = document.getElementById('selectAllBudgets');
    const totalSelectedDisplay = document.getElementById('somaOrcamentos');
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
                budgets = data.sort((a, b) => new Date(b.data) - new Date(a.data));
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
            return Object.values(budgets).flat();
        }
        return budgets[selectedMonthYear] || [];
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
                situacaoStyle = 'background-color: #dc3545; color: white; border-radius: 3px; padding: 2px 4px; font-size: 0.85em; font-weight: bold; display: inline-block;';
            }

            row.innerHTML = `
                <td class="text-center align-middle">
                    <input type="checkbox" class="budget-checkbox" data-valor="${valorFinal.toFixed(2)}">
                </td>
                <td>${budget.numero}</td>
                <td>${budget.cliente}</td>
                <td class="text-center align-middle"><span style="${situacaoStyle}">${situacao}</span></td>
                <td>${formatDate(budget.data)}</td>
                <td>${formatarMoeda(valorFinal)}</td>
                <td>
                    <a href="view-budget.html?id=${budget.id}" target="_blank" class="btn btn-sm btn-outline-info" title="Imprimir">
                        <i class="fas fa-print"></i> 
                    </a>
                    <button class="btn btn-sm btn-outline-success mark-paid" data-id="${budget.id}" title="${budget.paga ? 'Desmarcar como Paga' : 'Marcar como Paga'}">
                        <i class="fas ${budget.paga ? 'fa-money-bill-wave' : 'fa-hand-holding-usd'}"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-primary edit-budget" data-id="${budget.id}" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger delete-budget" data-id="${budget.id}" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });

        addEventListeners();
        setupCheckboxes();
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
        return budgetsArray.filter(budget => 
            budget.cliente.toLowerCase().includes(searchTerm) &&
            budget.numero.toLowerCase().includes(searchNumber)
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
        // Remova o event listener para o botão de visualização, pois agora é um link <a>
        document.querySelectorAll('.edit-budget').forEach(button => {
            button.addEventListener('click', () => {
                const budgetId = button.getAttribute('data-id');
                window.location.href = `budgets.html?id=${budgetId}`;
            });
        });

        document.querySelectorAll('.delete-budget').forEach(button => {
            button.addEventListener('click', () => {
                const budgetId = button.getAttribute('data-id');
                if (confirm('Tem certeza que deseja excluir este orçamento?')) {
                    deleteBudget(budgetId);
                }
            });
        });

        document.querySelectorAll('.mark-paid').forEach(button => {
            button.addEventListener('click', () => {
                const budgetId = button.getAttribute('data-id');
                markBudgetAsPaid(budgetId);
            });
        });

        // Remova o event listener para o botão de visualização
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

    // Função para configurar os checkboxes
    function setupCheckboxes() {
        const budgetCheckboxes = document.querySelectorAll('.budget-checkbox');

        selectAllCheckbox.addEventListener('change', function() {
            budgetCheckboxes.forEach(checkbox => {
                checkbox.checked = this.checked;
            });
            updateTotalSelected();
        });

        budgetCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', updateTotalSelected);
        });
    }

    // Função para atualizar a soma dos orçamentos selecionados
    function updateTotalSelected() {
        const budgetCheckboxes = document.querySelectorAll('.budget-checkbox:checked');
        const totalSelected = Array.from(budgetCheckboxes)
            .reduce((total, checkbox) => total + parseFloat(checkbox.dataset.valor), 0);
        totalSelectedDisplay.textContent = formatarMoeda(totalSelected);
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

    // Inicializar a página
    fetchBudgets();
});