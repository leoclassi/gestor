document.addEventListener('DOMContentLoaded', () => {
    const numeroOrcamentoInput = document.getElementById('numero');
    let numeroOrcamentoAtual = numeroOrcamentoInput.value;

    async function fetchNextBudgetNumber() {
        if (!numeroOrcamentoAtual) {
            try {
                const response = await fetch('/api/next-budget-number');
                const data = await response.json();
                numeroOrcamentoAtual = data.nextNumber;
                numeroOrcamentoInput.value = numeroOrcamentoAtual;
            } catch (error) {
                console.error('Erro ao buscar o próximo número de orçamento:', error);
            }
        }
    }

    fetchNextBudgetNumber();

    const addBudgetForm = document.getElementById('addBudgetForm');
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

    function applyDarkTheme() {
        body.classList.add('dark-theme');
        localStorage.setItem('theme', 'dark-theme');
        
        const parcelasGeradas = document.getElementById('parcelasGeradas');
        const listaParcelas = document.getElementById('listaParcelas');
        const btnGerarParcelas = document.getElementById('btnGerarParcelas');
        const parceladoFields = document.getElementById('parceladoFields');
        
        if (parcelasGeradas) parcelasGeradas.classList.add('dark-theme');
        if (listaParcelas) listaParcelas.classList.add('dark-theme');
        if (btnGerarParcelas) btnGerarParcelas.classList.add('dark-theme');
        if (parceladoFields) parceladoFields.classList.add('dark-theme');
    }

    function removeDarkTheme() {
        body.classList.remove('dark-theme');
        localStorage.setItem('theme', '');
        
        const parcelasGeradas = document.getElementById('parcelasGeradas');
        const listaParcelas = document.getElementById('listaParcelas');
        const btnGerarParcelas = document.getElementById('btnGerarParcelas');
        const parceladoFields = document.getElementById('parceladoFields');
        
        if (parcelasGeradas) parcelasGeradas.classList.remove('dark-theme');
        if (listaParcelas) listaParcelas.classList.remove('dark-theme');
        if (btnGerarParcelas) btnGerarParcelas.classList.remove('dark-theme');
        if (parceladoFields) parceladoFields.classList.remove('dark-theme');
    }

    if (currentTheme === 'dark-theme') {
        applyDarkTheme();
    }

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
                    row.find('input[type="number"]').eq(0).prop('disabled', false);
                    row.find('select.tipo-preco').prop('disabled', false);
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
        row.find('input[type="number"]').eq(1).val(price.toFixed(2));
        calculateSubtotal(row);
    }

    function setupInitialProductRow() {
        const initialRow = productsContainer.querySelector('.form-row');
        if (initialRow) {
            setupProductAutocomplete(initialRow.querySelector('.produto-autocomplete'));
            setupRowEventListeners($(initialRow));
        }
    }

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
        row.find('.remove-product').on('click', () => {
            row.remove();
            updateTotalValue();
        });

        const quantidadeInput = row.find('input[type="number"]').eq(0);
        const valorInput = row.find('input[type="number"]').eq(1);
        const descontoInput = row.find('.desconto-input');
        const descontoTipo = row.find('.desconto-tipo');

        const validateNonNegative = (input) => {
            input.val(Math.max(0, parseInt(input.val()) || 0));
        };

        const recalculateSubtotal = () => {
            calculateSubtotal(row);
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

        const valorTotalOrcamentoInput = document.getElementById('valorTotalOrcamento');
        valorTotalOrcamentoInput.value = formatCurrency(total);
        valorTotalOrcamentoInput.setAttribute('data-valor-original', total.toFixed(2));

        calcularValorTotal();
    }

    function calcularValorTotal() {
        const valorTotalOrcamentoInput = document.getElementById('valorTotalOrcamento');
        let valorTotalProdutos = parseFloat(valorTotalOrcamentoInput.getAttribute('data-valor-original')) || 0;

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
        document.getElementById('valorTotalOrcamento').value = formatCurrency(valorFinal);
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

        subtotal = Math.max(0, subtotal);
        descontoInput.val(descontoValor);
        row.find('input[readonly]').val(formatCurrency(subtotal));
        updateTotalValue();
    }

    document.getElementById('descontoTotal').addEventListener('input', calcularValorTotal);
    document.getElementById('descontoTotalTipo').addEventListener('change', calcularValorTotal);

    document.getElementById('descontoTotal').addEventListener('input', function() {
        if (this.value === '' || parseFloat(this.value) === 0) {
            this.value = '';
        }
        calcularValorTotal();
    });

    addBudgetForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const numero = document.getElementById('numero').value;
        const cliente = document.getElementById('cliente').value;
        const situacao = document.getElementById('situacao').value;
        const data = document.getElementById('data').value;
        const prazoEntrega = document.getElementById('prazoEntrega').value;
        const formaPagamento = formaPagamentoSelect.value;
        const valorTotalOrcamento = parseCurrency(document.getElementById('valorTotalOrcamento').value);

        const budgetProducts = [];
        productsContainer.querySelectorAll('.form-row').forEach(row => {
            const produto = row.querySelector('.produto-autocomplete').value;
            const quantidade = Math.max(1, parseInt(row.querySelector('input[type="number"]').value) || 1);
            const valor = Math.max(0, parseFloat(row.querySelectorAll('input[type="number"]')[1].value) || 0);
            const desconto = Math.max(0, parseInt(row.querySelector('.desconto-input').value) || 0);
            const descontoTipo = row.querySelector('.desconto-tipo').value;
            const subtotal = parseCurrency(row.querySelector('input[readonly]').value);

            budgetProducts.push({ produto, quantidade, valor, desconto, descontoTipo, subtotal });
        });

        const newBudget = {
            numero,
            cliente,
            situacao,
            data,
            prazoEntrega,
            formaPagamento,
            produtos: budgetProducts,
            valorTotal: valorTotalOrcamento,
            descontoTotal: {
                valor: parseFloat(document.getElementById('descontoTotal').value) || 0,
                tipo: document.getElementById('descontoTotalTipo').value
            },
            valorFinal: parseCurrency(document.getElementById('valorTotalOrcamento').value)
        };

        if (document.getElementById('parceladoFields').style.display === 'block') {
            newBudget.tipoPagamento = 'Parcelado';
            newBudget.intervaloParcelas = parseInt(document.getElementById('intervaloParcelas').value) || 0;
            newBudget.quantidadeParcelas = parseInt(document.getElementById('quantidadeParcelas').value) || 0;
            newBudget.dataPrimeiraParcela = document.getElementById('dataPrimeiraParcela').value || '';
            newBudget.parcelas = window.orcamentoAtual ? window.orcamentoAtual.parcelas : [];
        } else {
            newBudget.tipoPagamento = 'À Vista';
        }

        if (budgetId) {
            newBudget.id = budgetId;
        }

        const url = budgetId ? `/api/budgets/${budgetId}` : '/api/budgets';
        const method = budgetId ? 'PUT' : 'POST';

        fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newBudget)
        })
        .then(response => response.json())
        .then(budget => {
            window.location.href = 'budgets-management.html';
        })
        .catch(error => {
            console.error('Erro ao salvar o orçamento:', error);
            alert('Ocorreu um erro ao salvar o orçamento. Por favor, tente novamente.');
        });
    });

    const urlParams = new URLSearchParams(window.location.search);
    const budgetId = urlParams.get('id');

    if (budgetId) {
        fetch(`/api/budgets/${budgetId}`)
            .then(response => response.json())
            .then(budget => {
                document.getElementById('numero').value = budget.numero;
                document.getElementById('cliente').value = budget.cliente;
                document.getElementById('situacao').value = budget.situacao;
                document.getElementById('data').value = budget.data;
                document.getElementById('prazoEntrega').value = budget.prazoEntrega || '';
                
                if (budget.formaPagamento) {
                    $(formaPagamentoSelect).val(budget.formaPagamento).trigger('change');
                }

                const productsContainer = document.getElementById('productsContainer');
                productsContainer.innerHTML = '';
                
                budget.produtos.forEach(produto => {
                    adicionarProduto(produto);
                });

                if (budget.descontoTotal) {
                    document.getElementById('descontoTotal').value = budget.descontoTotal.valor;
                    document.getElementById('descontoTotalTipo').value = budget.descontoTotal.tipo;
                }

                if (budget.tipoPagamento === 'Parcelado') {
                    updatePaymentSelection('Parcelado');
                    document.getElementById('intervaloParcelas').value = budget.intervaloParcelas || '';
                    document.getElementById('quantidadeParcelas').value = budget.quantidadeParcelas || '';
                    document.getElementById('dataPrimeiraParcela').value = budget.dataPrimeiraParcela || '';
                    parceladoFields.style.display = 'block';

                    if (budget.parcelas && budget.parcelas.length > 0) {
                        listaParcelas.innerHTML = '';
                        budget.parcelas.forEach(parcela => {
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

                updateTotalValue();

                document.querySelector('button[type="submit"]').textContent = 'Atualizar Orçamento';
            })
            .catch(error => console.error('Erro ao buscar detalhes do orçamento:', error));
    }

    function formatDateForInput(dateString) {
        return dateString ? new Date(dateString).toISOString().split('T')[0] : '';
    }

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

    function setCurrentDate() {
        const today = new Date();
        const day = String(today.getDate()).padStart(2, '0');
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const year = today.getFullYear();
        dataInput.value = `${year}-${month}-${day}`;
    }

    setCurrentDate();

    const formaPagamentoSelect = document.getElementById('formaPagamento');

    $(formaPagamentoSelect).select2({
        placeholder: 'Digite para buscar',
        allowClear: true,
        theme: 'bootstrap4'
    });

    updateTotalValue();

    addProductRow();

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

    if (budgetId) {
        fetch(`/api/budgets/${budgetId}`)
            .then(response => response.json())
            .then(budget => {
                if (budget.tipoPagamento === 'Parcelado') {
                    updatePaymentSelection('Parcelado');
                    document.getElementById('intervaloParcelas').value = budget.intervaloParcelas || '';
                    document.getElementById('quantidadeParcelas').value = budget.quantidadeParcelas || '';
                    document.getElementById('dataPrimeiraParcela').value = budget.dataPrimeiraParcela || '';
                    if (budget.parcelas) {
                        window.orcamentoAtual = { parcelas: budget.parcelas };
                        renderParcelas(budget.parcelas);
                    }
                } else {
                    updatePaymentSelection('À Vista');
                }
            })
            .catch(error => console.error('Erro ao buscar detalhes do orçamento:', error));
    } else {
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
        const valorTotal = parseCurrency(document.getElementById('valorTotalOrcamento').value);

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
                data: formatDateWithSlashes(dataAtual.toISOString().split('T')[0]),
                valor: valorParcela
            });
            dataAtual.setDate(dataAtual.getDate() + intervaloParcelas);
        }

        renderParcelas(parcelas);

        if (!window.orcamentoAtual) {
            window.orcamentoAtual = {};
        }
        window.orcamentoAtual.parcelas = parcelas;
    }

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

    function formatDateWithSlashes(dateString) {
        const [year, month, day] = dateString.split('-');
        return `${year}/${month}/${day}`;
    }

    function formatDate(dateString) {
        if (dateString.includes('-')) {
            const [year, month, day] = dateString.split('-');
            return `${day}/${month}/${year}`;
        } else {
            const [year, month, day] = dateString.split('/');
            return `${day}/${month}/${year}`;
        }
    }

    const tipoClienteSelect = document.getElementById('tipoCliente');
    tipoClienteSelect.addEventListener('change', toggleDocumentFields);

    const addClientForm = document.getElementById('addClientForm');
    addClientForm.addEventListener('submit', handleAddClient);

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

        const currentDate = new Date();
        const formattedDate = `${currentDate.getDate().toString().padStart(2, '0')}/${(currentDate.getMonth() + 1).toString().padStart(2, '0')}/${currentDate.getFullYear()}, ${currentDate.getHours().toString().padStart(2, '0')}:${currentDate.getMinutes().toString().padStart(2, '0')}:${currentDate.getSeconds().toString().padStart(2, '0')}`;

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
                numero: document.getElementById('numeroEndereco').value, // Use o ID correto aqui
                bairro: document.getElementById('bairro').value,
                cidade: document.getElementById('cidade').value,
                estado: document.getElementById('estado').value
            },
            dataCadastro: formattedDate
        };

        try {
            const response = await fetch('/api/clients', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newClient)
            });

            if (response.ok) {
                const client = await response.json();
                clients.push(client);
                setupClientAutocomplete();
                $('#addClientModal').modal('hide');
                document.getElementById('cliente').value = client.nome;
                alert('Cliente adicionado com sucesso!');
            } else {
                throw new Error('Erro ao adicionar cliente');
            }
        } catch (error) {
            console.error('Erro ao adicionar cliente:', error);
            alert('Ocorreu um erro ao adicionar o cliente. Por favor, tente novamente.');
        }
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
            document.getElementById('nome').value = data.nome || '';
            document.getElementById('email').value = data.email || '';
            document.getElementById('telefone').value = data.telefone || '';
            document.getElementById('logradouro').value = data.logradouro || '';
            // Alteração aqui: use o ID correto para o número do endereço
            document.getElementById('numeroEndereco').value = data.numero || ''; 
            document.getElementById('bairro').value = data.bairro || '';
            document.getElementById('cep').value = data.cep || '';
    
            // Preenchendo cidade e estado
            document.getElementById('cidade').value = data.municipio || '';
            document.getElementById('estado').value = data.uf || '';
    
            // Se 'municipio' e 'uf' não estiverem disponíveis, tente usar 'efr'
            if (!data.municipio && !data.uf && data.efr) {
                const parts = data.efr.split('/');
                if (parts.length === 2) {
                    document.getElementById('cidade').value = parts[0].trim();
                    document.getElementById('estado').value = parts[1].trim();
                }
            }
        } catch (error) {
            console.error('Erro ao buscar CNPJ:', error);
            alert('Ocorreu um erro ao buscar os dados do CNPJ. Por favor, tente novamente ou preencha manualmente.');
        }
    }

    document.getElementById('cep').addEventListener('blur', async function() {
        const cep = this.value.replace(/\D/g, '');
        if (cep.length !== 8) {
            return;
        }

        try {
            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const data = await response.json();

            if (data.erro) {
                throw new Error('CEP não encontrado');
            }

            document.getElementById('logradouro').value = data.logradouro;
            document.getElementById('bairro').value = data.bairro;
            document.getElementById('cidade').value = data.localidade;
            document.getElementById('estado').value = data.uf;

        } catch (error) {
            console.error('Erro ao buscar CEP:', error);
            alert('Não foi possível encontrar o endereço para este CEP. Por favor, preencha manualmente.');
        }
    });

    function formatCNPJ(input) {
        let value = input.value.replace(/\D/g, '');
        if (value.length > 14) {
            value = value.slice(0, 14);
        }
        value = value.replace(/^(\d{2})(\d)/, '$1.$2');
        value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
        value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
        value = value.replace(/(\d{4})(\d)/, '$1-$2');
        input.value = value;
    }

    document.getElementById('cnpj').addEventListener('input', function() {
        formatCNPJ(this);
    });

    function formatCPF(input) {
        let value = input.value.replace(/\D/g, '');
        if (value.length > 11) {
            value = value.slice(0, 11);
        }
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        input.value = value;
    }

    document.getElementById('cpf').addEventListener('input', function() {
        formatCPF(this);
    });

    function formatPhone(input) {
        let value = input.value.replace(/\D/g, '');
        if (value.length > 11) {
            value = value.slice(0, 11);
        }
        if (value.length > 10) {
            value = value.replace(/^(\d\d)(\d{5})(\d{4}).*/, '($1) $2-$3');
        } else if (value.length > 5) {
            value = value.replace(/^(\d\d)(\d{4})(\d{0,4}).*/, '($1) $2-$3');
        } else if (value.length > 2) {
            value = value.replace(/^(\d\d)(\d{0,5})/, '($1) $2');
        } else {
            value = value.replace(/^(\d*)/, '($1');
        }
        input.value = value;
    }

    document.getElementById('telefone').addEventListener('input', function() {
        formatPhone(this);
    });

    function formatCEP(input) {
        let value = input.value.replace(/\D/g, '');
        if (value.length > 8) {
            value = value.slice(0, 8);
        }
        value = value.replace(/^(\d{5})(\d)/, '$1-$2');
        input.value = value;
    }

    document.getElementById('cep').addEventListener('input', function() {
        formatCEP(this);
    });

    const cidadeInput = document.getElementById('cidade');
    const estadoInput = document.getElementById('estado');

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
                    }
                });
            },
            minLength: 3,
            select: function(event, ui) {
                event.preventDefault();
                cidadeInput.value = ui.item.value;
                estadoInput.value = ui.item.uf;
            }
        });
    }

    const addNewProductBtn = document.getElementById('addNewProductBtn');
    const saveNewProductBtn = document.getElementById('saveNewProduct');
    const generateCodeBtn = document.getElementById('generateCode');
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

    // Adicione este event listener para o botão de gerar código
    if (generateCodeBtn) {
        generateCodeBtn.addEventListener('click', generateProductCode);
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

    function generateProductCode() {
        const code = Math.floor(1000000000 + Math.random() * 9000000000);
        document.getElementById('newProductCode').value = code;
    }

    function updateProductAutocomplete() {
        const productInputs = document.querySelectorAll('.produto-autocomplete');
        productInputs.forEach(input => {
            $(input).autocomplete("option", "source", products.map(product => product.nome));
        });
    }
});

// Função para exibir toast de sucesso (se ainda não existir)
function showSuccessToast(message) {
    // Implemente a lógica para exibir um toast de sucesso
    console.log('Sucesso:', message);
}

// Função para exibir toast de erro (se ainda não existir)
function showErrorToast(message) {
    // Implemente a lógica para exibir um toast de erro
    console.error('Erro:', message);
}
