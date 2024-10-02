document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('addProductForm');
    const productTable = document.getElementById('productTable');
    const searchInput = document.getElementById('search');
    const deleteSelectedButton = document.getElementById('deleteSelected');
    const selectAllCheckbox = document.getElementById('selectAll');
    const themeToggle = document.getElementById('themeToggle');
    const generateCodeBtn = document.getElementById('generateCode');
    let editingProduct = null;
    let products = [];

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

    // Generate random code functionality
    if (generateCodeBtn) {
        generateCodeBtn.addEventListener('click', generateRandomCode);
    }

    function generateRandomCode() {
        const code = Math.floor(1000000000 + Math.random() * 9000000000);
        document.getElementById('codigo').value = code;
    }

    // Fetch existing products from the server
    fetch('/api/products')
        .then(response => response.json())
        .then(data => {
            products = data;
            products.forEach(product => {
                addProductToTable(product);
            });
        });

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const codigo = document.getElementById('codigo').value;
            const nome = document.getElementById('nome').value;
            const valor = parseFloat(document.getElementById('valor').value);
            const valorEspecial = parseFloat(document.getElementById('valorEspecial').value);
            const estoque = parseInt(document.getElementById('estoque').value);

            const newProduct = {
                id: editingProduct ? editingProduct.id : Date.now().toString(),
                codigo,
                nome,
                valor,
                valorEspecial,
                estoque,
                dataCadastro: editingProduct ? editingProduct.dataCadastro : new Date().toLocaleString()
            };

            if (editingProduct) {
                // Update existing product
                fetch(`/api/products/${editingProduct.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(newProduct)
                })
                .then(response => response.json())
                .then(updatedProduct => {
                    updateProductInTable(updatedProduct);
                    form.reset();
                    $('#addProductModal').modal('hide');
                    editingProduct = null;
                });
            } else {
                // Add new product
                fetch('/api/products', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(newProduct)
                })
                .then(response => response.json())
                .then(product => {
                    products.push(product);
                    addProductToTable(product);
                    form.reset();
                    $('#addProductModal').modal('hide');
                });
            }
        });
    }

    function addProductToTable(product) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><input type="checkbox" class="select-product" value="${product.id}"></td>
            <td>${product.codigo}</td>
            <td>${product.nome}</td>
            <td>R$ ${(product.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td>R$ ${(product.valorEspecial || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <!-- Removido Estoque -->
            <!-- Removido Data de Cadastro -->
            <td>
                <button class="btn btn-primary btn-sm edit-btn">✏️ Editar</button>
                <button class="btn btn-danger btn-sm delete-btn">🗑️ Excluir</button>
            </td>
        `;

        row.querySelector('.edit-btn').addEventListener('click', () => {
            editingProduct = product;
            document.getElementById('codigo').value = product.codigo;
            document.getElementById('nome').value = product.nome;
            document.getElementById('valor').value = product.valor;
            document.getElementById('valorEspecial').value = product.valorEspecial;
            document.getElementById('estoque').value = product.estoque;
            $('#addProductModal').modal('show');
        });

        row.querySelector('.delete-btn').addEventListener('click', () => {
            fetch(`/api/products/${product.id}`, {
                method: 'DELETE'
            })
            .then(() => {
                products = products.filter(p => p.id !== product.id);
                productTable.removeChild(row);
            });
        });

        row.querySelector('.select-product').addEventListener('change', toggleDeleteSelectedButton);

        productTable.appendChild(row);
    }

    function updateProductInTable(product) {
        const row = productTable.querySelector(`tr:has(input[value="${product.id}"])`);
        if (row) {
            row.innerHTML = `
                <td><input type="checkbox" class="select-product" value="${product.id}"></td>
                <td>${product.codigo}</td>
                <td>${product.nome}</td>
                <td>R$ ${(product.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td>R$ ${(product.valorEspecial || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <!-- Removido Estoque -->
                <!-- Removido Data de Cadastro -->
                <td>
                    <button class="btn btn-primary btn-sm edit-btn">✏️ Editar</button>
                    <button class="btn btn-danger btn-sm delete-btn">🗑️ Excluir</button>
                </td>
            `;

            row.querySelector('.edit-btn').addEventListener('click', () => {
                editingProduct = product;
                document.getElementById('codigo').value = product.codigo;
                document.getElementById('nome').value = product.nome;
                document.getElementById('valor').value = product.valor;
                document.getElementById('valorEspecial').value = product.valorEspecial;
                document.getElementById('estoque').value = product.estoque;
                $('#addProductModal').modal('show');
            });

            row.querySelector('.delete-btn').addEventListener('click', () => {
                fetch(`/api/products/${product.id}`, {
                    method: 'DELETE'
                })
                .then(() => {
                    products = products.filter(p => p.id !== product.id);
                    productTable.removeChild(row);
                });
            });

            row.querySelector('.select-product').addEventListener('change', toggleDeleteSelectedButton);
        }
    }

    function toggleDeleteSelectedButton() {
        const selectedCheckboxes = document.querySelectorAll('.select-product:checked');
        deleteSelectedButton.style.display = selectedCheckboxes.length > 0 ? 'inline-block' : 'none';
    }

    selectAllCheckbox.addEventListener('change', () => {
        const checkboxes = document.querySelectorAll('.select-product');
        checkboxes.forEach(checkbox => {
            checkbox.checked = selectAllCheckbox.checked;
        });
        toggleDeleteSelectedButton();
    });

    deleteSelectedButton.addEventListener('click', () => {
        const selectedIds = Array.from(document.querySelectorAll('.select-product:checked'))
            .map(checkbox => checkbox.value);

        if (selectedIds.length > 0) {
            if (confirm(`Tem certeza que deseja excluir ${selectedIds.length} produto(s)?`)) {
                Promise.all(selectedIds.map(id =>
                    fetch(`/api/products/${id}`, { method: 'DELETE' })
                ))
                .then(() => {
                    selectedIds.forEach(id => {
                        const row = productTable.querySelector(`tr:has(input[value="${id}"])`);
                        if (row) {
                            productTable.removeChild(row);
                        }
                    });
                    products = products.filter(product => !selectedIds.includes(product.id));
                    toggleDeleteSelectedButton();
                });
            }
        }
    });

    searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.toLowerCase();
        const filteredProducts = products.filter(product =>
            product.codigo.toLowerCase().includes(searchTerm) ||
            product.nome.toLowerCase().includes(searchTerm) ||
            product.valor.toString().includes(searchTerm) ||
            product.valorEspecial.toString().includes(searchTerm) ||
            product.estoque.toString().includes(searchTerm)
        );
        renderProductTable(filteredProducts);
    });

    function renderProductTable(products) {
        productTable.innerHTML = '';
        products.forEach(product => {
            addProductToTable(product);
        });
    }

    const preencherProdutoBtn = document.getElementById('preencherProduto');
    const adicionarTodosProdutosBtn = document.getElementById('adicionarTodosProdutos');
    const produtoJsonTextarea = document.getElementById('produtoJson');

    preencherProdutoBtn.addEventListener('click', () => {
        try {
            const produtoData = JSON.parse(produtoJsonTextarea.value);
            if (Array.isArray(produtoData) && produtoData.length > 0) {
                const produto = produtoData[0];
                preencherFormularioProduto(produto);
                $('#autoPreencherModal').modal('hide');
            } else {
                throw new Error('Formato JSON inválido');
            }
        } catch (error) {
            alert('Erro ao processar o JSON. Verifique o formato e tente novamente.');
        }
    });

    adicionarTodosProdutosBtn.addEventListener('click', () => {
        try {
            const produtoData = JSON.parse(produtoJsonTextarea.value);
            if (Array.isArray(produtoData) && produtoData.length > 0) {
                adicionarMultiplosProdutos(produtoData);
                $('#autoPreencherModal').modal('hide');
            } else {
                throw new Error('Formato JSON inválido');
            }
        } catch (error) {
            alert('Erro ao processar o JSON. Verifique o formato e tente novamente.');
        }
    });

    function preencherFormularioProduto(produto) {
        document.getElementById('codigo').value = produto.codigo || '';
        document.getElementById('nome').value = produto.nome || '';
        document.getElementById('valor').value = produto.valor ? parseFloat(produto.valor).toFixed(2) : '';
        document.getElementById('valorEspecial').value = produto.valorEspecial ? parseFloat(produto.valorEspecial).toFixed(2) : '';
        document.getElementById('estoque').value = produto.estoque || '';
    }

    function adicionarMultiplosProdutos(produtos) {
        produtos.forEach(produto => {
            const newProduct = {
                id: Date.now().toString(),
                codigo: produto.codigo,
                nome: produto.nome,
                valor: parseFloat(produto.valor),
                valorEspecial: parseFloat(produto.valorEspecial),
                estoque: parseInt(produto.estoque),
                dataCadastro: new Date().toLocaleString()
            };

            fetch('/api/products', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newProduct)
            })
            .then(response => response.json())
            .then(addedProduct => {
                products.push(addedProduct);
                addProductToTable(addedProduct);
            })
            .catch(error => {
                console.error('Erro ao adicionar produto:', error);
            });
        });

        alert(`${produtos.length} produto(s) adicionado(s) com sucesso!`);
    }
});