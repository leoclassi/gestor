const fs = require('fs').promises;
const path = require('path');

const CONTATOS_FILE = path.join(__dirname, 'contatos.json');

async function corrigirTelefones() {
    try {
        const data = await fs.readFile(CONTATOS_FILE, 'utf8');
        let contatos = JSON.parse(data);

        // Corrigir telefones e converter nomes para maiúsculas
        contatos = contatos.filter(contato => {
            let telefone = contato.telefone;

            // Remover o 15/015 depois do 55
            if (telefone.match(/^55015/) || telefone.match(/^5515/)) {
                if (telefone.startsWith('55015')) {
                    telefone = '55' + telefone.substring(5);
                } else if (telefone.startsWith('5515')) {
                    telefone = '55' + telefone.substring(4);
                }
            }

            // Atualizar o telefone corrigido
            contato.telefone = telefone;

            // Converter nome para maiúsculas
            contato.nome = contato.nome.toUpperCase();

            // Manter apenas telefones com tamanho adequado
            return telefone.length <= 13;
        });

        // Salvar o arquivo atualizado
        await fs.writeFile(CONTATOS_FILE, JSON.stringify(contatos, null, 2));
        console.log('Contatos atualizados com sucesso! (telefones corrigidos e nomes em maiúsculas)');

    } catch (error) {
        console.error('Erro ao atualizar contatos:', error);
    }
}

// Executar as correções
corrigirTelefones(); 