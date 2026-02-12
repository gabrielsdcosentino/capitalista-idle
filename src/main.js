// --- CONFIGURAÇÃO (DATA) ---
// Adicione novos negócios aqui e eles aparecerão automaticamente
const CONFIG_NEGOCIOS = [
  { id: 'limonada', nome: 'Limonada', custoBase: 10, receitaBase: 1, tempoMs: 1000 },
  { id: 'jornal', nome: 'Entrega de Jornal', custoBase: 60, receitaBase: 4, tempoMs: 3000 },
  { id: 'lava_jato', nome: 'Lava Jato', custoBase: 700, receitaBase: 15, tempoMs: 6000 },
  { id: 'pizzaria', nome: 'Pizzaria', custoBase: 2500, receitaBase: 50, tempoMs: 12000 },
];

// --- ESTADO DO JOGO (STATE) ---
let jogo = {
  dinheiro: 0,
  negocios: {} // Vai guardar { limonada: 0, jornal: 5 ... }
};

// Inicializa o estado com 0 para cada negócio
CONFIG_NEGOCIOS.forEach(n => {
  jogo.negocios[n.id] = 0;
});

// --- SISTEMA DE SAVE (PERSISTÊNCIA) ---
function guardarJogo() {
  localStorage.setItem('save_capitalista', JSON.stringify(jogo));
}

function carregarJogo() {
  const save = localStorage.getItem('save_capitalista');
  if (save) {
    const dadosSalvos = JSON.parse(save);
    // Mescla o save com o estado atual (para evitar bugs se adicionar novos negócios)
    jogo = { ...jogo, ...dadosSalvos };
  }
}

// --- LÓGICA CORE ---
function calcularCusto(id) {
  const config = CONFIG_NEGOCIOS.find(n => n.id === id);
  const qtd = jogo.negocios[id];
  // Fórmula: Custo * 1.15 ^ Quantidade
  return config.custoBase * Math.pow(1.15, qtd);
}

function comprarNegocio(id) {
  const custo = calcularCusto(id);
  if (jogo.dinheiro >= custo) {
    jogo.dinheiro -= custo;
    jogo.negocios[id]++;
    atualizarInterface();
    guardarJogo();
  }
}

function cliqueManual() {
  jogo.dinheiro += 1;
  atualizarInterface(); // Atualiza apenas texto, sem redesenhar tudo
  renderizarDinheiro();
}

// --- GAME LOOP (MOTOR) ---
let ultimoTempo = 0;
let acumuladorTempo = {}; // Guarda o tempo decorrido para cada negócio

// Inicializa acumuladores
CONFIG_NEGOCIOS.forEach(n => acumuladorTempo[n.id] = 0);

function loop(tempoAtual) {
  if (!ultimoTempo) ultimoTempo = tempoAtual;
  const delta = tempoAtual - ultimoTempo;
  ultimoTempo = tempoAtual;

  // Processa produção automática
  CONFIG_NEGOCIOS.forEach(negocio => {
    const qtd = jogo.negocios[negocio.id];
    if (qtd > 0) {
      acumuladorTempo[negocio.id] += delta;
      
      if (acumuladorTempo[negocio.id] >= negocio.tempoMs) {
        // Ciclo completou!
        const ciclosCompletos = Math.floor(acumuladorTempo[negocio.id] / negocio.tempoMs);
        const lucro = (negocio.receitaBase * qtd) * ciclosCompletos;
        
        jogo.dinheiro += lucro;
        acumuladorTempo[negocio.id] %= negocio.tempoMs; // Guarda o resto do tempo
      }
    }
  });

  renderizarDinheiro();
  requestAnimationFrame(loop);
}

// Guarda o jogo a cada 5 segundos automaticamente
setInterval(guardarJogo, 5000);


// --- INTERFACE (UI) ---
const elLista = document.getElementById('lista-negocios');
const elDinheiro = document.getElementById('display-dinheiro');

function renderizarDinheiro() {
  // Formata para moeda brasileira
  elDinheiro.innerText = jogo.dinheiro.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function criarInterface() {
  elLista.innerHTML = '';
  CONFIG_NEGOCIOS.forEach(n => {
    const div = document.createElement('div');
    div.className = 'business-card';
    div.id = `card-${n.id}`;
    
    div.innerHTML = `
      <div class="info">
        <h3>${n.nome}</h3>
        <p>Possui: <span id="qtd-${n.id}">0</span></p>
        <p>Receita: ${n.receitaBase.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}/s</p>
      </div>
      <button class="btn-compra" onclick="window.tentarComprar('${n.id}')">
        Comprar<br>
        <small id="custo-${n.id}">---</small>
      </button>
    `;
    elLista.appendChild(div);
  });
}

function atualizarInterface() {
  CONFIG_NEGOCIOS.forEach(n => {
    const custo = calcularCusto(n.id);
    const qtd = jogo.negocios[n.id];
    
    document.getElementById(`qtd-${n.id}`).innerText = qtd;
    document.getElementById(`custo-${n.id}`).innerText = custo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    
    // Muda a cor do botão se puder comprar
    const btn = document.querySelector(`#card-${n.id} .btn-compra`);
    if (jogo.dinheiro >= custo) {
      btn.classList.add('pode-comprar');
      btn.classList.remove('bloqueado');
    } else {
      btn.classList.remove('pode-comprar');
    }
  });
}

// --- INICIALIZAÇÃO ---
window.cliqueManual = cliqueManual; // <--- Isso conecta o botão do HTML à função JS
window.tentarComprar = comprarNegocio;

carregarJogo();
criarInterface();
atualizarInterface();
requestAnimationFrame(loop);