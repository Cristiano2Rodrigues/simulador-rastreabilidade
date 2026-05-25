// ============================================================
// blockchain.js — Integração real com MetaMask + Sepolia
// ============================================================

import { CONTRACT_ADDRESS, CONTRACT_ABI } from './config.js';

let provider = null;
let signer = null;
let contrato = null;
let contadorChassi = 1;

// Gera um ID de chassi único por peça
function gerarChassi() {
    const id = String(contadorChassi).padStart(5, '0');
    contadorChassi++;
    return `CHX-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${id}`;
}

export async function inicializarBlockchain() {
    const dotEl = document.getElementById('blockchain-dot');
    const txtEl = document.getElementById('blockchain-status-text');

    // Carrega endereço/carteira salvos
    const addressSalvo = localStorage.getItem('web3_contract_address');
    const walletSalva = localStorage.getItem('web3_admin_wallet');
    if (addressSalvo) document.getElementById('adminContractInput').value = addressSalvo;
    if (walletSalva) document.getElementById('adminWalletInput').value = walletSalva;

    if (typeof window.ethereum === 'undefined') {
        txtEl.innerText = "MetaMask não encontrada";
        dotEl.style.backgroundColor = "#ef4444";
        return false;
    }

    try {
        // Solicita conexão com MetaMask
        await window.ethereum.request({ method: 'eth_requestAccounts' });

        provider = new ethers.BrowserProvider(window.ethereum);
        signer = await provider.getSigner();

        // Verifica se está na rede Sepolia (chainId 11155111)
        const network = await provider.getNetwork();
        if (network.chainId !== 11155111n) {
            txtEl.innerText = "⚠️ Troque para Sepolia";
            dotEl.style.backgroundColor = "#f59e0b";

            // Tenta trocar automaticamente para Sepolia
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0xaa36a7' }]
                });
                // Reinicializa após trocar
                return await inicializarBlockchain();
            } catch (e) {
                return false;
            }
        }

        contrato = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

        const enderecoCarteira = await signer.getAddress();
        txtEl.innerText = `${enderecoCarteira.slice(0, 6)}...${enderecoCarteira.slice(-4)} | Sepolia`;
        dotEl.style.backgroundColor = "#10b981";

        return true;

    } catch (err) {
        console.error("Erro ao conectar blockchain:", err);
        txtEl.innerText = "Modo Local Sandbox";
        dotEl.style.backgroundColor = "#64748b";
        return false;
    }
}

export async function registrarPassagemBlockchain(posto, sucesso) {
    if (!contrato) {
        console.warn("Contrato não conectado. Operando em modo local.");
        return null;
    }

    const chassi = gerarChassi();
    const operador = signer ? await signer.getAddress() : "0x0000";

    try {
        atualizarStatusTx("⏳ Enviando transação...", "#f59e0b");

        const tx = await contrato.registrarPassagem(chassi, posto, operador, sucesso);

        atualizarStatusTx("⛏️ Minerando...", "#38bdf8");
        await tx.wait(); // Aguarda confirmação on-chain

        atualizarStatusTx(`✅ TX confirmada`, "#10b981");
        console.log(`✅ Passagem registrada! Chassi: ${chassi} | TX: ${tx.hash}`);
        console.log(`🔗 Ver no Etherscan: https://sepolia.etherscan.io/tx/${tx.hash}`);

        // Exibe link no painel admin se estiver aberto
        exibirLinkEtherscan(tx.hash, chassi);

        return tx.hash;

    } catch (err) {
        // Erro de gás ou rejeição pelo usuário
        if (err.code === 4001) {
            atualizarStatusTx("❌ Transação rejeitada", "#ef4444");
        } else {
            atualizarStatusTx("⚠️ Erro na TX (local salvo)", "#f59e0b");
            console.error("Erro blockchain:", err);
        }
        return null;
    }
}

export async function registrarOperadorBlockchain(operador, entrou) {
    if (!contrato) return null;

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

function atualizarStatusTx(msg, cor) {
    const el = document.getElementById('blockchain-status-text');
    const dot = document.getElementById('blockchain-dot');
    if (el) el.innerText = msg;
    if (dot) dot.style.backgroundColor = cor;
}

function exibirLinkEtherscan(txHash, chassi) {
    // Injeta um link clicável no console de ações rápidas
    const console = document.getElementById('console-acoes-rapidas');
    if (!console) return;

    // Remove link anterior se houver
    const anterior = document.getElementById('ultimo-tx-link');
    if (anterior) anterior.remove();

    const div = document.createElement('div');
    div.id = 'ultimo-tx-link';
    div.style.cssText = 'margin-top:8px; padding:8px; background:#0f172a; border-radius:6px; border:1px solid #10b981;';
    div.innerHTML = `
        <div style="font-size:0.65rem; color:#64748b; margin-bottom:4px;">Última TX Confirmada:</div>
        <div style="font-size:0.7rem; color:#34d399; font-family:monospace;">Chassi: ${chassi}</div>
        <a href="https://sepolia.etherscan.io/tx/${txHash}" target="_blank" 
           style="font-size:0.7rem; color:#38bdf8; text-decoration:none; font-family:monospace; word-break:break-all;">
            🔗 Ver no Etherscan
        </a>
    `;
    console.appendChild(div);
}
