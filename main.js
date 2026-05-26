// ============================================================
// storage.js — Persistência de dados por data e turno
// ============================================================

import { estado, resetarEstado } from './config.js';
import {
    chart1, chart2, chartDpmu, chartReparoFluxo,
    chart3, chart5, chart6, zerarGraficos
} from './charts.js';

const hojeStr = new Date().toISOString().split('T')[0];

export function obterChavesParaBusca() {
    const dataInput = document.getElementById('dataFiltro').value || hojeStr;
    const turnoInput = document.getElementById('turnoSelect').value || "todos";
    if (turnoInput === "todos") {
        return [`linhaData_${dataInput}_Turno_1`, `linhaData_${dataInput}_Turno_2`];
    }
    return [`linhaData_${dataInput}_Turno_${turnoInput}`];
}

export function salvarEstadoHistorico() {
    const dataInput = document.getElementById('dataFiltro').value || hojeStr;
    let turnoInput = document.getElementById('turnoSelect').value || "todos";
    if (turnoInput === "todos") turnoInput = "1";

    const chave = `linhaData_${dataInput}_Turno_${turnoInput}`;
    const snapshot = {
        ...estado,
        c1_data: chart1 ? chart1.data.datasets[0].data : Array(8).fill(0),
        c2_boas: chart2 ? chart2.data.datasets[0].data : Array(8).fill(0),
        c2_ruins: chart2 ? chart2.data.datasets[1].data : Array(8).fill(0),
        cDpmu_data: chartDpmu ? chartDpmu.data.datasets[0].data : Array(8).fill(0),
        cFluxo_e: chartReparoFluxo ? chartReparoFluxo.data.datasets[0].data : Array(8).fill(0),
        cFluxo_s: chartReparoFluxo ? chartReparoFluxo.data.datasets[1].data : Array(8).fill(0),
        c3_data: chart3 ? chart3.data.datasets[0].data : Array(4).fill(0),
        c5_data: chart5 ? chart5.data.datasets[0].data : Array(4).fill(0),
        c6_data: chart6 ? chart6.data.datasets[0].data : Array(3).fill(0)
    };

    localStorage.setItem(chave, JSON.stringify(snapshot));
    localStorage.setItem('web3_backup_geral_v3', JSON.stringify(snapshot));
}

export function carregarEstadoHistorico() {
    const chaves = obterChavesParaBusca();
    resetarEstado();

    let c1 = Array(8).fill(0), c2b = Array(8).fill(0), c2r = Array(8).fill(0);
    let cD = Array(8).fill(0), cFe = Array(8).fill(0), cFs = Array(8).fill(0);
    let c3 = Array(4).fill(0), c5 = Array(4).fill(0), c6 = Array(3).fill(0);
    let encontrou = false;

    chaves.forEach(chave => {
        const cache = localStorage.getItem(chave);
        if (!cache) return;
        encontrou = true;
        const est = JSON.parse(cache);

        // Acumula métricas
        ['atualProduzido', 'atualDPMU', 'totalBipadoReal', 'entradasReparo',
            'saidasReparo', 'loopsRetrabalho', 'pecasMontagem', 'pecasTeste',
            'falhasTorque', 'falhasFuncionais', 'falhasEsteticas'
        ].forEach(k => { if (est[k]) estado[k] += est[k]; });

        estado.horaApontamentoAtual = est.horaApontamentoAtual || 0;

        if (est.c1_data) est.c1_data.forEach((v, i) => c1[i] += v);
        if (est.c2_boas) est.c2_boas.forEach((v, i) => c2b[i] += v);
        if (est.c2_ruins) est.c2_ruins.forEach((v, i) => c2r[i] += v);
        if (est.cDpmu_data) est.cDpmu_data.forEach((v, i) => cD[i] += v);
        if (est.cFluxo_e) est.cFluxo_e.forEach((v, i) => cFe[i] += v);
        if (est.cFluxo_s) est.cFluxo_s.forEach((v, i) => cFs[i] += v);
        if (est.c3_data) est.c3_data.forEach((v, i) => c3[i] = Math.max(c3[i], v));
        if (est.c5_data) est.c5_data.forEach((v, i) => c5[i] += v);
        if (est.c6_data) est.c6_data.forEach((v, i) => c6[i] += v);
    });

    // Fallback para backup geral
    if (!encontrou) {
        const backup = localStorage.getItem('web3_backup_geral_v3');
        if (backup) {
            const est = JSON.parse(backup);
            Object.assign(estado, est);
            c1 = est.c1_data || c1;
            c2b = est.c2_boas || c2b;
            c2r = est.c2_ruins || c2r;
            cD = est.cDpmu_data || cD;
            cFe = est.cFluxo_e || cFe;
            cFs = est.cFluxo_s || cFs;
            c3 = est.c3_data || c3;
            c5 = est.c5_data || c5;
            c6 = est.c6_data || c6;
        }
    }

    // Aplica nos gráficos
    if (chart1) chart1.data.datasets[0].data = c1;
    if (chart2) { chart2.data.datasets[0].data = c2b; chart2.data.datasets[1].data = c2r; }
    if (chartDpmu) chartDpmu.data.datasets[0].data = cD;
    if (chartReparoFluxo) { chartReparoFluxo.data.datasets[0].data = cFe; chartReparoFluxo.data.datasets[1].data = cFs; }
    if (chart3) chart3.data.datasets[0].data = c3;
    if (chart5) chart5.data.datasets[0].data = c5;
    if (chart6) chart6.data.datasets[0].data = c6;
}

export function limparTudoStorage() {
    localStorage.clear();
    resetarEstado();
    zerarGraficos();
    document.getElementById('adminContractInput').value = '';
    document.getElementById('adminWalletInput').value = '';
}
