// ============================================================
// main.js — Ponto de entrada: inicializa a aplicação
// ============================================================

import { inicializarGraficos } from './charts.js';
import { inicializarBlockchain, conectarCarteira } from './blockchain.js';
import { carregarEstadoHistorico } from './storage.js';
import { renderizarKPIs, switchTab, tentarAcessarAdmin, fecharModalAdmin, salvarConfiguracoesAdmin, zerarTudoSistema, alterouDataOuTurno, exportarRelatorioExcel } from './ui.js';
import { simularBipagemCracha, simularPassagemPeca, obterMatricula, inicializarNFC } from './simulacao.js';
import { consultarChassi, exportarLedgerExcel } from './rastreabilidade.js';
import { salvarNomePlanta, obterNomePlanta } from './config.js';

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
window.exportarLedgerExcel = exportarLedgerExcel;

// Busca o chassi digitado/bipado
window.buscarChassi = () => {
    const chassi = document.getElementById('inputChassi').value;
    consultarChassi(chassi);
};

// Salva nome da planta ao digitar no admin
window.salvarPlantaAdmin = () => {
    const val = document.getElementById('adminPlantaInput').value;
    salvarNomePlanta(val);
};

// Inicialização sequencial
window.addEventListener('DOMContentLoaded', async () => {
    inicializarGraficos();
    await inicializarBlockchain();
    carregarEstadoHistorico();
    renderizarKPIs();

    // Exibe matrícula atual no display (NFC ou última simulação)
    const matriculaSalva = obterMatricula();
    const displayMatricula = document.getElementById('display-matricula-atual');
    if (displayMatricula && matriculaSalva) displayMatricula.innerText = matriculaSalva;

    // Inicializa leitor NFC se disponível no dispositivo
    await inicializarNFC();

    // Restaura nome da planta no campo admin
    const plantaSalva = obterNomePlanta();
    const inputPlanta = document.getElementById('adminPlantaInput');
    if (inputPlanta) inputPlanta.value = plantaSalva;
});
