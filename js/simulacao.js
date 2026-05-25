// ============================================================
// simulacao.js — Lógica de simulação dos postos e KPIs
// ============================================================

import { estado } from './config.js';
import { registrarPassagemBlockchain, registrarOperadorBlockchain } from './blockchain.js';
import { chart1, chart2, chartDpmu, chartReparoFluxo, chart3, chart4, chart5, chart6, chartReparoSerie } from './charts.js';
import { salvarEstadoHistorico } from './storage.js';
import { renderizarKPIs } from './ui.js';

export async function simularBipagemCracha(isEntrada) {
    if (isEntrada) {
        estado.totalBipadoReal++;
    } else {
        if (estado.totalBipadoReal > 0) estado.totalBipadoReal--;
    }

    // Registra operador na blockchain
    const operadorNome = `OP-${String(estado.totalBipadoReal).padStart(3, '0')}`;
    await registrarOperadorBlockchain(operadorNome, isEntrada);

    salvarEstadoHistorico();
    renderizarKPIs();
}

export async function simularPassagemPeca(posto) {
    const idxHora = estado.horaApontamentoAtual % 8;
    let sucesso = true;

    if (posto === 'montagem') {
        estado.pecasMontagem++;
        if (chart3) chart3.data.datasets[0].data[0] = obterTempoCiclo('montagem');
        if (chart4) chart4.data.datasets[0].data[0] = 85;
        if (chart5) chart5.data.datasets[0].data[0] += 1;

    } else if (posto === 'teste') {
        estado.pecasTeste++;
        if (chart3) chart3.data.datasets[0].data[1] = obterTempoCiclo('teste');
        if (chart4) chart4.data.datasets[0].data[1] = 90;
        if (chart5) chart5.data.datasets[0].data[1] += 2;

    } else if (posto === 'reparo') {
        sucesso = false;
        estado.entradasReparo++;
        estado.loopsRetrabalho++;
        estado.atualDPMU += 250;
        estado.falhasTorque++;

        if (chart2) chart2.data.datasets[1].data[idxHora] += 1;
        if (chartDpmu) chartDpmu.data.datasets[0].data[idxHora] += 250;
        if (chartReparoFluxo) chartReparoFluxo.data.datasets[0].data[idxHora] += 1;
        if (chart3) chart3.data.datasets[0].data[2] = obterTempoCiclo('reparo');
        if (chart4) chart4.data.datasets[0].data[2] = 40;
        if (chart5) chart5.data.datasets[0].data[2] += 4;
        if (chart6) chart6.data.datasets[0].data[0] += 1;

    } else if (posto === 'embalagem') {
        estado.atualProduzido++;

        if (estado.entradasReparo > estado.saidasReparo) {
            estado.saidasReparo++;
            if (chartReparoFluxo) chartReparoFluxo.data.datasets[1].data[idxHora] += 1;
        }

        if (chart1) chart1.data.datasets[0].data[idxHora] += 1;
        if (chart2) chart2.data.datasets[0].data[idxHora] += 1;
        if (chart3) chart3.data.datasets[0].data[3] = obterTempoCiclo('embalagem');
        if (chart4) chart4.data.datasets[0].data[3] = 95;
        if (chart5) chart5.data.datasets[0].data[3] += 1;

        // Avança ponteiro de hora a cada peça finalizada
        estado.horaApontamentoAtual++;
    }

    // ✅ Registra na blockchain com transação real
    await registrarPassagemBlockchain(posto, sucesso);

    salvarEstadoHistorico();
    renderizarKPIs();
}

// Lê os tempos de ciclo dos inputs do painel admin (configuráveis)
function obterTempoCiclo(posto) {
    const ids = {
        montagem: 'inputTcMontagem',
        teste: 'inputTcTeste',
        reparo: 'inputTcReparo',
        embalagem: 'inputTcEmbalagem'
    };
    const el = document.getElementById(ids[posto]);
    // Fallback para valores padrão se os inputs não existirem
    const defaults = { montagem: 42, teste: 39, reparo: 58, embalagem: 34 };
    return el ? (parseInt(el.value) || defaults[posto]) : defaults[posto];
}
