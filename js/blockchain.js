// ============================================================
// blockchain.js — Integração MetaMask + Sepolia
// Qualquer carteira pode conectar e registrar passagens
// ============================================================

import { CONTRACT_ADDRESS, CONTRACT_ABI } from './config.js';

let provider = null;
let signer = null;
let contrato = null;
let carteiraConectada = false;

// ---- Gerenciamento de chassi por peça ----
// Cada peça tem um chassi único compartilhado entre todos os postos
let _chassiAtual = null;
let _contadorChassi = parseInt(localStorage.getItem('_chassiCounter') || '0');

export function gerarNovoChassiPeca() {
    _contadorChassi++;
    localStorage.setItem('_chassiCounter', String(_contadorChassi));
    const id = String(_contadorChassi).padStart(5, '0');
    const d = new Date();
    const dataLocal = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
    _chassiAtual = `CHX-${dataLocal}-${id}`;
    console.log(`🔖 Novo chassi de peça: ${_chassiAtual}`);
    return _chassiAtual;
}

export function obterChassiAtual() {
    if (!_chassiAtual) gerarNovoChassiPeca();
    return _chassiAtual;
}

// Chamado na inicialização — apenas verifica se MetaMask existe, NÃO conecta
export async function inicializarBlockchain() {
    const dotEl = document.getElementById('blockchain-dot');
    const txtEl = document.getElementById('blockchain-status-text');

    const addressSalvo = localStorage.getItem('web3_contract_address');
    const walletSalva = localStorage.getItem('web3_admin_wallet');
    if (addressSalvo) document.getElementById('adminContractInput').value = addressSalvo;
    if (walletSalva) document.getElementById('adminWalletInput').value = walletSalva;

    if (typeof window.ethereum === 'undefined') {
        txtEl.innerText = "MetaMask não instalada";
        dotEl.style.backgroundColor = "#ef4444";
        atualizarBotaoConectar(false);
        return false;
    }

    // Verifica se já tinha uma conta conectada anteriormente (sem abrir popup)
    try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
            // Já estava conectado, restaura a sessão silenciosamente
            await conectarCarteira(false);
        } else {
            txtEl.innerText = "Carteira não conectada";
            dotEl.style.backgroundColor = "#64748b";
            atualizarBotaoConectar(false);
        }
    } catch (e) {
        txtEl.innerText = "Carteira não conectada";
        dotEl.style.backgroundColor = "#64748b";
        atualizarBotaoConectar(false);
    }

    // Escuta troca de conta ou rede no MetaMask
    window.ethereum.on('accountsChanged', () => conectarCarteira(false));
    window.ethereum.on('chainChanged', () => window.location.reload());

    return carteiraConectada;
}

// Chamado pelo botão "Conectar Carteira" — abre o popup do MetaMask
export async function conectarCarteira(mostrarPopup = true) {
    const dotEl = document.getElementById('blockchain-dot');
    const txtEl = document.getElementById('blockchain-status-text');

    if (typeof window.ethereum === 'undefined') {
        alert("MetaMask não encontrada! Instale em https://metamask.io");
        return false;
    }

    try {
        if (mostrarPopup) {
            atualizarStatusTx("🔓 Abrindo MetaMask...", "#f59e0b");
            await window.ethereum.request({ method: 'eth_requestAccounts' });
        }

        provider = new ethers.BrowserProvider(window.ethereum);
        signer = await provider.getSigner();

        // Verifica rede Sepolia
        const network = await provider.getNetwork();
        if (network.chainId !== 11155111n) {
            atualizarStatusTx("⚠️ Trocando para Sepolia...", "#f59e0b");
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0xaa36a7' }]
                });
                return await conectarCarteira(false);
            } catch (e) {
                atualizarStatusTx("❌ Troque para Sepolia manualmente", "#ef4444");
                return false;
            }
        }

        contrato = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
        carteiraConectada = true;

        const endereco = await signer.getAddress();
        txtEl.innerText = `${endereco.slice(0, 6)}...${endereco.slice(-4)} | Sepolia ✅`;
        dotEl.style.backgroundColor = "#10b981";
        atualizarBotaoConectar(true);

        return true;

    } catch (err) {
        if (err.code === 4001) {
            atualizarStatusTx("❌ Conexão recusada pelo usuário", "#ef4444");
        } else {
            atualizarStatusTx("⚠️ Erro ao conectar", "#ef4444");
            console.error(err);
        }
        atualizarBotaoConectar(false);
        return false;
    }
}

export async function registrarPassagemBlockchain(posto, sucesso, matricula = 'SIST', chassi = null) {
    if (!chassi) chassi = obterChassiAtual();
    const operador = matricula;
    const timestamp = Date.now();

    // Sempre salva localmente primeiro (garante histórico mesmo sem blockchain)
    salvarRegistroLocal({ chassi, posto, matricula, sucesso, txHash: '—', timestamp });

    // Se não conectado, salva local e retorna sem popup
    if (!contrato || !carteiraConectada) {
        atualizarStatusTx("⚠️ Salvo localmente (sem blockchain)", "#f59e0b");
        return null;
    }

    try {
        atualizarStatusTx("⏳ Aguardando assinatura...", "#f59e0b");

        const tx = await contrato.registrarPassagem(chassi, posto, operador, sucesso);

        atualizarStatusTx("⛏️ Minerando...", "#38bdf8");
        await tx.wait();

        const txHash = tx.hash;
        atualizarStatusTx("✅ TX confirmada!", "#10b981");
        console.log(`✅ Chassi: ${chassi} | TX: ${txHash}`);

        // Atualiza o registro local com o hash real da transação
        _atualizarHashRegistroLocal(chassi, txHash);

        exibirLinkEtherscan(txHash, chassi, operador);
        return txHash;

    } catch (err) {
        if (err.code === 4001) {
            atualizarStatusTx("❌ Transação rejeitada", "#ef4444");
        } else {
            atualizarStatusTx("⚠️ Erro na TX (salvo localmente)", "#f59e0b");
            console.error(err);
        }
        return null;
    }
}

