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

        sales.forEach(sale => {
            const date = new Date(sale.data);
            const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;

            if (!monthlySales[monthYear]) {
                monthlySales[monthYear] = 0;
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
        });

        const labels = Object.keys(monthlySales).sort((a, b) => {
            const [monthA, yearA] = a.split('/').map(Number);
            const [monthB, yearB] = b.split('/').map(Number);
            return new Date(yearA, monthA - 1) - new Date(yearB, monthB - 1);
        });

        const values = labels.map(label => monthlySales[label]);

        return { labels, values };
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
        const textColor = isDarkTheme ? '#e0e0e0' : '#333333';
        const gridColor = isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: salesData.labels,
                datasets: [{
                    label: 'Vendas Mensais (R$)',
                    data: salesData.values,
                    backgroundColor: isDarkTheme ? 'rgba(75, 192, 192, 0.5)' : 'rgba(75, 192, 192, 0.2)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
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
                    },
                    x: {
                        ticks: {
                            color: textColor,
                            autoSkip: false
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