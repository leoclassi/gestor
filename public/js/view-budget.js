document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const budgetId = urlParams.get('id');

    if (!budgetId) {
        alert('ID do orçamento não fornecido');
        window.location.href = 'budgets-management.html';
        return;
    }

    fetchBudgetDetails(budgetId);

    // Funcionalidade de impressão
    document.getElementById('printButton').addEventListener('click', () => {
        window.print();
    });
});

function fetchBudgetDetails(budgetId) {
    fetch(`/api/budgets/${budgetId}`)
        .then(response => response.json())
        .then(budget => {
            console.log('Dados do orçamento recebidos:', budget); // Log para debug
            displayBudgetDetails(budget);
        })
        .catch(error => {
            console.error('Erro ao buscar detalhes do orçamento:', error);
            alert('Erro ao carregar os detalhes do orçamento. Por favor, tente novamente.');
        });
}

function displayBudgetDetails(budget) {
    console.log('Dados completos do orçamento:', budget);
    // Verifica se 'budget' existe antes de acessar suas propriedades
    if (!budget) {
        console.error('Dados do orçamento estão faltando.');
        return;  // Sai da função se os dados necessários não estiverem presentes
    }

    document.getElementById('budgetNumber').textContent = budget.numero;
    document.getElementById('budgetDate').textContent = formatDate(budget.data);
    document.getElementById('deliveryDate').textContent = formatDate(budget.prazoEntrega);
    document.getElementById('clientName').textContent = budget.cliente;
    
    const paymentInfo = `${budget.tipoPagamento} - ${budget.formaPagamento || 'Não especificado'}`;
    document.getElementById('paymentMethod').textContent = paymentInfo;

    // Exibir informações do cliente
    if (budget.clienteInfo) {
        document.getElementById('clientPhone').textContent = budget.clienteInfo.telefone || 'Não informado';
        const logradouro = budget.clienteInfo.endereco?.logradouro || '';
        const numero = budget.clienteInfo.endereco?.numero || '';
        const enderecoCompleto = numero ? `${logradouro}, ${numero}` : logradouro || 'Não informado';
        document.getElementById('clientAddress').textContent = enderecoCompleto;
        document.getElementById('clientCity').textContent = budget.clienteInfo.endereco?.cidade || 'Não informada';
        document.getElementById('clientZip').textContent = budget.clienteInfo.endereco?.cep || 'Não informado';
        
        if (budget.clienteInfo.tipoCliente.trim().toLowerCase() === 'pessoa física') {
            document.getElementById('clientDocumentLabel').textContent = 'CPF:';
            document.getElementById('clientDocument').textContent = formatDocument(budget.clienteInfo.cpf) || 'Não informado';
        } else {
            document.getElementById('clientDocumentLabel').textContent = 'CNPJ:';
            document.getElementById('clientDocument').textContent = formatDocument(budget.clienteInfo.cnpj) || 'Não informado';
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
    const totalDiscount = calculateTotalDiscount(budget);
    document.getElementById('totalDiscount').textContent = formatCurrency(totalDiscount);

    // Adicione esta linha para exibir os produtos
    displayProducts(budget.produtos);

    displayPaymentSummary(budget);
    displayInstallmentsInfo(budget);
}

// Adicione esta função para calcular o desconto total
function calculateTotalDiscount(budget) {
    if (budget.descontoTotal && budget.descontoTotal.valor) {
        return {
            valor: parseFloat(budget.descontoTotal.valor),
            tipo: budget.descontoTotal.tipo
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
            <td>${product.produto || 'Produto não especificado'}</td>
            <td>${product.quantidade}</td>
            <td>${formatCurrency(product.valor)}</td>
            <td>${formatCurrency(product.subtotal)}</td>
        `;
        productsTableBody.appendChild(row);
    });
}

function displayPaymentSummary(budget) {
    const totalProductsValue = calculateTotalProductsValue(budget.produtos);
    const totalDiscount = calculateTotalDiscount(budget);
    
    document.getElementById('totalProductsValue').textContent = formatCurrency(totalProductsValue);
    
    // Exibir o desconto total sem o tipo adicional
    const discountElement = document.getElementById('totalDiscount');
    if (totalDiscount.tipo === 'percentage') {
        discountElement.textContent = `${totalDiscount.valor}%`;
    } else {
        discountElement.textContent = formatCurrency(totalDiscount.valor);
    }
    
    document.getElementById('finalValue').textContent = formatCurrency(budget.valorFinal);
    document.getElementById('paymentMethod').textContent = `${budget.tipoPagamento} - ${budget.formaPagamento || 'Não especificado'}`;

    // Verificação mais robusta
    const isParcelado = budget.tipoPagamento.toLowerCase().includes('parcelado') || 
                        (budget.formaPagamento && budget.formaPagamento.toLowerCase().includes('parcelado'));

    const installmentsInfo = document.getElementById('installmentsInfo');
    
    if (isParcelado && budget.parcelas && budget.parcelas.length > 0) {
        installmentsInfo.style.display = 'block';
        displayInstallmentsInfo(budget);
    } else {
        installmentsInfo.style.display = 'none';
    }
}

function displayInstallmentsInfo(budget) {
    const installmentsInfo = document.getElementById('installmentsInfo');
    const installmentsList = document.getElementById('installmentsList');
    installmentsList.innerHTML = '';  // Limpa a lista de parcelas anterior

    // Verifica se 'budget.parcelas' existe e é um array com elementos
    if (budget.parcelas && Array.isArray(budget.parcelas) && budget.parcelas.length > 0) {
        installmentsInfo.style.display = 'block';
        budget.parcelas.forEach(parcela => {
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

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(dateString) {
    if (!dateString) return 'Não especificado';
    const date = new Date(dateString);
    date.setDate(date.getDate() + 1); // Adiciona um dia à data
    return date.toLocaleDateString('pt-BR', {
        timeZone: 'America/Sao_Paulo', // Define o fuso horário para Brasília
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit'
    });
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