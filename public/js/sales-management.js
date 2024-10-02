document.addEventListener('DOMContentLoaded', () => {
    const salesTableBody = document.querySelector('#salesTable');
    const searchInput = document.getElementById('search');
    const searchByNumberInput = document.getElementById('searchByNumber');
    const monthYearSelector = document.getElementById('monthYearSelector');
    const themeToggle = document.getElementById('themeToggle');
    const selectAllCheckbox = document.getElementById('selectAllSales');
    const totalSelectedDisplay = document.getElementById('somaVendas');
    const paginationContainer = document.getElementById('pagination');
    let sales = [];
    let currentPage = 1;
    const salesPerPage = 100;
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
            renderSalesTable();
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

    // Função para buscar as vendas
    function fetchSales() {
        fetch('/api/sales')
            .then(response => response.json())
            .then(data => {
                sales = data.sort((a, b) => new Date(b.data) - new Date(a.data));
                organizeSalesByMonthYear();
                if (!selectedMonthYear) {
                    setCurrentMonthYear(); // Apenas define o mês atual se nenhum mês estiver selecionado
                }
                renderSalesTable();
            })
            .catch(error => console.error('Erro ao buscar vendas:', error));
    }

    // Função para organizar as vendas por mês e ano
    function organizeSalesByMonthYear() {
        const salesByMonthYear = {};
        sales.forEach(sale => {
            const [year, month] = sale.data.split('-');
            const key = `${year}-${month}`;
            if (!salesByMonthYear[key]) {
                salesByMonthYear[key] = [];
            }
            salesByMonthYear[key].push(sale);
        });
        sales = salesByMonthYear;
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

    // Função para filtrar as vendas do mês e ano selecionados
    function getSelectedMonthYearSales() {
        if (!selectedMonthYear) {
            return Object.values(sales).flat();
        }
        return sales[selectedMonthYear] || [];
    }

    // Função para paginar as vendas
    function paginateSales(salesArray, page) {
        const startIndex = (page - 1) * salesPerPage;
        return salesArray.slice(startIndex, startIndex + salesPerPage);
    }

    // Função para renderizar a tabela de vendas
    function renderSalesTable() {
        const filteredSales = filterSales(getSelectedMonthYearSales());
        const paginatedSales = paginateSales(filteredSales, currentPage);
        const tableBody = document.getElementById('salesTable');
        tableBody.innerHTML = '';

        paginatedSales.forEach(sale => {
            const row = document.createElement('tr');
            
            // Calcular o valor total com desconto dos produtos
            const valorTotalProdutos = sale.produtos.reduce((total, produto) => {
                let subtotal = produto.quantidade * produto.valor;
                if (produto.descontoTipo === 'percentage') {
                    subtotal *= (1 - produto.desconto / 100);
                } else {
                    subtotal -= produto.desconto;
                }
                return total + subtotal;
            }, 0);

            // Aplicar o desconto total da venda
            let valorFinal = valorTotalProdutos;
            if (sale.descontoTotal) {
                if (sale.descontoTotal.tipo === 'percentage') {
                    valorFinal *= (1 - sale.descontoTotal.valor / 100);
                } else {
                    valorFinal -= sale.descontoTotal.valor;
                }
            }

            // Determinar a situação e o estilo com base no status de pagamento
            let situacao = sale.situacao;
            let situacaoStyle = '';

            if (sale.paga) {
                situacao = 'Recebido'; // Alterado de 'Concretizada' para 'Paga'
                situacaoStyle = 'background-color: #28a745; color: white; border-radius: 3px; padding: 2px 4px; font-size: 0.85em; font-weight: bold; display: inline-block;';
            } else if (situacao === 'Concretizada') {
                situacaoStyle = 'background-color: #dc3545; color: white; border-radius: 3px; padding: 2px 4px; font-size: 0.85em; font-weight: bold; display: inline-block;';
            }

            row.innerHTML = `
                <td class="text-center align-middle">
                    <input type="checkbox" class="sale-checkbox" data-valor="${valorFinal.toFixed(2)}">
                </td>
                <td>${sale.numero}</td>
                <td>${sale.cliente}</td>
                <td class="text-center align-middle"><span style="${situacaoStyle}">${situacao}</span></td>
                <td>${formatDate(sale.data)}</td>
                <td>${formatarMoeda(valorFinal)}</td>
                <td>
                    <a href="view-sale.html?id=${sale.id}" target="_blank" class="btn btn-sm btn-outline-info" title="Imprimir">
                        <i class="fas fa-print"></i> 
                    </a>
                    <button class="btn btn-sm btn-outline-success mark-paid" data-id="${sale.id}" title="${sale.paga ? 'Desmarcar como Paga' : 'Marcar como Paga'}">
                        <i class="fas ${sale.paga ? 'fa-money-bill-wave' : 'fa-hand-holding-usd'}"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-primary edit-sale" data-id="${sale.id}" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger delete-sale" data-id="${sale.id}" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });

        addEventListeners();
        setupCheckboxes();
        renderPagination(filteredSales.length);
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

    // Função para calcular o valor total da venda
    function calculateTotalValue(produtos) {
        return produtos.reduce((total, produto) => total + (produto.valor * produto.quantidade), 0);
    }

    // Função para filtrar as vendas
    function filterSales(salesArray) {
        const searchTerm = searchInput.value.toLowerCase();
        const searchNumber = searchByNumberInput.value.toLowerCase();
        return salesArray.filter(sale => 
            sale.cliente.toLowerCase().includes(searchTerm) &&
            sale.numero.toLowerCase().includes(searchNumber)
        );
    }

    // Função para renderizar a paginação
    function renderPagination(totalSales) {
        const totalPages = Math.ceil(totalSales / salesPerPage);
        paginationContainer.innerHTML = '';

        for (let i = 1; i <= totalPages; i++) {
            const pageButton = document.createElement('button');
            pageButton.textContent = i;
            pageButton.classList.add('btn', 'btn-sm', 'mx-1');
            pageButton.classList.toggle('btn-primary', i === currentPage);
            pageButton.classList.toggle('btn-outline-primary', i !== currentPage);
            pageButton.addEventListener('click', () => {
                currentPage = i;
                renderSalesTable();
            });
            paginationContainer.appendChild(pageButton);
        }
    }

    // Event listeners
    searchInput.addEventListener('input', () => {
        currentPage = 1;
        renderSalesTable();
    });

    searchByNumberInput.addEventListener('input', () => {
        currentPage = 1;
        renderSalesTable();
    });

    // Função para adicionar event listeners aos botões de editar e excluir
    function addEventListeners() {
        // Remova o event listener para o botão de visualização, pois agora é um link <a>
        document.querySelectorAll('.edit-sale').forEach(button => {
            button.addEventListener('click', () => {
                const saleId = button.getAttribute('data-id');
                window.location.href = `sales.html?id=${saleId}`;
            });
        });

        document.querySelectorAll('.delete-sale').forEach(button => {
            button.addEventListener('click', () => {
                const saleId = button.getAttribute('data-id');
                if (confirm('Tem certeza que deseja excluir esta venda?')) {
                    deleteSale(saleId);
                }
            });
        });

        document.querySelectorAll('.mark-paid').forEach(button => {
            button.addEventListener('click', () => {
                const saleId = button.getAttribute('data-id');
                markSaleAsPaid(saleId);
            });
        });

        // Remova o event listener para o botão de visualização
    }

    // Função para excluir uma venda
    function deleteSale(id) {
        fetch(`/api/sales/${id}`, { method: 'DELETE' })
            .then(response => {
                if (response.ok) {
                    fetchSales(); // Atualiza a lista de vendas após a exclusão
                } else {
                    throw new Error('Erro ao excluir a venda');
                }
            })
            .catch(error => console.error('Erro:', error));
    }

    // Função para configurar os checkboxes
    function setupCheckboxes() {
        const saleCheckboxes = document.querySelectorAll('.sale-checkbox');

        selectAllCheckbox.addEventListener('change', function() {
            saleCheckboxes.forEach(checkbox => {
                checkbox.checked = this.checked;
            });
            updateTotalSelected();
        });

        saleCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', updateTotalSelected);
        });
    }

    // Função para atualizar a soma das vendas selecionadas
    function updateTotalSelected() {
        const saleCheckboxes = document.querySelectorAll('.sale-checkbox:checked');
        const totalSelected = Array.from(saleCheckboxes)
            .reduce((total, checkbox) => total + parseFloat(checkbox.dataset.valor), 0);
        totalSelectedDisplay.textContent = formatarMoeda(totalSelected);
    }

    // Função para marcar a venda como paga
    function markSaleAsPaid(saleId) {
        const button = document.querySelector(`button.mark-paid[data-id="${saleId}"]`);
        const icon = button.querySelector('i');
        const isPaga = icon.classList.contains('fa-money-bill-wave');

        fetch(`/api/sales/${saleId}/pay`, {
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
                fetchSales(); // Recarrega a lista de vendas sem redefinir o mês
            } else {
                throw new Error(data.message);
            }
        })
        .catch(error => {
            console.error('Erro ao atualizar o estado da venda:', error);
            alert('Ocorreu um erro ao atualizar o estado da venda. Por favor, tente novamente.');
        });
    }

    // Inicializar a página
    fetchSales();
});