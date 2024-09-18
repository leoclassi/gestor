app.post('/api/cheques', async (req, res) => {
    try {
        const cheques = await readJSONFile(chequesFile);
        const newCheque = req.body;
        newCheque.id = Date.now().toString();
        // Não faça nenhuma manipulação nas datas aqui
        cheques.push(newCheque);
        await writeJSONFile(chequesFile, cheques);
        res.json(newCheque);
    } catch (error) {
        console.error('Erro ao salvar o cheque:', error);
        res.status(500).json({ error: 'Erro ao salvar o cheque' });
    }
});