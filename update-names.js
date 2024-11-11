const fs = require('fs');
const path = require('path');

// Caminho para o arquivo cheques.json
const chequesPath = path.join(__dirname, 'data', 'cheques.json');

try {
    // Ler o arquivo
    const cheques = JSON.parse(fs.readFileSync(chequesPath, 'utf8'));

    // Padrões de nome a serem substituídos
    const patterns = [
        'MARIA CARREIRA MENDES',
        'Maria Carreira Mendes',
        'CARVAO GALETO LTDA'
    ];

    // Contador para acompanhar as alterações
    let alteracoes = 0;

    // Atualizar os nomes
    cheques.forEach(cheque => {
        if (cheque.remetente && patterns.some(pattern => cheque.remetente.includes(pattern))) {
            cheque.remetente = 'MARIA CARREIRA MENDES - ME';
            alteracoes++;
        }
    });

    // Salvar o arquivo atualizado
    fs.writeFileSync(chequesPath, JSON.stringify(cheques, null, 2));
    console.log(`Atualização concluída! ${alteracoes} registros foram modificados.`);

} catch (error) {
    console.error('Erro ao atualizar os nomes:', error);
} 