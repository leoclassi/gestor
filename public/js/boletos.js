// Função para ajustar a data para GMT-3
function adjustDateToGMTMinus3(dateString) {
    const date = new Date(dateString.replace(/\//g, '-'));
    return new Date(date.getTime() + (3 * 60 * 60 * 1000)); // Adiciona 3 horas
}

// Função para formatar a data
function formatDate(dateString) {
    const date = adjustDateToGMTMinus3(dateString);
    return date.toLocaleDateString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

// Função para obter o status da venda
function getSaleStatus(sale) {
    if (sale.paga) return 'pago';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let vencida = false;
    let aVencer = false;
    
    sale.parcelas.forEach(parcela => {
        const dataVencimento = adjustDateToGMTMinus3(parcela.data);
        if (!parcela.paga) {
            if (dataVencimento < today) {
                vencida = true;
            } else {
                aVencer = true;
            }
        }
    });
    
    if (vencida) return 'vencido';
    if (aVencer) return 'a_vencer';
    return 'pago';
}

// Função para obter a próxima data de vencimento
function getProximaDataVencimento(sale) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let proximaData = null;
    
    for (const parcela of sale.parcelas) {
        if (!parcela.paga) {
            const dataVencimento = adjustDateToGMTMinus3(parcela.data);
            if (!proximaData || dataVencimento < proximaData) {
                proximaData = dataVencimento;
            }
        }
    }
    
    return proximaData || new Date('9999-12-31');
}

// Função para calcular as somas
function calcularSomas(boletoSales) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    return boletoSales.reduce((somas, sale) => {
        sale.parcelas.forEach(parcela => {
            const valorParcela = parseFloat(parcela.valor);
            const dataVencimento = adjustDateToGMTMinus3(parcela.data);

            if (parcela.paga) {
                somas.pagos += valorParcela;
            } else if (dataVencimento < hoje) {
                somas.vencidos += valorParcela;
            } else {
                somas.aVencer += valorParcela;
            }
        });

        return somas;
    }, { vencidos: 0, aVencer: 0, pagos: 0 });
}

// Função para ler o último número de boleto
async function lerUltimoNumeroBoleto() {
    try {
        const response = await fetch('/api/boletos');
        const data = await response.json();
        return data.ultimoNumeroBoleto;
    } catch (error) {
        console.error('Erro ao ler o último número de boleto:', error);
        return 199; // Valor padrão caso ocorra um erro
    }
}

// Função para atualizar o último número de boleto
async function atualizarUltimoNumeroBoleto(numeroInicial, quantidadeParcelas) {
    try {
        const ultimoNumero = numeroInicial + quantidadeParcelas - 1;
        await fetch('/api/boletos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ultimoNumeroBoleto: ultimoNumero }),
        });
    } catch (error) {
        console.error('Erro ao atualizar o último número de boleto:', error);
    }
}

// Função para atualizar o último número de boleto
async function atualizarUltimoNumeroBoleto(numero) {
    try {
        await fetch('/api/boletos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ultimoNumeroBoleto: numero }),
        });
    } catch (error) {
        console.error('Erro ao atualizar o último número de boleto:', error);
    }
}

// Adicione esta função auxiliar no início do arquivo ou antes da função generateRemessa
function removeAcentos(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
               .replace(/[^a-zA-Z0-9\s]/g, ""); // Remove caracteres especiais, mantendo apenas letras, números e espaços
}

// Adicione esta função no início do arquivo, junto com as outras funções
async function updateLastRemessaNumber() {
    try {
        const response = await fetch('/api/boletos');
        const data = await response.json();
        const lastNumber = data.ultimoNumeroBoleto || 0;
        
        const element = document.getElementById('lastRemessaNumber');
        if (element) {
            element.textContent = lastNumber;
        }
    } catch (error) {
        console.error('Erro ao buscar último número de remessa:', error);
    }
}

