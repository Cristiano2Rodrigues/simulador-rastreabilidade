// ============================================================
// rastreabilidade.js — Consulta de histórico de chassi
// ============================================================

import { CONTRACT_ADDRESS, CONTRACT_ABI, obterNomePlanta } from './config.js';

let contratoLeitura = null;

async function obterContrato() {
    if (contratoLeitura) return contratoLeitura;
    const publicProvider = new ethers.JsonRpcProvider("https://rpc.sepolia.org");
    contratoLeitura = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, publicProvider);
    return contratoLeitura;
}

async function gerarHash(texto) {
    const encoder = new TextEncoder();
    const data = encoder.encode(texto);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function formatarHora(timestamp) {
    return new Date(Number(timestamp) * 1000).toLocaleTimeString('pt-BR');
}

function formatarDataHora(timestamp) {
    return new Date(Number(timestamp) * 1000).toLocaleString('pt-BR');
}

// Exibe matrícula de 4 dígitos diretamente (ex: A3K9)
// Se vier endereço de carteira antigo, exibe abreviado
function formatarMatricula(operador) {
    if (!operador || operador === '0x0000' || operador === '') return '—';
    // Matrícula de 4 caracteres (novo formato)
    if (operador.length === 4) return operador.toUpperCase();
    // Endereço de carteira (formato antigo — fallback)
    if (operador.startsWith('0x') && operador.length === 42) {
        return operador.slice(0, 6) + '...' + operador.slice(-4);
    }
    return operador;
}

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

async function renderizarLedger(chassi, historico) {
    const container = document.getElementById('ledger-container');
    const planta = obterNomePlanta();

    const registros = [...historico].sort((a, b) => Number(a.timestamp) - Number(b.timestamp));

    let hashAnterior = '0'.repeat(64);
    const hashes = [];
    for (let i = 0; i < registros.length; i++) {
        const r = registros[i];
        const conteudo = `${chassi}${r.posto}${r.timestamp}${r.operador}${r.statusSucesso}${hashAnterior}`;
        const hash = await gerarHash(conteudo);
        hashes.push({ atual: hash, anterior: hashAnterior });
        hashAnterior = hash;
    }

    const registrosDesc = [...registros].reverse();
    const hashesDesc = [...hashes].reverse();

    let linhas = '';
    registrosDesc.forEach((r, idx) => {
        const status = r.statusSucesso;
        const statusBadge = status
            ? `<span class="badge-validado">Validado</span>`
            : `<span class="badge-reparo">Reparo</span>`;

        const numeroRegistro = registros.length - idx;
        const h = hashesDesc[idx];
        const matricula = formatarMatricula(r.operador);

        linhas += `
            <tr class="${idx % 2 === 0 ? 'row-par' : 'row-impar'}">
                <td>${statusBadge}</td>
                <td>${formatarDataHora(r.timestamp)}</td>
                <td><strong>${chassi}</strong></td>
                <td><strong>${matricula}</strong><br><span class="posto-label">${r.posto} • #${numeroRegistro}</span></td>
                <td>${planta}</td>
                <td class="hash-cell">
                    <span class="hash-label">Hash:</span>
                    <span class="hash-valor">${h.atual}</span><br>
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
                        <th>Status</th><th>Data/Hora</th><th>Produto</th>
                        <th>Operador / Posto</th><th>Planta</th>
                        <th>Hash de Segurança (SHA-256)</th>
                    </tr>
                </thead>
                <tbody>${linhas}</tbody>
            </table>
        </div>`;

    window._ultimoHistoricoLedger = { chassi, registros, hashes, planta };
}

export async function exportarLedgerExcel(chassi) {
    const dados = window._ultimoHistoricoLedger;
    if (!dados) return;

    const { registros, hashes, planta } = dados;

    const wb = XLSX.utils.book_new();

    const rMontagem  = encontrarPosto(registros, 'montagem');
    const rTeste     = encontrarPosto(registros, 'teste');
    const rEmbalagem = encontrarPosto(registros, 'embalagem');
    const rReparo    = encontrarPosto(registros, 'reparo');

    const todosHashes = hashes.map(h => h.atual);

    const cabecalho = [
        "Código do Produto",
        "Posto de Montagem",
        "Operador de Montagem",
        "Posto de Teste",
        "Operador de Teste",
        "Posto de Embalagem",
        "Operador de Embalagem",
        "Posto de Reparo",
        "Operador do Reparo",
        "Hash das Transações (SHA-256)"
    ];

    const linhaDados = [
        chassi,
        rMontagem  ? formatarHora(rMontagem.timestamp)         : '—',
        rMontagem  ? formatarMatricula(rMontagem.operador)      : '—',
        rTeste     ? formatarHora(rTeste.timestamp)             : '—',
        rTeste     ? formatarMatricula(rTeste.operador)         : '—',
        rEmbalagem ? formatarHora(rEmbalagem.timestamp)         : '—',
        rEmbalagem ? formatarMatricula(rEmbalagem.operador)     : '—',
        rReparo    ? formatarHora(rReparo.timestamp)            : '—',
        rReparo    ? formatarMatricula(rReparo.operador)        : '—',
        todosHashes[0] || '—'
    ];

    const linhasExtras = todosHashes.slice(1).map(h => [
        '', '', '', '', '', '', '', '', '', h
    ]);

    const wsRastreabilidade = XLSX.utils.aoa_to_sheet([
        cabecalho,
        linhaDados,
        ...linhasExtras
    ]);

    wsRastreabilidade['!cols'] = [
        { wch: 22 }, { wch: 18 }, { wch: 22 },
        { wch: 18 }, { wch: 22 }, { wch: 18 },
        { wch: 22 }, { wch: 18 }, { wch: 22 },
        { wch: 68 }
    ];

    XLSX.utils.book_append_sheet(wb, wsRastreabilidade, "Rastreabilidade");

    // Aba ledger completo
    const cabLedger = [
        "Nº", "Status", "Data/Hora", "Chassi", "Posto",
        "Operador (Matrícula)", "Planta", "Hash SHA-256", "Hash Anterior (Prev)"
    ];

    const registrosDesc = [...registros].reverse();
    const hashesDesc    = [...hashes].reverse();

    const linhasLedger = registrosDesc.map((r, idx) => {
        const h = hashesDesc[idx];
        return [
            registros.length - idx,
            r.statusSucesso ? "Validado" : "Reparo",
            formatarDataHora(r.timestamp),
            chassi,
            r.posto,
            formatarMatricula(r.operador),
            planta,
            h.atual,
            h.anterior
        ];
    });

    const wsLedger = XLSX.utils.aoa_to_sheet([cabLedger, ...linhasLedger]);
    wsLedger['!cols'] = [
        { wch: 5 }, { wch: 10 }, { wch: 20 }, { wch: 22 },
        { wch: 15 }, { wch: 18 }, { wch: 20 }, { wch: 68 }, { wch: 68 }
    ];

    XLSX.utils.book_append_sheet(wb, wsLedger, "Ledger Blockchain");
    XLSX.writeFile(wb, `Rastreabilidade_${chassi}_${new Date().toISOString().slice(0,10)}.xlsx`);
}

function encontrarPosto(registros, nomeChave) {
    return registros.find(r => r.posto.toLowerCase().includes(nomeChave)) || null;
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
