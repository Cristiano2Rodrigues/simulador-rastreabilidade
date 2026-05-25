// ============================================================
// main.js — Ponto de entrada: inicializa a aplicação
// ============================================================

import { inicializarGraficos } from './charts.js';
import { inicializarBlockchain, conectarCarteira } from './blockchain.js';
import { carregarEstadoHistorico } from './storage.js';
import { renderizarKPIs, switchTab, tentarAcessarAdmin, fecharModalAdmin, salvarConfiguracoesAdmin, zerarTudoSistema, alterouDataOuTurno, exportarRelatorioExcel } from './ui.js';
import { simularBipagemCracha, simularPassagemPeca } from './simulacao.js';

// Define data de hoje nos filtros
const hojeStr = new Date().toISOString().split('T')[0];
document.getElementById('dataFiltro').value = hojeStr;
document.getElementById('dataPlanilhaInicio').value = hojeStr;
document.getElementById('dataPlanilhaFim').value = hojeStr;

// Expõe funções ao escopo global (necessário para onclick no HTML)
window.switchTab = switchTab;
window.tentarAcessarAdmin = tentarAcessarAdmin;
window.fecharModalAdmin = fecharModalAdmin;
window.salvarConfiguracoesAdmin = salvarConfiguracoesAdmin;
window.zerarTudoSistema = zerarTudoSistema;
window.alterouDataOuTurno = alterouDataOuTurno;
window.exportarRelatorioExcel = exportarRelatorioExcel;
window.simularBipagemCracha = simularBipagemCracha;
window.simularPassagemPeca = simularPassagemPeca;
window.conectarCarteira = conectarCarteira;

// Inicialização sequencial
window.addEventListener('DOMContentLoaded', async () => {
    inicializarGraficos();
    await inicializarBlockchain();
    carregarEstadoHistorico();
    renderizarKPIs();
});
