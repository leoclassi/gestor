document.addEventListener('DOMContentLoaded', () => {
    const ctx = document.getElementById('salesChart').getContext('2d');

    fetch('/api/sales')
        .then(response => response.json())
        .then(data => {
            const salesData = processSalesData(data);
            renderChart(salesData);
        })
        .catch(error => console.error('Erro ao buscar dados de vendas:', error));

    function processSalesData(sales) {
        const monthlySales = {};
        const monthlyPaidSales = {};

        sales.forEach(sale => {
            // Parse da data para garantir que é tratada como local
            const parts = sale.data.split('-');
            const date = new Date(parts[0], parts[1] - 1, parts[2]);
            const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;

            if (!monthlySales[monthYear]) {
                monthlySales[monthYear] = 0;
                monthlyPaidSales[monthYear] = 0;
            }

            let valorTotalProdutos = sale.produtos.reduce((total, produto) => {
                let subtotal = produto.quantidade * produto.valor;
                if (produto.descontoTipo === 'percentage') {
                    subtotal *= (1 - produto.desconto / 100);
                } else {
                    subtotal -= produto.desconto;
                }
                return total + subtotal;
            }, 0);

            if (sale.descontoTotal) {
                if (sale.descontoTotal.tipo === 'percentage') {
                    valorTotalProdutos *= (1 - sale.descontoTotal.valor / 100);
                } else {
                    valorTotalProdutos -= sale.descontoTotal.valor;
                }
            }

            monthlySales[monthYear] += valorTotalProdutos;

            if (sale.paga) {
                monthlyPaidSales[monthYear] += valorTotalProdutos;
            }
        });

        const labels = Object.keys(monthlySales).sort((a, b) => {
            const [monthA, yearA] = a.split('/').map(Number);
            const [monthB, yearB] = b.split('/').map(Number);
            return new Date(yearA, monthA - 1) - new Date(yearB, monthB - 1);
        });

        const values = labels.map(label => monthlySales[label]);
        const paidValues = labels.map(label => monthlyPaidSales[label]);

        return { labels, values, paidValues };
    }

    function formatarMoeda(valor) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(valor);
    }

    function renderChart(salesData) {
        const isDarkTheme = document.body.classList.contains('dark-theme');
        const textColor = isDarkTheme ? '#ffffff' : '#000000';
        const gridColor = isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
        const barColor = isDarkTheme ? 'rgba(75, 192, 192, 1)' : 'rgba(75, 192, 192, 1)';
        const lineColor = 'rgba(255, 0, 0, 1)'; // Cor sólida para a linha de vendas pagas

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: salesData.labels,
                datasets: [
                    {
                        label: 'Vendas Mensais (R$)',
                        data: salesData.values,
                        backgroundColor: barColor,
                        borderColor: barColor,
                        borderWidth: 1,
                        barPercentage: 0.8,
                        categoryPercentage: 0.9,
                        order: 2 // Define a ordem de renderização (2 = atrás)
                    },
                    {
                        label: 'Vendas Pagas (R$)',
                        data: salesData.paidValues,
                        type: 'line',
                        backgroundColor: lineColor,
                        borderColor: lineColor,
                        borderWidth: 2,
                        tension: 0.1,
                        fill: false, // Remove o preenchimento abaixo da linha
                        order: 1 // Define a ordem de renderização (1 = na frente)
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    x: {
                        ticks: {
                            color: textColor,
                            autoSkip: false
                        },
                        grid: {
                            color: gridColor
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: textColor,
                            callback: function(value) {
                                return formatarMoeda(value);
                            }
                        },
                        grid: {
                            color: gridColor
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Gráfico de Vendas',
                        color: textColor,
                        font: {
                            size: 18
                        }
                    },
                    legend: {
                        labels: {
                            color: textColor
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return formatarMoeda(context.raw);
                            }
                        }
                    }
                }
            }
        });
    }
});