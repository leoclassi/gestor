document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const saleId = urlParams.get('id');

    if (!saleId) {
        alert('ID da venda não fornecido');
        window.location.href = 'sales-management.html';
        return;
    }

    fetchSaleDetails(saleId);

    // Print functionality
    document.getElementById('printButton').addEventListener('click', () => {
        window.print();
    });
});

function fetchSaleDetails(saleId) {
    fetch(`/api/sales/${saleId}`)
        .then(response => response.json())
        .then(sale => {
            console.log('Dados da venda recebidos:', sale); // Log para debug
            displaySaleDetails(sale);
        })
        .catch(error => {
            console.error('Erro ao buscar detalhes da venda:', error);
            alert('Erro ao carregar os detalhes da venda. Por favor, tente novamente.');
        });
}

function displaySaleDetails(sale) {
    console.log('Dados completos da venda:', sale);
    // Verifica se 'sale' e 'sale.clienteInfo' existem antes de acessar suas propriedades
    if (!sale || !sale.clienteInfo) {
        console.error('Dados da venda ou informações do cliente estão faltando.');
        return;  // Sai da função se os dados necessários não estiverem presentes
    }

    console.log('Dados da venda:', sale); // Adicione esta linha
    document.getElementById('saleNumber').textContent = sale.numero;
    document.getElementById('saleDate').textContent = formatDate(sale.data);
    document.getElementById('deliveryDate').textContent = formatDate(sale.prazoEntrega);
    document.getElementById('clientName').textContent = sale.cliente;
    
    const paymentInfo = `${sale.tipoPagamento} - ${sale.formaPagamento || 'Não especificado'}`;
    document.getElementById('paymentMethod').textContent = paymentInfo;

    // Exibir informações do cliente
    if (sale.clienteInfo) {
        document.getElementById('clientPhone').textContent = sale.clienteInfo.telefone || 'Não informado';
        document.getElementById('clientAddress').textContent = sale.clienteInfo.endereco?.logradouro || 'Não informado';
        document.getElementById('clientCity').textContent = sale.clienteInfo.endereco?.cidade || 'Não informada';
        document.getElementById('clientZip').textContent = sale.clienteInfo.endereco?.cep || 'Não informado';
        
        if (sale.clienteInfo.tipoCliente.trim().toLowerCase() === 'pessoa física') {
            document.getElementById('clientDocumentLabel').textContent = 'CPF:';
            document.getElementById('clientDocument').textContent = formatDocument(sale.clienteInfo.cpf) || 'Não informado';
        } else {
            document.getElementById('clientDocumentLabel').textContent = 'CNPJ:';
            document.getElementById('clientDocument').textContent = formatDocument(sale.clienteInfo.cnpj) || 'Não informado';
        }
    } else {
        document.getElementById('clientPhone').textContent = 'Não informado';
        document.getElementById('clientAddress').textContent = 'Não informado';
        document.getElementById('clientCity').textContent = 'Não informada';
        document.getElementById('clientZip').textContent = 'Não informado';
        document.getElementById('clientDocumentLabel').textContent = 'Documento:';
        document.getElementById('clientDocument').textContent = 'Não informado';
    }

    // Calcular e exibir o desconto total
    const totalDiscount = calculateTotalDiscount(sale);
    document.getElementById('totalDiscount').textContent = formatCurrency(totalDiscount);

    // Adicione esta linha para exibir os produtos
    displayProducts(sale.produtos);

    displayPaymentSummary(sale);
    displayInstallmentsInfo(sale);
}

// Adicione esta função para calcular o desconto total
function calculateTotalDiscount(sale) {
    if (sale.descontoTotal && sale.descontoTotal.valor) {
        return {
            valor: parseFloat(sale.descontoTotal.valor),
            tipo: sale.descontoTotal.tipo
        };
    }
    return { valor: 0, tipo: 'value' };
}

function displayProducts(products) {
    const productsTableBody = document.getElementById('productsTableBody');
    productsTableBody.innerHTML = '';

    products.forEach((product, index) => {
        const row = document.createElement('tr');

        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${product.nome || product.produto || 'Produto não especificado'}</td>
            <td>${product.quantidade}</td>
            <td>${formatCurrency(product.valor)}</td>
            <td>${formatCurrency(calculateSubtotal(product))}</td>
        `;
        productsTableBody.appendChild(row);
    });
}

function displayPaymentSummary(sale) {
    const totalProductsValue = calculateTotalProductsValue(sale.produtos);
    const totalDiscount = calculateTotalDiscount(sale);
    
    document.getElementById('totalProductsValue').textContent = formatCurrency(totalProductsValue);
    
    // Exibir o desconto total sem o tipo adicional
    const discountElement = document.getElementById('totalDiscount');
    if (totalDiscount.tipo === 'percentage') {
        discountElement.textContent = `${totalDiscount.valor}%`;
    } else {
        discountElement.textContent = formatCurrency(totalDiscount.valor);
    }
    
    document.getElementById('finalValue').textContent = formatCurrency(sale.valorFinal);
    document.getElementById('paymentMethod').textContent = `${sale.tipoPagamento} - ${sale.formaPagamento || 'Não especificado'}`;

    // Verificação mais robusta
    const isParcelado = sale.tipoPagamento.toLowerCase().includes('parcelado') || 
                        sale.formaPagamento.toLowerCase().includes('parcelado');

    const installmentsInfo = document.getElementById('installmentsInfo');
    
    if (isParcelado && sale.parcelas && sale.parcelas.length > 0) {
        installmentsInfo.style.display = 'block';
        displayInstallmentsInfo(sale);
    } else {
        installmentsInfo.style.display = 'none';
    }
}

function displayInstallmentsInfo(sale) {
    const installmentsInfo = document.getElementById('installmentsInfo');
    const installmentsList = document.getElementById('installmentsList');
    installmentsList.innerHTML = '';  // Limpa a lista de parcelas anterior

    // Verifica se 'sale.parcelas' existe e é um array com elementos
    if (sale.parcelas && Array.isArray(sale.parcelas) && sale.parcelas.length > 0) {
        installmentsInfo.style.display = 'block';
        sale.parcelas.forEach(parcela => {
            const listItem = document.createElement('p');
            listItem.className = 'mb-1';
            listItem.textContent = `Parcela ${parcela.numero}: ${formatCurrency(parcela.valor)} - Vencimento: ${formatDate(parcela.data)}`;
            installmentsList.appendChild(listItem);
        });
    } else {
        installmentsInfo.style.display = 'none';  // Oculta a seção se não houver parcelas
    }
}

function calculateTotalProductsValue(products) {
    return products.reduce((total, product) => {
        return total + (product.quantidade * product.valor);
    }, 0);
}

function calculateSubtotal(product) {
    return product.quantidade * product.valor;
}

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(dateString) {
    if (!dateString) return 'Não especificado';
    const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
    return new Date(dateString).toLocaleDateString('pt-BR', options);
}

// Adicione esta função para formatar o documento
function formatDocument(doc) {
    if (!doc) return '';
    // Remove qualquer caractere que não seja número
    const numbers = doc.replace(/\D/g, '');
    if (numbers.length === 11) {
        // CPF: 000.000.000-00
        return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (numbers.length === 14) {
        // CNPJ: 00.000.000/0000-00
        return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return numbers; // Retorna os números sem formatação se não for CPF nem CNPJ
}