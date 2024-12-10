class WhatsAppMarketing {
    constructor() {
        this.contatos = [];
        this.carregarContatos();
        this.templates = {
            orcamento: (nome) => `Olá ${nome}! 👋

Tudo bem? Somos da Portugal Madeiras e gostaríamos de saber se você está precisando de algum orçamento de madeiras? 🌳

Temos Madeiras Tratadas em Geral:
• Madeira para construção civil
• Palanques e repiques
• Vigas e caibros
• Tábuas e ripas

Será um prazer te atender! 😊`
        };
    }

    async carregarContatos() {
        try {
            const response = await fetch('/api/contatos');
            const data = await response.json();
            
            // Verifica se data é um array
            this.contatos = Array.isArray(data) ? data : [];
            
            this.atualizarListaContatos();
            this.atualizarEstatisticas();
        } catch (error) {
            console.error('Erro ao carregar contatos:', error);
            this.mostrarNotificacao('Erro ao carregar contatos. Tentando novamente...', 'error');
            
            // Tenta carregar novamente após 2 segundos
            setTimeout(() => this.carregarContatos(), 2000);
        }
    }

    async salvarContatos() {
        try {
            await fetch('/api/contatos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.contatos)
            });
        } catch (error) {
            console.error('Erro ao salvar contatos:', error);
            this.mostrarNotificacao('Erro ao salvar contatos', 'error');
        }
    }

    atualizarListaContatos() {
        const tbody = document.getElementById('contatosTable');
        if (!tbody) return;
        
        tbody.innerHTML = '';

        this.contatos.forEach((contato, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="width: 5%; text-align: center;">
                    <input type="checkbox" class="form-check-input">
                </td>
                <td style="width: 40%; padding-left: 15px;">${contato.nome}</td>
                <td style="width: 35%; text-align: center;">${this.formatarTelefone(contato.telefone)}</td>
                <td style="width: 20%; text-align: center;">
                    <button class="btn btn-sm btn-outline-primary" onclick="marketing.editarContato(${index})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="marketing.removerContato(${index})" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        this.atualizarEstatisticas();
    }

    atualizarEstatisticas() {
        const stats = {
            total: this.contatos.length,
            mensagens: this.contatos.reduce((total, c) => total + (c.mensagensEnviadas || 0), 0)
        };

        // Atualiza os valores nos elementos
        document.getElementById('totalContatos').textContent = stats.total.toLocaleString();
        document.getElementById('mensagensEnviadas').textContent = stats.mensagens.toLocaleString();
    }

    adicionarContato(nome, telefone, grupo = 'Geral') {
        const novoContato = {
            nome,
            telefone: this.formatarTelefone(telefone),
            grupo,
            ativo: true,
            dataCadastro: new Date().toISOString(),
            mensagensEnviadas: 0
        };

        this.contatos.push(novoContato);
        this.salvarContatos();
        this.atualizarListaContatos();
        this.mostrarNotificacao('Contato adicionado com sucesso!', 'success');
    }

    removerContato(index) {
        if (confirm('Tem certeza que deseja remover este contato?')) {
            this.contatos.splice(index, 1);
            this.salvarContatos();
            this.atualizarListaContatos();
            this.mostrarNotificacao('Contato removido com sucesso!', 'success');
        }
    }

    editarContato(index) {
        const contato = this.contatos[index];
        const novoNome = prompt('Nome:', contato.nome);
        const novoTelefone = prompt('Telefone:', contato.telefone);
        const novoGrupo = prompt('Grupo:', contato.grupo);

        if (novoNome && novoTelefone) {
            this.contatos[index] = {
                ...contato,
                nome: novoNome,
                telefone: this.formatarTelefone(novoTelefone),
                grupo: novoGrupo || 'Geral'
            };
            this.salvarContatos();
            this.atualizarListaContatos();
            this.mostrarNotificacao('Contato atualizado com sucesso!', 'success');
        }
    }

    importarArquivo(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const conteudo = e.target.result;
                const linhas = conteudo.split('\n');
                let importados = 0;

                linhas.forEach(linha => {
                    if (!linha.trim()) return;
                    
                    const [nome, telefone, grupo] = linha.split(',').map(s => s.trim());
                    if (nome && telefone) {
                        this.contatos.push({
                            nome,
                            telefone: this.formatarTelefone(telefone),
                            grupo: grupo || 'Geral',
                            ativo: true,
                            dataCadastro: new Date().toISOString(),
                            mensagensEnviadas: 0
                        });
                        importados++;
                    }
                });

                this.salvarContatos();
                this.atualizarListaContatos();
                this.mostrarNotificacao(`${importados} contatos importados com sucesso!`, 'success');
                
                const modal = bootstrap.Modal.getInstance(document.getElementById('importModal'));
                if (modal) modal.hide();
            } catch (error) {
                this.mostrarNotificacao('Erro ao importar arquivo. Verifique o formato.', 'error');
            }
        };
        reader.readAsText(file);
    }

    formatarTelefone(telefone) {
        // Remove todos os caracteres não numéricos
        let numero = telefone.replace(/\D/g, '');
        
        // Remove o 0 à esquerda do DDD se existir
        if (numero.length > 12 && numero.substring(2, 3) === '0') {
            numero = numero.substring(0, 2) + numero.substring(3);
        }
        
        // Adiciona 55 se não tiver
        if (numero.length <= 11) {
            numero = '55' + numero;
        }
        
        // Adiciona 9 depois do DDD se tiver apenas 12 dígitos
        if (numero.length === 12) {
            numero = numero.substring(0, 4) + '9' + numero.substring(4);
        }

        // Formata para o padrão +55 (DDD) XXXXX-XXXX
        const ddd = numero.substring(2, 4);
        const numeroFinal = numero.substring(4);
        
        return `+55 (${ddd}) ${numeroFinal}`;
    }

    mostrarNotificacao(mensagem, tipo) {
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-white bg-${tipo} border-0`;
        toast.style.position = 'fixed';
        toast.style.top = '20px';
        toast.style.right = '20px';
        toast.style.zIndex = '1050';
        
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">${mensagem}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;
        
        document.body.appendChild(toast);
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
        
        setTimeout(() => toast.remove(), 3000);
    }

    setupEventListeners() {
        document.getElementById('importarContatos')?.addEventListener('click', () => {
            $('#importModal').modal('show');
        });

        document.getElementById('fileInput')?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) this.importarArquivo(file);
        });

        document.getElementById('importarExcel')?.addEventListener('click', () => {
            document.getElementById('uploadArea').classList.remove('d-none');
        });

        document.getElementById('searchContato')?.addEventListener('input', (e) => {
            this.filtrarContatos(e.target.value);
        });

        document.getElementById('importarGoogle')?.addEventListener('click', () => {
            this.importarDoGoogle();
        });

        document.getElementById('novaCampanha')?.addEventListener('click', () => {
            $('#campanhaModal').modal('show');
            this.preencherSelectContatos();
            this.preencherTemplate();
        });

        document.getElementById('enviarCampanha')?.addEventListener('click', () => {
            this.enviarCampanha();
        });

        document.getElementById('tipoCampanha')?.addEventListener('change', () => {
            this.preencherTemplate();
        });

        document.getElementById('tipoEnvio')?.addEventListener('change', (e) => {
            const isGrupo = e.target.value === 'grupo';
            document.getElementById('grupoSection').classList.toggle('d-none', !isGrupo);
            document.getElementById('contatoSection').classList.toggle('d-none', isGrupo);
        });

        document.getElementById('contatoEspecifico')?.addEventListener('change', () => {
            this.preencherTemplate();
        });
    }

    filtrarContatos(termo) {
        const tbody = document.getElementById('contatosTable');
        const linhas = tbody.getElementsByTagName('tr');
        
        for (const linha of linhas) {
            const nome = linha.cells[1].textContent.toLowerCase();
            const telefone = linha.cells[2].textContent.toLowerCase();
            const grupo = linha.cells[3].textContent.toLowerCase();
            
            const corresponde = nome.includes(termo.toLowerCase()) || 
                              telefone.includes(termo.toLowerCase()) ||
                              grupo.includes(termo.toLowerCase());
            
            linha.style.display = corresponde ? '' : 'none';
        }
    }

    async importarDoGoogle() {
        // Criar modal com instruções
        const modalContent = `
            <div class="modal-body">
                <h5>Como importar contatos do Google:</h5>
                <ol class="mb-4">
                    <li>Acesse <a href="https://contacts.google.com" target="_blank">Google Contacts</a></li>
                    <li>No menu lateral, clique em "Exportar"</li>
                    <li>Selecione "Google CSV" como formato</li>
                    <li>Clique em "Exportar"</li>
                    <li>Selecione o arquivo baixado abaixo:</li>
                </ol>
                <div class="upload-area">
                    <i class="fas fa-cloud-upload-alt fa-3x mb-3"></i>
                    <h5>Arraste o arquivo CSV aqui</h5>
                    <p class="text-muted">ou</p>
                    <input type="file" id="googleCsvInput" class="d-none" accept=".csv">
                    <button class="btn btn-primary" onclick="document.getElementById('googleCsvInput').click()">
                        Selecionar Arquivo
                    </button>
                </div>
            </div>
        `;

        // Atualizar o conteúdo do modal
        const modalBody = document.querySelector('#importModal .modal-body');
        modalBody.innerHTML = modalContent;

        // Adicionar event listener para o input de arquivo
        document.getElementById('googleCsvInput').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) this.processarCsvGoogle(file);
        });
    }

    async processarCsvGoogle(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const conteudo = e.target.result;
                const linhas = conteudo.split('\n');
                let importados = 0;

                // Pular a primeira linha (cabeçalho)
                for (let i = 1; i < linhas.length; i++) {
                    const linha = linhas[i];
                    if (!linha.trim()) continue;

                    // Dividir a linha em colunas
                    const colunas = linha.split(',').map(col => col.trim());
                    
                    // Extrair nome e telefone
                    let nome = '';
                    if (colunas[0]) nome = colunas[0]; // First Name
                    if (colunas[1]) nome += ' ' + colunas[1]; // Middle Name
                    if (colunas[2]) nome += ' ' + colunas[2]; // Last Name
                    nome = nome.trim() || 'Sem Nome';

                    // O telefone está na coluna "Phone 1 - Value" (índice 18)
                    let telefone = colunas[18]?.trim();
                    
                    // Se não houver telefone na primeira posição, tentar outras posições de telefone
                    if (!telefone) {
                        // Procurar em todas as colunas por um número de telefone
                        for (let j = 0; j < colunas.length; j++) {
                            const valor = colunas[j]?.trim();
                            if (valor && (
                                valor.includes('+55') || 
                                valor.match(/^\d{11,}$/) || // Números com 11 ou mais dígitos
                                valor.match(/^\d{2}\s?\d{4,5}-?\d{4}$/) // Formato (XX) XXXXX-XXXX
                            )) {
                                telefone = valor;
                                break;
                            }
                        }
                    }

                    if (telefone) {
                        // Limpar o telefone
                        telefone = telefone.replace(/[^\d+]/g, '');
                        
                        // Adicionar +55 se não tiver
                        if (!telefone.startsWith('+') && !telefone.startsWith('55')) {
                            telefone = '55' + telefone;
                        }
                        
                        // Remover o + se existir
                        telefone = telefone.replace('+', '');

                        this.contatos.push({
                            nome,
                            telefone: this.formatarTelefone(telefone),
                            grupo: 'Google Contacts',
                            ativo: true,
                            dataCadastro: new Date().toISOString(),
                            mensagensEnviadas: 0
                        });
                        importados++;
                    }
                }

                this.salvarContatos();
                this.atualizarListaContatos();
                this.mostrarNotificacao(`${importados} contatos importados do Google com sucesso!`, 'success');
                
                // Fecha o modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('importModal'));
                if (modal) modal.hide();
            } catch (error) {
                console.error('Erro ao processar CSV do Google:', error);
                this.mostrarNotificacao('Erro ao processar arquivo. Verifique o formato.', 'error');
            }
        };
        reader.readAsText(file);
    }

    async limparContatos() {
        try {
            // Criar um Map usando o telefone como chave para remover duplicatas
            const contatosMap = new Map();
            
            this.contatos.forEach(contato => {
                // Normalizar o telefone (remover espaços, traços, etc)
                const telefoneNormalizado = contato.telefone.replace(/\D/g, '');
                
                // Ignorar contatos "Sem Nome" e números inválidos (muito curtos)
                if (contato.nome !== "Sem Nome" && telefoneNormalizado.length >= 10) {
                    // Se já existe um contato com este número, manter apenas se o atual tem nome
                    if (!contatosMap.has(telefoneNormalizado) || contato.nome !== "Sem Nome") {
                        contatosMap.set(telefoneNormalizado, {
                            ...contato,
                            telefone: telefoneNormalizado
                        });
                    }
                }
            });
            
            // Converter o Map de volta para array
            this.contatos = Array.from(contatosMap.values());
            
            // Salvar os contatos limpos
            await this.salvarContatos();
            this.atualizarListaContatos();
            
            this.mostrarNotificacao('Contatos limpos com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao limpar contatos:', error);
            this.mostrarNotificacao('Erro ao limpar contatos', 'error');
        }
    }

    async enviarCampanha() {
        // Previne múltiplos cliques
        const enviarButton = document.getElementById('enviarCampanha');
        if (enviarButton.disabled) return;
        enviarButton.disabled = true;

        try {
            const tipo = document.getElementById('tipoCampanha').value;
            const mensagem = document.getElementById('mensagemCampanha').value;
            const tipoEnvio = document.getElementById('tipoEnvio').value;
            
            let grupo = null;
            let contatoEspecifico = null;

            if (tipoEnvio === 'grupo') {
                grupo = document.getElementById('grupoCampanha').value;
            } else {
                contatoEspecifico = document.getElementById('contatoEspecifico').value;
                if (!contatoEspecifico) {
                    this.mostrarNotificacao('Por favor, selecione um contato', 'error');
                    return;
                }
            }

            if (!mensagem.trim()) {
                this.mostrarNotificacao('Por favor, insira uma mensagem', 'error');
                return;
            }

            // Mostra progresso
            const progressModal = new bootstrap.Modal(document.getElementById('progressModal'));
            progressModal.show();
            
            const response = await fetch('/api/enviar-mensagem', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    tipo, 
                    mensagem, 
                    grupo,
                    contatoEspecifico 
                })
            });

            const resultado = await response.json();

            if (resultado.success) {
                this.mostrarNotificacao(
                    `Campanha enviada com sucesso!\n` +
                    `Total: ${resultado.total}\n` +
                    `Sucessos: ${resultado.sucessos}\n` +
                    `Falhas: ${resultado.falhas}`,
                    'success'
                );

                // Atualiza a lista de contatos para refletir as mensagens enviadas
                await this.carregarContatos();
            } else {
                this.mostrarNotificacao(
                    `Erro ao enviar campanha: ${resultado.error}`,
                    'error'
                );
            }

            // Fecha os modais
            progressModal.hide();
            $('#campanhaModal').modal('hide'); // Usando jQuery para fechar o modal

        } catch (error) {
            console.error('Erro ao enviar campanha:', error);
            this.mostrarNotificacao('Erro ao enviar campanha', 'error');
        } finally {
            // Reabilita o botão após o envio (sucesso ou erro)
            enviarButton.disabled = false;
        }
    }

    preencherTemplate() {
        const tipo = document.getElementById('tipoCampanha').value;
        const mensagemTextarea = document.getElementById('mensagemCampanha');
        const contatoEspecifico = document.getElementById('contatoEspecifico').value;
        const contato = this.contatos.find(c => c.telefone === contatoEspecifico);

        switch (tipo) {
            case 'orcamento':
                const nome = contato ? contato.nome : 'Cliente';
                mensagemTextarea.value = this.templates.orcamento(nome);
                break;
        }
    }

    preencherSelectContatos() {
        const select = document.getElementById('contatoEspecifico');
        select.innerHTML = '<option value="">Selecione um contato...</option>';
        
        // Ordena os contatos por nome
        const contatosOrdenados = this.contatos.sort((a, b) => 
            a.nome.localeCompare(b.nome)
        );

        contatosOrdenados.forEach(contato => {
            const option = document.createElement('option');
            option.value = contato.telefone;
            option.textContent = `${contato.nome} - ${this.formatarTelefone(contato.telefone)}`;
            select.appendChild(option);
        });
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    window.marketing = new WhatsAppMarketing();
    window.marketing.setupEventListeners();
}); 