document.addEventListener('DOMContentLoaded', () => {
    const salesTableBody = document.querySelector('#salesTable');
    const searchInput = document.getElementById('search');
    const searchByNumberInput = document.getElementById('searchByNumber');
    const themeToggle = document.getElementById('themeToggle');
    const selectAllCheckbox = document.getElementById('selectAllSales');
    const totalSelectedDisplay = document.getElementById('somaVendas');
    let sales = [];

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

    // Função para buscar as vendas
    function fetchSales() {
        fetch('/api/sales')
            .then(response => response.json())
            .then(data => {
                sales = data;
                renderSalesTable(sales);
            })
            .catch(error => console.error('Erro ao buscar vendas:', error));
    }

    // Função para renderizar a tabela de vendas
    function renderSalesTable(sales) {
        const tableBody = document.getElementById('salesTable');
        tableBody.innerHTML = '';

        sales.forEach(sale => {
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

            row.innerHTML = `
                <td class="text-center align-middle">
                    <input type="checkbox" class="sale-checkbox" data-valor="${valorFinal.toFixed(2)}">
                </td>
                <td>${sale.numero}</td>
                <td>${sale.cliente}</td>
                <td>${sale.situacao}</td>
                <td>${formatDate(sale.data)}</td>
                <td>${sale.prazoEntrega ? formatDate(sale.prazoEntrega) : 'N/A'}</td>
                <td>${formatarMoeda(valorFinal)}</td>
                <td>
                    <button class="btn btn-sm btn-primary edit-sale" data-id="${sale.id}">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn btn-sm btn-danger delete-sale" data-id="${sale.id}">
                        <i class="fas fa-trash"></i> Excluir
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });

        addEventListeners();
        setupCheckboxes();
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
    function filterSales() {
        const searchTerm = searchInput.value.toLowerCase();
        const searchNumber = searchByNumberInput.value.toLowerCase();
        const filteredSales = sales.filter(sale => 
            sale.cliente.toLowerCase().includes(searchTerm) &&
            sale.numero.toLowerCase().includes(searchNumber)
        );
        renderSalesTable(filteredSales);
    }

    // Event listeners para os campos de busca
    searchInput.addEventListener('input', filterSales);
    searchByNumberInput.addEventListener('input', filterSales);

    // Função para adicionar event listeners aos botões de editar e excluir
    function addEventListeners() {
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

    // Inicializar a página
    fetchSales();
});