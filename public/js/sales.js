document.addEventListener('DOMContentLoaded', () => {
    const addSaleForm = document.getElementById('addSaleForm');
    const productsContainer = document.getElementById('productsContainer');
    const addProductButton = document.getElementById('addProduct');
    const themeToggle = document.getElementById('themeToggle');
    const clienteInput = document.getElementById('cliente');
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
                    row.find('input[type="number"]').eq(1).val(selectedProduct.valor);
                    calculateSubtotal(row[0]);
                }
            }
        }).focus(function() {
            $(this).autocomplete("search", "");
        });
    }

    function setupInitialProductRow() {
        const initialRow = productsContainer.querySelector('.form-row');
        if (initialRow) {
            setupProductAutocomplete(initialRow.querySelector('.produto-autocomplete'));
            setupRowEventListeners(initialRow);
        }
    }

    // Add product row
    addProductButton.addEventListener('click', () => {
        const productRow = document.createElement('div');
        productRow.classList.add('form-row', 'mb-3');
        productRow.innerHTML = `
            <div class="form-group col-md-3">
                <label for="produto">Produto</label>
                <input type="text" class="form-control produto-autocomplete" required>
            </div>
            <div class="form-group col-md-2">
                <label for="quantidade">Quant.</label>
                <input type="number" class="form-control" required>
            </div>
            <div class="form-group col-md-2">
                <label for="valor">Valor</label>
                <div class="input-group">
                    <div class="input-group-prepend">
                        <span class="input-group-text">R$</span>
                    </div>
                    <input type="number" class="form-control" step="0.01" required>
                </div>
            </div>
            <div class="form-group col-md-2">
                <label for="desconto">Desconto</label>
                <input type="number" class="form-control" step="0.01">
            </div>
            <div class="form-group col-md-2">
                <label for="subtotal">Subtotal</label>
                <input type="text" class="form-control" readonly>
            </div>
            <div class="form-group col-md-1 d-flex align-items-end">
                <button type="button" class="btn btn-danger btn-sm remove-product">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        productsContainer.appendChild(productRow);

        setupProductAutocomplete(productRow.querySelector('.produto-autocomplete'));
        setupRowEventListeners(productRow);
    });

    function setupRowEventListeners(row) {
        // Add event listener to remove button
        row.querySelector('.remove-product').addEventListener('click', () => {
            productsContainer.removeChild(row);
        });

        // Add event listeners to calculate subtotal
        const quantidadeInput = row.querySelector('input[type="number"]');
        const valorInput = row.querySelectorAll('input[type="number"]')[1];
        const descontoInput = row.querySelectorAll('input[type="number"]')[2];

        quantidadeInput.addEventListener('input', () => calculateSubtotal(row));
        valorInput.addEventListener('input', () => calculateSubtotal(row));
        descontoInput.addEventListener('input', () => calculateSubtotal(row));
    }

    function calculateSubtotal(row) {
        const quantidade = parseFloat(row.querySelector('input[type="number"]').value) || 0;
        const valor = parseFloat(row.querySelectorAll('input[type="number"]')[1].value) || 0;
        const desconto = parseFloat(row.querySelectorAll('input[type="number"]')[2].value) || 0;
        const subtotal = (quantidade * valor) - desconto;
        row.querySelector('input[readonly]').value = `R$ ${subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    // Handle form submission
    addSaleForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const numero = document.getElementById('numero').value;
        const cliente = document.getElementById('cliente').value;
        const situacao = document.getElementById('situacao').value;
        const data = document.getElementById('data').value;
        const prazoEntrega = document.getElementById('prazoEntrega').value;

        const saleProducts = [];
        productsContainer.querySelectorAll('.form-row').forEach(row => {
            const produto = row.querySelector('.produto-autocomplete').value;
            const quantidade = parseFloat(row.querySelector('input[type="number"]').value) || 0;
            const valor = parseFloat(row.querySelectorAll('input[type="number"]')[1].value) || 0;
            const desconto = parseFloat(row.querySelectorAll('input[type="number"]')[2].value) || 0;
            const subtotal = parseFloat(row.querySelector('input[readonly]').value.replace('R$ ', '').replace('.', '').replace(',', '.')) || 0;

            saleProducts.push({ produto, quantidade, valor, desconto, subtotal });
        });

        const newSale = {
            numero,
            cliente,
            situacao,
            data,
            prazoEntrega,
            produtos: saleProducts
        };

        fetch('/api/sales', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newSale)
        })
        .then(response => response.json())
        .then(sale => {
            alert('Venda salva com sucesso!');
            addSaleForm.reset();
            productsContainer.innerHTML = '';
            addProductButton.click(); // Add an empty product row
        });
    });

    // Initialize the first product row
    addProductButton.click();
});