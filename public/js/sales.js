document.addEventListener('DOMContentLoaded', () => {
    const addSaleForm = document.getElementById('addSaleForm');
    const productsContainer = document.getElementById('productsContainer');
    const addProductButton = document.getElementById('addProduct');
    const themeToggle = document.getElementById('themeToggle');
    const clienteInput = document.getElementById('cliente');
    const dataInput = document.getElementById('data');
    const totalValueInput = document.getElementById('totalValue');
    const discountInput = document.getElementById('discount');
    const discountTypeSelect = document.getElementById('discountType');
    const finalTotalInput = document.getElementById('finalTotal');
    let products = [];
    let clients = [];

    // Theme toggle functionality
    const body = document.body;
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

    // Fetch products and clients
    fetch('/api/products')
        .then(response => response.json())
        .then(data => {
            products = data;
            setupInitialProductRow();
        });

    fetch('/api/clients')
        .then(response => response.json())
        .then(data => {
            clients = data;
            setupClientAutocomplete();
        });

    function setupClientAutocomplete() {
        $(clienteInput).autocomplete({
            source: clients.map(client => client.nome),
            minLength: 0,
            select: function(event, ui) {
                event.preventDefault();
                $(this).val(ui.item.value);
            }
        }).focus(function() {
            $(this).autocomplete("search", "");
        });
    }

    function setupProductAutocomplete(input) {
        $(input).autocomplete({
            source: products.map(product => product.nome),
            minLength: 0,
            select: function(event, ui) {
                event.preventDefault();
                $(this).val(ui.item.value);
                const selectedProduct = products.find(p => p.nome === ui.item.value);
                if (selectedProduct) {
                    const row = $(this).closest('.form-row');
                    row.find('input[type="number"]').eq(0).prop('disabled', false); // Habilitar quantidade
                    row.find('select.tipo-preco').prop('disabled', false); // Habilitar tipo de preço
                    updateUnitPrice(row, selectedProduct);
                }
            }
        }).focus(function() {
            $(this).autocomplete("search", "");
        });
    }

    function updateUnitPrice(row, product) {
        const priceType = row.find('select.tipo-preco').val();
        const price = priceType === 'simples' ? product.valor : product.valorEspecial;
        row.find('input[type="number"]').eq(1).val(price.toFixed(2)); // Preencher valor com duas casas decimais
        calculateSubtotal(row); // Passar objeto jQuery
    }

    function setupInitialProductRow() {
        const initialRow = productsContainer.querySelector('.form-row');
        if (initialRow) {
            setupProductAutocomplete(initialRow.querySelector('.produto-autocomplete'));
            setupRowEventListeners($(initialRow)); // Converter para objeto jQuery
        }
    }

    // Add product row
    addProductButton.addEventListener('click', addProductRow);

    function addProductRow() {
        const productRowHTML = `
            <div class="form-row mb-3 align-items-end">
                <div class="form-group produto-col">
                    <label for="produto">Produto</label>
                    <input type="text" class="form-control produto-autocomplete" required>
                </div>
                <div class="form-group quantidade-col">
                    <label for="quantidade">Quantidade</label>
                    <input type="number" class="form-control quantidade-input" value="1" min="1" required>
                </div>
                <div class="form-group valor-col">
                    <label for="valor">Valor</label>
                    <div class="input-group">
                        <div class="input-group-prepend">
                            <span class="input-group-text">R$</span>
                        </div>
                        <input type="number" class="form-control" step="0.01" min="0" required>
                        <div class="input-group-append">
                            <select class="form-control tipo-preco" required>
                                <option value="simples">Simples</option>
                                <option value="especial">Especial</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div class="form-group desconto-col">
                    <label for="desconto">Desconto</label>
                    <div class="input-group">
                        <input type="number" class="form-control desconto-input" min="0" value="0">
                        <div class="input-group-append">
                            <select class="form-control desconto-tipo desconto-dropdown">
                                <option value="percentage">%</option>
                                <option value="value">R$</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div class="form-group subtotal-col">
                    <label for="subtotal">Subtotal</label>
                    <input type="text" class="form-control" readonly>
                </div>
                <div class="form-group col-auto">
                    <button type="button" class="btn btn-danger remove-product">X</button>
                </div>
            </div>
        `;
        
        const $productRow = $(productRowHTML);
        $('#productsContainer').append($productRow);
        
        setupProductAutocomplete($productRow.find('.produto-autocomplete')[0]);
        setupRowEventListeners($productRow);
        updateTotalValue();
    }

    function setupRowEventListeners(row) {
        // Add event listener to remove button
        row.find('.remove-product').on('click', () => {
            row.remove();
            updateTotalValue();
        });

        // Add event listeners to calculate subtotal
        const quantidadeInput = row.find('input[type="number"]').eq(0);
        const valorInput = row.find('input[type="number"]').eq(1);
        const descontoInput = row.find('.desconto-input');
        const descontoTipo = row.find('.desconto-tipo');

        const validateNonNegative = (input) => {
            input.val(Math.max(0, parseInt(input.val()) || 0));
        };

        const recalculateSubtotal = () => {
            calculateSubtotal(row); // Passar objeto jQuery
            updateTotalValue();
        };

        quantidadeInput.on('input', () => {
            validateNonNegative(quantidadeInput);
            recalculateSubtotal();
        });

        valorInput.on('input', () => {
            validateNonNegative(valorInput);
            recalculateSubtotal();
        });

        descontoInput.on('input', () => {
            validateNonNegative(descontoInput);
            recalculateSubtotal();
        });

        descontoTipo.on('change', recalculateSubtotal);

        const tipoPrecoSelect = row.find('select.tipo-preco');
        tipoPrecoSelect.on('change', function() {
            const productName = row.find('.produto-autocomplete').val();
            const selectedProduct = products.find(p => p.nome === productName);
            if (selectedProduct) {
                updateUnitPrice(row, selectedProduct);
            }
        });
    }

    function calculateSubtotal(row) {
        const quantidade = parseInt(row.find('input[type="number"]').eq(0).val()) || 0;
        const valor = parseFloat(row.find('input[type="number"]').eq(1).val()) || 0;
        const descontoInput = row.find('.desconto-input');
        const descontoTipo = row.find('.desconto-tipo').val();
        let descontoValor = parseFloat(descontoInput.val()) || 0;

        let subtotal = quantidade * valor;

        if (descontoTipo === 'percentage') {
            subtotal *= (1 - descontoValor / 100);
        } else {
            subtotal -= descontoValor;
        }

        subtotal = Math.max(0, subtotal); // Garante que o subtotal não seja negativo
        descontoInput.val(descontoValor);
        row.find('input[readonly]').val(`R$ ${subtotal.toFixed(2)}`);
        updateTotalValue();
    }

    function formatCurrency(value) {
        return `R$ ${value.toFixed(2).replace('.', ',')}`;
    }

    function calcularValorTotal() {
        const valorTotalVendaInput = document.getElementById('valorTotalVenda');
        let valorTotalProdutos = parseFloat(valorTotalVendaInput.getAttribute('data-valor-original').replace(',', '.')) || 0;

        const descontoTotalInput = document.getElementById('descontoTotal');
        const descontoTotal = parseFloat(descontoTotalInput.value) || 0;
        const descontoTotalTipo = document.getElementById('descontoTotalTipo').value;
        
        let valorFinal = valorTotalProdutos;
        if (descontoTotal > 0) {
            if (descontoTotalTipo === 'percentage') {
                valorFinal *= (1 - descontoTotal / 100);
            } else {
                valorFinal = Math.max(0, valorFinal - descontoTotal);
            }
        }

        valorFinal = Math.max(0, valorFinal); // Garante que o valor final não seja negativo
        document.getElementById('valorTotalVenda').value = formatCurrency(valorFinal);
    }

    function updateTotalValue() {
        const rows = document.querySelectorAll('#productsContainer .form-row');
        let total = 0;

        rows.forEach(row => {
            const subtotalStr = row.querySelector('input[readonly]').value.replace('R$ ', '').replace(',', '.');
            total += parseFloat(subtotalStr);
        });

        const valorTotalVendaInput = document.getElementById('valorTotalVenda');
        valorTotalVendaInput.value = formatCurrency(total);
        valorTotalVendaInput.setAttribute('data-valor-original', total.toFixed(2));

        calcularValorTotal(); // Chama a função para calcular o valor final com desconto
    }

    // Adicione estes event listeners
    document.getElementById('descontoTotal').addEventListener('input', calcularValorTotal);
    document.getElementById('descontoTotalTipo').addEventListener('change', calcularValorTotal);

    // Remova o event listener 'change' anterior e substitua por este
    document.getElementById('descontoTotal').addEventListener('input', function() {
        if (this.value === '' || parseFloat(this.value) === 0) {
            this.value = '';
        }
        calcularValorTotal();
    });

    // Handle form submission
    addSaleForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const numero = document.getElementById('numero').value;
        const cliente = document.getElementById('cliente').value;
        const situacao = document.getElementById('situacao').value;
        const data = document.getElementById('data').value;
        const prazoEntrega = document.getElementById('prazoEntrega').value;
        const formaPagamento = formaPagamentoSelect.value;
        const valorTotalVenda = document.getElementById('valorTotalVenda').value;

        const saleProducts = [];
        productsContainer.querySelectorAll('.form-row').forEach(row => {
            const produto = row.querySelector('.produto-autocomplete').value;
            const quantidade = Math.max(1, parseInt(row.querySelector('input[type="number"]').value) || 1);
            const valor = Math.max(0, parseFloat(row.querySelectorAll('input[type="number"]')[1].value) || 0);
            const desconto = Math.max(0, parseInt(row.querySelector('.desconto-input').value) || 0);
            const descontoTipo = row.querySelector('.desconto-tipo').value;
            const subtotal = Math.max(0, parseFloat(row.querySelector('input[readonly]').value.replace('R$ ', '').replace(',', '.')) || 0);

            saleProducts.push({ produto, quantidade, valor, desconto, descontoTipo, subtotal });
        });

        const newSale = {
            numero,
            cliente,
            situacao,
            data,
            prazoEntrega,
            formaPagamento,
            produtos: saleProducts,
            valorTotal: valorTotalVenda.replace('R$ ', '').replace(',', '.'),
            descontoTotal: {
                valor: parseFloat(document.getElementById('descontoTotal').value) || 0,
                tipo: document.getElementById('descontoTotalTipo').value
            },
            valorFinal: parseFloat(document.getElementById('valorTotalVenda').value.replace('R$ ', '').replace(',', '.'))
        };

        // Se estiver editando, mantenha o ID original
        if (saleId) {
            newSale.id = saleId;
        }

        const url = saleId ? `/api/sales/${saleId}` : '/api/sales';
        const method = saleId ? 'PUT' : 'POST';

        fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newSale)
        })
        .then(response => response.json())
        .then(sale => {
            // Remover o alerta e redirecionar para a página de gerenciamento de vendas
            window.location.href = 'sales-management.html';
        })
        .catch(error => {
            console.error('Erro ao salvar a venda:', error);
            alert('Ocorreu um erro ao salvar a venda. Por favor, tente novamente.');
        });
    });

    // Função para buscar o próximo número de venda
    async function fetchNextSaleNumber() {
        try {
            const response = await fetch('/api/next-sale-number');
            const data = await response.json();
            document.getElementById('numero').value = data.nextNumber;
        } catch (error) {
            console.error('Erro ao buscar o próximo número de venda:', error);
        }
    }

    // Verificar se há um ID de venda na URL
    const urlParams = new URLSearchParams(window.location.search);
    const saleId = urlParams.get('id');

    if (saleId) {
        // Se houver um ID, buscar os detalhes da venda e preencher o formulário
        fetch(`/api/sales/${saleId}`)
            .then(response => response.json())
            .then(sale => {
                document.getElementById('numero').value = sale.numero; // Usar o número existente
                document.getElementById('cliente').value = sale.cliente;
                document.getElementById('situacao').value = sale.situacao;
                document.getElementById('data').value = sale.data;
                document.getElementById('prazoEntrega').value = sale.prazoEntrega || '';
                
                // Carregar a forma de pagamento
                if (sale.formaPagamento) {
                    $(formaPagamentoSelect).val(sale.formaPagamento).trigger('change');
                }

                // Limpar produtos existentes
                const productsContainer = document.getElementById('productsContainer');
                productsContainer.innerHTML = '';
                
                // Adicionar produtos da venda
                sale.produtos.forEach(produto => {
                    adicionarProduto(produto);
                });

                // Carregar o desconto total
                if (sale.descontoTotal) {
                    document.getElementById('descontoTotal').value = sale.descontoTotal.valor;
                    document.getElementById('descontoTotalTipo').value = sale.descontoTotal.tipo;
                }

                // Atualizar o valor total e final
                updateTotalValue();

                document.querySelector('button[type="submit"]').textContent = 'Atualizar Venda';
            })
            .catch(error => console.error('Erro ao buscar detalhes da venda:', error));
    } else {
        // Se for uma nova venda, buscar o próximo número
        fetchNextSaleNumber();
    }

    // Função para formatar a data para o formato aceito pelo input type="date"
    function formatDateForInput(dateString) {
        return dateString ? new Date(dateString).toISOString().split('T')[0] : '';
    }

    // Função para adicionar um produto ao formulário
    function adicionarProduto(produto) {
        const productRow = document.createElement('div');
        productRow.classList.add('form-row', 'mb-3', 'align-items-end');
        productRow.innerHTML = `
            <div class="form-group produto-col">
                <label for="produto">Produto</label>
                <input type="text" class="form-control produto-autocomplete" value="${produto.produto}" required>
            </div>
            <div class="form-group quantidade-col">
                <label for="quantidade">Quantidade</label>
                <input type="number" class="form-control quantidade-input" value="${produto.quantidade}" min="1" required>
            </div>
            <div class="form-group valor-col">
                <label for="valor">Valor</label>
                <div class="input-group">
                    <div class="input-group-prepend">
                        <span class="input-group-text">R$</span>
                    </div>
                    <input type="number" class="form-control" step="0.01" min="0" value="${produto.valor.toFixed(2)}" required>
                    <div class="input-group-append">
                        <select class="form-control tipo-preco" required>
                            <option value="simples" ${produto.tipoPreco === 'simples' ? 'selected' : ''}>Simples</option>
                            <option value="especial" ${produto.tipoPreco === 'especial' ? 'selected' : ''}>Especial</option>
                        </select>
                    </div>
                </div>
            </div>
            <div class="form-group desconto-col">
                <label for="desconto">Desconto</label>
                <div class="input-group">
                    <input type="number" class="form-control desconto-input" min="0" value="${Math.round(produto.desconto || 0)}">
                    <div class="input-group-append">
                        <select class="form-control desconto-tipo desconto-dropdown">
                            <option value="percentage" ${produto.descontoTipo === 'percentage' ? 'selected' : ''}>%</option>
                            <option value="value" ${produto.descontoTipo === 'value' ? 'selected' : ''}>R$</option>
                        </select>
                    </div>
                </div>
            </div>
            <div class="form-group subtotal-col">
                <label for="subtotal">Subtotal</label>
                <input type="text" class="form-control" readonly value="R$ ${produto.subtotal.toFixed(2)}">
            </div>
            <div class="form-group col-auto">
                <button type="button" class="btn btn-danger remove-product">X</button>
            </div>
        `;
        document.getElementById('productsContainer').appendChild(productRow);
        
        // Reaplique os event listeners e a funcionalidade de autocomplete
        setupProductAutocomplete(productRow.querySelector('.produto-autocomplete'));
        setupRowEventListeners($(productRow)); // Converter para objeto jQuery
        updateTotalValue();
    }

    // Mova estas funções para dentro do evento DOMContentLoaded
    function setCurrentDate() {
        const today = new Date();
        const day = String(today.getDate()).padStart(2, '0');
        const month = String(today.getMonth() + 1).padStart(2, '0'); // Janeiro é 0!
        const year = today.getFullYear();
        dataInput.value = `${year}-${month}-${day}`;
    }

    // Definir a data atual no campo de data ao carregar a página
    setCurrentDate();

    const formaPagamentoSelect = document.getElementById('formaPagamento');

    // Inicializar o select2 para o campo de forma de pagamento
    $(formaPagamentoSelect).select2({
        placeholder: 'Digite para buscar',
        allowClear: true,
        theme: 'bootstrap4'
    });

    // Chame updateTotalValue() para inicializar o valor total
    updateTotalValue();

    // Adicione uma linha de produto inicial
    addProductRow();

    // Inicialize o autocomplete para todos os campos de produto existentes
    initializeAutocomplete();

    function initializeAutocomplete() {
        $('.produto-autocomplete').each(function() {
            setupProductAutocomplete(this);
        });
    }
});