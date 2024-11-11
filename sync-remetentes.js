const fs = require('fs');
const path = require('path');

// Caminhos dos arquivos
const chequesPath = path.join(__dirname, 'data', 'cheques.json');
const remetentesPath = path.join(__dirname, 'data', 'remetentes.json');

try {
    // Ler os arquivos
    const cheques = JSON.parse(fs.readFileSync(chequesPath, 'utf8'));
    let remetentesAtuais = [];
    try {
        remetentesAtuais = JSON.parse(fs.readFileSync(remetentesPath, 'utf8'));
    } catch (e) {
        console.log('Arquivo remetentes.json não existe ou está vazio');
    }

    // Extrair remetentes únicos dos cheques
    const remetentesUnicos = new Map();
    
    cheques.forEach(cheque => {
        if (cheque.remetente) {
            // Converter nome para maiúsculas
            const nomeUpperCase = cheque.remetente.toUpperCase();
            
            if (!remetentesUnicos.has(nomeUpperCase)) {
                // Procurar informações bancárias do remetente
                const info = cheques.find(c => 
                    c.remetente.toUpperCase() === nomeUpperCase && 
                    c.banco && 
                    c.agencia && 
                    c.contaCorrente
                );

                remetentesUnicos.set(nomeUpperCase, {
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                    nome: nomeUpperCase, // Salvar o nome em maiúsculas
                    banco: info?.banco || null,
                    agencia: info?.agencia || null,
                    conta: info?.contaCorrente || null
                });
            }
        }
    });

    // Converter Map para array e garantir que nomes existentes também estejam em maiúsculas
    const novosRemetentes = Array.from(remetentesUnicos.values());

    // Manter remetentes existentes que não estão nos cheques (também em maiúsculas)
    remetentesAtuais.forEach(rem => {
        const nomeUpperCase = rem.nome.toUpperCase();
        if (!remetentesUnicos.has(nomeUpperCase)) {
            novosRemetentes.push({
                ...rem,
                nome: nomeUpperCase // Converter nome existente para maiúsculas
            });
        }
    });

    // Ordenar remetentes por nome
    novosRemetentes.sort((a, b) => a.nome.localeCompare(b.nome));

    // Salvar arquivo atualizado
    fs.writeFileSync(remetentesPath, JSON.stringify(novosRemetentes, null, 2));
    console.log(`Sincronização concluída! ${novosRemetentes.length} remetentes salvos em maiúsculas.`);

} catch (error) {
    console.error('Erro ao sincronizar remetentes:', error);
} 