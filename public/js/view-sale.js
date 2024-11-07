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
    document.getElementById('printButton').addEventListener('click', async () => {
        try {
            const element = document.querySelector('.container');
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: true,
                allowTaint: true,
                backgroundColor: '#ffffff'
            });

            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            
            const imgWidth = 210;
            const pageHeight = 295;
            const imgHeight = canvas.height * imgWidth / canvas.width;
            
            const imgData = canvas.toDataURL('image/jpeg', 1.0);
            pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);

            let heightLeft = imgHeight;
            let position = 0;

            while (heightLeft >= pageHeight) {
                position = heightLeft - pageHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            const pdfBlob = pdf.output('blob');

            window.print();

            const phoneNumber = '5514997992564';
            const saleNumber = document.getElementById('saleNumber').textContent;
            const urlParams = new URLSearchParams(window.location.search);
            const saleId = urlParams.get('id');

            const whatsappService = new WhatsAppService();

            await whatsappService.sendPdfToWhatsApp(pdfBlob, phoneNumber, saleNumber, saleId);

        } catch (error) {
            console.error('Erro ao processar:', error);
        }
    });

    // Atualizar o estilo do botão
    const printButton = document.getElementById('printButton');
    printButton.style.backgroundColor = '#28a745';
    printButton.style.borderColor = '#28a745';

    // Quando o mouse passar por cima
    printButton.addEventListener('mouseenter', () => {
        printButton.style.backgroundColor = '#218838';
        printButton.style.borderColor = '#1e7e34';
    });

    // Quando o mouse sair
    printButton.addEventListener('mouseleave', () => {
        printButton.style.backgroundColor = '#28a745';
        printButton.style.borderColor = '#28a745';
    });

    // Adicionar evento para o novo botão
    document.getElementById('sendToClientButton').addEventListener('click', async () => {
        try {
            const clientPhone = document.getElementById('clientPhone').textContent.trim();
            
            if (!clientPhone || clientPhone === 'Não informado') {
                showNotification('Cliente não possui número de telefone cadastrado', 'error');
                return;
            }

            const formattedClientPhone = formatPhoneNumber(clientPhone);
            const whatsappService = new WhatsAppService();
            const clientName = document.getElementById('clientName').textContent;

            // Verificar se é pagamento PIX
            const paymentMethod = document.getElementById('paymentMethod').textContent.trim();
            const isPix = paymentMethod.toLowerCase().includes('pix');

            // Se for PIX, enviar primeiro as informações do PIX
            if (isPix) {
                const finalValue = document.getElementById('finalValue').textContent
                    .replace('R$', '')
                    .replace(/\./g, '')
                    .replace(',', '.')
                    .trim();

                const saleNumber = document.getElementById('saleNumber').textContent;
                
                // Gerar apenas o código PIX com o novo identificador PEDIDO
                const pixCode = PixGenerator.generatePix(
                    '14996516567',
                    parseFloat(finalValue),
                    `PEDIDO${saleNumber}`
                );

                // Enviar primeiro as informações do PIX
                await whatsappService.sendPixInfo(
                    formattedClientPhone,
                    pixCode
                );
            }

            // Depois gerar e enviar o PDF
            const element = document.querySelector('.container');
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: true,
                allowTaint: true,
                backgroundColor: '#ffffff'
            });

            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            
            const imgWidth = 210;
            const pageHeight = 295;
            const imgHeight = canvas.height * imgWidth / canvas.width;
            
            const imgData = canvas.toDataURL('image/jpeg', 1.0);
            pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);

            let heightLeft = imgHeight;
            let position = 0;

            while (heightLeft >= pageHeight) {
                position = heightLeft - pageHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            const pdfBlob = pdf.output('blob');
            
            // Por último, enviar o PDF
            const saleNumber = document.getElementById('saleNumber').textContent;
            await whatsappService.sendPdfToWhatsApp(
                pdfBlob, 
                formattedClientPhone, 
                '',
                `PEDIDO_${saleNumber}`
            );

            showNotification('Documentos enviados com sucesso para o cliente!', 'success');

        } catch (error) {
            console.error('Erro ao processar:', error);
            showNotification('Erro ao enviar documentos para o cliente', 'error');
        }
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
        const logradouro = sale.clienteInfo.endereco?.logradouro || '';
        const numero = sale.clienteInfo.endereco?.numero || '';
        const enderecoCompleto = numero ? `${logradouro}, ${numero}` : logradouro || 'Não informado';
        document.getElementById('clientAddress').textContent = enderecoCompleto;
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
            // Usar a função formatDate para formatar a data corretamente
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
    const date = new Date(dateString);
    // Não adicionar um dia à data, pois isso pode causar problemas com fusos horários
    return date.toLocaleDateString('pt-BR', {
        timeZone: 'UTC', // Use UTC para evitar problemas com fusos horários
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

async function generateAndSendPdf(saleData) {
    try {
        // Aguarda renderização
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Captura o conteúdo
        const element = document.querySelector('.container');
        
        // Configurações do PDF
        const pdfOptions = {
            margin: 10,
            filename: `venda_${saleData.saleNumber}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        // Gera o PDF
        const pdf = await html2pdf().from(element).set(pdfOptions).outputPdf();
        const pdfBlob = new Blob([pdf], { type: 'application/pdf' });

        // Instancia o serviço do WhatsApp
        const whatsappService = new WhatsAppService();

        // Formata o número de telefone
        const formattedPhone = formatPhoneNumber(saleData.clientPhone);

        // Envia o PDF
        await whatsappService.sendPdfToWhatsApp(pdfBlob, formattedPhone, saleData.saleNumber);

        showNotification('PDF enviado com sucesso pelo WhatsApp!', 'success');

    } catch (error) {
        console.error('Erro ao gerar e enviar PDF:', error);
        showNotification('Erro ao enviar PDF pelo WhatsApp', 'error');
    }
}

// Função auxiliar para formatar o número de telefone
function formatPhoneNumber(phone) {
    // Remove todos os caracteres não numéricos
    const numbers = phone.replace(/\D/g, '');
    
    // Adiciona o código do país (Brasil) se não estiver presente
    if (!numbers.startsWith('55')) {
        return `55${numbers}`;
    }
    return numbers;
}

// Função para mostrar notificações
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} notification`;
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.zIndex = '9999';
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Adicione este código onde você processa a venda
async function processSale(saleData) {
    try {
        // ... código existente de processamento da venda ...

        // Após salvar a venda com sucesso, gera e envia o PDF
        await generateAndSendPdf(saleData);

    } catch (error) {
        console.error('Erro ao processar venda:', error);
        showNotification('Erro ao processar venda', 'error');
    }
}

// Adicione esta função no início do arquivo
async function showPixModal(value, txid) {
    try {
        // Formatar o valor para exibição
        const formattedValue = parseFloat(value).toFixed(2);
        document.getElementById('pixValue').textContent = `R$ ${formattedValue}`;

        // Gerar código PIX usando o número da venda
        const pixCode = PixGenerator.generatePix(
            '14996516567',
            parseFloat(formattedValue),
            txid // Usando o identificador VENDA + número
        );

        // Gerar e exibir QR Code
        const qrCodeContainer = document.getElementById('qrCodeContainer');
        qrCodeContainer.innerHTML = ''; // Limpar conteúdo anterior
        
        const qrCodeUrl = await PixGenerator.generateQRCode(pixCode);
        
        // Criar e adicionar a imagem do QR Code
        const qrImage = document.createElement('img');
        qrImage.src = qrCodeUrl;
        qrImage.alt = 'QR Code PIX';
        qrCodeContainer.appendChild(qrImage);

        // Exibir código PIX
        document.getElementById('pixCode').textContent = pixCode;

        // Mostrar o modal
        $('#pixModal').modal('show');

        // Extrair a parte base64 da URL da imagem
        const base64Data = qrCodeUrl.split(',')[1];

        return { 
            pixCode, 
            qrCodeBase64: base64Data 
        };
    } catch (error) {
        console.error('Erro ao gerar PIX:', error);
        throw error;
    }
}

// Adicione esta função para copiar o código PIX
window.copyPixCode = function() {
    const pixCode = document.getElementById('pixCode').textContent;
    navigator.clipboard.writeText(pixCode).then(() => {
        showNotification('Código PIX copiado!', 'success');
    }).catch(() => {
        showNotification('Erro ao copiar código', 'error');
    });
}