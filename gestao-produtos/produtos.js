const CHAVE_STORAGE = 'produtos_estoque';
const CHAVE_MOVIMENTACOES = 'movimentacoes_estoque';

// Quantidade a partir da qual um produto é considerado com estoque baixo
const LIMITE_ESTOQUE_BAIXO <= 9;

// Quantas movimentações mais recentes aparecem no histórico
const LIMITE_HISTORICO_EXIBIDO = 100;

function carregarLista(chave) {
    try {
        const dados = JSON.parse(localStorage.getItem(chave));
        return Array.isArray(dados) ? dados : [];
    } catch (erro) {
        console.error('Dados corrompidos no localStorage, iniciando vazio.', erro);
        return [];
    }
}

function salvarNoLocalStorage() {
    try {
        localStorage.setItem(CHAVE_STORAGE, JSON.stringify(produtos));
        localStorage.setItem(CHAVE_MOVIMENTACOES, JSON.stringify(movimentacoes));
    } catch (erro) {
        mostrarToast('Não foi possível salvar os dados no navegador.', 'erro');
        console.error(erro);
    }
}

let produtos = carregarLista(CHAVE_STORAGE);
let movimentacoes = carregarLista(CHAVE_MOVIMENTACOES);

// == Elementos ==
const form = document.getElementById('form-produto');
const inputId = document.getElementById('produto-id');
const inputNome = document.getElementById('nome');
const inputQuantidade = document.getElementById('quantidade');
const inputPreco = document.getElementById('preco');
const btnSalvar = document.getElementById('btn-salvar');
const btnCancelar = document.getElementById('btn-cancelar');
const tabela = document.getElementById('tabela-produtos');
const inputBusca = document.getElementById('input-busca');
const selectSituacao = document.getElementById('filtro-situacao');
const btnLimparFiltros = document.getElementById('btn-limpar-filtros');
const tabelaMovimentacoes = document.getElementById('tabela-movimentacoes');

function gerarId() {
    let id;
    do {
        id = String(Math.floor(100000 + Math.random() * 900000)); // 6 dígitos
    } while (produtos.some(prod => prod.id === id)); // garante unicidade
    return id;
}

let idDestaque = null;

