// ============================================================
// ui-v2.js — Interface, KPIs e Camada de Exportação Excel
// VERSÃO CORRIGIDA - Mapeamento Robusto Anti-Crash
// ============================================================

import { estado } from './config.js';
import { obterRegistrosPorPeriodo } from './blockchain.js';
import { forcarResizeGraficos } from './charts.js';

export function renderizarKPIs() {
    const targetMeta = parseInt(document.getElementById('inputMeta')?.value) || 200;
    const totalInjetado = estado.atualProduzido + estado.entradasReparo;
    
    if (document.getElementById('kpi-meta')) {
        document.getElementById('kpi-meta').innerHTML =
            `${estado.atualProduzido} <span style="font-size:0.875rem;color:#94a3b8">/ ${targetMeta} un</span>`;
    }
    if (document.getElementById('kpi-progresso')) {
        document.getElementById('kpi-progresso').style.width = `${Math.min((estado.atualProduzido / targetMeta) * 100, 100)}%`;
    }
}

// ---- FUNÇÃO DE EXPORTAÇÃO EXCEL REVISADA ----
export function exportarRelatorioExcel() {
    try {
        console.log("Iniciando exportação estruturada...");
        const inputInicio = document.getElementById('dataPlanilhaInicio');
        const inputFim = document.getElementById('dataPlanilhaFim');

        if (!inputInicio || !inputFim) {
            alert("Elementos de seleção de data não foram localizados no HTML.");
            return;
        }

        const dataInicio = inputInicio.value;
        const dataFim = inputFim.value;

        if (!dataInicio || !dataFim) {
            alert("Por favor, selecione os campos de início e fim do período.");
            return;
        }

        const registros = obterRegistrosPorPeriodo(dataInicio, dataFim) || [];

        if (typeof XLSX === 'undefined') {
            alert("Biblioteca SheetJS (XLSX) ausente. Verifique a importação no index.html.");
            return;
        }

        const wb = XLSX.utils.book_new();

        // ABA 1: Registros Operacionais Brutos
        const cabecalhoBruto = ["Nº", "Data e Hora", "Chassi Identificador", "Posto", "Operador", "Status"];
        const linhasBrutas = registros.map((r, idx) => {
            const dataFormatada = r.timestamp ? new Date(Number(r.timestamp) * 1000).toLocaleString('pt-BR') : '—';
            return [
                idx + 1,
                dataFormatada,
                r.chassi || '—',
                r.posto || '—',
                r.operador || '—',
                r.statusSucesso ? "Sucesso / Aprovado" : "Falha / Reparo"
            ];
        });

        if (linhasBrutas.length === 0) {
            linhasBrutas.push(["—", "Nenhum dado registrado para o intervalo selecionado", "—", "—", "—", "—"]);
        }

        const wsBrutos = XLSX.utils.aoa_to_sheet([cabecalhoBruto, ...linhasBrutas]);
        wsBrutos['!cols'] = [{ wch: 8 }, { wch: 22 }, { wch: 22 }, { wch: 18 }, { wch: 18 }, { wch: 20 }];
        XLSX.utils.book_append_sheet(wb, wsBrutos, "Dados de Linha");

        // ABA 2: Métricas Consolidadas (Sumário)
        const fpyCalculado = (estado.atualProduzido + estado.entradasReparo) > 0
            ? (((estado.atualProduzido) / (estado.atualProduzido + estado.entradasReparo)) * 100).toFixed(2) + "%"
            : "100%";

        const sumario = [
            ["MÉTRICA OPERACIONAL ANDON", "VALOR", "OBSERVAÇÃO"],
            ["Filtro de Data Inicial", dataInicio, "Início do Turno/Período"],
            ["Filtro de Data Final", dataFim, "Fim do Turno/Período"],
            ["Total de Passagens Coletadas", registros.length, "Volume de Transações"],
            ["", "", ""],
            ["Peças Aprovadas Finais", estado.atualProduzido || 0, "Unidades Prontas"],
            ["Entradas em Posto de Reparo", estado.entradasReparo || 0, "Falhas registradas"],
            ["Saídas Liberadas do Reparo", estado.saidasReparo || 0, "Retrabalhos efetuados"],
            ["Taxa First Pass Yield (FPY)", fpyCalculado, "Eficiência Operacional"]
        ];

        const wsSumario = XLSX.utils.aoa_to_sheet(sumario);
        wsSumario['!cols'] = [{ wch: 32 }, { wch: 20 }, { wch: 25 }];
        XLSX.utils.book_append_sheet(wb, wsSumario, "Sumário de Performance");

        const dataExport = new Date().toISOString().slice(0, 10);
        XLSX.writeFile(wb, `Relatorio_Historico_Planta_${dataExport}.xlsx`);

    } catch (err) {
        console.error("Falha ao exportar planilha:", err);
        alert("Erro na geração do Excel: " + err.message);
    }
}

export function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    
    const targetTab = document.getElementById(tabId);
    if (targetTab) targetTab.classList.add('active');
    forcarResizeGraficos();
}