// Adicione esta função para incrementar o número
async function incrementarNumeroRemessa() {
    try {
        const response = await fetch('/api/boletos');
        const data = await response.json();
        const novoNumero = (data.ultimoNumeroBoleto || 0) + 1;
        
        await fetch('/api/boletos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ultimoNumeroBoleto: novoNumero }),
        });

        // Atualiza o número na interface
        const element = document.getElementById('lastRemessaNumber');
        if (element) {
            element.textContent = novoNumero;
        }
    } catch (error) {
        console.error('Erro ao incrementar número de remessa:', error);
    }
}

// Mover funções auxiliares para o escopo global
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function preencherTabelaBoletos(boletos, tableBody) {
    boletos.forEach(sale => {
        const row = document.createElement('tr');
        row.setAttribute('data-sale-id', sale.id);
        row.innerHTML = `
            <td>${sale.numero}</td>
            <td>${sale.cliente}</td>
            <td>${formatDate(sale.data)}</td>
            <td>${formatCurrency(sale.valorFinal)}</td>
            <td style="white-space: nowrap;">${getStatusBadge(getSaleStatus(sale), sale.parcelas)}</td>
            <td class="text-center">
                <button class="btn btn-sm btn-info" onclick="viewSale('${sale.id}')" title="Ver">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-primary" onclick="editSale('${sale.id}')" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-secondary" onclick="toggleParcelas('${sale.id}')" title="Parcelas">
                    <i class="fas fa-list"></i>
                </button>
                ${!sale.parcelas.every(p => p.paga) ? `
                    <button class="btn btn-sm btn-warning" onclick="generateRemessa('${sale.id}')" title="Gerar Remessa">
                        <i class="fas fa-file-export"></i>
                    </button>
                ` : ''}
            </td>
        `;
        tableBody.appendChild(row);

        // Adicionar linha para detalhes das parcelas
        const detailRow = document.createElement('tr');
        detailRow.id = `parcelas-${sale.id}`;
        detailRow.style.display = 'none';
        detailRow.innerHTML = `
            <td colspan="6">
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
                            ${generateParcelDetails(sale)}
                        </tbody>
                    </table>
                </div>
            </td>
        `;
        tableBody.appendChild(detailRow);
    });
}

