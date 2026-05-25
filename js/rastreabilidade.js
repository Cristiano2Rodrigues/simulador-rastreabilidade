// ============================================================
// rastreabilidade.js — Consulta de histórico de chassi
// ============================================================

import { CONTRACT_ADDRESS, CONTRACT_ABI, obterNomePlanta } from './config.js';

let contratoLeitura = null;

// Inicializa contrato em modo leitura (não precisa de carteira)
async function obterContrato() {
    if (contratoLeitura) return contratoLeitura;

    // Usa provider público da Sepolia para leitura (sem MetaMask obrigatório)
    const publicProvider = new ethers.JsonRpcProvider(
        "https://rpc.sepolia.org"
    );
    contratoLeitura = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, publicProvider);
    return contratoLeitura;
}

// Gera hash SHA-256 de uma string
async function gerarHash(texto) {
    const encoder = new TextEncoder();
    const data = encoder.encode(texto);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Consulta histórico completo de um chassi na blockchain
export async function consultarChassi(chassi) {
    if (!chassi || chassi.trim() === '') {
        exibirErro("Digite um código de chassi válido.");
        return;
    }

    const chassiFormatado = chassi.trim().toUpperCase();
    exibirCarregando(chassiFormatado);

    try {
        const contrato = await obterContrato();
        const historico = await contrato.consultarHistorico(chassiFormatado);

        if (!historico || historico.length === 0) {
            exibirErro(`Nenhum registro encontrado para o chassi <strong>${chassiFormatado}</strong> na blockchain.`);
            return;
        }

        await renderizarLedger(chassiFormatado, historico);

    } catch (err) {
        console.error("Erro ao consultar blockchain:", err);
        exibirErro("Erro ao consultar a blockchain. Verifique sua conexão e tente novamente.");
    }
}

// Renderiza a tabela ledger com os registros
async function renderizarLedger(chassi, historico) {
    const container = document.getElementById('ledger-container');
    const planta = obterNomePlanta();

    // Ordena do mais antigo para o mais recente
    const registros = [...historico].sort((a, b) => Number(a.timestamp) - Number(b.timestamp));

    // Gera hashes encadeados (cada um depende do anterior)
    let hashAnterior = '0'.repeat(64);
    const hashes = [];
    for (let i = 0; i < registros.length; i++) {
        const r = registros[i];
        const conteudo = `${chassi}${r.posto}${r.timestamp}${r.operador}${r.statusSucesso}${hashAnterior}`;
        const hash = await gerarHash(conteudo);
        hashes.push({ atual: hash, anterior: hashAnterior });
        hashAnterior = hash;
    }

    // Renderiza do mais recente para o mais antigo (como na imagem)
    const registrosDesc = [...registros].reverse();
    const hashesDesc = [...hashes].reverse();

    let linhas = '';
    registrosDesc.forEach((r, idx) => {
        const data = new Date(Number(r.timestamp) * 1000);
        const dataStr = data.toLocaleString('pt-BR');
        const status = r.statusSucesso;
        const statusBadge = status
            ? `<span class="badge-validado">Validado</span>`
            : `<span class="badge-reparo">Reparo</span>`;

        const numeroRegistro = registros.length - idx;
        const h = hashesDesc[idx];
        const operadorCurto = r.operador.length > 20
            ? `${r.operador.slice(0, 6)}...${r.operador.slice(-4)}`
            : r.operador;

        linhas += `
            <tr class="${idx % 2 === 0 ? 'row-par' : 'row-impar'}">
                <td>${statusBadge}</td>
                <td>${dataStr}</td>
                <td><strong>${chassi}</strong></td>
                <td>${operadorCurto}<br><span class="posto-label">${r.posto} • #${numeroRegistro}</span></td>
                <td>${planta}</td>
                <td class="hash-cell">
                    <span class="hash-label">Hash:</span>
                    <span class="hash-valor">${h.atual}</span>
                    <br>
                    <span class="hash-label">Prev:</span>
                    <span class="hash-valor prev">${h.anterior}</span>
                </td>
            </tr>`;
    });

    container.innerHTML = `
        <div class="ledger-header-info">
            <div>
                <span class="ledger-chassi-titulo">Ledger da Blockchain (Registros Imutáveis)</span>
                <span class="ledger-chassi-sub">Chassi: <strong>${chassi}</strong> · ${registros.length} registro(s) encontrado(s)</span>
            </div>
            <button onclick="exportarLedgerExcel('${chassi}')" class="btn-exportar-ledger">
                <i class="fa-solid fa-file-excel"></i> Exportar .XLSX
            </button>
        </div>
        <div class="ledger-table-wrapper">
            <table class="ledger-table">
                <thead>
                    <tr>
                        <th>Status</th>
                        <th>Data/Hora</th>
                        <th>Produto</th>
                        <th>Operador / Posto</th>
                        <th>Planta</th>
                        <th>Hash de Segurança (SHA-256)</th>
                    </tr>
                </thead>
                <tbody>${linhas}</tbody>
            </table>
        </div>`;

    // Salva último histórico para exportação
    window._ultimoHistoricoLedger = { chassi, registros, hashes, planta };
}

// Exporta o ledger para Excel
export async function exportarLedgerExcel(chassi) {
    const dados = window._ultimoHistoricoLedger;
    if (!dados) return;

    const { registros, hashes, planta } = dados;
    const registrosDesc = [...registros].reverse();
    const hashesDesc = [...hashes].reverse();

    const wb = XLSX.utils.book_new();

    const linhas = [
        ["Status", "Data/Hora", "Produto (Chassi)", "Operador", "Posto", "Nº Registro", "Planta", "Hash SHA-256", "Hash Anterior (Prev)"]
    ];

    registrosDesc.forEach((r, idx) => {
        const data = new Date(Number(r.timestamp) * 1000).toLocaleString('pt-BR');
        const numeroRegistro = registros.length - idx;
        const h = hashesDesc[idx];
        linhas.push([
            r.statusSucesso ? "Validado" : "Reparo",
            data,
            chassi,
            r.operador,
            r.posto,
            numeroRegistro,
            planta,
            h.atual,
            h.anterior
        ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(linhas);

    // Largura das colunas
    ws['!cols'] = [
        { wch: 10 }, { wch: 20 }, { wch: 25 }, { wch: 45 },
        { wch: 15 }, { wch: 10 }, { wch: 20 }, { wch: 65 }, { wch: 65 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Ledger Blockchain");
    XLSX.writeFile(wb, `Rastreabilidade_${chassi}_${new Date().toISOString().slice(0,10)}.xlsx`);
}

function exibirCarregando(chassi) {
    document.getElementById('ledger-container').innerHTML = `
        <div class="ledger-estado">
            <i class="fa-solid fa-spinner fa-spin" style="font-size:2rem; color:#38bdf8;"></i>
            <p style="color:#94a3b8; margin-top:12px;">Consultando blockchain para o chassi <strong style="color:#f8fafc;">${chassi}</strong>...</p>
        </div>`;
}

function exibirErro(msg) {
    document.getElementById('ledger-container').innerHTML = `
        <div class="ledger-estado">
            <i class="fa-solid fa-circle-xmark" style="font-size:2rem; color:#ef4444;"></i>
            <p style="color:#94a3b8; margin-top:12px;">${msg}</p>
        </div>`;
}
