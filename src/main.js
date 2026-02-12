import { AdMob, RewardAdPluginEvents } from '@capacitor-community/admob';
// Função para formatar números grandes (ex: 1.5M, 3.2B)
function formatarDinheiro(valor) {
  if (valor < 1000) return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  
  const sufixos = ["", "K", "M", "B", "T", "Qa", "Qi"];
  const sufixoNum = Math.floor(("" + Math.floor(valor)).length / 3);
  
  if (sufixoNum === 0) return valor;
  
  let curto = parseFloat((sufixoNum != 0 ? (valor / Math.pow(1000, sufixoNum)) : valor).toPrecision(3));
  if (curto % 1 != 0) {
      curto = curto.toFixed(1);
  }
  return "R$ " + curto + sufixos[sufixoNum];
}

// --- CONFIGURAÇÃO (DATA) ---
const CONFIG_NEGOCIOS = [
  { id: 'limonada',  nome: 'Limonada',        custoBase: 10,    receitaBase: 1,   tempoMs: 1000,  icone: '🍋' },
  { id: 'jornal',    nome: 'Jornais',         custoBase: 60,    receitaBase: 4,   tempoMs: 3000,  icone: '📰' },
  { id: 'lava_jato', nome: 'Lava Jato',       custoBase: 700,   receitaBase: 15,  tempoMs: 6000,  icone: '🚗' },
  { id: 'pizzaria',  nome: 'Pizzaria',        custoBase: 2500,  receitaBase: 50,  tempoMs: 12000, icone: '🍕' },
  { id: 'donut',     nome: 'Donuts',          custoBase: 10000, receitaBase: 200, tempoMs: 20000, icone: '🍩' },
  { id: 'banco',     nome: 'Banco',           custoBase: 100000,receitaBase: 1000,tempoMs: 60000, icone: '🏦' },
  { id: 'petroleo',  nome: 'Petróleo',        custoBase: 1000000,receitaBase: 5000,tempoMs: 120000,icone: '🛢️' }
];

// --- ESTADO DO JOGO (STATE) ---
let jogo = {
  dinheiro: 0,
  dinheiroTotal: 0,
  investidores: 0,
  diamantes: 0,
  ultimoLogin: Date.now(),
  negocios: {},
  upgrades: [] 
};

// Inicializa zeros
CONFIG_NEGOCIOS.forEach(n => { jogo.negocios[n.id] = 0; });

// --- PERSISTÊNCIA ---
function guardarJogo() {
  jogo.ultimoLogin = Date.now();
  localStorage.setItem('save_capitalista', JSON.stringify(jogo));
}

function carregarJogo() {
  const save = localStorage.getItem('save_capitalista');
  if (save) {
    const dados = JSON.parse(save);
    jogo = { ...jogo, ...dados };
    
    // --- CORREÇÃO DE BUGS (ANTI-NAN) ---
    // Se adicionarmos negócios novos, o save antigo não tem eles.
    // Aqui garantimos que todos existam com valor 0 se faltarem.
    CONFIG_NEGOCIOS.forEach(n => {
        if (jogo.negocios[n.id] === undefined) {
            jogo.negocios[n.id] = 0;
        }
    });

    if (!jogo.investidores) jogo.investidores = 0;
    if (!jogo.dinheiroTotal) jogo.dinheiroTotal = jogo.dinheiro;
    if (!jogo.diamantes) jogo.diamantes = 0;
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
  jogo.dinheiro += 1 + Math.floor(jogo.investidores * 0.1); 
  renderizarDinheiro();
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
        const bonusAnjos = 1 + (jogo.investidores * 0.02);
        const lucro = (negocio.receitaBase * qtd * bonusAnjos) * ciclos;
        
        jogo.dinheiro += lucro;
        jogo.dinheiroTotal += lucro;
        acumuladorTempo[negocio.id] %= negocio.tempoMs;
      }

      // Visual Barra
      const bar = document.getElementById(`bar-${negocio.id}`);
      if (bar) {
        const pct = (acumuladorTempo[negocio.id] / negocio.tempoMs) * 100;
        bar.style.width = `${Math.min(pct, 100)}%`;
      }
    } else {
        const bar = document.getElementById(`bar-${negocio.id}`);
        if(bar) bar.style.width = '0%';
    }
  });

  renderizarDinheiro();
  requestAnimationFrame(loop);
}

