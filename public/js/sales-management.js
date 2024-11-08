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

    // Declare estas variáveis no escopo global do seu script
    let countUpTotal, countUpAVencer, countUpPagas;

    // Aplicar tema escuro se estiver armazenado no localStorage
    const body = document.body;
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme) {
        body.classList.add(currentTheme);
    }

    const toggleAllValuesButton = document.getElementById('toggleAllValues');
    let allValuesVisible = false;

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
            fetchSales();  // Recarrega as vendas e recalcula as somas para o novo mês selecionado
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
                    setCurrentMonthYear();
                }
                renderSalesTable();
                // Atualize as tabelas de parcelas que estão abertas
                document.querySelectorAll('.parcelas-details').forEach(parcelasDetails => {
                    const saleId = parcelasDetails.closest('tr').id.replace('parcelas-', '');
                    updateParcelasTable(saleId);
                });
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
        const [year, month] = selectedMonthYear.split('-');
        return Object.values(sales).flat().filter(sale => {
            const saleDate = new Date(sale.data);
            saleDate.setDate(saleDate.getDate() + 1); // Adiciona um dia à data da venda
            return saleDate.getFullYear() === parseInt(year) && saleDate.getMonth() === parseInt(month) - 1;
        });
    }

    // Função para paginar as vendas
    function paginateSales(salesArray, page) {
        const startIndex = (page - 1) * salesPerPage;
        return salesArray.slice(startIndex, startIndex + salesPerPage);
    }

    // Função para calcular as somas das vendas
    function calcularSomasVendas(vendas, mesSelecionado, anoSelecionado) {
        const somas = { total: 0, pendentes: 0, pagas: 0 };

        Object.values(sales).flat().forEach(venda => {
            const dataVenda = new Date(venda.data);
            dataVenda.setDate(dataVenda.getDate() + 1); // Adiciona um dia à data da venda
            const mesVenda = dataVenda.getMonth();
            const anoVenda = dataVenda.getFullYear();

            // Adiciona ao total de vendas se a venda ocorreu no mês e ano selecionados
            if (mesVenda === mesSelecionado && anoVenda === anoSelecionado) {
                somas.total += parseFloat(venda.valorFinal);

                // Verifica se é uma venda à vista
                if (venda.tipoPagamento === "À Vista") {
                    if (venda.paga) {
                        somas.pagas += parseFloat(venda.valorFinal);
                    } else {
                        somas.pendentes += parseFloat(venda.valorFinal);
                    }
                }
            }

            // Processa as parcelas, se houver
            if (venda.parcelas && Array.isArray(venda.parcelas)) {
                venda.parcelas.forEach(parcela => {
                    const dataParcela = new Date(parcela.data.replace(/\//g, '-'));
                    dataParcela.setDate(dataParcela.getDate() + 1); // Adiciona um dia à data da parcela
                    if (dataParcela.getFullYear() === anoSelecionado && dataParcela.getMonth() === mesSelecionado) {
                        const valorParcela = parseFloat(parcela.valor);
                        if (parcela.paga) {
                            somas.pagas += valorParcela;
                        } else {
                            somas.pendentes += valorParcela;
                        }
                    }
                });
            }
        });

        return somas;
    }

    // Função para atualizar a interface com as somas
    function atualizarSomasVendas(somas) {
        const options = {
            decimalPlaces: 2,
            duration: 1,
            useEasing: true,
            useGrouping: true,
            separator: '.',
            decimal: ',',
            prefix: 'R$ '
        };

        function createOrUpdateCountUp(elementId, endVal) {
            const element = document.getElementById(elementId);
            element.setAttribute('data-value', `R$ ${formatarMoeda(endVal)}`);
            
            if (!window[elementId + 'CountUp']) {
                window[elementId + 'CountUp'] = new CountUp(elementId, 0, endVal, 2, 1, options);
                // Não inicie o CountUp automaticamente
            } else {
                window[elementId + 'CountUp'].update(endVal);
            }

            // Sempre exiba o valor censurado inicialmente
            element.textContent = 'R$ ********';
        }

        createOrUpdateCountUp('somaTotalVendas', somas.total);
        createOrUpdateCountUp('somaVendasPendentes', somas.pendentes);
        createOrUpdateCountUp('somaVendasPagas', somas.pagas);
    }

    // Adicione esta função para revelar os valores quando necessário
    function revelarValoresSoma() {
        if (allValuesVisible) {
            ['somaTotalVendas', 'somaVendasPendentes', 'somaVendasPagas'].forEach(id => {
                const countUp = window[id + 'CountUp'];
                if (countUp) {
                    countUp.start();
                }
            });
        }
    }

    // Modifique a função toggleAllValues para usar a nova função revelarValoresSoma
    function toggleAllValues(event) {
        event.stopPropagation();
        allValuesVisible = !allValuesVisible;
        const summaryValues = document.querySelectorAll('.summary-card .value');

        summaryValues.forEach(el => {
            if (allValuesVisible) {
                revelarValoresSoma();
            } else {
                el.textContent = 'R$ ********';
            }
        });

        // Atualizar o ícone do botão
        if (toggleAllValuesButton) {
            const icon = toggleAllValuesButton.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-eye', !allValuesVisible);
                icon.classList.toggle('fa-eye-slash', allValuesVisible);
            }
        }
    }

    // Função para renderizar a tabela de vendas
    function renderSalesTable() {
        const filteredSales = filterSales(getSelectedMonthYearSales());
        const paginatedSales = paginateSales(filteredSales, currentPage);
        const tableBody = document.getElementById('salesTable');
        tableBody.innerHTML = '';

        paginatedSales.forEach(sale => {
            const row = document.createElement('tr');
            row.setAttribute('data-id', sale.id);
            
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
                situacao = 'Recebido';
                situacaoStyle = 'background-color: #28a745; color: white; border-radius: 3px; padding: 2px 4px; font-size: 0.85em; font-weight: bold; display: inline-block;';
            } else if (situacao === 'Concretizada') {
                situacaoStyle = 'background-color: #0991cf; color: white; border-radius: 3px; padding: 2px 4px; font-size: 0.85em; font-weight: bold; display: inline-block;';
            } else if (situacao === 'Pendente') {
                situacaoStyle = 'background-color: #ffa500; color: white; border-radius: 3px; padding: 2px 4px; font-size: 0.85em; font-weight: bold; display: inline-block;';
            }

            row.innerHTML = `
                <td class="text-center align-middle">
                    <input type="checkbox" class="sale-checkbox" data-valor="${valorFinal.toFixed(2)}">
                </td>
                <td>${sale.numero}</td>
                <td>${sale.cliente}</td>
                <td class="text-center align-middle"><span style="${situacaoStyle}">${situacao}</span></td>
                <td>${formatDate(sale.data)}</td>
                <td class="valor-total">
                    R$ ${formatarMoeda(valorFinal).replace('R$ ', '')}
                </td>
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
                    <button class="btn btn-sm btn-outline-secondary view-parcelas" data-id="${sale.id}" title="Ver Parcelas">
                        <i class="fas fa-list"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-info copy-json" data-sale='${JSON.stringify(sale)}' title="Copiar JSON">
                        <i class="fas fa-code"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger delete-sale" data-id="${sale.id}" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;

            tableBody.appendChild(row);

            // Adicionar linha oculta para detalhes das parcelas
            const parcelasRow = document.createElement('tr');
            parcelasRow.id = `parcelas-${sale.id}`;
            parcelasRow.style.display = 'none';
            parcelasRow.innerHTML = `
                <td colspan="7">
                    <div class="parcelas-details">
                        <h5>Detalhes das Parcelas</h5>
                        <table class="table table-sm">
                            <thead>
                                <tr>
                                    <th>Nº Parcela</th>
                                    <th>Data Vencimento</th>
                                    <th>Valor</th>
                                    <th>Ação</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${generateParcelasDetails(sale)}
                            </tbody>
                        </table>
                    </div>
                </td>
            `;
            tableBody.appendChild(parcelasRow);
        });

        // Calcular e atualizar as somas
        const [selectedYear, selectedMonth] = selectedMonthYear.split('-');
        const somas = calcularSomasVendas(sales, parseInt(selectedMonth) - 1, parseInt(selectedYear));
        
        setTimeout(() => {
            atualizarSomasVendas(somas);
        }, 100);

        // Após renderizar a tabela
        addEventListeners();
        setupCheckboxes();
        renderPagination(filteredSales.length);
    }

    // Função para formatar a data considerando o fuso horário do Brasil (GMT-3)
    function formatDate(dateString) {
        if (!dateString) return 'Data inválida';

        // Substitui '/' por '-' para garantir compatibilidade com diferentes navegadores
        const formattedDateString = dateString.replace(/\//g, '-');

        // Cria a data usando o formato ISO para garantir que seja interpretada corretamente
        let date = new Date(formattedDateString + 'T00:00:00');

        // Adiciona um dia à data
        date.setDate(date.getDate() + 1);

        // Verifica se a data é válida
        if (isNaN(date.getTime())) {
            return 'Data inválida';
        }

        // Ajusta para o fuso horário do Brasil (GMT-3)
        date.setHours(date.getHours() - 3);

        const options = { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'America/Sao_Paulo' };
        return date.toLocaleDateString('pt-BR', options);
    }

    // Função para formatar o valor monetário
    function formatarMoeda(valor) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'decimal',
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

    function addEventListeners() {
        const salesTable = document.getElementById('salesTable');
        if (salesTable) {
            salesTable.removeEventListener('click', handleSalesTableClick);
            salesTable.addEventListener('click', handleSalesTableClick);
        }

        // Adicionar listeners para os botões de copiar JSON
        document.querySelectorAll('.copy-json').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const saleData = button.getAttribute('data-sale');
                
                try {
                    const sale = JSON.parse(saleData);
                    // Formatar o JSON para ficar mais legível
                    const formattedJson = JSON.stringify(sale, null, 2);
                    
                    // Copiar para a área de transferência
                    navigator.clipboard.writeText(formattedJson).then(() => {
                        showNotification('JSON copiado com sucesso!', 'success');
                    }).catch(err => {
                        console.error('Erro ao copiar:', err);
                        showNotification('Erro ao copiar JSON', 'error');
                    });
                } catch (error) {
                    console.error('Erro ao processar JSON:', error);
                    showNotification('Erro ao processar JSON', 'error');
                }
            });
        });

        if (toggleAllValuesButton) {
            toggleAllValuesButton.removeEventListener('click', toggleAllValues);
            toggleAllValuesButton.addEventListener('click', toggleAllValues);
        }
    }

    // Variável global para armazenar o ID da venda a ser excluída
    let saleToDeleteId = null;

    function handleSalesTableClick(e) {
        const target = e.target.closest('button');
        if (!target) return;

        const saleId = target.getAttribute('data-id');

        if (target.classList.contains('view-parcelas')) {
            toggleParcelas(saleId);
        } else if (target.classList.contains('edit-sale')) {
            window.location.href = `sales.html?id=${saleId}`;
        } else if (target.classList.contains('delete-sale')) {
            // Encontrar a linha da venda
            const saleRow = target.closest('tr');
            const saleNumber = saleRow.querySelector('td:nth-child(2)').textContent;
            const clientName = saleRow.querySelector('td:nth-child(3)').textContent;
            
            // Atualizar o modal com as informações da venda
            document.getElementById('deleteModalSaleNumber').textContent = saleNumber;
            document.getElementById('deleteModalClientName').textContent = clientName;
            
            // Armazena o ID da venda a ser excluída
            saleToDeleteId = saleId;
            // Mostra o modal de confirmação
            $('#deleteConfirmModal').modal('show');
        } else if (target.classList.contains('mark-paid')) {
            markSaleAsPaid(saleId);
        }
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
            showNotification('Ocorreu um erro ao atualizar o estado da venda. Por favor, tente novamente.', 'error');
        });
    }

    // Modifique a função toggleParcelas para garantir que ela funcione corretamente
    function toggleParcelas(saleId) {
        const parcelasRow = document.getElementById(`parcelas-${saleId}`);
        if (parcelasRow) {
            parcelasRow.style.display = parcelasRow.style.display === 'none' ? 'table-row' : 'none';
        }
    }

    // Adicione esta nova função para carregar os detalhes das parcelas
    function loadParcelasDetails(saleId) {
        fetch(`/api/sales/${saleId}`)
            .then(response => response.json())
            .then(sale => {
                const parcelasRow = document.getElementById(`parcelas-${saleId}`);
                if (parcelasRow) {
                    parcelasRow.innerHTML = `
                        <td colspan="7">
                            <div class="parcelas-details">
                                <h5>Detalhes das Parcelas</h5>
                                <table class="table table-sm">
                                    <thead>
                                        <tr>
                                            <th>Nº Parcela</th>
                                            <th>Data Vencimento</th>
                                            <th>Valor</th>
                                            <th>Ação</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${generateParcelasDetails(sale)}
                                    </tbody>
                                </table>
                            </div>
                        </td>
                    `;
                }
            })
            .catch(error => console.error('Erro ao carregar detalhes das parcelas:', error));
    }

    // Adicione esta função para marcar uma parcela como paga
    function markParcelAsPaid(saleId, parcelIndex) {
        fetch('/api/mark-parcel-as-paid', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ saleId: saleId, parcelIndex: parseInt(parcelIndex) })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Falha ao marcar a parcela como paga');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                updateParcelasTable(saleId);
                if (data.saleStatus === 'Pago') {
                    // Atualiza o status da venda na interface
                    const saleRow = document.querySelector(`tr[data-id="${saleId}"]`);
                    if (saleRow) {
                        const statusCell = saleRow.querySelector('td:nth-child(4)');
                        if (statusCell) {
                            statusCell.innerHTML = '<span style="background-color: #28a745; color: white; border-radius: 3px; padding: 2px 4px; font-size: 0.85em; font-weight: bold; display: inline-block;">Recebido</span>';
                        }
                    }
                }
                fetchSales(); // Recarrega todas as vendas para atualizar os totais
            } else {
                throw new Error(data.message || 'Erro ao marcar a parcela como paga');
            }
        })
        .catch(error => {
            console.error('Erro:', error);
            showNotification('Erro ao marcar a parcela como paga: ' + error.message, 'error');
        });
    }

    // Adicione esta nova função para atualizar apenas a tabela de parcelas
    function updateParcelasTable(saleId) {
        fetch(`/api/sales/${saleId}`)
            .then(response => response.json())
            .then(sale => {
                const parcelasTableBody = document.querySelector(`#parcelas-${saleId} .parcelas-details table tbody`);
                if (parcelasTableBody) {
                    parcelasTableBody.innerHTML = generateParcelasDetails(sale);
                    // Reaplique os event listeners para os novos botões
                    addEventListeners();
                }
            })
            .catch(error => console.error('Erro ao atualizar tabela de parcelas:', error));
    }

    // Adicione esta função no escopo global
    window.markParcelAsPaid = function(saleId, parcelIndex) {
        console.log('Marking parcel as paid:', saleId, parcelIndex);
        fetch('/api/mark-parcel-as-paid', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ saleId: saleId, parcelIndex: parseInt(parcelIndex) })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Falha ao marcar a parcela como paga');
            }
            return response.json();
        })
        .then(data => {
            console.log('Response from server:', data);
            if (data.success) {
                updateParcelasTable(saleId);
                if (data.saleStatus === 'Pago') {
                    // Atualiza o status da venda na interface
                    const saleRow = document.querySelector(`tr[data-id="${saleId}"]`);
                    if (saleRow) {
                        const statusCell = saleRow.querySelector('td:nth-child(4)');
                        if (statusCell) {
                            statusCell.innerHTML = '<span style="background-color: #28a745; color: white; border-radius: 3px; padding: 2px 4px; font-size: 0.85em; font-weight: bold; display: inline-block;">Recebido</span>';
                        }
                    }
                }
                fetchSales(); // Recarrega todas as vendas para atualizar os totais
            } else {
                throw new Error(data.message || 'Erro ao marcar a parcela como paga');
            }
        })
        .catch(error => {
            console.error('Erro:', error);
            showNotification('Erro ao marcar a parcela como paga: ' + error.message, 'error');
        });
    };

    function generateParcelasDetails(sale) {
        // Trata vendas à vista como uma única parcela
        if (sale.tipoPagamento === "À Vista") {
            return `
                <tr>
                    <td>1</td>
                    <td>${formatDate(sale.data)}</td>
                    <td>${formatarMoeda(sale.valorFinal)}</td>
                    <td>
                        ${sale.paga ? 
                            '<span class="badge badge-success">Paga</span>' : 
                            `<button class="btn btn-success btn-mark-parcel-paid" onclick="markParcelAsPaid('${sale.id}', 0)">Marcar como Paga</button>`
                        }
                    </td>
                </tr>
            `;
        } else if (!sale.parcelas || !Array.isArray(sale.parcelas)) {
            return '<tr><td colspan="4">Não há informações de parcelas disponíveis</td></tr>';
        }
        
        return sale.parcelas.map((parcela, index) => `
            <tr>
                <td>${parcela.numero}</td>
                <td>${formatDate(parcela.data)}</td>
                <td>${formatarMoeda(parcela.valor)}</td>
                <td>
                    ${parcela.paga ? 
                        '<span class="badge badge-success">Paga</span>' : 
                        `<button class="btn btn-success btn-mark-parcel-paid" onclick="markParcelAsPaid('${sale.id}', ${index})">Marcar como Paga</button>`
                    }
                </td>
            </tr>
        `).join('');
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

    // Inicializar a página
    fetchSales();

    // Adicionar listener para o botão de importar JSON
    document.getElementById('importJsonButton').addEventListener('click', () => {
        $('#importJsonModal').modal('show');
    });

    // Adicionar listener para o botão de confirmar importação
    document.getElementById('importJsonConfirm').addEventListener('click', importSaleFromJson);

    // Adicionar listener para o botão de confirmar exclusão no modal
    document.getElementById('confirmDelete').addEventListener('click', () => {
        if (saleToDeleteId) {
            deleteSale(saleToDeleteId);
            $('#deleteConfirmModal').modal('hide');
            saleToDeleteId = null; // Limpa o ID após a exclusão
        }
    });
});

