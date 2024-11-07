document.addEventListener('DOMContentLoaded', () => {
    const numeroVendaInput = document.getElementById('numero');
    let numeroVendaAtual = numeroVendaInput.value;

    // Função para buscar o próximo número de venda
    async function fetchNextSaleNumber() {
        if (!numeroVendaAtual) {
            try {
                const response = await fetch('/api/next-sale-number');
                const data = await response.json();
                numeroVendaAtual = data.nextNumber;
                numeroVendaInput.value = numeroVendaAtual;
            } catch (error) {
                console.error('Erro ao buscar o próximo número de venda:', error);
            }
        }
    }

    // Chame fetchNextSaleNumber() apenas uma vez no carregamento da página
    fetchNextSaleNumber();

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
            removeDarkTheme();
        } else {
            applyDarkTheme();
        }
    });

    // Função para aplicar o tema escuro
    function applyDarkTheme() {
        body.classList.add('dark-theme');
        localStorage.setItem('theme', 'dark-theme');
        
        // Aplicar tema escuro às parcelas geradas
        const parcelasGeradas = document.getElementById('parcelasGeradas');
        const listaParcelas = document.getElementById('listaParcelas');
        const btnGerarParcelas = document.getElementById('btnGerarParcelas');
        const parceladoFields = document.getElementById('parceladoFields');
        
        if (parcelasGeradas) parcelasGeradas.classList.add('dark-theme');
        if (listaParcelas) listaParcelas.classList.add('dark-theme');
        if (btnGerarParcelas) btnGerarParcelas.classList.add('dark-theme');
        if (parceladoFields) parceladoFields.classList.add('dark-theme');
    }

    // Função para remover o tema escuro
    function removeDarkTheme() {
        body.classList.remove('dark-theme');
        localStorage.setItem('theme', '');
        
        // Remover tema escuro das parcelas geradas
        const parcelasGeradas = document.getElementById('parcelasGeradas');
        const listaParcelas = document.getElementById('listaParcelas');
        const btnGerarParcelas = document.getElementById('btnGerarParcelas');
        const parceladoFields = document.getElementById('parceladoFields');
        
        if (parcelasGeradas) parcelasGeradas.classList.remove('dark-theme');
        if (listaParcelas) listaParcelas.classList.remove('dark-theme');
        if (btnGerarParcelas) btnGerarParcelas.classList.remove('dark-theme');
        if (parceladoFields) parceladoFields.classList.remove('dark-theme');
    }

    // Aplicar o tema inicial com base na preferência salva
    if (currentTheme === 'dark-theme') {
        applyDarkTheme();
    }

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

    // Adicione uma variável global para armazenar a linha de produto atual
    let currentProductRow = null;

    function addProductRow() {
        const productRowHTML = `
            <div class="form-row mb-3 align-items-end">
                <div class="form-group produto-col">
                    <label for="produto">Produto</label>
                    <div class="input-group">
                        <input type="text" class="form-control produto-autocomplete" required>
                        <div class="input-group-append">
                            <button type="button" class="btn btn-primary add-new-product-btn">
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                    </div>
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

        // Adicionar evento de clique para o botão de adicionar novo produto
        $productRow.find('.add-new-product-btn').on('click', () => {
            currentProductRow = $productRow[0];
            if (addProductModal) {
                addProductModal.show();
            }
        });
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

    function formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    }

    function parseCurrency(value) {
        return parseFloat(value.replace(/[^\d,-]/g, '').replace(',', '.'));
    }

    function updateTotalValue() {
        const rows = document.querySelectorAll('#productsContainer .form-row');
        let total = 0;

        rows.forEach(row => {
            const subtotalStr = row.querySelector('input[readonly]').value;
            total += parseCurrency(subtotalStr);
        });

        const valorTotalVendaInput = document.getElementById('valorTotalVenda');
        valorTotalVendaInput.value = formatCurrency(total);
        valorTotalVendaInput.setAttribute('data-valor-original', total.toFixed(2));

        calcularValorTotal();
    }

    function calcularValorTotal() {
        const valorTotalVendaInput = document.getElementById('valorTotalVenda');
        let valorTotalProdutos = parseFloat(valorTotalVendaInput.getAttribute('data-valor-original')) || 0;

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

        valorFinal = Math.max(0, valorFinal);
        document.getElementById('valorTotalVenda').value = formatCurrency(valorFinal);
    }

    // Atualize a função calculateSubtotal para usar a nova formatação
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

        subtotal = Math.max(0, subtotal);
        descontoInput.val(descontoValor);
        row.find('input[readonly]').val(formatCurrency(subtotal));
        updateTotalValue();
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
        const valorTotalVenda = parseCurrency(document.getElementById('valorTotalVenda').value);

        const saleProducts = [];
        productsContainer.querySelectorAll('.form-row').forEach(row => {
            const produto = row.querySelector('.produto-autocomplete').value;
            const quantidade = Math.max(1, parseInt(row.querySelector('input[type="number"]').value) || 1);
            const valor = Math.max(0, parseFloat(row.querySelectorAll('input[type="number"]')[1].value) || 0);
            const desconto = Math.max(0, parseInt(row.querySelector('.desconto-input').value) || 0);
            const descontoTipo = row.querySelector('.desconto-tipo').value;
            const subtotal = parseCurrency(row.querySelector('input[readonly]').value);

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
            valorTotal: valorTotalVenda,
            descontoTotal: {
                valor: parseFloat(document.getElementById('descontoTotal').value) || 0,
                tipo: document.getElementById('descontoTotalTipo').value
            },
            valorFinal: parseCurrency(document.getElementById('valorTotalVenda').value)
        };

        // Adicionar o campo 'paga' ao objeto newSale
        newSale.paga = false;

        // Adicionar novos campos ao objeto newSale
        if (document.getElementById('parceladoFields').style.display === 'block') {
            newSale.tipoPagamento = 'Parcelado';
            newSale.intervaloParcelas = parseInt(document.getElementById('intervaloParcelas').value) || 0;
            newSale.quantidadeParcelas = parseInt(document.getElementById('quantidadeParcelas').value) || 0;
            newSale.dataPrimeiraParcela = document.getElementById('dataPrimeiraParcela').value || '';
            newSale.parcelas = window.vendaAtual ? window.vendaAtual.parcelas : [];
        } else {
            newSale.tipoPagamento = 'À Vista';
        }

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

                // Carregar os novos campos se a forma de pagamento for "Parcelado"
                if (sale.tipoPagamento === 'Parcelado') {
                    updatePaymentSelection('Parcelado');
                    document.getElementById('intervaloParcelas').value = sale.intervaloParcelas || '';
                    document.getElementById('quantidadeParcelas').value = sale.quantidadeParcelas || '';
                    document.getElementById('dataPrimeiraParcela').value = sale.dataPrimeiraParcela || '';
                    parceladoFields.style.display = 'block';

                    // Exibir as parcelas geradas
                    if (sale.parcelas && sale.parcelas.length > 0) {
                        listaParcelas.innerHTML = '';
                        sale.parcelas.forEach(parcela => {
                            const li = document.createElement('li');
                            li.className = 'list-group-item';
                            li.textContent = `Parcela ${parcela.numero}: ${formatCurrency(parseFloat(parcela.valor))} - Vencimento: ${formatDate(parcela.data)}`;
                            listaParcelas.appendChild(li);
                        });
                        parcelasGeradas.style.display = 'block';
                    }
                } else {
                    updatePaymentSelection('À Vista');
                }

                // Atualizar o valor total e final
                updateTotalValue();

                document.querySelector('button[type="submit"]').textContent = 'Atualizar Venda';
            })
            .catch(error => console.error('Erro ao buscar detalhes da venda:', error));
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
                <div class="input-group">
                    <input type="text" class="form-control produto-autocomplete" value="${produto.produto}" required>
                    <div class="input-group-append">
                        <button type="button" class="btn btn-primary add-new-product-btn">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </div>
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
                <input type="text" class="form-control" readonly value="${formatCurrency(produto.subtotal)}">
            </div>
            <div class="form-group col-auto">
                <button type="button" class="btn btn-danger remove-product">X</button>
            </div>
        `;
        document.getElementById('productsContainer').appendChild(productRow);
        
        setupProductAutocomplete(productRow.querySelector('.produto-autocomplete'));
        setupRowEventListeners($(productRow));
        
        // Adicionar evento de clique para o botão de adicionar novo produto
        $(productRow).find('.add-new-product-btn').on('click', () => {
            currentProductRow = productRow;
            if (addProductModal) {
                addProductModal.show();
            }
        });
        
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

    const btnAVista = document.getElementById('btnAVista');
    const btnParcelado = document.getElementById('btnParcelado');
    const formaPagamentoRow = document.getElementById('formaPagamentoRow');
    const parceladoFields = document.getElementById('parceladoFields');

    function updatePaymentSelection(type) {
        if (type === 'À Vista') {
            btnAVista.classList.remove('btn-outline-primary');
            btnAVista.classList.add('btn-primary');
            btnParcelado.classList.add('btn-outline-primary');
            btnParcelado.classList.remove('btn-primary');
            formaPagamentoRow.style.display = 'block';
            parceladoFields.style.display = 'none';
        } else if (type === 'Parcelado') {
            btnParcelado.classList.remove('btn-outline-primary');
            btnParcelado.classList.add('btn-primary');
            btnAVista.classList.add('btn-outline-primary');
            btnAVista.classList.remove('btn-primary');
            formaPagamentoRow.style.display = 'block';
            parceladoFields.style.display = 'block';
        }
    }

    btnAVista.addEventListener('click', () => updatePaymentSelection('À Vista'));
    btnParcelado.addEventListener('click', () => updatePaymentSelection('Parcelado'));

    // Se houver um ID de venda na URL, atualize a seleção de forma de pagamento
    if (saleId) {
        fetch(`/api/sales/${saleId}`)
            .then(response => response.json())
            .then(sale => {
                if (sale.tipoPagamento === 'Parcelado') {
                    updatePaymentSelection('Parcelado');
                    document.getElementById('intervaloParcelas').value = sale.intervaloParcelas || '';
                    document.getElementById('quantidadeParcelas').value = sale.quantidadeParcelas || '';
                    document.getElementById('dataPrimeiraParcela').value = sale.dataPrimeiraParcela || '';
                    if (sale.parcelas) {
                        window.vendaAtual = { parcelas: sale.parcelas };
                        renderParcelas(sale.parcelas);
                    }
                } else {
                    updatePaymentSelection('À Vista');
                }
            })
            .catch(error => console.error('Erro ao buscar detalhes da venda:', error));
    } else {
        // Se for uma nova venda, selecionar 'À Vista' por padrão
        updatePaymentSelection('À Vista');
    }

    const btnGerarParcelas = document.getElementById('btnGerarParcelas');
    const parcelasGeradas = document.getElementById('parcelasGeradas');
    const listaParcelas = document.getElementById('listaParcelas');

    btnGerarParcelas.addEventListener('click', gerarParcelas);

    function gerarParcelas() {
        const intervaloParcelas = parseInt(document.getElementById('intervaloParcelas').value);
        const quantidadeParcelas = parseInt(document.getElementById('quantidadeParcelas').value);
        const dataPrimeiraParcela = document.getElementById('dataPrimeiraParcela').value;
        const valorTotal = parseCurrency(document.getElementById('valorTotalVenda').value);

        if (!intervaloParcelas || !quantidadeParcelas || !dataPrimeiraParcela || isNaN(valorTotal)) {
            alert('Por favor, preencha todos os campos de parcelamento corretamente.');
            return;
        }

        const valorParcela = valorTotal / quantidadeParcelas;
        const parcelas = [];

        let dataAtual = new Date(dataPrimeiraParcela);
        for (let i = 0; i < quantidadeParcelas; i++) {
            parcelas.push({
                numero: i + 1,
                data: formatDateWithSlashes(dataAtual.toISOString().split('T')[0]), // Formatar a data com barras
                valor: valorParcela
            });
            dataAtual.setDate(dataAtual.getDate() + intervaloParcelas);
        }

        // Exibir as parcelas geradas
        renderParcelas(parcelas);

        // Armazenar as parcelas no objeto de venda
        if (!window.vendaAtual) {
            window.vendaAtual = {};
        }
        window.vendaAtual.parcelas = parcelas;
    }

    // Função para renderizar as parcelas
    function renderParcelas(parcelas) {
        listaParcelas.innerHTML = '';
        parcelas.forEach(parcela => {
            const li = document.createElement('li');
            li.className = 'list-group-item';
            li.textContent = `Parcela ${parcela.numero}: ${formatCurrency(parcela.valor)} - Vencimento: ${formatDate(parcela.data)}`;
            listaParcelas.appendChild(li);
        });
        parcelasGeradas.style.display = 'block';
    }

    // Função auxiliar para formatar a data com barras
    function formatDateWithSlashes(dateString) {
        const [year, month, day] = dateString.split('-');
        return `${year}/${month}/${day}`;
    }

    // Função auxiliar para formatar a data
    function formatDate(dateString) {
        if (dateString.includes('-')) {
            // Se a data estiver no formato YYYY-MM-DD
            const [year, month, day] = dateString.split('-');
            return `${day}/${month}/${year}`;
        } else {
            // Se a data estiver no formato YYYY/MM/DD
            const [year, month, day] = dateString.split('/');
            return `${day}/${month}/${year}`;
        }
    }

    // Adicionar evento de mudança ao select de tipo de cliente
    const tipoClienteSelect = document.getElementById('tipoCliente');
    tipoClienteSelect.addEventListener('change', toggleDocumentFields);

    // Adicionar evento de submit ao formulário de cliente
    const addClientForm = document.getElementById('addClientForm');
    addClientForm.addEventListener('submit', handleAddClient);

    // Adicionar evento de clique ao botão de buscar CNPJ
    const buscarCNPJButton = document.getElementById('buscarCNPJ');
    buscarCNPJButton.addEventListener('click', buscarCNPJ);

    function toggleDocumentFields() {
        const tipoCliente = document.getElementById('tipoCliente').value;
        const cpfField = document.getElementById('cpfField');
        const cnpjField = document.getElementById('cnpjField');

        if (tipoCliente === 'Pessoa Física') {
            cpfField.style.display = 'block';
            cnpjField.style.display = 'none';
        } else if (tipoCliente === 'Pessoa Jurídica') {
            cpfField.style.display = 'none';
            cnpjField.style.display = 'block';
        } else {
            cpfField.style.display = 'none';
            cnpjField.style.display = 'none';
        }
    }

    async function handleAddClient(event) {
        event.preventDefault();

        const newClient = {
            tipoCliente: document.getElementById('tipoCliente').value,
            nome: document.getElementById('nome').value,
            email: document.getElementById('email').value,
            telefone: document.getElementById('telefone').value,
            cpf: document.getElementById('cpf').value,
            cnpj: document.getElementById('cnpj').value,
            endereco: {
                cep: document.getElementById('cep').value,
                logradouro: document.getElementById('logradouro').value,
                numero: document.getElementById('numeroEndereco').value, // Corrigido aqui
                bairro: document.getElementById('bairro').value,
                cidade: document.getElementById('cidade').value,
                uf: document.getElementById('uf').value
            },
            dataCadastro: new Date().toLocaleString()
        };

        try {
            const response = await fetch('/api/clients', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newClient)
            });

            if (response.ok) {
                const savedClient = await response.json();
                $('#successToast').toast('show');
                
                $('#addClientModal').modal('hide');
                
                // Atualizar o campo de cliente com o novo cliente
                const clienteInput = document.getElementById('cliente');
                clienteInput.value = savedClient.nome;
                
                // Adicionar o novo cliente à lista de clientes para o autocomplete
                clients.push(savedClient);
                
                // Atualizar o autocomplete
                $(clienteInput).autocomplete("option", "source", clients.map(client => client.nome));
                
                // Disparar o evento de mudança para atualizar quaisquer listeners
                $(clienteInput).trigger('change');
            } else {
                throw new Error('Erro ao cadastrar cliente');
            }
        } catch (error) {
            console.error('Erro ao cadastrar cliente:', error);
            showErrorToast('Erro ao cadastrar cliente. Por favor, tente novamente.');
        }
    }

    // Adicione esta função para mostrar um Toast de sucesso
    function showSuccessToast(message) {
        const successToast = `
        <div class="toast" role="alert" aria-live="assertive" aria-atomic="true" data-delay="5000">
            <div class="toast-header bg-success text-white">
                <strong class="mr-auto">Sucesso</strong>
                <button type="button" class="ml-2 mb-1 close" data-dismiss="toast" aria-label="Fechar">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        </div>
        `;

        showToast(successToast);
    }

    // Modifique a função showErrorToast para usar a função showToast
    function showErrorToast(message) {
        const errorToast = `
        <div class="toast" role="alert" aria-live="assertive" aria-atomic="true" data-delay="5000">
            <div class="toast-header bg-danger text-white">
                <strong class="mr-auto">Erro</strong>
                <button type="button" class="ml-2 mb-1 close" data-dismiss="toast" aria-label="Fechar">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        </div>
        `;

        showToast(errorToast);
    }

    // Adicione esta função para mostrar o Toast
    function showToast(toastHTML) {
        // Verifique se o container de toast existe, se não, crie-o
        let toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container position-fixed bottom-0 right-0 p-3';
            document.body.appendChild(toastContainer);
        }

        // Adicione o Toast ao container
        toastContainer.insertAdjacentHTML('beforeend', toastHTML);

        // Mostre o Toast
        $('.toast:last-child').toast('show');

        // Remova o Toast do DOM após ser ocultado
        $('.toast:last-child').on('hidden.bs.toast', function () {
            $(this).remove();
        });
    }

    async function buscarCNPJ() {
        const cnpj = document.getElementById('cnpj').value.replace(/\D/g, '');
        if (cnpj.length !== 14) {
            alert('CNPJ inválido. Por favor, insira um CNPJ válido com 14 dígitos.');
            return;
        }

        try {
            const response = await fetch(`/api/cnpj/${cnpj}`);
            const data = await response.json();

            if (data.status === 'ERROR') {
                throw new Error(data.message);
            }

            // Preenchendo os campos do formulário com os dados da API
            const fields = {
                'nome': data.nome,
                'email': data.email,
                'telefone': data.telefone,
                'logradouro': data.logradouro,
                'numeroEndereco': data.numero,
                'bairro': data.bairro,
                'cep': data.cep,
                'cidade': data.municipio,
                'estado': data.uf
            };

            for (const [id, value] of Object.entries(fields)) {
                const element = document.getElementById(id);
                if (element) {
                    element.value = value || '';
                }
            }

            // Se 'municipio' e 'uf' não estiverem disponíveis, tente usar 'efr'
            if (!data.municipio && !data.uf && data.efr) {
                const parts = data.efr.split('/');
                if (parts.length === 2) {
                    const cidadeElement = document.getElementById('cidade');
                    const estadoElement = document.getElementById('estado');
                    if (cidadeElement) cidadeElement.value = parts[0].trim();
                    if (estadoElement) estadoElement.value = parts[1].trim();
                }
            }
        } catch (error) {
            console.error('Erro ao buscar CNPJ:', error);
            alert('Ocorreu um erro ao buscar os dados do CNPJ. Por favor, tente novamente ou preencha manualmente.');
        }
    }

    // Certifique-se de que o botão de busca CNPJ existe e adicione o evento de clique
    document.addEventListener('DOMContentLoaded', () => {
        const buscarCNPJButton = document.getElementById('buscarCNPJ');
        if (buscarCNPJButton) {
            buscarCNPJButton.addEventListener('click', buscarCNPJ);
        }
    });

    // Adicione estas novas funções
    function formatCPF(cpf) {
        cpf = cpf.replace(/\D/g, '');
        if (cpf.length > 11) cpf = cpf.slice(0, 11);
        return cpf.replace(/^(\d{0,3})(\d{0,3})(\d{0,3})(\d{0,2}).*/, function(match, p1, p2, p3, p4) {
            if (p2) p1 += '.';
            if (p3) p2 += '.';
            if (p4) p3 += '-';
            return [p1, p2, p3, p4].filter(Boolean).join('');
        });
    }

    function formatCNPJ(cnpj) {
        cnpj = cnpj.replace(/\D/g, '');
        if (cnpj.length > 14) cnpj = cnpj.slice(0, 14);
        return cnpj.replace(/^(\d{0,2})(\d{0,3})(\d{0,3})(\d{0,4})(\d{0,2}).*/, function(match, p1, p2, p3, p4, p5) {
            if (p2) p1 += '.';
            if (p3) p2 += '.';
            if (p4) p3 += '/';
            if (p5) p4 += '-';
            return [p1, p2, p3, p4, p5].filter(Boolean).join('');
        });
    }

    function formatDocument(input) {
        const tipoCliente = document.getElementById('tipoCliente').value;
        const cursorPos = input.selectionStart;
        const oldLength = input.value.length;
        
        if (tipoCliente === 'Pessoa Física') {
            input.value = formatCPF(input.value);
        } else if (tipoCliente === 'Pessoa Jurídica') {
            input.value = formatCNPJ(input.value);
        }
        
        const newLength = input.value.length;
        input.setSelectionRange(cursorPos + (newLength - oldLength), cursorPos + (newLength - oldLength));
    }

    // Adicione estes event listeners
    const cpfInput = document.getElementById('cpf');
    const cnpjInput = document.getElementById('cnpj');

    cpfInput.addEventListener('input', function() {
        formatDocument(this);
    });

    cnpjInput.addEventListener('input', function() {
        formatDocument(this);
    });

    // Adicionar evento de submit ao formulário de novo produto
    const addProductForm = document.getElementById('addProductForm');
    addProductForm.addEventListener('submit', handleAddProduct);

    async function handleAddProduct(event) {
        event.preventDefault();
        
        const newProduct = {
            codigo: document.getElementById('codigo').value,
            nome: document.getElementById('nome').value,
            valor: parseFloat(document.getElementById('valor').value),
            valorEspecial: parseFloat(document.getElementById('valorEspecial').value) || null,
            estoque: parseInt(document.getElementById('estoque').value)
        };

        try {
            const response = await fetch('/api/products', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newProduct)
            });

            if (response.ok) {
                const savedProduct = await response.json();
                // Adicionar o novo produto à lista de produtos para o autocomplete
                products.push(savedProduct);
                
                // Atualizar o autocomplete
                updateProductAutocomplete();
                
                // Fechar o modal
                $('#addProductModal').modal('hide');
                
                // Limpar o formulário
                addProductForm.reset();
                
                // Mostrar mensagem de sucesso
                showSuccessToast('Produto adicionado com sucesso!');
            } else {
                throw new Error('Erro ao cadastrar produto');
            }
        } catch (error) {
            console.error('Erro ao cadastrar produto:', error);
            showErrorToast('Erro ao cadastrar produto. Por favor, tente novamente.');
        }
    }

    function updateProductAutocomplete() {
        // Atualizar o autocomplete com a nova lista de produtos
        // (Isso depende de como você implementou o autocomplete de produtos)
    }

    // Função para formatar o CEP
    function formatCEP(input) {
        let value = input.value.replace(/\D/g, '');
        if (value.length > 5) {
            value = value.slice(0, 5) + '-' + value.slice(5, 8);
        }
        input.value = value;
    }

    // Função para buscar o CEP
    function buscarCEP(cep) {
        fetch(`/api/cep/${cep}`)
            .then(response => response.json())
            .then(data => {
                if (data.erro) {
                    alert('CEP não encontrado');
                } else {
                    const setValueIfExists = (id, value) => {
                        const element = document.getElementById(id);
                        if (element) {
                            element.value = value || '';
                        }
                    };

                    setValueIfExists('logradouro', data.logradouro);
                    setValueIfExists('bairro', data.bairro);
                    setValueIfExists('cidade', data.localidade);
                    setValueIfExists('uf', data.uf);
                    setValueIfExists('numeroEndereco', '');

                    const numeroEnderecoElement = document.getElementById('numeroEndereco');
                    if (numeroEnderecoElement) {
                        numeroEnderecoElement.focus();
                    }
                }
            })
            .catch(error => {
                console.error('Erro ao buscar CEP:', error);
                alert('Erro ao buscar CEP. Por favor, tente novamente.');
            });
    }

    // Adicione estes event listeners
    const cepInput = document.getElementById('cep');
    if (cepInput) {
        cepInput.addEventListener('input', () => formatCEP(cepInput));
        cepInput.addEventListener('blur', () => {
            const cep = cepInput.value.replace(/\D/g, '');
            if (cep.length === 8) {
                buscarCEP(cep);
            }
        });
    }

    function initializeAutocomplete(inputId, items, displayProperty) {
        $(`#${inputId}`).autocomplete({
            source: function(request, response) {
                var term = request.term.toLowerCase();
                var matches = items.filter(item => 
                    item[displayProperty].toLowerCase().includes(term)
                );
                response(matches.map(item => ({ label: item[displayProperty], value: item[displayProperty] })));
            },
            minLength: 1,
            select: function(event, ui) {
                event.preventDefault();
                $(this).val(ui.item.value);
            },
            focus: function(event, ui) {
                event.preventDefault();
                $(this).val(ui.item.value);
            },
            create: function() {
                $(this).data("ui-autocomplete")._renderItem = function(ul, item) {
                    return $("<li>")
                        .append("<div>" + item.label + "</div>")
                        .appendTo(ul);
                };
            }
        });

        // Ajusta a largura do menu de sugestões
        $(`#${inputId}`).on("autocompleteopen", function(event, ui) {
            var autocomplete = $(this).autocomplete("instance");
            if (autocomplete) {
                var menu = autocomplete.menu.element;
                menu.outerWidth(Math.min(
                    $(this).outerWidth(),
                    menu.width("").outerWidth() + 1
                ));
            }
        });
    }

    // Inicialize o autocomplete para clientes e produtos
    initializeAutocomplete('cliente', clients, 'nome');
    initializeAutocomplete('produto', products, 'nome');

    const cidadeInput = document.getElementById('cidade');
    const ufInput = document.getElementById('uf');

    if (cidadeInput) {
        $(cidadeInput).autocomplete({
            source: function(request, response) {
                $.ajax({
                    url: "/api/cidades",
                    dataType: "json",
                    data: {
                        termo: request.term
                    },
                    success: function(data) {
                        response(data.map(item => ({
                            label: `${item.nome} - ${item.uf}`,
                            value: item.nome,
                            uf: item.uf
                        })));
                    },
                    error: function(xhr, status, error) {
                        console.error("Erro na requisição:", error);
                    }
                });
            },
            minLength: 3,
            select: function(event, ui) {
                cidadeInput.value = ui.item.value;
                if (ufInput) {
                    ufInput.value = ui.item.uf;
                }
                return false;
            },
            open: function() {
                $(this).autocomplete('widget').css('z-index', 2000);
                
                // Aplicar o tema escuro se necessário
                if (document.body.classList.contains('dark-theme')) {
                    $(this).autocomplete('widget').addClass('dark-theme');
                } else {
                    $(this).autocomplete('widget').removeClass('dark-theme');
                }

                // Posicionar o menu de autocompletar
                const inputOffset = $(this).offset();
                const inputHeight = $(this).outerHeight();
                $(this).autocomplete('widget').css({
                    'top': inputOffset.top + inputHeight + 'px',
                    'left': inputOffset.left + 'px',
                    'width': $(this).outerWidth() + 'px'
                });
            }
        }).autocomplete("instance")._renderItem = function(ul, item) {
            return $("<li>")
                .append(`<div>${item.label}</div>`)
                .appendTo(ul);
        };
    }

    // Atualizar o tema do autocomplete quando o tema geral for alterado
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {

            // Atualizar o tema do autocomplete
            if (cidadeInput) {
                const autocompleteWidget = $(cidadeInput).autocomplete('widget');
                if (document.body.classList.contains('dark-theme')) {
                    autocompleteWidget.addClass('dark-theme');
                } else {
                    autocompleteWidget.removeClass('dark-theme');
                }
            }
        });
    }

    const addNewProductBtn = document.getElementById('addNewProductBtn');
    const saveNewProductBtn = document.getElementById('saveNewProduct');
    let addProductModal;

    // Mova a inicialização do modal para dentro do evento DOMContentLoaded
    addProductModal = new bootstrap.Modal(document.getElementById('addProductModal'));

    if (addNewProductBtn) {
        addNewProductBtn.addEventListener('click', () => {
            addProductModal.show();
        });
    }

    if (saveNewProductBtn) {
        saveNewProductBtn.addEventListener('click', () => saveNewProduct(currentProductRow));
    }

    // Adicione o evento para resetar currentProductRow quando o modal for fechado
    const addProductModalElement = document.getElementById('addProductModal');
    if (addProductModalElement) {
        addProductModalElement.addEventListener('hidden.bs.modal', () => {
            currentProductRow = null;
        });
    }

    // Modifique a função saveNewProduct para aceitar um parâmetro que indica a linha de produto
    function saveNewProduct(productRow) {
        const newProductName = document.getElementById('newProductName').value;
        const newProductValue = document.getElementById('newProductValue').value;
        const newProductValueSpecial = document.getElementById('newProductValueSpecial').value;
        const newProductCode = document.getElementById('newProductCode').value;
        const newProductStock = document.getElementById('newProductStock').value;

        const newProduct = {
            id: Date.now().toString(),
            codigo: newProductCode,
            nome: newProductName,
            valor: parseFloat(newProductValue),
            valorEspecial: newProductValueSpecial ? parseFloat(newProductValueSpecial) : parseFloat(newProductValue),
            estoque: parseInt(newProductStock),
            dataCadastro: new Date().toLocaleString('pt-BR')
        };

        fetch('/api/products', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(newProduct)
        })
        .then(response => response.json())
        .then(savedProduct => {
            products.push(savedProduct);
            updateProductAutocomplete();
            addProductModal.hide();
            document.getElementById('addProductForm').reset();
            showSuccessToast('Produto adicionado com sucesso!');

            // Preencher o campo de produto na linha correta
            if (productRow) {
                const productInput = productRow.querySelector('.produto-autocomplete');
                if (productInput) {
                    productInput.value = savedProduct.nome;
                    const event = new Event('change');
                    productInput.dispatchEvent(event);

                    // Atualizar o preço e outros campos relacionados ao produto
                    updateUnitPrice($(productRow), savedProduct);
                }
            }
        })
        .catch(error => {
            console.error('Erro ao salvar o produto:', error);
            showErrorToast('Ocorreu um erro ao salvar o produto. Por favor, tente novamente.');
        });
    }

    function updateProductAutocomplete() {
        const productInputs = document.querySelectorAll('.produto-autocomplete');
        productInputs.forEach(input => {
            $(input).autocomplete("option", "source", products.map(product => product.nome));
        });
    }

    const generateCodeBtn = document.getElementById('generateCode');

    generateCodeBtn.addEventListener('click', generateProductCode);

    function generateProductCode() {
        const code = Math.floor(1000000000 + Math.random() * 9000000000);
        document.getElementById('newProductCode').value = code;
    }
});