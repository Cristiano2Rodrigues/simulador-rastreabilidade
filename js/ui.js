// ============================================================
// ui-v2.js — Interface: KPIs, Andon, tabs, admin, exportação
// VERSÃO CORRIGIDA - Correção da Exportação Histórica do Excel
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
    if(document.getElementById('kpi-meta')) {
        document.getElementById('kpi-meta').innerHTML =
            `${estado.atualProduzido} <span style="font-size:0.875rem;color:#94a3b8">/ ${targetMeta} un</span>`;
    }
    if(document.getElementById('kpi-progresso')) {
        document.getElementById('kpi-progresso').style.width = `${Math.min((estado.atualProduzido / targetMeta) * 100, 100)}%`;
    }
    // (... Restante da renderização de KPIs mantida conforme original ...)
}

// ---- FUNÇÃO CORRIGIDA DE EXPORTAÇÃO OPERACIONAL HISTÓRICA ----
export function exportarRelatorioExcel() {
    try {
        console.log("Iniciando exportação do histórico consolidado...");
        
        // 1. Captura as datas dos inputs do HTML de forma segura
        const inputInicio = document.getElementById('dataPlanilhaInicio');
        const inputFim = document.getElementById('dataPlanilhaFim');
        
        if (!inputInicio || !inputFim) {
            alert("Erro: Elementos de data não encontrados na interface.");
            return;
        }

        const dataInicio = inputInicio.value;
        const dataFim = inputFim.value;

        if (!dataInicio || !dataFim) {
            alert("Por favor, selecione as datas de início e fim para a exportação.");
            return;
        }

        // 2. Busca os registros no período usando a função global tratada
        const registros = obterRegistrosPorPeriodo(dataInicio, dataFim) || [];
        
        // 3. Validação da biblioteca SheetJS (XLSX)
        if (typeof XLSX === 'undefined') {
            alert("Erro: A biblioteca SheetJS (XLSX) não foi carregada corretamente no HTML.");
            return;
        }

        // Criar o Workbook
        const wb = XLSX.utils.book_new();

        // ---- ABA 1: Dados Brutos (Historico Passagens) ----
        const cabecalhoBruto = [
            "ID / Índice", "Data/Hora", "Chassi", "Posto de Trabalho", 
            "Matrícula Operador", "Status da Operação", "Resultado"
        ];
        
        // Mapeamento seguro tratando nulos e indefinidos
        const linhasBrutas = registros.map((r, idx) => {
            const dataFormatada = r.timestamp ? new Date(Number(r.timestamp) * 1000).toLocaleString('pt-BR') : '—';
            return [
                idx + 1,
                dataFormatada,
                r.chassi || '—',
                r.posto || '—',
                r.operador || '—',
                r.statusSucesso ? "Sucesso" : "Falha / Rejeito",
                r.statusSucesso ? "Validado" : "Encaminhado ao Reparo"
            ];
        });

        // Se não houver dados, insere uma linha informativa para não quebrar a planilha
        if (linhasBrutas.length === 0) {
            linhasBrutas.push(["—", "Nenhum registro encontrado para este período", "—", "—", "—", "—", "—"]);
        }

        const wsBrutos = XLSX.utils.aoa_to_sheet([cabecalhoBruto, ...linhasBrutas]);
        
        // Ajuste de largura das colunas da Aba 1
        wsBrutos['!cols'] = [
            { wch: 12 }, { wch: 22 }, { wch: 20 }, { wch: 20 }, { wch: 18 }, { wch: 20 }, { wch: 25 }
        ];
        XLSX.utils.book_append_sheet(wb, wsBrutos, "Dados Brutos Operacionais");

        // ---- ABA 2: Sumário Operacional Consolidado ----
        const fpyCalculado = (estado.atualProduzido + estado.entradasReparo) > 0
            ? (((estado.atualProduzido) / (estado.atualProduzido + estado.entradasReparo)) * 100).toFixed(2) + "%"
            : "100%";

        const sumario = [
            ["INDICADOR INDUSTRIAL", "VALOR CONSOLIDADO", "UNIDADE / DETALHE"],
            ["Período de Extração", `${dataInicio} até ${dataFim}`, "Filtro Aplicado"],
            ["Total de Transações / Passagens", registros.length, "Eventos de Linha"],
            ["-----------------------------------", "---------------------", "------------------------"],
            ["Peças Concluídas (Embalagem)", estado.atualProduzido || 0, "Unidades prontas"],
            ["Entradas no Posto de Reparo", estado.entradasReparo || 0, "Defeitos detectados"],
            ["Saídas Liberadas do Reparo", estado.saidasReparo || 0, "Retrabalhos finalizados"],
            ["Loops Críticos de Retrabalho", estado.loopsRetrabalho || 0, "Reincidências de falha"],
            ["DPMU da Planta (PPM)", Math.round(estado.atualDPMU || 0), "Defeitos por Milhão"],
            ["First Pass Yield (FPY)", fpyCalculado, "Eficiência de 1ª Passagem"],
            ["Operadores Logados no Turno", estado.totalBipadoReal || 0, "Crachás ativos via NFC"]
        ];

        const wsSumario = XLSX.utils.aoa_to_sheet(sumario);
        wsSumario['!cols'] = [{ wch: 35 }, { wch: 25 }, { wch: 25 }];
        XLSX.utils.book_append_sheet(wb, wsSumario, "Resumo de Performance (KPIs)");

        // 4. Salva o arquivo final com timestamp no nome
        const dataArquivo = new Date().toISOString().slice(0,10);
        XLSX.writeFile(wb, `Relatorio_Historico_Linha_${dataArquivo}.xlsx`);
        console.log("Excel histórico exportado com sucesso!");

    } catch (error) {
        console.error("Erro crítico na exportação do Excel:", error);
        alert("Ocorreu um erro ao gerar o arquivo Excel: " + error.message);
    }
}

// Mantém as outras funções de navegação compatíveis
export function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    
    const targetTab = document.getElementById(tabId);
    if (targetTab) targetTab.classList.add('active');
    
    // Procura o botão correspondente
    const btn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.getAttribute('onclick')?.includes(tabId));
    if (btn) btn.classList.add('active');
    
    forcarResizeGraficos();
}

// Exportação das demais funções para o escopo global
window.exportarRelatorioExcel = exportarRelatorioExcel;
window.switchTab = switchTab;