async function importSaleFromJson() {
    try {
        const jsonInput = document.getElementById('jsonInput').value;
        
        // Validar se o input está vazio
        if (!jsonInput.trim()) {
            showNotification('Por favor, insira um JSON válido', 'warning');
            return;
        }

        // Tentar fazer o parse do JSON
        let saleData;
        try {
            saleData = JSON.parse(jsonInput);
        } catch (e) {
            showNotification('JSON inválido. Por favor, verifique o formato', 'error');
            return;
        }

        // Buscar o próximo número de venda disponível
        const nextNumberResponse = await fetch('/api/sales/next-number');
        const { nextNumber } = await nextNumberResponse.json();

        // Preparar os dados da venda
        const newSale = {
            ...saleData,
            id: undefined, // Remover ID para que um novo seja gerado
            numero: nextNumber,
            data: new Date().toISOString().split('T')[0], // Data atual
            situacao: 'Pendente',
            paga: false
        };

        // Enviar a nova venda para o servidor
        const response = await fetch('/api/sales', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(newSale)
        });

        if (!response.ok) {
            throw new Error('Erro ao importar venda');
        }

        // Fechar o modal
        $('#importJsonModal').modal('hide');

        // Limpar o textarea
        document.getElementById('jsonInput').value = '';

        // Mostrar notificação de sucesso
        showNotification('Venda importada com sucesso!', 'success');
        
        // Recarregar a lista de vendas
        fetchSales();

    } catch (error) {
        console.error('Erro ao importar venda:', error);
        showNotification('Erro ao importar venda. Por favor, verifique os dados e tente novamente.', 'error');
    }
}