function mostrarToast(mensagem, tipo = 'sucesso') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo}`;
    toast.setAttribute('role', 'status');
    toast.textContent = mensagem;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast-saindo');
        toast.addEventListener('animationend', () => toast.remove());
    }, 3000);
}

function confirmarAcao({ titulo, mensagem, textoConfirmar = 'Confirmar' }) {
    return new Promise(resolve => {
        const focoAnterior = document.activeElement;

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'modal-titulo');

        const h2 = document.createElement('h2');
        h2.id = 'modal-titulo';
        h2.textContent = titulo;

        const p = document.createElement('p');
        p.textContent = mensagem;

        function fechar(resultado) {
            document.removeEventListener('keydown', aoPressionarTecla);
            overlay.remove();
            if (focoAnterior && focoAnterior.focus) focoAnterior.focus();
            resolve(resultado);
        }

        const btnCancelarModal = criarBotao('Cancelar', 'btn-modal-cancelar', () => fechar(false));
        const btnConfirmarModal = criarBotao(textoConfirmar, 'btn-modal-confirmar', () => fechar(true));

        function aoPressionarTecla(e) {
            if (e.key === 'Escape') {
                fechar(false);
            } else if (e.key === 'Tab') {
        
                if (e.shiftKey && document.activeElement === btnCancelarModal) {
                    e.preventDefault();
                    btnConfirmarModal.focus();
                } else if (!e.shiftKey && document.activeElement === btnConfirmarModal) {
                    e.preventDefault();
                    btnCancelarModal.focus();
                }
            }
        }

        overlay.addEventListener('click', e => {
            if (e.target === overlay) fechar(false); // clique fora do modal
        });
        document.addEventListener('keydown', aoPressionarTecla);

        const acoes = document.createElement('div');
        acoes.className = 'modal-acoes';
        acoes.appendChild(btnCancelarModal);
        acoes.appendChild(btnConfirmarModal);

        modal.appendChild(h2);
        modal.appendChild(p);
        modal.appendChild(acoes);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        btnCancelarModal.focus();
    });
}

// --- Movimentações de estoque (entrada / saída) --
function formatarDataHora(iso) {
    return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function registrarMovimentacao(prod, tipo, quantidade, observacao) {
    const delta = tipo === 'entrada' ? quantidade : -quantidade;
    prod.quantidade = Number(prod.quantidade) + delta;

    movimentacoes.push({
        produtoId: prod.id,
        produtoNome: prod.nome,
        tipo,
        quantidade,
        saldo: prod.quantidade,
        observacao,
        data: new Date().toISOString()
    });
}

function abrirModalMovimentacao(prod) {
    return new Promise(resolve => {
        const focoAnterior = document.activeElement;

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'modal-mov-titulo');

        const h2 = document.createElement('h2');
        h2.id = 'modal-mov-titulo';
        h2.textContent = 'Movimentar estoque';

        const info = document.createElement('p');
        info.textContent = `${prod.nome} — saldo atual: ${prod.quantidade}`;

        function criarOpcao(valor, rotulo, marcado) {
            const label = document.createElement('label');
            label.className = `tipo-opcao ${valor}`;
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = 'tipo-mov';
            radio.value = valor;
            radio.checked = marcado;
            const span = document.createElement('span');
            span.textContent = rotulo;
            label.append(radio, span);
            return { label, radio };
        }
        const opEntrada = criarOpcao('entrada', 'Entrada', true);
        const opSaida = criarOpcao('saida', 'Saída', false);

        const opcoes = document.createElement('div');
        opcoes.className = 'tipo-opcoes';
        opcoes.append(opEntrada.label, opSaida.label);

        function criarCampo(rotulo, input, idCampo) {
            const grupo = document.createElement('div');
            grupo.className = 'modal-campo';
            const label = document.createElement('label');
            label.htmlFor = idCampo;
            label.textContent = rotulo;
            input.id = idCampo;
            grupo.append(label, input);
            return grupo;
        }

        const inputQtd = document.createElement('input');
        inputQtd.type = 'number';
        inputQtd.min = '1';
        inputQtd.step = '1';
        inputQtd.placeholder = 'Ex.: 10';

        const inputObs = document.createElement('input');
        inputObs.type = 'text';
        inputObs.maxLength = 80;
        inputObs.placeholder = 'Ex.: compra de fornecedor, venda, perda';

        const erro = document.createElement('p');
        erro.className = 'modal-erro';
        erro.setAttribute('role', 'alert');
        erro.hidden = true;

        function fechar(resultado) {
            document.removeEventListener('keydown', aoPressionarTecla);
            overlay.remove();
            if (focoAnterior && focoAnterior.focus) focoAnterior.focus();
            resolve(resultado);
        }

        function confirmar() {
            const quantidade = Number(inputQtd.value);
            const tipo = opSaida.radio.checked ? 'saida' : 'entrada';

            let mensagemErro = null;
            if (!Number.isInteger(quantidade) || quantidade < 1) {
                mensagemErro = 'Informe uma quantidade inteira maior que zero.';
            } else if (tipo === 'saida' && quantidade > Number(prod.quantidade)) {
                mensagemErro = `Saída maior que o estoque disponível (${prod.quantidade}).`;
            }

            if (mensagemErro) {
                erro.textContent = mensagemErro;
                erro.hidden = false;
                inputQtd.focus();
                return;
            }

            fechar({ tipo, quantidade, observacao: inputObs.value.trim() });
        }

        const btnCancelarModal = criarBotao('Cancelar', 'btn-modal-cancelar', () => fechar(null));
        const btnRegistrarModal = criarBotao('Registrar', 'btn-modal-primario', confirmar);

        function aoPressionarTecla(e) {
            if (e.key === 'Escape') {
                fechar(null);
            } else if (e.key === 'Enter' && (e.target === inputQtd || e.target === inputObs)) {
                e.preventDefault();
                confirmar();
            } else if (e.key === 'Tab') {
                const radioAtivo = opSaida.radio.checked ? opSaida.radio : opEntrada.radio;
                const focaveis = [radioAtivo, inputQtd, inputObs, btnCancelarModal, btnRegistrarModal];
                const primeiro = focaveis[0];
                const ultimo = focaveis[focaveis.length - 1];

                if (e.shiftKey && document.activeElement === primeiro) {
                    e.preventDefault();
                    ultimo.focus();
                } else if (!e.shiftKey && document.activeElement === ultimo) {
                    e.preventDefault();
                    primeiro.focus();
                }
            }
        }

        overlay.addEventListener('click', e => {
            if (e.target === overlay) fechar(null);
        });
        document.addEventListener('keydown', aoPressionarTecla);

        const acoes = document.createElement('div');
        acoes.className = 'modal-acoes';
        acoes.append(btnCancelarModal, btnRegistrarModal);

        modal.append(
            h2,
            info,
            opcoes,
            criarCampo('Quantidade', inputQtd, 'mov-quantidade'),
            criarCampo('Observação (opcional)', inputObs, 'mov-observacao'),
            erro,
            acoes
        );
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        inputQtd.focus();
    });
}

async function movimentarEstoque(id) {
    const prod = produtos.find(p => p.id === id);
    if (!prod) return;

    const dados = await abrirModalMovimentacao(prod);
    if (!dados) return;

    registrarMovimentacao(prod, dados.tipo, dados.quantidade, dados.observacao);

    if (inputId.value === prod.id) inputQuantidade.value = prod.quantidade;

    salvarNoLocalStorage();
    idDestaque = prod.id;
    renderizarTabela();

    const nomeTipo = dados.tipo === 'entrada' ? 'Entrada' : 'Saída';
    mostrarToast(`${nomeTipo} de ${dados.quantidade} unidade(s) registrada.`);
}

// Estoque baixo inclui os zerados (quantidade <= limite)
function estoqueBaixo(prod) {
    return Number(prod.quantidade) <= LIMITE_ESTOQUE_BAIXO;
}

// -- Filtros --
function filtroAtual() {
    return inputBusca ? inputBusca.value.trim().toLowerCase() : '';
}

function situacaoAtual() {
    return selectSituacao ? selectSituacao.value : 'todos';
}

function filtrosAtivos() {
    return filtroAtual() !== '' || situacaoAtual() !== 'todos';
}

function bateSituacao(prod, situacao) {
    switch (situacao) {
        case 'baixo':  return estoqueBaixo(prod);
        case 'zerado': return Number(prod.quantidade) === 0;
        default:       return true;
    }
}

function limparFiltros() {
    if (inputBusca) inputBusca.value = '';
    if (selectSituacao) selectSituacao.value = 'todos';
    renderizarTabela();
}

function validarProduto(nome, quantidade, preco) {
    if (nome === '') return 'Informe o nome do produto.';
    if (!Number.isInteger(quantidade) || quantidade < 0) {
        return 'A quantidade deve ser um número inteiro maior ou igual a zero.';
    }
    if (!Number.isFinite(preco) || preco < 0) {
        return 'O preço deve ser um número maior ou igual a zero.';
    }
    return null;
}

if (inputBusca) {
    inputBusca.addEventListener('input', () => renderizarTabela());
}
if (selectSituacao) {
    selectSituacao.addEventListener('change', () => renderizarTabela());
}
if (btnLimparFiltros) {
    btnLimparFiltros.addEventListener('click', limparFiltros);
}

// == Botão Cancelar ==
// Mostra o botão "Cancelar" apenas se algum campo do formulário estiver preenchido
function verificarPreenchimento() {
    const temTexto = inputNome.value.trim() !== '' ||
                     inputQuantidade.value !== '' ||
                     inputPreco.value !== '';

    if (temTexto) {
        btnCancelar.style.display = 'inline-block';
    } else if (!inputId.value) {
        btnCancelar.style.display = 'none';
    }
}

inputNome.addEventListener('input', verificarPreenchimento);
inputQuantidade.addEventListener('input', verificarPreenchimento);
inputPreco.addEventListener('input', verificarPreenchimento);

// == Cadastro / Atualização de Produtos ==
form.addEventListener('submit', function (e) {
    e.preventDefault();

    const id = inputId.value;
    const nome = inputNome.value.trim();
    const quantidade = Number(inputQuantidade.value);
    const preco = Number(inputPreco.value);

    const erro = validarProduto(nome, quantidade, preco);
    if (erro) {
        mostrarToast(erro, 'erro');
        return;
    }

    if (id) {
        atualizarProduto(id, nome, quantidade, preco);
        idDestaque = id;
        mostrarToast('Produto atualizado com sucesso!');
    } else {
        idDestaque = cadastrarProduto(nome, quantidade, preco);
        mostrarToast('Produto cadastrado com sucesso!');
    }

    salvarNoLocalStorage();
    limparFormulario();
    renderizarTabela();
});

function cadastrarProduto(nome, quantidade, preco) {
    const id = gerarId();
    produtos.push({ id, nome, quantidade, preco });
    return id;
}

function atualizarProduto(id, nome, quantidade, preco) {
    const prod = produtos.find(p => p.id === id);
    if (prod) {
        prod.nome = nome;
        prod.quantidade = quantidade;
        prod.preco = preco;
    }
}

function prepararEdicao(id) {
    const produto = produtos.find(prod => prod.id === id);
    if (!produto) return;

    inputId.value = produto.id;
    inputNome.value = produto.nome;
    inputQuantidade.value = produto.quantidade;
    inputPreco.value = produto.preco;

    btnSalvar.innerText = 'Atualizar Produto';
    btnCancelar.style.display = 'inline-block';
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    inputNome.focus({ preventScroll: true });
}

async function excluirProduto(id) {
    const produto = produtos.find(prod => prod.id === id);
    if (!produto) return;

    const confirmou = await confirmarAcao({
        titulo: 'Excluir produto?',
        mensagem: `Você está prestes a excluir "${produto.nome}". Essa ação não pode ser desfeita.`,
        textoConfirmar: 'Excluir'
    });
    if (!confirmou) return;

    produtos = produtos.filter(prod => prod.id !== id);

    if (inputId.value === id) limparFormulario();

    salvarNoLocalStorage();
    renderizarTabela();
    mostrarToast('Produto excluído.', 'info');
}

function limparFormulario() {
    inputId.value = '';
    inputNome.value = '';
    inputQuantidade.value = '';
    inputPreco.value = '';
    btnSalvar.innerText = 'Cadastrar Produto';
    btnCancelar.style.display = 'none';
}

if (btnCancelar) {
    btnCancelar.addEventListener('click', limparFormulario);
}

function atualizarResumo() {
    const elTotalQuantidade = document.getElementById('total-quantidade');
    const elTotalValor = document.getElementById('total-valor');
    if (!elTotalQuantidade || !elTotalValor) return;

    const totalQuantidade = produtos.reduce((acc, p) => acc + Number(p.quantidade), 0);
    const totalValor = produtos.reduce((acc, p) => acc + Number(p.quantidade) * Number(p.preco), 0);

    elTotalQuantidade.textContent = totalQuantidade;
    elTotalValor.textContent = `R$ ${totalValor.toFixed(2)}`;
}

function criarCelula(texto) {
    const td = document.createElement('td');
    td.textContent = texto;
    return td;
}

function criarBotao(rotulo, classe, aoClicar) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = classe;
    btn.textContent = rotulo;
    btn.addEventListener('click', aoClicar);
    return btn;
}

function criarCelulaTipo(tipo) {
    const td = document.createElement('td');
    const selo = document.createElement('span');
    selo.className = `selo selo-${tipo}`;
    selo.textContent = tipo === 'entrada' ? 'Entrada' : 'Saída';
    td.appendChild(selo);
    return td;
}

function renderizarHistorico() {
    if (!tabelaMovimentacoes) return;

    tabelaMovimentacoes.innerHTML = '';

    if (movimentacoes.length === 0) {
        const tr = document.createElement('tr');
        const td = criarCelula('Nenhuma movimentação registrada ainda.');
        td.className = 'estado-vazio';
        td.colSpan = 6;
        tr.appendChild(td);
        tabelaMovimentacoes.appendChild(tr);
        return;
    }

    const recentes = movimentacoes.slice().reverse().slice(0, LIMITE_HISTORICO_EXIBIDO);

    recentes.forEach(mov => {
        const tr = document.createElement('tr');
        const sinal = mov.tipo === 'entrada' ? '+' : '-';

        tr.appendChild(criarCelula(formatarDataHora(mov.data)));
        tr.appendChild(criarCelula(mov.produtoNome));
        tr.appendChild(criarCelulaTipo(mov.tipo));
        tr.appendChild(criarCelula(`${sinal}${mov.quantidade}`));
        tr.appendChild(criarCelula(mov.saldo));
        tr.appendChild(criarCelula(mov.observacao || '—'));

        tabelaMovimentacoes.appendChild(tr);
    });
}

function renderizarTabela(filtro = filtroAtual()) {
    atualizarResumo();
    renderizarHistorico();
    tabela.innerHTML = '';

    if (btnLimparFiltros) btnLimparFiltros.hidden = !filtrosAtivos();

    const situacao = situacaoAtual();

    const produtosFiltrados = produtos.filter(prod => {
        const bateBusca =
            String(prod.nome).toLowerCase().includes(filtro) ||
            String(prod.id).toLowerCase().includes(filtro);

        return bateBusca && bateSituacao(prod, situacao);
    });

    if (produtosFiltrados.length === 0) {
        const tr = document.createElement('tr');
        const texto = produtos.length === 0
            ? 'Seu estoque está vazio. Cadastre o primeiro produto acima!'
            : 'Nenhum produto encontrado para essa busca ou filtro.';
        const td = criarCelula(texto);
        td.className = 'estado-vazio';
        td.colSpan = 5;
        tr.appendChild(td);
        tabela.appendChild(tr);
        return;
    }

    produtosFiltrados.forEach(prod => {
        const tr = document.createElement('tr');
        if (prod.id === idDestaque) tr.classList.add('linha-destaque');
        if (estoqueBaixo(prod)) tr.classList.add('estoque-baixo');

        tr.appendChild(criarCelula(prod.id));
        tr.appendChild(criarCelula(prod.nome));
        tr.appendChild(criarCelula(prod.quantidade));
        tr.appendChild(criarCelula(`R$ ${Number(prod.preco).toFixed(2)}`));

        const tdAcoes = document.createElement('td');
        const divAcoes = document.createElement('div');
        divAcoes.className = 'acoes';
        divAcoes.appendChild(criarBotao('Movimentar', 'btn-mover', () => movimentarEstoque(prod.id)));
        divAcoes.appendChild(criarBotao('Editar', 'btn-editar', () => prepararEdicao(prod.id)));
        divAcoes.appendChild(criarBotao('Excluir', 'btn-excluir', () => excluirProduto(prod.id)));
        tdAcoes.appendChild(divAcoes);
        tr.appendChild(tdAcoes);

        tabela.appendChild(tr);
    });

    idDestaque = null;
}

limparFormulario();
renderizarTabela();
