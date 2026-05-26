// ============================================================
// ui.js — Interface: KPIs, Andon, tabs, admin, exportação
// ============================================================

import { estado } from './config.js';
import { obterRegistrosPorPeriodo } from './blockchain.js';
import { atualizarTodosGraficos, forcarResizeGraficos } from './charts.js';
import { salvarEstadoHistorico, limparTudoStorage, carregarEstadoHistorico } from './storage.js';
import { inicializarBlockchain } from './blockchain.js';

// ---- KPIs e Renderização Principal -------------------------

export function renderizarKPIs() {
    const targetMeta = parseInt(document.getElementById('inputMeta').value) || 200;
    const limitDPMU = parseInt(document.getElementById('inputDPMU').value) || 1500;
    const hcPrevisto = parseInt(document.getElementById('inputHC').value) || 12;

    const totalInjetado = estado.atualProduzido + estado.entradasReparo;
    const fpy = totalInjetado > 0
        ? (((totalInjetado - estado.entradasReparo) / totalInjetado) * 100).toFixed(1)
        : '0';

    // KPIs Produção
    document.getElementById('kpi-meta').innerHTML =
        `${estado.atualProduzido} <span style="font-size:0.875rem;color:#94a3b8">/ ${targetMeta} un</span>`;
    document.getElementById('kpi-progresso').style.width =
        `${Math.min((estado.atualProduzido / targetMeta) * 100, 100)}%`;
    document.getElementById('kpi-dpmu').innerText =
        Math.round(estado.atualDPMU).toLocaleString('pt-BR');
    document.getElementById('kpi-operadores').innerHTML =
        `${estado.totalBipadoReal} <span style="font-size:0.875rem;color:#94a3b8">em linha</span>`;
    document.getElementById('kpi-fpy').innerText = fpy + '%';

    // KPIs Reparo
    document.getElementById('kpi-reparo-entradas').innerText = estado.entradasReparo;
    document.getElementById('kpi-reparo-saidas').innerText = estado.saidasReparo;
    document.getElementById('kpi-reparo-retrabalho').innerHTML =
        `${estado.loopsRetrabalho} <span style="font-size:0.75rem;font-weight:400;color:#94a3b8">Loops</span>`;

    // Status auxiliares
    document.getElementById('kpi-dpmu-status').innerText =
        estado.atualDPMU > limitDPMU ? "⚠️ Fora do Limite Padrão" : "✅ Dentro do Limite";
    document.getElementById('kpi-fpy-status').innerText =
        parseFloat(fpy) >= 90 ? "✅ Classe Mundial" : "📉 Necessita Melhoria";
    document.getElementById('kpi-operadores-status').innerText =
        estado.totalBipadoReal >= hcPrevisto ? "✅ Equipe Completa" : "⚠️ Headcount Reduzido";

    // Atualiza gráficos e captura dados do Takt Time para o Andon
    const temposCiclo = atualizarTodosGraficos(estado, targetMeta, limitDPMU, hcPrevisto);
    if (temposCiclo) atualizarAndonFisico(temposCiclo);

    processarInsights();
}

// ---- Andon Físico ------------------------------------------

function atualizarAndonFisico(tempos) {
    const postos = ['montagem', 'teste', 'reparo', 'embalagem'];
    postos.forEach((id, idx) => {
        const t = tempos[idx] || 0;
        const elT = document.getElementById(`val-t-${id}`);
        const elE = document.getElementById(`val-e-${id}`);
        if (elT) elT.innerText = t + 's';

        let ef = t > 0 ? Math.round((40 / t) * 100) : 0;
        if (ef > 100) ef = 100;
        if (elE) elE.innerText = ef + '% Eficiência';

        const el = document.getElementById(`ws-${id}`);
        if (el) {
            el.className = 'workstation';
            if (id === 'reparo') el.className += ' ws-reparo-exclusivo';
            if (t > 45) el.classList.add('status-red');
            else if (t > 0) el.classList.add('status-green');
        }
    });
}

// ---- Engine de Insights ------------------------------------

function processarInsights() {
    const box = document.getElementById('textoSugestao');
    if (!box) return;

    if (estado.entradasReparo === 0 && estado.atualProduzido === 0) {
        box.innerText = "Aguardando sincronização de dados estáveis da linha.";
        return;
    }

    if (estado.entradasReparo > 0 && estado.entradasReparo >= estado.atualProduzido * 0.3) {
        box.innerText = "Alerta Crítico: Alto índice de rejeição no Posto de Teste Funcional. Foco imediato na calibração de torque e fixações na Montagem para estancar a geração de DPMU.";
    } else if (estado.atualProduzido > 0 && estado.totalBipadoReal < 8) {
        box.innerText = "Otimização HC: A linha opera com Headcount abaixo do planejado mantendo eficiência de Takt Time. Revise o balanceamento para padronizar essa nova capacidade.";
    } else {
        box.innerText = "Estabilidade: Fluxo produtivo dentro dos limites de controle. FPY estabilizado. Monitore os registros imutáveis na Sepolia para auditorias de fim de turno.";
    }
}

// ---- Navegação entre Abas ----------------------------------

export function switchTab(tabId, btn) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    btn.classList.add('active');
    setTimeout(forcarResizeGraficos, 50);
}

