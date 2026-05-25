// ============================================================
// blockchain.js — Integração MetaMask + Sepolia
// Qualquer carteira pode conectar e registrar passagens
// ============================================================

import { CONTRACT_ADDRESS, CONTRACT_ABI } from './config.js';

let provider = null;
let signer = null;
let contrato = null;
let contadorChassi = 1;
let carteiraConectada = false;

function gerarChassi() {
    const id = String(contadorChassi).padStart(5, '0');
    contadorChassi++;
    return `CHX-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${id}`;
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

export async function registrarPassagemBlockchain(posto, sucesso) {
    // Se não conectado, avisa e pede para conectar
    if (!contrato || !carteiraConectada) {
        const queroConectar = confirm(
            "Você precisa conectar sua carteira MetaMask para registrar na blockchain.\n\nDeseja conectar agora?"
        );
        if (queroConectar) await conectarCarteira(true);
        if (!contrato) return null; // Ainda não conectado
    }

    const chassi = gerarChassi();
    const operador = await signer.getAddress();

    try {
        atualizarStatusTx("⏳ Aguardando assinatura...", "#f59e0b");

        const tx = await contrato.registrarPassagem(chassi, posto, operador, sucesso);

        atualizarStatusTx("⛏️ Minerando...", "#38bdf8");
        await tx.wait();

        atualizarStatusTx("✅ TX confirmada!", "#10b981");
        console.log(`✅ Chassi: ${chassi} | TX: ${tx.hash}`);

        exibirLinkEtherscan(tx.hash, chassi, operador);
        return tx.hash;

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
