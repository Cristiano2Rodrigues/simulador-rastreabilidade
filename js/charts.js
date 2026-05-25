// ============================================================
// charts.js — Inicialização e atualização dos gráficos Chart.js
// ============================================================

export let chart1 = null, chart2 = null, chartDpmu = null;
export let chartReparoFluxo = null, chartReparoSerie = null;
export let chart3 = null, chart4 = null, chart5 = null;
export let chartPizzaHC = null, chart6 = null;

export function inicializarGraficos() {
    Chart.register(ChartDataLabels);
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.borderColor = '#334155';

    chart1 = new Chart(document.getElementById('chartHoraHora'), {
        type: 'line',
        data: {
            labels: ['1ªH', '2ªH', '3ªH', '4ªH', '5ªH', '6ªH', '7ªH', '8ªH'],
            datasets: [
                { label: 'Realizado', data: Array(8).fill(0), borderColor: '#10b981', fill: true, tension: 0.4 },
                { label: 'Meta', data: Array(8).fill(0), borderColor: '#ef4444', borderDash: [5, 5] }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    chart2 = new Chart(document.getElementById('chartStatusBarras'), {
        type: 'bar',
        data: {
            labels: ['1ªH', '2ªH', '3ªH', '4ªH', '5ªH', '6ªH', '7ªH', '8ªH'],
            datasets: [
                { label: 'Boas', backgroundColor: '#10b981', data: Array(8).fill(0) },
                { label: 'Ruins', backgroundColor: '#ef4444', data: Array(8).fill(0) }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { x: { stacked: true }, y: { stacked: true } } }
    });

    chartDpmu = new Chart(document.getElementById('chartDpmuHora'), {
        type: 'line',
        data: {
            labels: ['1ªH', '2ªH', '3ªH', '4ªH', '5ªH', '6ªH', '7ªH', '8ªH'],
            datasets: [
                { label: 'DPMU Real', borderColor: '#f59e0b', data: Array(8).fill(0), tension: 0.2 },
                { label: 'Limite Máx', borderColor: '#ef4444', borderDash: [4, 4], data: Array(8).fill(1500) }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    chartReparoFluxo = new Chart(document.getElementById('chartFluxoReparo'), {
        type: 'bar',
        data: {
            labels: ['1ªH', '2ªH', '3ªH', '4ªH', '5ªH', '6ªH', '7ªH', '8ªH'],
            datasets: [
                { label: 'Entradas', backgroundColor: '#ef4444', data: Array(8).fill(0) },
                { label: 'Saídas', backgroundColor: '#10b981', data: Array(8).fill(0) }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    chartReparoSerie = new Chart(document.getElementById('chartRetrabalhoSerie'), {
        type: 'bar',
        data: {
            labels: ['Torque', 'Funcional', 'Estético', 'Firmware'],
            datasets: [{ label: 'Loops', backgroundColor: '#f59e0b', data: Array(4).fill(0) }]
        },
        options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false }
    });

    chart3 = new Chart(document.getElementById('chartTaktTime'), {
        type: 'bar',
        data: {
            labels: ['Montagem', 'Teste', 'Reparo', 'Embalagem'],
            datasets: [{ label: 'Ciclo (s)', backgroundColor: '#3b82f6', data: Array(4).fill(0) }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    chart4 = new Chart(document.getElementById('chartCrono'), {
        type: 'bar',
        data: {
            labels: ['Montagem', 'Teste', 'Reparo', 'Embalagem'],
            datasets: [{ label: 'VA (%)', backgroundColor: '#8b5cf6', data: [0, 0, 0, 0] }]
        },
        options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, scales: { x: { max: 100 } } }
    });

    chart5 = new Chart(document.getElementById('chartGargalos'), {
        type: 'bar',
        data: {
            labels: ['Montagem', 'Teste', 'Reparo', 'Embalagem'],
            datasets: [{ label: 'Retenção', data: Array(4).fill(0), backgroundColor: '#1e3a8a' }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    chartPizzaHC = new Chart(document.getElementById('chartPizzaHC'), {
        type: 'pie',
        data: {
            labels: ['Previsto', 'Real'],
            datasets: [{ backgroundColor: ['#6366f1', '#10b981'], data: [12, 0] }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    chart6 = new Chart(document.getElementById('chartDefeitos'), {
        type: 'bar',
        data: {
            labels: ['Posto Teste', 'Posto Montagem', 'Posto Embalagem'],
            datasets: [{ label: 'Ocorrências', backgroundColor: '#f43f5e', data: [0, 0, 0] }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

export function forcarResizeGraficos() {
    [chart1, chart2, chartDpmu, chartReparoFluxo, chartReparoSerie,
        chart3, chart4, chart5, chartPizzaHC, chart6
    ].forEach(c => { if (c) c.resize(); });
}

export function zerarGraficos() {
    if (chart1) chart1.data.datasets[0].data = Array(8).fill(0);
    if (chart2) { chart2.data.datasets[0].data = Array(8).fill(0); chart2.data.datasets[1].data = Array(8).fill(0); }
    if (chartDpmu) chartDpmu.data.datasets[0].data = Array(8).fill(0);
    if (chartReparoFluxo) { chartReparoFluxo.data.datasets[0].data = Array(8).fill(0); chartReparoFluxo.data.datasets[1].data = Array(8).fill(0); }
    if (chartReparoSerie) chartReparoSerie.data.datasets[0].data = Array(4).fill(0);
    if (chart3) chart3.data.datasets[0].data = Array(4).fill(0);
    if (chart4) chart4.data.datasets[0].data = Array(4).fill(0);
    if (chart5) chart5.data.datasets[0].data = Array(4).fill(0);
    if (chart6) chart6.data.datasets[0].data = Array(3).fill(0);
}

export function atualizarTodosGraficos(estado, targetMeta, limitDPMU, hcPrevisto) {
    if (chart1) { chart1.data.datasets[1].data = Array(8).fill(Math.round(targetMeta / 8)); chart1.update(); }
    if (chartDpmu) { chartDpmu.data.datasets[1].data = Array(8).fill(limitDPMU); chartDpmu.update(); }
    if (chartPizzaHC) { chartPizzaHC.data.datasets[0].data = [hcPrevisto, estado.totalBipadoReal]; chartPizzaHC.update(); }
    if (chart2) chart2.update();
    if (chartReparoFluxo) chartReparoFluxo.update();
    if (chart4) chart4.update();
    if (chart5) chart5.update();
    if (chart6) chart6.update();
    if (chartReparoSerie) { chartReparoSerie.data.datasets[0].data = [estado.falhasTorque, estado.falhasFuncionais, 0, 0]; chartReparoSerie.update(); }
    if (chart3) { chart3.update(); return chart3.data.datasets[0].data; }
    return null;
}
