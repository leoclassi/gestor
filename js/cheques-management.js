function renderCheques(cheques) {
    const chequesTable = document.getElementById('chequesTable');
    chequesTable.innerHTML = '';

    cheques.forEach(cheque => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${cheque.numeroCheque}</td>
            <td>${cheque.banco}</td>
            <td>${cheque.agencia}</td>
            <td>${cheque.contaCorrente}</td>
            <td>R$ ${cheque.valor.toFixed(2)}</td>
            <td>${formatDate(cheque.dataEmissao)}</td>
            <td>${cheque.beneficiario}</td>
            <td>${formatDate(cheque.dataCompensacao)}</td>
            <td>${cheque.compensado ? 'Sim' : 'Não'}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editCheque('${cheque.id}')">✏️ Editar</button>
                <button class="btn btn-sm btn-danger" onclick="deleteCheque('${cheque.id}')">🗑️ Excluir</button>
                <button class="btn btn-sm ${cheque.compensado ? 'btn-warning' : 'btn-success'}" 
                        onclick="marcarChequeDepositado('${cheque.id}', ${!cheque.compensado})">
                    ${cheque.compensado ? '❌ Desmarcar Depositado' : '✅ Marcar Depositado'}
                </button>
            </td>
        `;
        chequesTable.appendChild(row);
    });
}

async function marcarChequeDepositado(id, depositado) {
    try {
        const response = await fetch(`/api/cheques/${id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ compensado: depositado })
        });

        if (!response.ok) {
            throw new Error('Falha ao atualizar o status do cheque');
        }

        // Atualiza a lista de cheques
        await loadCheques();
    } catch (error) {
        console.error('Erro ao marcar cheque como depositado:', error);
        alert('Ocorreu um erro ao atualizar o status do cheque. Por favor, tente novamente.');
    }
}