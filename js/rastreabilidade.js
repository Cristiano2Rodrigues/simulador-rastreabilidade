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
    // Suporta tanto timestamp Unix (blockchain) quanto ms (localStorage)
    const ts = Number(timestamp);
    const d = ts > 1e12 ? new Date(ts) : new Date(ts * 1000);
    return d.toLocaleTimeString('pt-BR');
}

function formatarDataHora(timestamp) {
    const ts = Number(timestamp);
    const d = ts > 1e12 ? new Date(ts) : new Date(ts * 1000);
    return d.toLocaleString('pt-BR');
}

function formatarMatricula(operador) {
    if (!operador || operador === '0x0000' || operador === '' || operador === 'SIST') return '—';
    if (operador.length <= 6) return operador.toUpperCase();
    if (operador.startsWith('0x') && operador.length === 42) {
        return operador.slice(0, 6) + '...' + operador.slice(-4);
    }
    return operador;
}

// ---- Busca registros do chassi no localStorage ----
function buscarRegistrosLocais(chassi) {
    const chassiUp = chassi.trim().toUpperCase();
    const todas = Object.keys(localStorage).filter(k => k.startsWith('registros_'));
    const encontrados = [];

    todas.forEach(chave => {
        try {
            const lista = JSON.parse(localStorage.getItem(chave) || '[]');
            lista.forEach(r => {
                if (r.chassi && r.chassi.toUpperCase() === chassiUp) {
                    encontrados.push(r);
                }
            });
        } catch(e) {}
    });

    // Ordena por timestamp crescente
    encontrados.sort((a, b) => Number(a.timestamp) - Number(b.timestamp));
    return encontrados;
}

// Converte registro local para o formato padrão do ledger
function normalizarRegistroLocal(r) {
    return {
        posto: r.posto || '—',
        timestamp: r.timestamp,   // em ms
        operador: r.matricula || r.operador || '—',
        statusSucesso: r.sucesso !== false,
        txHash: r.txHash || '—',
        fonte: 'local'
    };
}

// Converte registro da blockchain para o formato padrão
function normalizarRegistroBlockchain(r) {
    return {
        posto: r.posto,
        timestamp: r.timestamp,   // em segundos Unix
        operador: r.operador,
        statusSucesso: r.statusSucesso,
        txHash: null,
        fonte: 'blockchain'
    };
}

export async function consultarChassi(chassi) {
    if (!chassi || chassi.trim() === '') {
        exibirErro("Digite um código de chassi válido.");
        return;
    }

    const chassiFormatado = chassi.trim().toUpperCase();
    exibirCarregando(chassiFormatado);

    // 1. Tenta buscar localmente primeiro (rápido e sem internet)
    const registrosLocais = buscarRegistrosLocais(chassiFormatado);

    // 2. Tenta buscar na blockchain em paralelo (sem travar se falhar)
    let registrosBC = [];
    try {
        const contrato = await obterContrato();
        const historico = await contrato.consultarHistorico(chassiFormatado);
        if (historico && historico.length > 0) {
            registrosBC = historico.map(normalizarRegistroBlockchain);
        }
    } catch (err) {
        console.warn("Blockchain indisponível, usando dados locais:", err.message);
    }

    // 3. Mescla: prioriza blockchain; completa com local se não encontrar na BC
    let registros = [];
    if (registrosBC.length > 0) {
        registros = registrosBC;
    } else if (registrosLocais.length > 0) {
        registros = registrosLocais.map(normalizarRegistroLocal);
    }

    if (registros.length === 0) {
        exibirErro(`Nenhum registro encontrado para <strong>${chassiFormatado}</strong>.<br>
            <small style="color:#64748b;">Verifique se o código foi apontado nesta sessão ou conecte sua carteira para consultar a blockchain.</small>`);
        return;
    }

    await renderizarLedger(chassiFormatado, registros);
}