// Atualiza o txHash de um registro já salvo localmente
function _atualizarHashRegistroLocal(chassi, txHash) {
    const d = new Date();
    const data = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const chave = `registros_${data}`;
    try {
        const lista = JSON.parse(localStorage.getItem(chave) || '[]');
        const idx = [...lista].reverse().findIndex(r => r.chassi === chassi);
        if (idx !== -1) {
            const realIdx = lista.length - 1 - idx;
            lista[realIdx].txHash = txHash;
            localStorage.setItem(chave, JSON.stringify(lista));
        }
    } catch(e) {}
}

export async function registrarOperadorBlockchain(operador, entrou) {
    if (!contrato || !carteiraConectada) return null;

    try {
        atualizarStatusTx("⏳ Registrando operador...", "#f59e0b");
        const tx = await contrato.alterarStatusOperador(operador, entrou);
        await tx.wait();
        atualizarStatusTx("✅ Operador registrado na rede", "#10b981");
        return tx.hash;
    } catch (err) {
        console.error("Erro ao registrar operador:", err);
        atualizarStatusTx("⚠️ Falha ao registrar operador", "#ef4444");
        return null;
    }
}

// Atualiza o botão de conectar na sidebar
function atualizarBotaoConectar(conectado) {
    const btn = document.getElementById('btn-conectar-carteira');
    if (!btn) return;

    if (conectado) {
        btn.innerHTML = `<i class="fa-solid fa-link"></i> Carteira Conectada`;
        btn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
        btn.style.color = '#fff';
        btn.style.cursor = 'default';
        btn.onclick = null;
    } else {
        btn.innerHTML = `<i class="fa-solid fa-wallet"></i> Conectar Carteira`;
        btn.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
        btn.style.color = '#000';
        btn.style.cursor = 'pointer';
        btn.onclick = () => conectarCarteira(true);
    }
}

function atualizarStatusTx(msg, cor) {
    const el = document.getElementById('blockchain-status-text');
    const dot = document.getElementById('blockchain-dot');
    if (el) el.innerText = msg;
    if (dot) dot.style.backgroundColor = cor;
}

// Salva cada transação localmente vinculada à data e turno atual
export function salvarRegistroLocal({ chassi, posto, matricula, sucesso, txHash, timestamp }) {
    // Usa data LOCAL (não UTC) para evitar desencontro de fuso horário
    const d = new Date(timestamp);
    const data = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const chave = `registros_${data}`;
    let lista = [];
    try { lista = JSON.parse(localStorage.getItem(chave) || '[]'); } catch(e) {}
    lista.push({ chassi, posto, matricula, sucesso, txHash, timestamp });
    localStorage.setItem(chave, JSON.stringify(lista));
    console.log(`💾 Salvo: chave=${chave} | chassi=${chassi} | total=${lista.length}`);
}

// Retorna todos os registros de um intervalo de datas
export function obterRegistrosPorPeriodo(dataInicio, dataFim) {
    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);
    fim.setHours(23, 59, 59);
    const registros = [];
    const cursor = new Date(inicio);
    while (cursor <= fim) {
        const chave = `registros_${cursor.toISOString().split('T')[0]}`;
        try {
            const lista = JSON.parse(localStorage.getItem(chave) || '[]');
            registros.push(...lista);
        } catch(e) {}
        cursor.setDate(cursor.getDate() + 1);
    }
    return registros;
}

function exibirLinkEtherscan(txHash, chassi, operador) {
    const container = document.getElementById('console-acoes-rapidas');
    if (!container) return;

    const anterior = document.getElementById('ultimo-tx-link');
    if (anterior) anterior.remove();

    const div = document.createElement('div');
    div.id = 'ultimo-tx-link';
    div.style.cssText = 'margin-top:8px; padding:8px; background:#0f172a; border-radius:6px; border:1px solid #10b981;';
    div.innerHTML = `
        <div style="font-size:0.65rem; color:#64748b; margin-bottom:4px;">Última TX Confirmada:</div>
        <div style="font-size:0.7rem; color:#34d399; font-family:monospace;">Chassi: ${chassi}</div>
        <div style="font-size:0.65rem; color:#64748b; font-family:monospace; margin-bottom:4px;">
            Por: ${operador.slice(0,6)}...${operador.slice(-4)}
        </div>
        <a href="https://sepolia.etherscan.io/tx/${txHash}" target="_blank"
           style="font-size:0.7rem; color:#38bdf8; text-decoration:none; font-family:monospace; word-break:break-all;">
            🔗 Ver no Etherscan
        </a>
    `;
    container.appendChild(div);
}
