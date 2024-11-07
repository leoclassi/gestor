document.addEventListener('DOMContentLoaded', function() {
    const allowedProducts = [
        "Caibro - 5x6 cm",
        "Viga - 6x16 cm",
        "Viga - 6x12 cm",
        "Ripa - 5x2 cm",
        "Ripão - 15x3 cm",
        "Sarrafo - 3x5 cm",
        "Balancim 3x4 cm - 1,25 mts [DZ]",
        "Palanque - 8,50 Metros",
        "Palanque - 8,00 Metros",
        "Palanque - 7,50 Metros",
        "Palanque - 7,00 Metros",
        "Palanque - 6,50 Metros",
        "Palanque - 6,00 Metros",
        "Palanque - 5,50 Metros",
        "Palanque - 5,00 Metros",
        "Palanque - 4,50 Metros",
        "Palanque - 4,00 Metros",
        "Palanque - 3,50 Metros",
        "Palanque - 3,20 Metros",
        "Palanque - 2,50 Metros",
        "Repique - 2,20 Metros"
    ];

    fetch('/api/products')
    .then(response => response.json())
    .then(data => {
        const table = document.getElementById('productTable');
        data.forEach(product => {
            if (allowedProducts.some(allowedProduct => product.nome.includes(allowedProduct))) {
                const row = document.createElement('tr');
                row.innerHTML = `<td>${product.nome}</td><td>R$ ${product.valorEspecial.toFixed(2)}</td><td>R$ ${product.valor.toFixed(2)}</td>`;
                table.appendChild(row);
            }
        });
    })
    .catch(error => console.error('Erro ao carregar produtos:', error));
});