setInterval(guardarJogo, 5000);

// --- INTERFACE (UI) ---
const elLista = document.getElementById('lista-negocios');
const elDinheiro = document.getElementById('display-dinheiro');
const elDiamante = document.getElementById('qtd-diamantes');

function renderizarDinheiro() {
  elDinheiro.innerText = formatarDinheiro(jogo.dinheiro);
  if(elDiamante) elDiamante.innerText = jogo.diamantes;
}

function criarInterface() {
  elLista.innerHTML = '';
  CONFIG_NEGOCIOS.forEach(n => {
    const div = document.createElement('div');
    div.className = 'business-card'; // Classe base
    div.id = `card-${n.id}`;
    
    // --- MUDANÇA VISUAL AQUI ---
    // Adicionamos a div 'business-icon' separada para poder estilizar
    div.innerHTML = `
      <div class="business-icon">${n.icone}</div>

      <div class="info-container">
        <div class="header-info">
            <h3>${n.nome}</h3>
            <span class="qtd-badge" id="qtd-${n.id}">0</span>
        </div>
        
        <div class="progresso-container">
            <div id="bar-${n.id}" class="progresso-fill"></div>
        </div>
        
        <div class="stats-row">
            <p>Receita: <span id="rec-${n.id}" style="color: #fff;">R$ 0,00</span></p>
        </div>
      </div>

      <button class="btn-compra" onclick="window.tentarComprar('${n.id}')">
        <span style="font-size:0.8rem">UP</span><br>
        <small id="custo-${n.id}">---</small>
      </button>
    `;
    elLista.appendChild(div);
  });
}

function atualizarInterface() {
  const bonusAnjos = 1 + (jogo.investidores * 0.02);
  
  CONFIG_NEGOCIOS.forEach(n => {
    const custo = calcularCusto(n.id);
    const qtd = jogo.negocios[n.id];
    const receitaReal = n.receitaBase * (qtd || 1) * bonusAnjos;
  
    document.getElementById(`rec-${n.id}`).innerText = `${formatarDinheiro(receitaReal)}/s`;
    document.getElementById(`custo-${n.id}`).innerText = formatarDinheiro(custo);
    document.getElementById(`qtd-${n.id}`).innerText = qtd;
    document.getElementById(`rec-${n.id}`).innerText = `${receitaReal.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}/s`;
    document.getElementById(`custo-${n.id}`).innerText = custo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
    
    // Efeito Visual de Desbloqueio
    const card = document.getElementById(`card-${n.id}`);
    if (qtd > 0) {
        card.classList.add('desbloqueado');
    } else {
        card.classList.remove('desbloqueado');
    }

    // Botão de Compra
    const btn = document.querySelector(`#card-${n.id} .btn-compra`);
    if (jogo.dinheiro >= custo) {
      btn.classList.add('pode-comprar');
      btn.disabled = false;
    } else {
      btn.classList.remove('pode-comprar');
      btn.disabled = true;
    }
  });
}

// --- UPGRADES & LOJA (Mantido igual) ---
window.comprarUpgrade = function(tipo) {
    if (tipo === 'limonada' && jogo.dinheiro >= 100 && !jogo.upgrades.includes('limao_x2')) {
        jogo.dinheiro -= 100;
        jogo.upgrades.push('limao_x2');
        aplicarEfeitosUpgrades();
        document.getElementById('upg-limao').classList.add('comprado');
        atualizarInterface();
    }
};

