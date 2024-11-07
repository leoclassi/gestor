document.addEventListener('DOMContentLoaded', function() {
    const dataAtual = new Date().toLocaleDateString('pt-BR');
    document.getElementById('dataAtual').textContent = dataAtual;

    function formatarMoeda(valor) {
        return `R$ ${parseFloat(valor).toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    }

    function converterParaNumero(valor) {
        if (!valor) return 0;
        if (typeof valor === 'number') return valor;
        return parseFloat(valor.replace(/[^\d,-]/g, '').replace(',', '.')) || 0;
    }

    function atualizarTotal() {
        const valorCheques = converterParaNumero(document.getElementById('totalCheques').textContent);
        const valorBoletos = converterParaNumero(document.getElementById('totalBoletos').textContent);
        const valorBB = converterParaNumero(document.getElementById('valorBB').value);
        const valorBradesco = converterParaNumero(document.getElementById('valorBradesco').value);

        const totalGeral = valorCheques + valorBoletos + valorBB + valorBradesco;
        document.getElementById('totalGeral').textContent = formatarMoeda(totalGeral);
    }

    ['valorBB', 'valorBradesco'].forEach(id => {
        const input = document.getElementById(id);
        
        input.addEventListener('input', function(e) {
            let valor = e.target.value.replace(/\D/g, '');
            if (valor) {
                valor = parseFloat(valor).toLocaleString('pt-BR');
            }
            e.target.value = valor;
            atualizarTotal();
        });

        input.addEventListener('blur', function(e) {
            let valor = converterParaNumero(e.target.value);
            e.target.value = valor ? formatarMoeda(valor) : '0';
            atualizarTotal();
        });

        input.addEventListener('focus', function(e) {
            let valor = e.target.value.replace(/\D/g, '');
            e.target.value = valor;
        });
    });

    Promise.all([
        fetch('/api/cheques-a-vencer').then(r => r.json()),
        fetch('/api/boletos-a-vencer').then(r => r.json())
    ]).then(([cheques, boletos]) => {
        document.getElementById('totalCheques').textContent = cheques.valor;
        document.getElementById('totalBoletos').textContent = boletos.valor;
        atualizarTotal();
    }).catch(error => {
        console.error('Erro ao carregar dados:', error);
        document.querySelectorAll('.value').forEach(el => {
            if (!el.classList.contains('value-input')) {
                el.textContent = 'Erro ao carregar';
            }
        });
    });
}); 