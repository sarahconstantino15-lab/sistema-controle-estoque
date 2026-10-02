// Busca que filtra as perguntas do FAQ
const campoBusca = document.getElementById('busca-faq');
const semResultados = document.getElementById('sem-resultados');
const perguntas = document.querySelectorAll('.faq details');
const secoes = document.querySelectorAll('.faq-secao');

// Remove acentos e deixa em minúsculas para a busca ignorar diferenças
function normalizar(texto) {
    return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function filtrarPerguntas() {
    const termo = normalizar(campoBusca.value.trim());
    let totalVisiveis = 0;

    perguntas.forEach(function (pergunta) {
        const combina = normalizar(pergunta.textContent).includes(termo);
        pergunta.hidden = !combina;
        pergunta.open = termo !== '' && combina;
        if (combina) totalVisiveis++;
    });

    // Esconde o título de uma seção quando nenhuma pergunta dela aparece
    secoes.forEach(function (secao) {
        const temVisivel = secao.querySelector('details:not([hidden])');
        secao.hidden = !temVisivel;
    });

    semResultados.hidden = totalVisiveis > 0;
}

campoBusca.addEventListener('input', filtrarPerguntas);