function aplicarEfeitosUpgrades() {
    if (jogo.upgrades.includes('limao_x2')) {
        const limonada = CONFIG_NEGOCIOS.find(n => n.id === 'limonada');
        if(limonada.receitaBase === 1) limonada.receitaBase = 2; 
    }
}

// --- ADS & OFFLINE ---
let lucroPendente = 0;
window.dobrarLucroOffline = async function() {
    try {
        const ouvinte = await AdMob.addListener(RewardAdPluginEvents.Rewarded, (reward) => {
            lucroPendente *= 2;
            window.fecharModalOffline();
            alert("💰 Lucro Dobrado!");
            AdMob.prepareRewardVideoAd({ adId: 'ca-app-pub-3940256099942544/5224354917' });
        });
        await AdMob.showRewardVideoAd();
    } catch (e) {
        console.error(e);
        alert("Falha no anúncio. Tente novamente.");
        AdMob.prepareRewardVideoAd({ adId: 'ca-app-pub-3940256099942544/5224354917' });
    }
};

window.fecharModalOffline = function() {
    jogo.dinheiro += lucroPendente;
    lucroPendente = 0;
    document.getElementById('modal-offline').style.display = 'none';
    renderizarDinheiro();
};

function calcularGanhosOffline() {
    if (!jogo.ultimoLogin) return;
    const tempoAusente = Date.now() - jogo.ultimoLogin;
    if (tempoAusente < 10000) return;

    let total = 0;
    const bonusAnjos = 1 + (jogo.investidores * 0.02);
    CONFIG_NEGOCIOS.forEach(n => {
        const qtd = jogo.negocios[n.id];
        if (qtd > 0) {
            const receitaPorMs = (n.receitaBase * qtd * bonusAnjos) / n.tempoMs;
            total += receitaPorMs * tempoAusente;
        }
    });

    if (total > 1) {
        lucroPendente = total;
        document.getElementById('valor-offline').innerText = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        document.getElementById('modal-offline').style.display = 'flex';
    }
}

// --- MODAIS GERAIS ---
window.abrirModal = (id) => document.getElementById(id).style.display = 'flex';
window.fecharModal = (id) => document.getElementById(id).style.display = 'none';
window.abrirPainelInvestidores = () => {
    const anjosPossiveis = Math.floor(Math.sqrt(jogo.dinheiroTotal / 1000000));
    const novos = Math.max(0, anjosPossiveis - jogo.investidores);
    document.getElementById('qtd-anjos-atuais').innerText = jogo.investidores;
    document.getElementById('bonus-anjos-atual').innerText = Math.floor(jogo.investidores * 2) + "%";
    document.getElementById('qtd-anjos-novos').innerText = novos;
    const btn = document.getElementById('btn-resetar');
    if(novos > 0) {
        btn.classList.remove('bloqueado');
        btn.onclick = () => confirmarReset(novos);
    } else {
        btn.classList.add('bloqueado');
        btn.onclick = null;
    }
    window.abrirModal('modal-investidores');
};

function confirmarReset(novos) {
    if(confirm("Reiniciar para ganhar Investidores?")) {
        jogo.investidores += novos;
        jogo.dinheiro = 0;
        jogo.dinheiroTotal = 0;
        CONFIG_NEGOCIOS.forEach(n => jogo.negocios[n.id] = 0);
        guardarJogo();
        location.reload();
    }
}

// --- START ---
window.cliqueManual = cliqueManual;
window.tentarComprar = comprarNegocio;

// INICIALIZAR ADS
AdMob.initialize({ requestTrackingAuthorization: true, initializeForTesting: true });
AdMob.prepareRewardVideoAd({ adId: 'ca-app-pub-3940256099942544/5224354917' });

carregarJogo();
aplicarEfeitosUpgrades();
criarInterface();
calcularGanhosOffline();
if(jogo.upgrades.includes('limao_x2')) {
    const b = document.getElementById('upg-limao');
    if(b) b.classList.add('comprado');
}
atualizarInterface();
requestAnimationFrame(loop);