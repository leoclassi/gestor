document.addEventListener('DOMContentLoaded', function() {
    // Atualizar a data atual
    const dataAtual = new Date().toLocaleDateString('pt-BR');
    document.getElementById('dataAtual').textContent = dataAtual;

    // Buscar cheques a vencer
    fetch('/api/cheques-a-vencer')
        .then(response => response.json())
        .then(data => {
            document.getElementById('chequesAVencer').textContent = `${data.count} cheque(s) a vencer`;
            document.getElementById('valorCheques').textContent = data.valor;
        })
        .catch(error => {
            document.getElementById('chequesAVencer').textContent = 'Erro ao carregar dados';
            console.error('Erro:', error);
        });

    // Função para buscar vendas do mês
    function buscarVendas(offset = 0) {
        fetch(`/api/vendas-do-mes/${offset}`)
            .then(response => response.json())
            .then(data => {
                document.getElementById('vendasDoMes').textContent = `${data.count} venda(s) no mês`;
                document.getElementById('valorVendas').textContent = data.valor;
            })
            .catch(error => {
                document.getElementById('vendasDoMes').textContent = 'Erro ao carregar dados';
                console.error('Erro:', error);
            });
    }

    // Adicionar evento de mudança ao select
    document.getElementById('mesSelecionado').addEventListener('change', function(e) {
        const offset = e.target.value === 'previous' ? 1 : 0;
        buscarVendas(offset);
    });

    // Carregar vendas do mês atual inicialmente
    buscarVendas(0);

    // Buscar boletos a vencer
    fetch('/api/boletos-a-vencer')
        .then(response => response.json())
        .then(data => {
            document.getElementById('boletosAVencer').textContent = `${data.count} boleto(s) a vencer`;
            document.getElementById('valorBoletos').textContent = data.valor;
        })
        .catch(error => {
            document.getElementById('boletosAVencer').textContent = 'Erro ao carregar dados';
            console.error('Erro:', error);
        });
}); 