// Função para animar a contagem dos números
function animateValue(element, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const current = Math.floor(progress * (end - start) + start);
        element.textContent = formatCurrency(current);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

// Função para atualizar a interface com as somas
function atualizarSomas(somas) {
    const duration = 1000; // Duração da animação em milissegundos
    animateValue(document.getElementById('somaVencidos'), 0, somas.vencidos, duration);
    animateValue(document.getElementById('somaAVencer'), 0, somas.aVencer, duration);
    animateValue(document.getElementById('somaPagos'), 0, somas.pagos, duration);
}

// Mover a função getStatusBadge para o escopo global
function getStatusBadge(status, parcelas) {
    if (!Array.isArray(parcelas) || parcelas.length === 0) {
        return `<span class="badge badge-secondary status-badge">Status Indefinido</span>`;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let vencidasCount = 0;
    let aVencerCount = 0;
    let pagasCount = 0;
    let statusDetails = [];
    let protestoCount = 0;

    parcelas.forEach((parcela, index) => {
        const dueDateObj = adjustDateToGMTMinus3(parcela.data);
        dueDateObj.setHours(0, 0, 0, 0);
        const timeDiff = dueDateObj - today;
        const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

        let badgeClass, statusText;
        if (parcela.paga) {
            pagasCount++;
            badgeClass = 'success';
            statusText = 'Paga';
        } else if (dueDateObj < today) {
            vencidasCount++;
            badgeClass = 'danger';
            if (Math.abs(daysDiff) >= 15) {
                protestoCount++;
                statusText = `PROTESTO`;
            } else {
                statusText = `${Math.abs(daysDiff)}d atrás`;
            }
        } else if (daysDiff === 0) {
            aVencerCount++;
            badgeClass = 'warning';
            statusText = 'Vence hoje';
        } else {
            aVencerCount++;
            badgeClass = 'info';
            statusText = `em ${daysDiff}d`;
        }

        statusDetails.push(`<div class="parcela-status"><span class="badge badge-${badgeClass}">${index + 1}ª</span> ${statusText}</div>`);
    });

    let mainStatus;
    if (protestoCount > 0) {
        mainStatus = `${vencidasCount} vencida${vencidasCount > 1 ? 's' : ''} (${protestoCount} em protesto)`;
    } else if (vencidasCount > 0) {
        mainStatus = `${vencidasCount} vencida${vencidasCount > 1 ? 's' : ''}`;
    } else if (aVencerCount > 0) {
        mainStatus = `${aVencerCount} a vencer`;
    } else {
        mainStatus = `Todas pagas`;
    }

    return `
        <div class="status-container">
            <div class="status-details">
                ${statusDetails.join('')}
            </div>
        </div>
    `;
}

// Mover a função generateParcelDetails para o escopo global
function generateParcelDetails(sale) {
    if (!sale.parcelas || !Array.isArray(sale.parcelas)) {
        return '<tr><td colspan="4">Não há informações de parcelas disponíveis</td></tr>';
    }
    
    return sale.parcelas.map(parcela => `
        <tr>
            <td>${parcela.numero}</td>
            <td>${formatDate(parcela.data)}</td>
            <td>${formatCurrency(parcela.valor)}</td>
            <td>
                ${parcela.paga ? 
                    '<span class="badge badge-success">Paga</span>' :
                    `<button class="btn btn-sm btn-success btn-mark-paid" onclick="markAsPaid('${sale.id}', ${parcela.numero})">Marcar como Paga</button>`
                }
            </td>
        </tr>
    `).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    const boletosTableBody = document.getElementById('boletosTableBody');
    const themeToggle = document.getElementById('themeToggle');
    const body = document.body;

    // Aplicar tema salvo
    const savedTheme = localStorage.getItem('theme') || 'light';
    body.classList.add(savedTheme);

    // Alternar tema
    themeToggle.addEventListener('click', () => {
        body.classList.toggle('dark-theme');
        const newTheme = body.classList.contains('dark-theme') ? 'dark-theme' : 'light';
        localStorage.setItem('theme', newTheme);
    });

    // Função para carregar os boletos
    function loadBoletos() {
        const token = localStorage.getItem('token');
        fetch('/api/sales', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => response.json())
        .then(sales => {
            const boletoSales = sales.filter(sale => sale.formaPagamento === "Boleto Bancário");
            
            // Separar boletos pagos dos ativos
            const boletosPagos = boletoSales.filter(sale => 
                sale.parcelas && sale.parcelas.every(parcela => parcela.paga)
            );
            
            const boletosAtivos = boletoSales.filter(sale => 
                sale.parcelas && sale.parcelas.some(parcela => !parcela.paga)
            );
            
            // Ordenar boletos ativos
            boletosAtivos.sort((a, b) => {
                const statusA = getSaleStatus(a);
                const statusB = getSaleStatus(b);
                
                if (statusA === 'vencido' && statusB !== 'vencido') return -1;
                if (statusB === 'vencido' && statusA !== 'vencido') return 1;
                
                if (statusA === 'a_vencer' && statusB === 'pago') return -1;
                if (statusB === 'a_vencer' && statusA === 'pago') return 1;
                
                return getProximaDataVencimento(a) - getProximaDataVencimento(b);
            });

            // Ordenar boletos pagos (mais recentes primeiro)
            boletosPagos.sort((a, b) => new Date(b.data) - new Date(a.data));

            // Calcular as somas
            const somas = calcularSomas(boletoSales);
            atualizarSomas(somas);

            // Preencher tabela de boletos ativos
            const boletosAtivosTableBody = document.getElementById('boletosAtivosTableBody');
            boletosAtivosTableBody.innerHTML = '';
            preencherTabelaBoletos(boletosAtivos, boletosAtivosTableBody);

            // Preencher tabela de boletos pagos
            const boletosPagosTableBody = document.getElementById('boletosPagosTableBody');
            boletosPagosTableBody.innerHTML = '';
            preencherTabelaBoletos(boletosPagos, boletosPagosTableBody);
        })
        .catch(error => console.error('Erro ao carregar boletos:', error));
    }

    // Função para marcar uma parcela como paga
    window.markAsPaid = async (saleId, parcelNumber) => {
        try {
            const response = await fetch('/api/mark-parcel-as-paid', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ saleId: saleId, parcelIndex: parseInt(parcelNumber) - 1 }) // Subtrai 1 do número da parcela para obter o índice correto
            });

            if (!response.ok) {
                throw new Error('Falha na requisição');
            }

            const result = await response.json();
            if (result.success) {
                if (result.saleStatus === 'Pago') {
                    const statusCell = document.querySelector(`tr[data-sale-id="${saleId}"] td:nth-child(5)`);
                    if (statusCell) {
                        statusCell.innerHTML = getStatusBadge('Pago', []);
                    }
                }
                loadBoletos(); // Recarregar os boletos para atualizar a interface
            } else {
                alert(result.message);
            }
        } catch (error) {
            console.error('Erro ao marcar a parcela como paga:', error);
            alert('Erro ao marcar a parcela como paga. Por favor, tente novamente.');
        }
    };

    // Função para visualizar uma venda
    window.viewSale = (id) => {
        window.location.href = `view-sale.html?id=${id}`;
    };

    // Função para editar uma venda
    window.editSale = (id) => {
        window.location.href = `sales.html?id=${id}`;
    };

    // Função para alternar a visibilidade das parcelas
    window.toggleParcelas = (id) => {
        const detailRow = document.getElementById(`parcelas-${id}`);
        detailRow.style.display = detailRow.style.display === 'none' ? 'table-row' : 'none';
    };

    // Função para gerar o arquivo de remessa
    window.generateRemessa = async (saleId) => {
        try {
            // Obter os detalhes da venda
            const saleResponse = await fetch(`/api/sales/${saleId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const sale = await saleResponse.json();

            // Obter os detalhes do cliente
            const clientResponse = await fetch('/api/clients', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const clients = await clientResponse.json();
            const client = clients.find(c => c.nome === sale.cliente);

            // Determinar o tipo de cliente e o documento
            let tipoCliente, documento;
            if (client.tipoCliente === "Pessoa Física") {
                tipoCliente = "01";
                documento = client.cpf.replace(/\D/g, '').padStart(14, '0');
            } else {
                tipoCliente = "02";
                documento = client.cnpj.replace(/\D/g, '');
            }

            // Formatar o nome do cliente
            const nomeCliente = removeAcentos(client.nome).padEnd(37, ' ').slice(0, 37);

            // Formatar o endereço do cliente
            const logradouroNumero = removeAcentos(`${client.endereco.logradouro} ${client.endereco.numero}`).trim();
            const enderecoFormatado = `   ${logradouroNumero.padEnd(40, ' ').slice(0, 40)}`;
            const bairroFormatado = removeAcentos(client.endereco.bairro).padEnd(12, ' ').slice(0, 12);

            // Formatar CEP, cidade e UF
            const cepFormatado = client.endereco.cep.replace(/\D/g, '').padStart(8, '0');
            const cidadeFormatada = removeAcentos(client.endereco.cidade).padEnd(15, ' ').slice(0, 15);
            const ufFormatada = client.endereco.uf.toUpperCase().padEnd(2, ' ').slice(0, 2);

            // Formatar o número da venda com zeros à esquerda para 7 dígitos
            const formattedSaleNumber = sale.numero.padStart(7, '0');

            // Obtenha a data atual no fuso horário GMT-3
            const dataAtual = new Date(new Date().getTime() - 3 * 60 * 60 * 1000);
            const dataFormatada = dataAtual.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: '2-digit',
                timeZone: 'America/Sao_Paulo'
            }).replace(/\//g, '');

            // Primeira linha do arquivo .rem com o número da venda formatado
            const primeiraLinha = `01REMESSA01COBRANCA       20346000005711000000VALDECI BATISTA PIRES         001BANCODOBRASIL  ${dataFormatada}${formattedSaleNumber}                      1813335                                                                                                                                                                                                                                                                  000001`;

            let linhasRemessa = [primeiraLinha];
            let sequencial = 2;
            let numeroBoleto = await lerUltimoNumeroBoleto() + 1; // Lê o último número e incrementa

            // Gerar linhas para cada parcela
            for (const parcela of sale.parcelas) {
                // Formatar o número da venda com zeros à esquerda para 4 dígitos
                const formattedSaleNumber4Digits = sale.numero.padStart(4, '0');

                // Formatar o número da venda para o final da linha (preenchido com espaços à direita)
                const formattedSaleNumberEnd = sale.numero.padEnd(10, ' ');

                const dataParcela = new Date(parcela.data);
                const dataVencimento = dataParcela.toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: '2-digit'
                }).replace(/\//g, '');

                // Calcular a data de vencimento acrescida de 10 dias
                const dataAcrescida = new Date(dataParcela);
                dataAcrescida.setDate(dataAcrescida.getDate() + 1);
                const dataVencimentoAcrescida = dataAcrescida.toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: '2-digit'
                }).replace(/\//g, '');

                // Formatar o valor da parcela
                const valorParcela = Math.round(parcela.valor * 100).toString().padStart(13, '0');

                // Usar o número do boleto em todos os lugares relevantes
                const numeroBoletoFormatado = numeroBoleto.toString().padStart(3, '0');
                const segundaLinhaBase = `70208643961000126203460000057111813335${numeroBoletoFormatado}`;
                const espacosEmBranco = ' '.repeat(25 - numeroBoletoFormatado.length);
                const segundaLinha = `${segundaLinhaBase}${espacosEmBranco}18133350000000${numeroBoletoFormatado}0000       0270000000     1701${numeroBoletoFormatado}       ${dataVencimento}${valorParcela}0010000 01A${dataFormatada}15000000000000000000000000000000000000000000000000000000000000${tipoCliente}${documento}${nomeCliente}${enderecoFormatado}${bairroFormatado}${cepFormatado}${cidadeFormatada}${ufFormatada}                                        00 ${sequencial.toString().padStart(6, '0')}`;
                linhasRemessa.push(segundaLinha);
                sequencial++;

                const terceiraLinha = `5992${dataVencimentoAcrescida}000000000200                                                                                                                                                                                                                                                                                                                                                                                    ${sequencial.toString().padStart(6, '0')}`;
                linhasRemessa.push(terceiraLinha);
                sequencial++;

                numeroBoleto++; // Incrementa o número do boleto para a próxima parcela
            }

            // Atualiza o último número de boleto usado
            await atualizarUltimoNumeroBoleto(numeroBoleto - 1);

            // Adicionar a linha de fechamento
            const linhaFechamento = `9${''.padEnd(393, ' ')}${sequencial.toString().padStart(6, '0')}`;
            linhasRemessa.push(linhaFechamento);

            // Conteúdo completo do arquivo .rem
            const remessaContent = linhasRemessa.join('\n');

            // Crie um Blob com o conteúdo
            const blob = new Blob([remessaContent], { type: 'text/plain' });

            // Crie um URL para o Blob
            const downloadUrl = window.URL.createObjectURL(blob);

            // Formatar o nome do cliente para o nome do arquivo
            const clienteNomeFormatado = client.nome.replace(/[^a-z0-9]/gi, '_').toLowerCase();

            // Crie um elemento <a> para download
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = downloadUrl;
            a.download = `remessa_${clienteNomeFormatado}.rem`;

            // Adicione o elemento ao corpo do documento, clique nele e remova-o
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            document.body.removeChild(a);

            // Após gerar a remessa com sucesso, atualizar o número mostrado
            updateLastRemessaNumber();
        } catch (error) {
            console.error('Erro ao gerar remessa:', error);
            alert('Erro ao gerar arquivo de remessa. Por favor, tente novamente.');
        }
    };

    // Carregar boletos ao iniciar a página
    loadBoletos();
    
    // Atualizar o número da última remessa
    updateLastRemessaNumber();

    // Ativar os tooltips do Bootstrap
    $('[data-toggle="tooltip"]').tooltip();

    // Adicionar listener para o botão de incremento
    const incrementButton = document.getElementById('incrementRemessa');
    if (incrementButton) {
        incrementButton.addEventListener('click', incrementarNumeroRemessa);
    }
});
