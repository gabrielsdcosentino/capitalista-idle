import { AdMob, RewardAdPluginEvents } from '@capacitor-community/admob';
// --- CONFIGURAÇÃO (DATA) ---
const CONFIG_NEGOCIOS = [
  { id: 'limonada', nome: 'Limonada', custoBase: 10, receitaBase: 1, tempoMs: 1000 },
  { id: 'jornal', nome: 'Entrega de Jornal', custoBase: 60, receitaBase: 4, tempoMs: 3000 },
  { id: 'lava_jato', nome: 'Lava Jato', custoBase: 700, receitaBase: 15, tempoMs: 6000 },
  { id: 'pizzaria', nome: 'Pizzaria', custoBase: 2500, receitaBase: 50, tempoMs: 12000 },
  { id: 'donut', nome: 'Loja de Donuts', custoBase: 10000, receitaBase: 200, tempoMs: 20000 },
];

// --- ESTADO DO JOGO (STATE) ---
let jogo = {
  dinheiro: 0,
  dinheiroTotal: 0, // Acumulado para Investidores
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
    // Migração de saves antigos
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
  // Investidores também aumentam o clique manual? Geralmente não, mas vamos dar um bônus fixo
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
        
        // FÓRMULA DE LUCRO: Base * Qtd * (1 + 2% por Anjo)
        const bonusAnjos = 1 + (jogo.investidores * 0.02);
        const lucro = (negocio.receitaBase * qtd * bonusAnjos) * ciclos;
        
        jogo.dinheiro += lucro;
        jogo.dinheiroTotal += lucro; // Conta para o próximo anjo
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

// --- INTERFACE ---
const elLista = document.getElementById('lista-negocios');
const elDinheiro = document.getElementById('display-dinheiro');
const elDiamante = document.getElementById('qtd-diamantes');

function renderizarDinheiro() {
  elDinheiro.innerText = jogo.dinheiro.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  if(elDiamante) elDiamante.innerText = jogo.diamantes;
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
          <p>Receita: <span id="rec-${n.id}">R$ 0,00</span></p>
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
  const bonusAnjos = 1 + (jogo.investidores * 0.02);
  
  CONFIG_NEGOCIOS.forEach(n => {
    const custo = calcularCusto(n.id);
    const qtd = jogo.negocios[n.id];
    const receitaReal = n.receitaBase * (qtd || 1) * bonusAnjos;
    
    document.getElementById(`qtd-${n.id}`).innerText = qtd;
    document.getElementById(`rec-${n.id}`).innerText = `${receitaReal.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}/ciclo`;
    document.getElementById(`custo-${n.id}`).innerText = custo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    
    const btn = document.querySelector(`#card-${n.id} .btn-compra`);
    if (jogo.dinheiro >= custo) {
      btn.classList.add('pode-comprar');
      btn.classList.remove('bloqueado');
    } else {
      btn.classList.remove('pode-comprar');
      // btn.classList.add('bloqueado'); // Opcional: deixar cinza
    }
  });
}

// --- UPGRADES ---
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

// --- OFFLINE EARNINGS ---
let lucroPendente = 0;
function calcularGanhosOffline() {
    if (!jogo.ultimoLogin) return;
    const tempoAusente = Date.now() - jogo.ultimoLogin;
    if (tempoAusente < 10000) return; // Mínimo 10s

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

window.fecharModalOffline = function() {
    jogo.dinheiro += lucroPendente;
    lucroPendente = 0;
    document.getElementById('modal-offline').style.display = 'none';
    renderizarDinheiro();
};
window.dobrarLucroOffline = async function() {
    // Escuta se o usuário assistiu até o fim
    const ouvinte = await AdMob.addListener(RewardAdPluginEvents.Rewarded, (reward) => {
        // O vídeo acabou e deu tudo certo!
        lucroPendente *= 2;
        window.fecharModalOffline();
        alert("💰 Bônus Recebido: Lucro Dobrado!");
        
        // Prepara o próximo
        AdMob.prepareRewardVideoAd({
            adId: 'ca-app-pub-3940256099942544/5224354917'
        });
    });

    // Tenta mostrar o anúncio
    try {
        await AdMob.showRewardVideoAd();
    } catch (e) {
        console.error(e);
        alert("O anúncio falhou em carregar. (Tente de novo em 5s)");
        // Se falhar, tenta carregar de novo para a próxima
        AdMob.prepareRewardVideoAd({
             adId: 'ca-app-pub-3940256099942544/5224354917'
        });
    }
};

// --- LOJA & INVESTIDORES ---
window.abrirModal = (id) => document.getElementById(id).style.display = 'flex';
window.fecharModal = (id) => document.getElementById(id).style.display = 'none';

window.simularCompraReal = (tipo) => {
    if(tipo === 'p') jogo.diamantes += 50;
    if(tipo === 'g') jogo.diamantes += 500;
    alert("Compra realizada com sucesso!");
    renderizarDinheiro();
    guardarJogo();
};

window.comprarItem = (tipo) => {
    if(tipo === 'avanco_1h') {
        if(jogo.diamantes >= 10) {
            jogo.diamantes -= 10;
            // Calcula 1h de ganhos
            let ganho = 0;
            const bonusAnjos = 1 + (jogo.investidores * 0.02);
            CONFIG_NEGOCIOS.forEach(n => {
                const qtd = jogo.negocios[n.id];
                if(qtd > 0) ganho += (n.receitaBase * qtd * bonusAnjos / n.tempoMs) * 3600000;
            });
            jogo.dinheiro += ganho;
            alert(`Salto no Tempo! Ganhou ${ganho.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}`);
            renderizarDinheiro();
            guardarJogo();
        } else {
            alert("Diamantes insuficientes!");
        }
    }
};

window.abrirPainelInvestidores = () => {
    // 1 Anjo a cada 1 Milhão acumulado (Raiz)
    const anjosPossiveis = Math.floor(Math.sqrt(jogo.dinheiroTotal / 1000000));
    const novos = Math.max(0, anjosPossiveis - jogo.investidores);
    
    document.getElementById('qtd-anjos-atuais').innerText = jogo.investidores;
    document.getElementById('bonus-anjos-atual').innerText = Math.floor(jogo.investidores * 2) + "%";
    document.getElementById('qtd-anjos-novos').innerText = novos;
    
    const btn = document.getElementById('btn-resetar');
    if(novos > 0) {
        btn.classList.remove('bloqueado');
        btn.innerText = `Vender Empresa (+${novos} Anjos)`;
        btn.onclick = () => confirmarReset(novos);
    } else {
        btn.classList.add('bloqueado');
        btn.innerText = "Precisa lucrar mais";
        btn.onclick = null;
    }
    window.abrirModal('modal-investidores');
};

function confirmarReset(novos) {
    if(confirm("Tem certeza? Você perderá o dinheiro e negócios, mas ganhará bônus permanente.")) {
        jogo.investidores += novos;
        jogo.dinheiro = 0;
        jogo.dinheiroTotal = 0; // Reseta o contador para o próximo marco
        CONFIG_NEGOCIOS.forEach(n => jogo.negocios[n.id] = 0);
        // Não resetamos diamantes nem upgrades permanentes
        guardarJogo();
        location.reload();
    }
}

// --- START ---
window.cliqueManual = cliqueManual;
window.tentarComprar = comprarNegocio;
// INICIALIZA OS ADS (NOVO)
AdMob.initialize({
  requestTrackingAuthorization: true,
  initializeForTesting: true, // Importante para testes
});

// Prepara o primeiro anúncio para não demorar quando clicar
AdMob.prepareRewardVideoAd({
  adId: 'ca-app-pub-3940256099942544/5224354917' // ID de Vídeo Premiado de Teste
});

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