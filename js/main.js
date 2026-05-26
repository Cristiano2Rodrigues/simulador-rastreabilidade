// ============================================================
// main-v2.js — Ponto de Entrada da Aplicação e Escopo Global
// VERSÃO CORRIGIDA - Vinculação Forçada no Escopo Window
// ============================================================

import { inicializarGraficos } from './charts.js';
import { inicializarBlockchain, conectarCarteira } from './blockchain.js';
import { carregarEstadoHistorico } from './storage.js';
import { renderizarKPIs, switchTab, exportarRelatorioExcel } from './ui.js';
import { simularBipagemCracha, simularPassagemPeca } from './simulacao.js';
import { consultarChassi, exportarLedgerExcel } from './rastreabilidade.js';

const hojeStr = new Date().toISOString().split('T')[0];

window.addEventListener('DOMContentLoaded', async () => {
    // Preenche inputs de data por segurança
    if(document.getElementById('dataFiltro')) document.getElementById('dataFiltro').value = hojeStr;
    if(document.getElementById('dataPlanilhaInicio')) document.getElementById('dataPlanilhaInicio').value = hojeStr;
    if(document.getElementById('dataPlanilhaFim')) document.getElementById('dataPlanilhaFim').value = hojeStr;

    inicializarGraficos();
    await inicializarBlockchain();
    carregarEstadoHistorico();
    renderizarKPIs();
});

// ---- ASSINATURA GLOBAL COMPATÍVEL COM ONCLICK DO HTML ----
window.switchTab = switchTab;
window.exportarRelatorioExcel = exportarRelatorioExcel;
window.simularBipagemCracha = simularBipagemCracha;
window.simularPassagemPeca = simularPassagemPeca;
window.conectarCarteira = conectarCarteira;
window.exportarLedgerExcel = exportarLedgerExcel;

window.buscarChassi = () => {
    const chassi = document.getElementById('inputChassi')?.value;
    if (chassi) consultarChassi(chassi);
};
