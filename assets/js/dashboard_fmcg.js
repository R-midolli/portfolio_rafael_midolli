/**
 * FMCG Native Dashboard Integration (Apache ECharts)
 * Fetches JSON data and renders highly interactive ECharts natively,
 * perfectly syncing with the portfolio's theme and language.
 */
document.addEventListener('DOMContentLoaded', async () => {
    // UI Elements
    const domComm = document.getElementById('chart-commodities');
    const domFx = document.getElementById('chart-fx');
    const domYoyComm = document.getElementById('chart-yoy');
    const domYoyInf = document.getElementById('chart-inflation');
    const domSqueeze = document.getElementById('chart-squeeze');

    const filterComm = document.getElementById('filterComm');

    let chartComm, chartFx, chartYoyComm, chartYoyInf, chartSqueeze;

    // Theme & Translation configuration
    const THEMES = {
        dark: {
            text: '#e0e3eb',
            muted: '#8b92a5',
            gridColor: 'rgba(255,255,255,0.06)',
            tooltipBg: 'rgba(15, 23, 42, 0.95)',
            tooltipBorder: 'rgba(91, 140, 255, 0.2)'
        },
        light: {
            text: '#1e293b',
            muted: '#64748b',
            gridColor: 'rgba(0,0,0,0.06)',
            tooltipBg: 'rgba(255, 255, 255, 0.95)',
            tooltipBorder: 'rgba(0,0,0,0.1)'
        }
    };

    const COLORS = {
        Cocoa: '#f59e0b',
        Coffee: '#ef4444',
        Sugar: '#22c55e',
        Wheat: '#3b82f6',
        Fx: '#818cf8',
        Positive: '#ef4444',
        Negative: '#22c55e'
    };

    const TRANSLATIONS = {
        fr: {
            titleComm: 'Évolution Mondiale des Prix (USD)',
            titleFx: 'Taux de Change EUR/USD',
            titleYoyComm: 'Variation sur 1 an (%)',
            titleYoyInf: 'Inflation Consommateur France',
            titleSqueeze: 'Matrice de Compression de Marge (Squeeze)',
            tooltipSqueeze: 'Score de Squeeze'
        },
        en: {
            titleComm: 'Global Price Evolution (USD)',
            titleFx: 'EUR/USD Exchange Rate',
            titleYoyComm: '1-Year Price Change (%)',
            titleYoyInf: 'France Consumer Inflation',
            titleSqueeze: 'Margin Squeeze Matrix',
            tooltipSqueeze: 'Squeeze Score'
        }
    };

    // State
    let dbData = null;
    let currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    let currentLang = document.documentElement.getAttribute('data-lang') || 'fr';

    try {
        const res = await fetch('reports/dashboard_fmcg_data.json');
        dbData = await res.json();

        // Populate KPIs if they exist on the page
        const kpiFx = document.getElementById('kpi-val-fx');
        if (kpiFx) kpiFx.textContent = dbData.kpis.fx_eur_usd.toFixed(4);

        const kpiCocoa = document.getElementById('kpi-val-cocoa');
        if (kpiCocoa) kpiCocoa.textContent = `+$${Math.round(dbData.kpis.cocoa_usd_t).toLocaleString('en-US')}`;

        initCharts();
        renderAllCharts();

        // Event Listeners for Theme/Lang matching shared.js logic
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                setTimeout(() => {
                    currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
                    updateAllLayouts();
                }, 50);
            });
        }

        const langToggle = document.getElementById('langToggle');
        if (langToggle) {
            langToggle.addEventListener('click', () => {
                setTimeout(() => {
                    currentLang = document.documentElement.getAttribute('data-lang') || 'fr';
                    updateAllLayouts();
                }, 50);
            });
        }

        if (filterComm) {
            filterComm.addEventListener('change', () => renderCommoditiesChart());
        }

        // Handle auto-resize on window resize
        window.addEventListener('resize', () => {
            if (chartComm) chartComm.resize();
            if (chartFx) chartFx.resize();
            if (chartYoyComm) chartYoyComm.resize();
            if (chartYoyInf) chartYoyInf.resize();
            if (chartSqueeze) chartSqueeze.resize();
        });

    } catch (e) {
        console.error("Failed to load dashboard data:", e);
    }

    // -- Chart Rendering Helpers --

    function initCharts() {
        if (domComm) chartComm = echarts.init(domComm);
        if (domFx) chartFx = echarts.init(domFx);
        if (domYoyComm) chartYoyComm = echarts.init(domYoyComm);
        if (domYoyInf) chartYoyInf = echarts.init(domYoyInf);
        if (domSqueeze) chartSqueeze = echarts.init(domSqueeze);
    }

    // Common configurations
    function getCommonAxisOpts() {
        const theme = THEMES[currentTheme];
        return {
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: { color: theme.muted, fontFamily: 'DM Sans' },
            splitLine: { lineStyle: { color: theme.gridColor, type: 'dashed' } }
        };
    }

    function getTooltipOpts() {
        const theme = THEMES[currentTheme];
        return {
            trigger: 'axis',
            backgroundColor: theme.tooltipBg,
            borderColor: theme.tooltipBorder,
            textStyle: { color: theme.text, fontFamily: 'DM Sans' },
            padding: [10, 15],
            borderRadius: 8,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        };
    }

    function renderCommoditiesChart() {
        if (!chartComm || !dbData) return;
        const sel = filterComm ? filterComm.value : 'all';
        const theme = THEMES[currentTheme];
        const t = TRANSLATIONS[currentLang];

        const series = [];
        const legendData = [];

        if (sel === 'all') {
            ['Cocoa', 'Coffee', 'Sugar', 'Wheat'].forEach(c => {
                const cData = dbData.charts.commodities[c];
                if (cData) {
                    legendData.push(c);
                    series.push({
                        name: c,
                        type: 'line',
                        smooth: true,
                        symbol: 'none',
                        lineStyle: { width: 3, color: COLORS[c] },
                        itemStyle: { color: COLORS[c] },
                        data: cData.prices.map((p, i) => [cData.dates[i], p])
                    });
                }
            });
        } else {
            const cData = dbData.charts.commodities[sel];
            if (cData) {
                legendData.push(sel);
                series.push({
                    name: sel,
                    type: 'line',
                    smooth: true,
                    symbol: 'none',
                    lineStyle: { width: 4, color: COLORS[sel] },
                    itemStyle: { color: COLORS[sel] },
                    areaStyle: {
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                            { offset: 0, color: COLORS[sel] + '60' }, // 60 implies opacity ~ 0.4 in hex
                            { offset: 1, color: COLORS[sel] + '00' }
                        ])
                    },
                    data: cData.prices.map((p, i) => [cData.dates[i], p])
                });
            }
        }

        const option = {
            backgroundColor: 'transparent',
            title: {
                text: t.titleComm,
                left: 'center',
                textStyle: { color: theme.text, fontFamily: 'DM Sans', fontSize: 16, fontWeight: 600 },
                top: 0
            },
            tooltip: getTooltipOpts(),
            legend: {
                data: legendData,
                top: 30,
                textStyle: { color: theme.text, fontFamily: 'DM Sans' },
                icon: 'circle'
            },
            grid: { left: '2%', right: '4%', bottom: '5%', top: '20%', containLabel: true },
            xAxis: {
                type: 'time',
                ...getCommonAxisOpts(),
                splitLine: { show: false }
            },
            yAxis: {
                type: 'value',
                ...getCommonAxisOpts(),
                axisLabel: {
                    formatter: (value) => '$' + echarts.format.addCommas(value),
                    color: theme.muted, fontFamily: 'DM Sans'
                }
            },
            series: series
        };

        chartComm.setOption(option, true);
    }

    function renderFxChart() {
        if (!chartFx || !dbData) return;
        const fx = dbData.charts.fx;
        const theme = THEMES[currentTheme];
        const t = TRANSLATIONS[currentLang];

        const option = {
            backgroundColor: 'transparent',
            title: {
                text: t.titleFx,
                left: 'center',
                textStyle: { color: theme.text, fontFamily: 'DM Sans', fontSize: 16, fontWeight: 600 }
            },
            tooltip: { ...getTooltipOpts(), valueFormatter: (val) => val.toFixed(4) },
            grid: { left: '2%', right: '4%', bottom: '5%', top: '15%', containLabel: true },
            xAxis: {
                type: 'category',
                data: fx.dates,
                ...getCommonAxisOpts(),
                splitLine: { show: false },
                axisLabel: { ...getCommonAxisOpts().axisLabel, formatter: (val) => val.substring(0, 7) } // YYYY-MM
            },
            yAxis: {
                type: 'value',
                min: 'dataMin',
                max: 'dataMax',
                ...getCommonAxisOpts(),
                splitLine: { show: false }
            },
            series: [{
                name: 'EUR/USD',
                type: 'line',
                smooth: true,
                symbol: 'none',
                lineStyle: { width: 3, color: COLORS.Fx },
                itemStyle: { color: COLORS.Fx },
                areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: COLORS.Fx + '60' },
                        { offset: 1, color: COLORS.Fx + '00' }
                    ])
                },
                data: fx.values
            }]
        };

        chartFx.setOption(option, true);
    }

    function renderYoyCommChart() {
        if (!chartYoyComm || !dbData) return;
        const d = dbData.charts.yoy_commodity;
        const theme = THEMES[currentTheme];
        const t = TRANSLATIONS[currentLang];

        const option = {
            backgroundColor: 'transparent',
            title: {
                text: t.titleYoyComm,
                left: 'center',
                textStyle: { color: theme.text, fontFamily: 'DM Sans', fontSize: 16, fontWeight: 600 }
            },
            tooltip: {
                ...getTooltipOpts(),
                trigger: 'item',
                formatter: '{b}: <strong>{c}%</strong>'
            },
            grid: { left: '5%', right: '15%', bottom: '5%', top: '15%', containLabel: true },
            xAxis: {
                type: 'value',
                ...getCommonAxisOpts(),
                splitLine: { show: false }
            },
            yAxis: {
                type: 'category',
                data: d.labels,
                ...getCommonAxisOpts(),
                axisLabel: { color: theme.text, fontWeight: 'bold' }
            },
            series: [{
                type: 'bar',
                data: d.values.map((v, i) => ({
                    value: v,
                    itemStyle: {
                        color: v > 0 ? COLORS.Positive : COLORS.Negative,
                        borderRadius: [0, 4, 4, 0]
                    }
                })),
                label: {
                    show: true,
                    position: 'right',
                    formatter: (params) => (params.value > 0 ? '+' : '') + params.value.toFixed(1) + '%',
                    color: theme.text,
                    fontFamily: 'DM Sans',
                    fontWeight: 'bold'
                }
            }]
        };

        chartYoyComm.setOption(option, true);
    }

    function renderYoyInfChart() {
        if (!chartYoyInf || !dbData) return;
        const d = dbData.charts.yoy_inflation;
        const theme = THEMES[currentTheme];
        const t = TRANSLATIONS[currentLang];

        const option = {
            backgroundColor: 'transparent',
            title: {
                text: t.titleYoyInf,
                left: 'center',
                textStyle: { color: theme.text, fontFamily: 'DM Sans', fontSize: 16, fontWeight: 600 }
            },
            tooltip: {
                ...getTooltipOpts(),
                trigger: 'item',
                formatter: '{b}: <strong>{c}%</strong>'
            },
            grid: { left: '2%', right: '10%', bottom: '5%', top: '10%', containLabel: true },
            xAxis: {
                type: 'value',
                ...getCommonAxisOpts(),
                splitLine: { show: false }
            },
            yAxis: {
                type: 'category',
                data: d.labels,
                ...getCommonAxisOpts(),
                axisLabel: { color: theme.text, width: 200, overflow: 'truncate' }
            },
            series: [{
                type: 'bar',
                data: d.values.map(v => ({
                    value: v,
                    itemStyle: {
                        color: v > 0 ? COLORS.Positive : COLORS.Negative,
                        borderRadius: [0, 4, 4, 0]
                    }
                })),
                label: {
                    show: true,
                    position: 'right',
                    formatter: (params) => (params.value > 0 ? '+' : '') + params.value.toFixed(1) + '%',
                    color: theme.text,
                    fontFamily: 'DM Sans',
                    fontWeight: 600
                }
            }]
        };

        chartYoyInf.setOption(option, true);
    }

    function renderSqueezeChart() {
        if (!chartSqueeze || !dbData) return;
        const d = dbData.charts.squeeze_matrix;
        const theme = THEMES[currentTheme];
        const t = TRANSLATIONS[currentLang];

        // Process data for ECharts Heatmap format [xIndex, yIndex, value]
        const heatmapData = [];
        for (let i = 0; i < d.y_labels.length; i++) {
            for (let j = 0; j < d.x_labels.length; j++) {
                heatmapData.push([j, i, d.z_values[i][j]]);
            }
        }

        const option = {
            backgroundColor: 'transparent',
            title: {
                text: t.titleSqueeze,
                left: 'center',
                textStyle: { color: theme.text, fontFamily: 'DM Sans', fontSize: 16, fontWeight: 600 },
                top: 0
            },
            tooltip: {
                position: 'top',
                backgroundColor: theme.tooltipBg,
                borderColor: theme.tooltipBorder,
                textStyle: { color: theme.text, fontFamily: 'DM Sans' },
                padding: [10, 15],
                borderRadius: 8,
                formatter: function (params) {
                    const xLabel = d.x_labels[params.value[0]];
                    const yLabel = d.y_labels[params.value[1]];
                    const val = params.value[2].toFixed(1);
                    return `<strong>${yLabel}</strong> × <strong>${xLabel}</strong><br/>${t.tooltipSqueeze}: ${val}`;
                }
            },
            grid: { left: '25%', right: '5%', bottom: '5%', top: '12%', containLabel: true },
            xAxis: {
                type: 'category',
                data: d.x_labels,
                ...getCommonAxisOpts(),
                splitArea: { show: true, areaStyle: { color: [theme.gridColor, 'transparent'] } }
            },
            yAxis: {
                type: 'category',
                data: d.y_labels,
                ...getCommonAxisOpts(),
                splitArea: { show: true, areaStyle: { color: [theme.gridColor, 'transparent'] } },
                axisLabel: { color: theme.text, fontWeight: 500, width: 200, overflow: 'truncate' }
            },
            visualMap: {
                min: -10,
                max: 40,
                calculable: true,
                orient: 'horizontal',
                left: 'center',
                bottom: '0%',
                inRange: {
                    color: ['#1e3a5f', '#22c55e', '#fbbf24', '#f97316', '#ef4444']
                },
                textStyle: { color: theme.muted }
            },
            series: [{
                type: 'heatmap',
                data: heatmapData,
                label: {
                    show: true,
                    formatter: (p) => p.value[2].toFixed(1),
                    color: '#fff',
                    fontFamily: 'DM Sans',
                    fontWeight: 600
                },
                itemStyle: {
                    borderColor: theme.bg, // Matches theme background to separate grid items
                    borderWidth: 2,
                    borderRadius: 4
                },
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                }
            }]
        };

        // ECharts visualMap needs a little padding bottom on grid
        option.grid.bottom = '15%';

        chartSqueeze.setOption(option, true);
    }

    function renderAllCharts() {
        renderCommoditiesChart();
        renderFxChart();
        renderYoyCommChart();
        renderYoyInfChart();
        renderSqueezeChart();
    }

    function updateAllLayouts() {
        renderAllCharts();
    }
});
