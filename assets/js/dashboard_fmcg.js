/**
 * FMCG Native Dashboard Integration (Apache ECharts)
 * Premium visual design with Power BI–style cross-chart filtering,
 * synced theme (dark/light) and language (FR/EN).
 */
document.addEventListener('DOMContentLoaded', async () => {
    // DOM containers
    const domComm = document.getElementById('chart-commodities');
    const domFx = document.getElementById('chart-fx');
    const domYoyComm = document.getElementById('chart-yoy');
    const domYoyInf = document.getElementById('chart-inflation');
    const domSqueeze = document.getElementById('chart-squeeze');
    const filterComm = document.getElementById('filterComm');

    let chartComm, chartFx, chartYoyComm, chartYoyInf, chartSqueeze;

    // ─── PREMIUM COLOR PALETTE ────────────────────────────────────────
    const PALETTE = {
        Cocoa: { main: '#f59e0b', glow: 'rgba(245,158,11,.35)' },
        Coffee: { main: '#ef4444', glow: 'rgba(239,68,68,.35)' },
        Sugar: { main: '#22d3ee', glow: 'rgba(34,211,238,.35)' },
        Wheat: { main: '#a78bfa', glow: 'rgba(167,139,250,.35)' },
        Fx: { main: '#818cf8', glow: 'rgba(129,140,248,.35)' },
        Up: '#ef4444',
        Down: '#22c55e'
    };

    // ─── THEME TOKENS ─────────────────────────────────────────────────
    const THEMES = {
        dark: {
            text: '#e0e3eb', muted: '#8b92a5',
            gridLine: 'rgba(255,255,255,0.05)',
            tipBg: 'rgba(15,23,42,0.96)', tipBorder: 'rgba(91,140,255,0.2)',
            cardBg: 'rgba(255,255,255,0.03)'
        },
        light: {
            text: '#1e293b', muted: '#64748b',
            gridLine: 'rgba(0,0,0,0.06)',
            tipBg: 'rgba(255,255,255,0.96)', tipBorder: 'rgba(0,0,0,0.08)',
            cardBg: 'rgba(0,0,0,0.02)'
        }
    };

    // ─── TRANSLATIONS ─────────────────────────────────────────────────
    const TR = {
        fr: {
            comm: 'Évolution Mondiale des Prix (USD)',
            fx: 'Taux de Change EUR/USD',
            yoy: 'Variation sur 1 an (%)',
            inf: 'Inflation Consommateur France (% YoY)',
            squeeze: 'Matrice de Compression de Marge',
            sqTip: 'Squeeze Score',
            zoomTip: 'Glissez pour zoomer',
            click: 'Cliquez sur la légende pour filtrer'
        },
        en: {
            comm: 'Global Commodity Price Evolution (USD)',
            fx: 'EUR/USD Exchange Rate',
            yoy: '1-Year Price Change (%)',
            inf: 'France Consumer Inflation (% YoY)',
            squeeze: 'Margin Squeeze Matrix',
            sqTip: 'Squeeze Score',
            zoomTip: 'Drag to zoom',
            click: 'Click legend to filter'
        }
    };

    // ─── STATE ─────────────────────────────────────────────────────────
    let data = null;
    let theme = () => THEMES[document.documentElement.getAttribute('data-theme') || 'dark'];
    let lang = () => TR[document.documentElement.getAttribute('data-lang') || 'fr'];
    let isDark = () => (document.documentElement.getAttribute('data-theme') || 'dark') === 'dark';
    let selectedCommodity = 'all'; // cross-filter state

    // ─── DATA FETCH ───────────────────────────────────────────────────
    try {
        const res = await fetch('reports/dashboard_fmcg_data.json');
        data = await res.json();

        // Populate KPIs
        const kpiFx = document.getElementById('kpi-val-fx');
        if (kpiFx) kpiFx.textContent = data.kpis.fx_eur_usd.toFixed(4);
        const kpiCocoa = document.getElementById('kpi-val-cocoa');
        if (kpiCocoa) kpiCocoa.textContent = `+$${Math.round(data.kpis.cocoa_usd_t).toLocaleString('en-US')}`;

        initCharts();
        renderAll();
        bindEvents();
    } catch (e) {
        console.warn('Dashboard data unavailable (expected on file://):', e.message);
    }

    // ─── INIT ─────────────────────────────────────────────────────────
    function initCharts() {
        if (domComm) chartComm = echarts.init(domComm);
        if (domFx) chartFx = echarts.init(domFx);
        if (domYoyComm) chartYoyComm = echarts.init(domYoyComm);
        if (domYoyInf) chartYoyInf = echarts.init(domYoyInf);
        if (domSqueeze) chartSqueeze = echarts.init(domSqueeze);
    }

    function bindEvents() {
        // Theme toggle
        const themeBtn = document.getElementById('themeToggle');
        if (themeBtn) themeBtn.addEventListener('click', () => setTimeout(renderAll, 60));

        // Language toggle
        const langBtn = document.getElementById('langToggle');
        if (langBtn) langBtn.addEventListener('click', () => setTimeout(renderAll, 60));

        // Category Toggles -> cross-filter AND update dynamic KPI
        const toggles = document.querySelectorAll('.category-toggle');
        toggles.forEach(btn => {
            btn.addEventListener('click', () => {
                toggles.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedCommodity = btn.getAttribute('data-comm');
                updateDynamicKPI();
                renderAll();
            });
        });

        // Responsive resize
        window.addEventListener('resize', () => {
            [chartComm, chartFx, chartYoyComm, chartYoyInf, chartSqueeze]
                .forEach(c => c && c.resize());
        });

        // ─── POWER BI-STYLE: Click legend on Commodities → cross-filter ─
        if (chartComm) {
            chartComm.on('legendselectchanged', (params) => {
                const selected = Object.entries(params.selected).filter(([, v]) => v).map(([k]) => k);
                if (selected.length === 1) {
                    selectedCommodity = selected[0];
                } else {
                    selectedCommodity = 'all';
                }

                // Sync HTML toggle buttons
                const toggles = document.querySelectorAll('.category-toggle');
                toggles.forEach(b => {
                    b.classList.remove('active');
                    if (b.getAttribute('data-comm') === selectedCommodity) b.classList.add('active');
                });

                updateDynamicKPI();
                renderYoyComm();
                renderSqueeze();
            });
        }
    }

    // ─── DYNAMIC KPI UPDATE ───────────────────────────────────────────
    function updateDynamicKPI() {
        // YoY Block
        const kpiTitle = document.getElementById('kpi-title');
        const kpiVal = document.getElementById('kpi-value');
        const kpiDesc = document.getElementById('kpi-desc');
        // Spot Block
        const spotTitle = document.getElementById('spot-title');
        const spotVal = document.getElementById('spot-value');
        const spotDesc = document.getElementById('spot-desc');

        if (!kpiTitle || !data) return;

        const pTheme = PALETTE[selectedCommodity] || { main: '#818cf8' };
        kpiVal.style.color = pTheme.main;
        if (spotVal) spotVal.style.color = pTheme.main;

        const frNames = { 'Cocoa': 'Cacao', 'Coffee': 'Café', 'Sugar': 'Sucre', 'Wheat': 'Blé' };
        const commFr = frNames[selectedCommodity] || selectedCommodity;

        if (selectedCommodity === 'all') {
            kpiTitle.innerHTML = `<span class="lang-fr">Cacao (YoY)</span><span class="lang-en">Cocoa (YoY)</span>`; // Top mover anchor
            kpiVal.textContent = "+60%";
            kpiDesc.innerHTML = `<span class="lang-fr">Pic historique</span><span class="lang-en">Historical Peak</span>`;

            if (spotTitle) spotTitle.innerHTML = `<span class="lang-fr">Cours Cacao (Live)</span><span class="lang-en">Cocoa Spot (Live)</span>`;
            if (spotVal) spotVal.textContent = `+$${Math.round(data.kpis.cocoa_usd_t).toLocaleString('en-US')}`;
            if (spotDesc) spotDesc.textContent = "Yahoo Finance";
        } else {
            const yoyIndex = data.charts.yoy_commodity.labels.indexOf(selectedCommodity);
            if (yoyIndex !== -1) {
                const val = data.charts.yoy_commodity.values[yoyIndex];
                const prefix = val > 0 ? '+' : '';
                kpiTitle.innerHTML = `<span class="lang-fr">${commFr} (YoY)</span><span class="lang-en">${selectedCommodity} (YoY)</span>`;
                kpiVal.textContent = prefix + val.toFixed(0) + "%";
                kpiDesc.innerHTML = val > 20 ?
                    `<span class="lang-fr">Alerte volatilité</span><span class="lang-en">Volatility Alert</span>` :
                    `<span class="lang-fr">Évolution Annuelle</span><span class="lang-en">Annual Evolution</span>`;
            }

            if (spotTitle && data.charts.commodities[selectedCommodity]) {
                const prices = data.charts.commodities[selectedCommodity].prices;
                const latest = prices[prices.length - 1];
                spotTitle.innerHTML = `<span class="lang-fr">Cours ${commFr} (Live)</span><span class="lang-en">${selectedCommodity} Spot</span>`;
                spotVal.textContent = `$${latest >= 1000 ? (latest / 1000).toFixed(1) + 'k' : Math.round(latest)}`;
                if (spotDesc) spotDesc.textContent = "Yahoo Finance";
            }
        }
    }

    // ─── COMMON HELPERS ───────────────────────────────────────────────
    function makeGradient(color, opacity1 = 0.45, opacity2 = 0) {
        return new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: color.replace(')', `,${opacity1})`).replace('rgb', 'rgba') },
            { offset: 1, color: color.replace(')', `,${opacity2})`).replace('rgb', 'rgba') }
        ]);
    }

    function hexToRgba(hex, a) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r},${g},${b},${a})`;
    }

    function areaGradient(hex, topA = 0.4, botA = 0.02) {
        return new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: hexToRgba(hex, topA) },
            { offset: 1, color: hexToRgba(hex, botA) }
        ]);
    }

    function tipStyle() {
        const t = theme();
        return {
            tooltip: {
                trigger: 'axis',
                backgroundColor: t.tipBg,
                borderColor: t.tipBorder,
                borderWidth: 1,
                borderRadius: 12,
                padding: [12, 16],
                textStyle: { color: t.text, fontFamily: 'DM Sans', fontSize: 13 },
                axisPointer: {
                    type: 'cross',
                    lineStyle: { color: hexToRgba(PALETTE.Cocoa.main, 0.3) },
                    crossStyle: { color: hexToRgba(PALETTE.Cocoa.main, 0.3) },
                    label: { backgroundColor: t.muted, borderRadius: 4, padding: [4, 8], precision: 0 }
                }
            }
        };
    }

    function axisBase() {
        const t = theme();
        return {
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: { color: t.muted, fontFamily: 'DM Sans', fontSize: 12 },
            splitLine: { lineStyle: { color: t.gridLine, type: 'dashed' } }
        };
    }

    function titleStyle(text) {
        return {
            text, left: 'center', top: 4,
            textStyle: {
                color: theme().text, fontFamily: 'DM Sans',
                fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em'
            }
        };
    }

    // ─── CHART 1: COMMODITIES (Main) ──────────────────────────────────
    function renderComm() {
        if (!chartComm || !data) return;
        const t = lang();
        const sel = selectedCommodity;
        const names = sel === 'all' ? ['Cocoa', 'Coffee', 'Sugar', 'Wheat'] : [sel];

        const series = names.map(name => {
            const d = data.charts.commodities[name];
            if (!d) return null;
            const p = PALETTE[name];
            const isOnly = names.length === 1;
            return {
                name, type: 'line', smooth: 0.4, symbol: 'none', sampling: 'lttb',
                lineStyle: { width: isOnly ? 3.5 : 2.5, color: p.main },
                itemStyle: { color: p.main },
                emphasis: { lineStyle: { width: 4, shadowBlur: 12, shadowColor: p.glow }, focus: 'series' },
                areaStyle: isOnly ? { color: areaGradient(p.main, 0.35, 0.02) } : undefined,
                animationDuration: 1200, animationEasing: 'cubicOut',
                // BASE 100 NORMALIZATION: Divide every price point by the first date's price and multiply by 100
                data: d.prices.map((v, i) => {
                    const basePrice = d.prices[0];
                    const indexedVal = (v / basePrice) * 100;
                    return [d.dates[i], indexedVal];
                })
            };
        }).filter(Boolean);

        const option = {
            backgroundColor: 'transparent',
            title: titleStyle(t.comm),
            tooltip: { ...tipStyle().tooltip, valueFormatter: v => typeof v === 'number' ? v.toFixed(0) : v },
            legend: { show: false }, // Controlled cleanly by HTML toggle buttons instead of ECharts natively
            grid: { left: '2%', right: '3%', bottom: '8%', top: '18%', containLabel: true },
            xAxis: {
                type: 'time', ...axisBase(), splitLine: { show: false },
                axisLabel: { ...axisBase().axisLabel, formatter: '{MMM} {yyyy}', hideOverlap: true }
            },
            yAxis: {
                type: 'value', min: 'dataMin', max: 'dataMax', ...axisBase(),
                axisLabel: {
                    formatter: '{value}', // Base 100 index doesn't need $ or decimals
                    color: theme().muted, fontFamily: 'DM Sans'
                },
                name: 'Base 100\n(Jan 2023)',
                nameTextStyle: { color: theme().muted, fontSize: 10, align: 'right', padding: [0, 8, 0, 0] }
            },
            series
        };
        chartComm.setOption(option, true);
    }

    // ─── CHART 2: FX (trimmed to 2020+ for relevance) ─────────────────
    function renderFx() {
        if (!chartFx || !data) return;
        const t = lang();
        const fx = data.charts.fx;

        // Trim to 2020+ for visual relevance alongside commodities
        const startIdx = fx.dates.findIndex(d => d >= '2020-01-01');
        const dates = fx.dates.slice(startIdx);
        const values = fx.values.slice(startIdx);

        const option = {
            backgroundColor: 'transparent',
            title: titleStyle(t.fx),
            tooltip: { ...tipStyle(), valueFormatter: v => v.toFixed(4) },
            grid: { left: '2%', right: '3%', bottom: '8%', top: '16%', containLabel: true },
            xAxis: {
                type: 'category', data: dates, ...axisBase(),
                splitLine: { show: false },
                axisLabel: { ...axisBase().axisLabel, formatter: v => v.substring(0, 7), rotate: 30, interval: 5 }
            },
            yAxis: {
                type: 'value', min: 'dataMin', max: 'dataMax', ...axisBase(),
                axisLabel: { ...axisBase().axisLabel, formatter: v => v.toFixed(2) }
            },
            series: [{
                name: 'EUR/USD', type: 'line', smooth: 0.3, symbol: 'none',
                lineStyle: { width: 2.5, color: PALETTE.Fx.main },
                itemStyle: { color: PALETTE.Fx.main },
                areaStyle: { color: areaGradient(PALETTE.Fx.main, 0.3, 0.02) },
                animationDuration: 1000, animationEasing: 'cubicOut',
                data: values
            }]
        };
        chartFx.setOption(option, true);
    }

    // ─── CHART 3: YoY COMMODITY (cross-filtered) ──────────────────────
    function renderYoyComm() {
        if (!chartYoyComm || !data) return;
        const t = lang();
        const d = data.charts.yoy_commodity;

        const option = {
            backgroundColor: 'transparent',
            title: titleStyle(t.yoy),
            tooltip: {
                ...tipStyle(), trigger: 'item',
                formatter: p => `<strong>${p.name}</strong><br/>${p.value > 0 ? '+' : ''}${p.value.toFixed(1)}%`
            },
            grid: { left: '5%', right: '18%', bottom: '5%', top: '16%', containLabel: true },
            xAxis: {
                type: 'value', ...axisBase(), splitLine: { show: false },
                axisLabel: { ...axisBase().axisLabel, formatter: '{value}%' }
            },
            yAxis: {
                type: 'category', data: d.labels, ...axisBase(),
                axisLabel: { color: theme().text, fontWeight: 600, fontSize: 13 }
            },
            series: [{
                type: 'bar', barWidth: '55%',
                animationDuration: 800, animationEasing: 'elasticOut',
                data: d.values.map((v, i) => {
                    const name = d.labels[i];
                    const isHighlighted = selectedCommodity === 'all' || selectedCommodity === name;
                    const color = v > 0 ? PALETTE.Up : PALETTE.Down;
                    return {
                        value: v,
                        itemStyle: {
                            color: isHighlighted ? color : hexToRgba(color, 0.15),
                            borderRadius: [0, 6, 6, 0],
                            shadowBlur: isHighlighted ? 8 : 0,
                            shadowColor: isHighlighted ? hexToRgba(color, 0.3) : 'transparent'
                        }
                    };
                }),
                label: {
                    show: true, position: 'right', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 13,
                    formatter: p => (p.value > 0 ? '+' : '') + p.value.toFixed(1) + '%',
                    color: theme().text
                }
            }]
        };
        chartYoyComm.setOption(option, true);
    }

    // ─── CHART 4: INFLATION ───────────────────────────────────────────
    function renderInf() {
        if (!chartYoyInf || !data) return;
        const t = lang();
        const d = data.charts.yoy_inflation;

        const option = {
            backgroundColor: 'transparent',
            title: titleStyle(t.inf),
            tooltip: {
                ...tipStyle(), trigger: 'item',
                formatter: p => `<strong>${p.name}</strong><br/>${p.value > 0 ? '+' : ''}${p.value.toFixed(2)}%`
            },
            grid: { left: '2%', right: '12%', bottom: '5%', top: '12%', containLabel: true },
            xAxis: {
                type: 'value', ...axisBase(), splitLine: { show: false },
                axisLabel: { ...axisBase().axisLabel, formatter: '{value}%' }
            },
            yAxis: {
                type: 'category', data: d.labels, ...axisBase(),
                axisLabel: { color: theme().text, width: 200, overflow: 'truncate', fontSize: 12 }
            },
            series: [{
                type: 'bar', barWidth: '60%',
                animationDuration: 800, animationEasing: 'elasticOut',
                data: d.values.map(v => ({
                    value: v,
                    itemStyle: {
                        color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                            { offset: 0, color: v > 2 ? '#ef4444' : v > 1 ? '#f59e0b' : '#22c55e' },
                            { offset: 1, color: v > 2 ? '#fca5a5' : v > 1 ? '#fcd34d' : '#86efac' }
                        ]),
                        borderRadius: [0, 6, 6, 0],
                        shadowBlur: 6,
                        shadowColor: hexToRgba(v > 2 ? '#ef4444' : '#22c55e', 0.2)
                    }
                })),
                label: {
                    show: true, position: 'right', fontFamily: 'DM Sans', fontWeight: 700, fontSize: 12,
                    formatter: p => '+' + p.value.toFixed(2) + '%',
                    color: theme().text
                }
            }]
        };
        chartYoyInf.setOption(option, true);
    }

    // ─── CHART 5: SQUEEZE MATRIX (Heatmap) ────────────────────────────
    function renderSqueeze() {
        if (!chartSqueeze || !data) return;
        const t = lang();
        const d = data.charts.squeeze_matrix;

        const heatData = [];
        for (let y = 0; y < d.y_labels.length; y++) {
            for (let x = 0; x < d.x_labels.length; x++) {
                // Cross-filter: dim cells not related to selected commodity
                const val = d.z_values[y][x];
                const isActive = selectedCommodity === 'all' || d.x_labels[x] === selectedCommodity;
                heatData.push([x, y, val, isActive]);
            }
        }

        const option = {
            backgroundColor: 'transparent',
            title: titleStyle(t.squeeze),
            tooltip: {
                position: 'top', backgroundColor: theme().tipBg,
                borderColor: theme().tipBorder, borderWidth: 1, borderRadius: 12,
                padding: [12, 16],
                textStyle: { color: theme().text, fontFamily: 'DM Sans' },
                formatter: p => {
                    const xL = d.x_labels[p.value[0]];
                    const yL = d.y_labels[p.value[1]];
                    const v = p.value[2].toFixed(1);
                    return `<strong>${yL}</strong> × <strong>${xL}</strong><br/>${t.sqTip}: <strong>${v}</strong>`;
                }
            },
            grid: { left: '2%', right: '5%', bottom: '16%', top: '14%', containLabel: true },
            xAxis: {
                type: 'category', data: d.x_labels, ...axisBase(),
                axisLabel: { color: theme().text, fontWeight: 600, fontSize: 13 },
                splitArea: { show: true, areaStyle: { color: ['transparent', theme().gridLine] } }
            },
            yAxis: {
                type: 'category', data: d.y_labels, ...axisBase(),
                axisLabel: { color: theme().text, fontWeight: 500, fontSize: 12, width: 200, overflow: 'truncate' },
                splitArea: { show: true, areaStyle: { color: ['transparent', theme().gridLine] } }
            },
            visualMap: {
                min: -15, max: 45, calculable: true,
                orient: 'horizontal', left: 'center', bottom: 4,
                itemWidth: 14, itemHeight: 120,
                inRange: { color: ['#1e3a5f', '#0ea5e9', '#22c55e', '#fbbf24', '#f97316', '#ef4444', '#dc2626'] },
                textStyle: { color: theme().muted, fontSize: 11 }
            },
            series: [{
                type: 'heatmap',
                data: heatData.map(d => ({
                    value: [d[0], d[1], d[2]],
                    itemStyle: { opacity: d[3] ? 1 : 0.15 }
                })),
                label: {
                    show: true, fontFamily: 'DM Sans', fontWeight: 700, fontSize: 14,
                    formatter: p => p.value[2].toFixed(1),
                    color: '#fff',
                    textShadowBlur: 4, textShadowColor: 'rgba(0,0,0,0.5)'
                },
                itemStyle: { borderColor: isDark() ? '#0e1117' : '#f6f7fb', borderWidth: 4, borderRadius: 8 },
                emphasis: {
                    itemStyle: { shadowBlur: 16, shadowColor: 'rgba(0,0,0,0.4)', borderColor: '#fff', borderWidth: 2 }
                },
                animationDuration: 600
            }]
        };
        chartSqueeze.setOption(option, true);
    }

    // ─── RENDER ALL ───────────────────────────────────────────────────
    function renderAll() {
        renderComm();
        renderFx();
        renderYoyComm();
        renderInf();
        renderSqueeze();
    }
});