async function renderizarLedger(chassi, registros) {
    const container = document.getElementById('ledger-container');
    const planta = obterNomePlanta();

    // Garante ordem cronológica
    const regsOrdenados = [...registros].sort((a, b) => Number(a.timestamp) - Number(b.timestamp));

    // Gera cadeia de hashes SHA-256
    let hashAnterior = '0'.repeat(64);
    const hashes = [];
    for (let i = 0; i < regsOrdenados.length; i++) {
        const r = regsOrdenados[i];
        const conteudo = `${chassi}${r.posto}${r.timestamp}${r.operador}${r.statusSucesso}${hashAnterior}`;
        const hash = await gerarHash(conteudo);
        hashes.push({ atual: hash, anterior: hashAnterior });
        hashAnterior = hash;
    }

    const registrosDesc = [...regsOrdenados].reverse();
    const hashesDesc = [...hashes].reverse();
    const temBlockchain = registros.some(r => r.fonte === 'blockchain');

    let linhas = '';
    registrosDesc.forEach((r, idx) => {
        const statusBadge = r.statusSucesso
            ? `<span class="badge-validado">Validado</span>`
            : `<span class="badge-reparo">Reparo</span>`;

        const numeroRegistro = regsOrdenados.length - idx;
        const h = hashesDesc[idx];
        const matricula = formatarMatricula(r.operador);
        const fonteIcon = r.fonte === 'blockchain'
            ? `<span title="Registrado na blockchain" style="color:#10b981;font-size:0.6rem;">⛓ ON-CHAIN</span>`
            : `<span title="Registrado localmente" style="color:#f59e0b;font-size:0.6rem;">💾 LOCAL</span>`;

        linhas += `
            <tr class="${idx % 2 === 0 ? 'row-par' : 'row-impar'}">
                <td>${statusBadge}<br>${fonteIcon}</td>
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

    const origemLabel = temBlockchain
        ? `<span style="color:#10b981;">⛓ Dados verificados na Blockchain Sepolia</span>`
        : `<span style="color:#f59e0b;">💾 Dados do histórico local (blockchain indisponível)</span>`;

    container.innerHTML = `
        <div class="ledger-header-info">
            <div>
                <span class="ledger-chassi-titulo">Ledger da Blockchain (Registros Imutáveis)</span>
                <span class="ledger-chassi-sub">Chassi: <strong>${chassi}</strong> · ${regsOrdenados.length} registro(s) · ${origemLabel}</span>
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

    window._ultimoHistoricoLedger = { chassi, registros: regsOrdenados, hashes, planta };
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
        "Posto de Montagem", "Operador de Montagem",
        "Posto de Teste",    "Operador de Teste",
        "Posto de Embalagem","Operador de Embalagem",
        "Posto de Reparo",   "Operador do Reparo",
        "Hash das Transações (SHA-256)"
    ];

    const linhaDados = [
        chassi,
        rMontagem  ? formatarHora(rMontagem.timestamp)       : '—',
        rMontagem  ? formatarMatricula(rMontagem.operador)   : '—',
        rTeste     ? formatarHora(rTeste.timestamp)           : '—',
        rTeste     ? formatarMatricula(rTeste.operador)       : '—',
        rEmbalagem ? formatarHora(rEmbalagem.timestamp)       : '—',
        rEmbalagem ? formatarMatricula(rEmbalagem.operador)   : '—',
        rReparo    ? formatarHora(rReparo.timestamp)          : '—',
        rReparo    ? formatarMatricula(rReparo.operador)      : '—',
        todosHashes[0] || '—'
    ];

    const linhasExtras = todosHashes.slice(1).map(h => ['','','','','','','','','', h]);

    const wsRastreabilidade = XLSX.utils.aoa_to_sheet([cabecalho, linhaDados, ...linhasExtras]);
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
        "Operador (Matrícula)", "Planta", "Origem", "Hash SHA-256", "Hash Anterior (Prev)"
    ];

    const registrosDesc = [...registros].reverse();
    const hashesDesc = [...hashes].reverse();

    const linhasLedger = registrosDesc.map((r, idx) => [
        registros.length - idx,
        r.statusSucesso ? "Validado" : "Reparo",
        formatarDataHora(r.timestamp),
        chassi,
        r.posto,
        formatarMatricula(r.operador),
        planta,
        r.fonte === 'blockchain' ? 'Blockchain' : 'Local',
        hashesDesc[idx].atual,
        hashesDesc[idx].anterior
    ]);

    const wsLedger = XLSX.utils.aoa_to_sheet([cabLedger, ...linhasLedger]);
    wsLedger['!cols'] = [
        { wch: 5 }, { wch: 10 }, { wch: 20 }, { wch: 22 },
        { wch: 15 }, { wch: 18 }, { wch: 20 }, { wch: 12 }, { wch: 68 }, { wch: 68 }
    ];
    XLSX.utils.book_append_sheet(wb, wsLedger, "Ledger Blockchain");

    XLSX.writeFile(wb, `Rastreabilidade_${chassi}_${new Date().toISOString().slice(0,10)}.xlsx`);
}

function encontrarPosto(registros, nomeChave) {
    return registros.find(r => r.posto && r.posto.toLowerCase().includes(nomeChave)) || null;
}

function exibirCarregando(chassi) {
    document.getElementById('ledger-container').innerHTML = `
        <div class="ledger-estado">
            <i class="fa-solid fa-spinner fa-spin" style="font-size:2rem; color:#38bdf8;"></i>
            <p style="color:#94a3b8; margin-top:12px;">Consultando registros para <strong style="color:#f8fafc;">${chassi}</strong>...</p>
        </div>`;
}

function exibirErro(msg) {
    document.getElementById('ledger-container').innerHTML = `
        <div class="ledger-estado">
            <i class="fa-solid fa-circle-xmark" style="font-size:2rem; color:#ef4444;"></i>
            <p style="color:#94a3b8; margin-top:12px;">${msg}</p>
        </div>`;
}