// ---- Painel Admin ------------------------------------------

export function tentarAcessarAdmin() {
    const user = prompt("Digite o Usuário Administrador:");
    const pass = prompt("Digite a Senha Administrador:");
    // ⚠️ Substitua por autenticação real em produção
    if (user === "admin" && pass === "admin") {
        document.getElementById('admin-modal').classList.add('open');
        setTimeout(forcarResizeGraficos, 310);
    } else {
        alert("🔒 Acesso negado!");
    }
}

export function fecharModalAdmin() {
    document.getElementById('admin-modal').classList.remove('open');
    setTimeout(forcarResizeGraficos, 310);
}

export function salvarConfiguracoesAdmin() {
    localStorage.setItem('web3_contract_address', document.getElementById('adminContractInput').value.trim());
    localStorage.setItem('web3_admin_wallet', document.getElementById('adminWalletInput').value.trim());
    salvarEstadoHistorico();
    carregarEstadoHistorico();
    renderizarKPIs();

    // Reinicia conexão blockchain com novo endereço
    inicializarBlockchain();
    alert("🔒 Configurações sincronizadas! Reconectando à blockchain...");
}

export function zerarTudoSistema() {
    if (!confirm("Tem certeza? Isso apagará todos os dados do painel.")) return;
    limparTudoStorage();
    document.getElementById('blockchain-status-text').innerText = "Desconectado";
    document.getElementById('blockchain-dot').style.backgroundColor = "#64748b";
    renderizarKPIs();
    alert("Painel completamente resetado!");
}

export function alterouDataOuTurno() {
    carregarEstadoHistorico();
    renderizarKPIs();
}

// ---- Exportação Excel Histórica ----------------------------

export function exportarRelatorioExcel() {
    const dataInicio = document.getElementById('dataPlanilhaInicio').value;
    const dataFim    = document.getElementById('dataPlanilhaFim').value;
    if (!dataInicio || !dataFim) { alert("Selecione o intervalo de datas."); return; }

    const registros = obterRegistrosPorPeriodo(dataInicio, dataFim);
    if (registros.length === 0) {
        alert("Nenhum registro encontrado para o período selecionado.\nRealiza operações no sistema para gerar dados.");
        return;
    }

    const wb = XLSX.utils.book_new();

    // ---- ABA 1: Rastreabilidade por Peça ----
    // Agrupa registros por chassi, monta uma linha por peça
    const porChassi = {};
    registros.forEach(r => {
        if (!porChassi[r.chassi]) porChassi[r.chassi] = [];
        porChassi[r.chassi].push(r);
    });

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

    const linhasRastreabilidade = [cabecalho];

    Object.entries(porChassi).forEach(([chassi, regs]) => {
        const porPosto = (nome) => regs.find(r => r.posto.toLowerCase().includes(nome));
        const hora = (r) => r ? new Date(r.timestamp).toLocaleTimeString('pt-BR') : '—';
        const mat  = (r) => r ? String(r.matricula).slice(0, 4) : '—';
        const hashes = regs.map(r => r.txHash || '—');

        const linhaDados = [
            chassi,
            hora(porPosto('montagem')),
            mat(porPosto('montagem')),
            hora(porPosto('teste')),
            mat(porPosto('teste')),
            hora(porPosto('embalagem')),
            mat(porPosto('embalagem')),
            hora(porPosto('reparo')),
            mat(porPosto('reparo')),
            hashes[0] || '—'
        ];

        linhasRastreabilidade.push(linhaDados);

        // Hashes adicionais abaixo da linha principal
        hashes.slice(1).forEach(h => {
            linhasRastreabilidade.push(['','','','','','','','','', h]);
        });
    });

    const wsRastr = XLSX.utils.aoa_to_sheet(linhasRastreabilidade);
    wsRastr['!cols'] = [
        { wch: 24 }, { wch: 16 }, { wch: 20 },
        { wch: 16 }, { wch: 20 }, { wch: 16 },
        { wch: 20 }, { wch: 16 }, { wch: 20 },
        { wch: 68 }
    ];
    XLSX.utils.book_append_sheet(wb, wsRastr, "Rastreabilidade");

    // ---- ABA 2: Sumário Operacional ----
    const sumario = [
        ["Período", `${dataInicio} até ${dataFim}`],
        ["Total de Registros", registros.length],
        ["---", "---"],
        ["Total Peças Embaladas",        estado.atualProduzido],
        ["Total Rejeições Reparo",        estado.entradasReparo],
        ["Saídas Liberadas do Reparo",    estado.saidasReparo],
        ["Loops de Retrabalho",           estado.loopsRetrabalho],
        ["DPMU Consolidado",              Math.round(estado.atualDPMU)],
        ["Operadores Ativos (Bipados)",   estado.totalBipadoReal],
        ["Falhas de Torque",              estado.falhasTorque],
        ["Falhas Funcionais",             estado.falhasFuncionais]
    ];
    const wsSumario = XLSX.utils.aoa_to_sheet(sumario);
    wsSumario['!cols'] = [{ wch: 28 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsSumario, "Sumário Operacional");

    XLSX.writeFile(wb, `Historico_${dataInicio}_a_${dataFim}.xlsx`);
}
