// --- CONFIGURAÇÃO (DATA) ---
const CONFIG_NEGOCIOS = [
  { id: 'limonada', nome: 'Limonada', custoBase: 10, receitaBase: 1, tempoMs: 1000 },
  { id: 'jornal', nome: 'Entrega de Jornal', custoBase: 60, receitaBase: 4, tempoMs: 3000 },
  { id: 'lava_jato', nome: 'Lava Jato', custoBase: 700, receitaBase: 15, tempoMs: 6000 },
  { id: 'pizzaria', nome: 'Pizzaria', custoBase: 2500, receitaBase: 50, tempoMs: 12000 },
];

// --- ESTADO DO JOGO (STATE) ---
let jogo = {
  dinheiro: 0,
  negocios: {},
  upgrades: [] 
};

// Inicializa o estado base
CONFIG_NEGOCIOS.forEach(n => {
  jogo.negocios[n.id] = 0;
});

// --- SISTEMA DE SAVE ---
function guardarJogo() {
  localStorage.setItem('save_capitalista', JSON.stringify(jogo));
}

function carregarJogo() {
  const save = localStorage.getItem('save_capitalista');
  if (save) {
    const dadosSalvos = JSON.parse(save);
    jogo = { ...jogo, ...dadosSalvos };
  }
}

// --- LÓGICA CORE ---
function calcularCusto(id) {
  const config = CONFIG_NEGOCIOS.find(n => n.id === id);
  const qtd = jogo.negocios[id];
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
  renderizarDinheiro();
}

// --- UPGRADES ---
window.comprarUpgrade = function(tipo) {
    if (tipo === 'limonada' && jogo.dinheiro >= 100 && !jogo.upgrades.includes('limao_x2')) {
        jogo.dinheiro -= 100;
        jogo.upgrades.push('limao_x2');
        
        aplicarEfeitosUpgrades(); // Aplica a matemática
        document.getElementById('upg-limao').classList.add('comprado'); // Some o botão
        
        guardarJogo();
        atualizarInterface();
    }
};

// Função para recalcular multiplicadores (usada ao carregar o jogo)
function aplicarEfeitosUpgrades() {
    if (jogo.upgrades.includes('limao_x2')) {
        const limonada = CONFIG_NEGOCIOS.find(n => n.id === 'limonada');
        // Garante que não multiplicamos infinitamente ao recarregar
        if(limonada.receitaBase === 1) { 
             limonada.receitaBase = 2; 
        }
    }
}

// --- GAME LOOP ---
let ultimoTempo = 0;
let acumuladorTempo = {};

CONFIG_NEGOCIOS.forEach(n => acumuladorTempo[n.id] = 0);

function loop(tempoAtual) {
  if (!ultimoTempo) ultimoTempo = tempoAtual;
  const delta = tempoAtual - ultimoTempo;
  ultimoTempo = tempoAtual;

  CONFIG_NEGOCIOS.forEach(negocio => {
    const qtd = jogo.negocios[negocio.id];
    
    if (qtd > 0) {
      acumuladorTempo[negocio.id] += delta;
      
      if (acumuladorTempo[negocio.id] >= negocio.tempoMs) {
        const ciclos = Math.floor(acumuladorTempo[negocio.id] / negocio.tempoMs);
        jogo.dinheiro += (negocio.receitaBase * qtd) * ciclos;
        acumuladorTempo[negocio.id] %= negocio.tempoMs;
      }

      const elementoBarra = document.getElementById(`bar-${negocio.id}`);
      if (elementoBarra) {
        const porcentagem = (acumuladorTempo[negocio.id] / negocio.tempoMs) * 100;
        elementoBarra.style.width = `${Math.min(porcentagem, 100)}%`;
      }
    } else {
        const elementoBarra = document.getElementById(`bar-${negocio.id}`);
        if(elementoBarra) elementoBarra.style.width = '0%';
    }
  });

  renderizarDinheiro();
  requestAnimationFrame(loop);
}

setInterval(guardarJogo, 5000);

// --- INTERFACE ---
const elLista = document.getElementById('lista-negocios');
const elDinheiro = document.getElementById('display-dinheiro');

function renderizarDinheiro() {
  elDinheiro.innerText = jogo.dinheiro.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function criarInterface() {
  elLista.innerHTML = '';
  CONFIG_NEGOCIOS.forEach(n => {
    const div = document.createElement('div');
    div.className = 'business-card';
    div.id = `card-${n.id}`;
    
    div.innerHTML = `
      <div style="flex: 1; margin-right: 10px;">
        <div class="info">
          <h3>${n.nome}</h3>
          <p>Possui: <span id="qtd-${n.id}">0</span></p>
          <p>Receita: ${n.receitaBase.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</p>
        </div>
        <div class="progresso-container">
            <div id="bar-${n.id}" class="progresso-fill"></div>
        </div>
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
    const receitaTotal = n.receitaBase * (qtd || 1);
    
    document.getElementById(`qtd-${n.id}`).innerText = qtd;
    document.getElementById(`custo-${n.id}`).innerText = custo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    
    const card = document.getElementById(`card-${n.id}`);
    const pReceita = card.querySelector('.info p:nth-child(3)');
    pReceita.innerText = `Receita: ${receitaTotal.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}/ciclo`;

    const btn = card.querySelector('.btn-compra');
    if (jogo.dinheiro >= custo) {
      btn.classList.add('pode-comprar');
      btn.classList.remove('bloqueado');
      btn.disabled = false;
    } else {
      btn.classList.remove('pode-comprar');
      btn.classList.add('bloqueado');
      btn.disabled = true;
    }
  });
}

// --- INICIALIZAÇÃO ---
window.cliqueManual = cliqueManual;
window.tentarComprar = comprarNegocio;

carregarJogo();          // 1. Carrega o Save
aplicarEfeitosUpgrades(); // 2. Aplica matemática (x2) se tiver upgrades salvos
criarInterface();        // 3. Cria o HTML

// 4. Esconde botões de upgrade já comprados
if (jogo.upgrades.includes('limao_x2')) {
    const btn = document.getElementById('upg-limao');
    if(btn) btn.classList.add('comprado');
}

atualizarInterface();
requestAnimationFrame(loop);