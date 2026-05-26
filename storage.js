// ============================================================
// simulacao.js — Lógica de simulação dos postos de produção
// ============================================================

import { estado } from './config.js';
import { registrarPassagemBlockchain, registrarOperadorBlockchain } from './blockchain.js';
import { chart1, chart2, chartDpmu, chartReparoFluxo, chart3, chart4, chart5, chart6 } from './charts.js';
import { salvarEstadoHistorico } from './storage.js';
import { renderizarKPIs } from './ui.js';

// ============================================================
// MATRÍCULA — 4 dígitos numéricos
// Em produção: vem do leitor NFC
// Em simulação: gerada aleatoriamente
// ============================================================

// Gera matrícula numérica aleatória de 4 dígitos (simulação)
function gerarMatriculaAleatoria() {
    return String(Math.floor(1000 + Math.random() * 9000));
}

// Retorna matrícula da sessão atual (setada pelo NFC ou pela simulação)
export function obterMatricula() {
    return localStorage.getItem('matricula_operador') || gerarMatriculaAleatoria();
}

export function salvarMatricula(matricula) {
    const limpa = String(matricula).replace(/\D/g, '').slice(0, 4).padStart(4, '0');
    localStorage.setItem('matricula_operador', limpa);
    atualizarExibicaoMatricula(limpa);
    return limpa;
}

// Atualiza o display de matrícula no painel admin (se visível)
function atualizarExibicaoMatricula(matricula) {
    const el = document.getElementById('display-matricula-atual');
    if (el) el.innerText = matricula;
}

// ============================================================
// NFC — Web NFC API (suportada no Chrome Android)
// Escuta leituras de crachá e registra automaticamente
// ============================================================
export async function inicializarNFC() {
    if (!('NDEFReader' in window)) {
        console.info('NFC não disponível neste dispositivo/navegador. Usando modo simulação.');
        return false;
    }

    try {
        const reader = new NDEFReader();
        await reader.scan();

        reader.addEventListener('reading', ({ message }) => {
            for (const record of message.records) {
                if (record.recordType === 'text') {
                    const decoder = new TextDecoder(record.encoding || 'utf-8');
                    const matricula = decoder.decode(record.data).replace(/\D/g, '').slice(0, 4);
                    if (matricula.length === 4) {
                        salvarMatricula(matricula);
                        console.log(`✅ NFC: Matrícula ${matricula} lida com sucesso.`);
                        // Registra entrada do operador automaticamente via NFC
                        simularBipagemCracha(true);
                    }
                }
            }
        });

        console.log('📡 Leitor NFC ativo — aguardando crachás...');
        return true;

    } catch (err) {
        console.warn('Erro ao inicializar NFC:', err);
        return false;
    }
}

// ============================================================
// BIPAGEM DE CRACHÁ
// ============================================================
export async function simularBipagemCracha(isEntrada) {
    // Em simulação: gera matrícula aleatória a cada bipagem
    // Em produção com NFC: já foi salva pelo leitor antes de chegar aqui
    const matricula = isEntrada ? gerarMatriculaAleatoria() : obterMatricula();
    salvarMatricula(matricula);

    if (isEntrada) {
        estado.totalBipadoReal++;
    } else {
        if (estado.totalBipadoReal > 0) estado.totalBipadoReal--;
    }

    await registrarOperadorBlockchain(matricula, isEntrada);
    salvarEstadoHistorico();
    renderizarKPIs();
}

// ============================================================
// PASSAGEM DE PEÇA POR POSTO
// ============================================================
export async function simularPassagemPeca(posto) {
    // Usa matrícula da sessão atual (NFC ou simulação)
    const matricula = obterMatricula();
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

        estado.horaApontamentoAtual++;
    }

    await registrarPassagemBlockchain(posto, sucesso, matricula);
    salvarEstadoHistorico();
    renderizarKPIs();
}

function obterTempoCiclo(posto) {
    const ids = {
        montagem: 'inputTcMontagem',
        teste: 'inputTcTeste',
        reparo: 'inputTcReparo',
        embalagem: 'inputTcEmbalagem'
    };
    const el = document.getElementById(ids[posto]);
    const defaults = { montagem: 42, teste: 39, reparo: 58, embalagem: 34 };
    return el ? (parseInt(el.value) || defaults[posto]) : defaults[posto];
}
