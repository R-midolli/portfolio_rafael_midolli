/**
 * FMCG Cost Pressure Monitor — Native Dashboard (Apache ECharts)
 * All values are 100% data-driven from the pipeline JSON.
 * No hardcoded KPIs. Cross-chart filtering via category toggles.
 */
document.addEventListener('DOMContentLoaded', async () => {
    const domComm = document.getElementById('chart-commodities');
    const domFx = document.getElementById('chart-fx');
    const domYoyComm = document.getElementById('chart-yoy');
    const domYoyInf = document.getElementById('chart-inflation');
    const domSqueeze = document.getElementById('chart-squeeze');

    let chartComm, chartFx, chartYoyComm, chartYoyInf, chartSqueeze;

    // ─── COLOR PALETTE ───────────────────────────────────────────────
    const PALETTE = {
        Cocoa: { main: '#f59e0b', glow: 'rgba(245,158,11,.35)' },
        Coffee: { main: '#ef4444', glow: 'rgba(239,68,68,.35)' },
        Sugar: { main: '#22d3ee', glow: 'rgba(34,211,238,.35)' },
        Wheat: { main: '#a78bfa', glow: 'rgba(167,139,250,.35)' },
        Fx: { main: '#818cf8', glow: 'rgba(129,140,248,.35)' },
        Up: '#ef4444', Down: '#22c55e'
    };

    // Inflation category colors (consistent across charts)
    const INF_COLORS = {
        'Oils & Fats': '#ef4444',
        'Dairy, Cheese & Eggs': '#f97316',
        'Coffee, Tea, Cocoa': '#f59e0b',
        'Meat': '#eab308',
        'Sugar, Jam, Honey, Chocolate': '#a78bfa',
        'All Items': '#3b82f6',
        'Bread & Cereals': '#22c55e'
    };

    // Map commodity filter → inflation category for cross-filtering
    const COMM_TO_INF = {
        'Cocoa': 'Coffee, Tea, Cocoa',
        'Coffee': 'Coffee, Tea, Cocoa',
        'Sugar': 'Sugar, Jam, Honey, Chocolate',
        'Wheat': 'Bread & Cereals'
    };

    // ─── THEME TOKENS ────────────────────────────────────────────────
    const THEMES = {
        dark: {
            text: '#e0e3eb', muted: '#8b92a5',
            gridLine: 'rgba(255,255,255,0.05)',
            tipBg: 'rgba(15,23,42,0.96)', tipBorder: 'rgba(91,140,255,0.2)',
        },
        light: {
            text: '#1e293b', muted: '#64748b',
            gridLine: 'rgba(0,0,0,0.06)',
            tipBg: 'rgba(255,255,255,0.96)', tipBorder: 'rgba(0,0,0,0.08)',
        }
    };

    // ─── TRANSLATIONS ────────────────────────────────────────────────
    const TR = {
        fr: {
            comm: 'Évolution des Prix (Base 100 = Jan 2023)',
            fx: 'Taux de Change EUR / USD',
            yoy: 'Variation Annuelle des Matières Premières',
            inf: 'Inflation par Catégorie Alimentaire (INSEE)',
            squeeze: 'Matrice de Pression sur les Marges',
            sqTip: 'Score de Pression'
        },
        en: {
            comm: 'Commodity Price Evolution (Base 100 = Jan 2023)',
            fx: 'EUR / USD Exchange Rate',
            yoy: 'Year-over-Year Commodity Price Change',
            inf: 'Food Category Inflation Over Time (INSEE)',
            squeeze: 'Margin Pressure Matrix',
            sqTip: 'Pressure Score'
        }
    };

    // ─── STATE ───────────────────────────────────────────────────────
    let data = null;
    let theme = () => THEMES[document.documentElement.getAttribute('data-theme') || 'dark'];
    let lang = () => TR[document.documentElement.getAttribute('data-lang') || 'fr'];
    let isDark = () => (document.documentElement.getAttribute('data-theme') || 'dark') === 'dark';
    let selectedCommodity = 'all';

    // ─── DATA FETCH ──────────────────────────────────────────────────
    try {
        const res = await fetch('reports/dashboard_fmcg_data.json');
        data = await res.json();

        // Populate static KPIs from real data
        const kpiFx = document.getElementById('kpi-val-fx');
        if (kpiFx) kpiFx.textContent = data.kpis.fx_eur_usd.toFixed(4);

        updateDynamicKPI();
        initCharts();
        renderAll();
        bindEvents();
    } catch (e) {
        console.warn('Dashboard data unavailable:', e.message);
    }

    // ─── INIT ────────────────────────────────────────────────────────
    function initCharts() {
        if (domComm) chartComm = echarts.init(domComm);
        if (domFx) chartFx = echarts.init(domFx);
        if (domYoyComm) chartYoyComm = echarts.init(domYoyComm);
        if (domYoyInf) chartYoyInf = echarts.init(domYoyInf);
        if (domSqueeze) chartSqueeze = echarts.init(domSqueeze);
    }

    function bindEvents() {
        const themeBtn = document.getElementById('themeToggle');
        if (themeBtn) themeBtn.addEventListener('click', () => setTimeout(renderAll, 60));

        const langBtn = document.getElementById('langToggle');
        if (langBtn) langBtn.addEventListener('click', () => setTimeout(renderAll, 60));

        document.querySelectorAll('.category-toggle').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.category-toggle').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedCommodity = btn.getAttribute('data-comm');
                updateDynamicKPI();
                renderAll();
            });
        });

        window.addEventListener('resize', () => {
            [chartComm, chartFx, chartYoyComm, chartYoyInf, chartSqueeze]
                .forEach(c => c && c.resize());
        });
    }

    // ─── DYNAMIC KPI (100% data-driven) ──────────────────────────────
    function updateDynamicKPI() {
        const kpiTitle = document.getElementById('kpi-title');
        const kpiVal = document.getElementById('kpi-value');
        const kpiDesc = document.getElementById('kpi-desc');
        const spotTitle = document.getElementById('spot-title');
        const spotVal = document.getElementById('spot-value');
        const spotDesc = document.getElementById('spot-desc');
        const dynInsight = document.getElementById('dynamic-insight');

        if (!kpiTitle || !data) return;

        const frNames = { 'Cocoa': 'Cacao', 'Coffee': 'Café', 'Sugar': 'Sucre', 'Wheat': 'Blé' };

        if (selectedCommodity === 'all') {
            // Find the top mover (highest absolute YoY change)
            const yoy = data.charts.yoy_commodity;
            let maxIdx = 0;
            yoy.values.forEach((v, i) => { if (Math.abs(v) > Math.abs(yoy.values[maxIdx])) maxIdx = i; });
            const topName = yoy.labels[maxIdx];
            const topVal = yoy.values[maxIdx];
            const topFr = frNames[topName] || topName;
            const prefix = topVal > 0 ? '+' : '';

            kpiTitle.innerHTML = `<span class="lang-fr">${topFr} (YoY)</span><span class="lang-en">${topName} (YoY)</span>`;
            kpiVal.textContent = prefix + Math.round(topVal) + '%';
            kpiVal.style.color = PALETTE[topName] ? PALETTE[topName].main : '#818cf8';
            kpiDesc.innerHTML = `<span class="lang-fr">Plus forte variation</span><span class="lang-en">Largest Swing</span>`;

            if (spotTitle) {
                const latestPrice = data.charts.commodities[topName].prices.slice(-1)[0];
                spotTitle.innerHTML = `<span class="lang-fr">Cours ${topFr}</span><span class="lang-en">${topName} Spot</span>`;
                spotVal.textContent = '$' + (latestPrice >= 1000 ? (latestPrice / 1000).toFixed(1) + 'k' : Math.round(latestPrice));
                spotVal.style.color = PALETTE[topName] ? PALETTE[topName].main : '#818cf8';
                spotVal.style.fontSize = '3rem';
                if (spotDesc) spotDesc.textContent = 'Yahoo Finance';
            }

            if (dynInsight) dynInsight.innerHTML = buildGlobalInsight();
        } else {
            const commFr = frNames[selectedCommodity] || selectedCommodity;
            const yoyIdx = data.charts.yoy_commodity.labels.indexOf(selectedCommodity);

            if (yoyIdx !== -1) {
                const val = data.charts.yoy_commodity.values[yoyIdx];
                const prefix = val > 0 ? '+' : '';
                kpiTitle.innerHTML = `<span class="lang-fr">${commFr} (YoY)</span><span class="lang-en">${selectedCommodity} (YoY)</span>`;
                kpiVal.textContent = prefix + Math.round(val) + '%';
                kpiVal.style.color = PALETTE[selectedCommodity] ? PALETTE[selectedCommodity].main : '#818cf8';
                kpiDesc.innerHTML = val > 10
                    ? `<span class="lang-fr">Hausse significative</span><span class="lang-en">Significant Rise</span>`
                    : val < -10
                        ? `<span class="lang-fr">Correction majeure</span><span class="lang-en">Major Correction</span>`
                        : `<span class="lang-fr">Variation annuelle</span><span class="lang-en">Annual Change</span>`;
            }

            if (spotTitle && data.charts.commodities[selectedCommodity]) {
                const prices = data.charts.commodities[selectedCommodity].prices;
                const latest = prices[prices.length - 1];
                spotTitle.innerHTML = `<span class="lang-fr">Cours ${commFr}</span><span class="lang-en">${selectedCommodity} Spot</span>`;
                spotVal.textContent = '$' + (latest >= 1000 ? (latest / 1000).toFixed(1) + 'k' : Math.round(latest));
                spotVal.style.color = PALETTE[selectedCommodity] ? PALETTE[selectedCommodity].main : '#818cf8';
                spotVal.style.fontSize = '3rem';
                if (spotDesc) spotDesc.textContent = 'Yahoo Finance';
            }

            if (dynInsight) dynInsight.innerHTML = buildCommodityInsight(selectedCommodity, commFr);
        }
    }

    // Insight text builders — derived from the actual data
    function buildGlobalInsight() {
        const yoy = data.charts.yoy_commodity;
        const rising = yoy.labels.filter((_, i) => yoy.values[i] > 0);
        const falling = yoy.labels.filter((_, i) => yoy.values[i] < 0);
        const risingFr = rising.map(n => ({ 'Cocoa': 'Cacao', 'Coffee': 'Café', 'Sugar': 'Sucre', 'Wheat': 'Blé' }[n] || n));
        const fallingFr = falling.map(n => ({ 'Cocoa': 'Cacao', 'Coffee': 'Café', 'Sugar': 'Sucre', 'Wheat': 'Blé' }[n] || n));

        const frText = `Sur les 4 matières suivies, ${rising.length > 0 ? risingFr.join(', ') + (rising.length === 1 ? ' est' : ' sont') + ' en hausse annuelle' : 'aucune n\'est en hausse'}${falling.length > 0 ? ' tandis que ' + fallingFr.join(', ') + (falling.length === 1 ? ' recule.' : ' reculent.') : '.'}`;
        const enText = `Of the 4 tracked commodities, ${rising.length > 0 ? rising.join(', ') + (rising.length === 1 ? ' is' : ' are') + ' rising year-over-year' : 'none are rising'}${falling.length > 0 ? ' while ' + falling.join(', ') + (falling.length === 1 ? ' is declining.' : ' are declining.') : '.'}`;

        return `<strong><span class="lang-fr">Vue d'ensemble :</span><span class="lang-en">Overview:</span></strong>
                <span class="lang-fr"> ${frText}</span><span class="lang-en"> ${enText}</span>`;
    }

    function buildCommodityInsight(comm, commFr) {
        const yoyIdx = data.charts.yoy_commodity.labels.indexOf(comm);
        const yoyVal = yoyIdx !== -1 ? data.charts.yoy_commodity.values[yoyIdx] : 0;
        const prefix = yoyVal > 0 ? '+' : '';
        const infCat = COMM_TO_INF[comm];
        let infVal = null;
        if (infCat) {
            const infIdx = data.charts.yoy_inflation.labels.indexOf(infCat);
            if (infIdx !== -1) infVal = data.charts.yoy_inflation.values[infIdx];
        }

        let frText = `Le ${commFr} affiche une variation de ${prefix}${Math.round(yoyVal)}% sur un an.`;
        let enText = `${comm} shows a ${prefix}${Math.round(yoyVal)}% year-over-year change.`;

        if (infVal !== null) {
            const infPrefix = infVal > 0 ? '+' : '';
            frText += ` L'inflation de la catégorie associée (${infCat}) se situe à ${infPrefix}${infVal.toFixed(1)}% — `;
            enText += ` Linked retail inflation (${infCat}) stands at ${infPrefix}${infVal.toFixed(1)}% — `;

            if (Math.abs(yoyVal) > 20 && infVal < 5) {
                frText += `le consommateur n'absorbe qu'une fraction du choc matières.`;
                enText += `consumers are absorbing only a fraction of the raw material shock.`;
            } else if (yoyVal < 0 && infVal > 0) {
                frText += `les prix de détail restent élevés malgré la baisse des matières premières (effet retard).`;
                enText += `retail prices remain high despite falling commodity costs (lag effect).`;
            } else {
                frText += `le pass-through vers les prix de détail est à surveiller.`;
                enText += `the pass-through to retail prices should be monitored.`;
            }
        }

        return `<strong><span class="lang-fr">Diagnostic ${commFr} :</span><span class="lang-en">${comm} Analysis:</span></strong>
                <span class="lang-fr"> ${frText}</span><span class="lang-en"> ${enText}</span>`;
    }

    // ─── COMMON HELPERS ──────────────────────────────────────────────
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
                backgroundColor: t.tipBg, borderColor: t.tipBorder, borderWidth: 1,
                borderRadius: 14, padding: [14, 18],
                textStyle: { color: t.text, fontFamily: 'DM Sans', fontSize: 13 },
                extraCssText: 'box-shadow: 0 8px 32px rgba(0,0,0,0.25);',
                axisPointer: {
                    type: 'cross',
                    lineStyle: { color: 'rgba(129,140,248,0.2)', type: 'dashed' },
                    crossStyle: { color: 'rgba(129,140,248,0.2)' },
                    label: { backgroundColor: 'rgba(91,140,255,0.85)', borderRadius: 6, padding: [4, 10], color: '#fff', fontSize: 11, fontFamily: 'DM Sans' }
                }
            }
        };
    }

    function axisBase() {
        const t = theme();
        return {
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: { color: t.muted, fontFamily: 'DM Sans', fontSize: 11.5, fontWeight: 500 },
            splitLine: { lineStyle: { color: t.gridLine, type: [4, 4] } }
        };
    }

    function titleStyle(text) {
        return {
            text, left: 'center', top: 6,
            textStyle: {
                color: theme().text, fontFamily: 'DM Sans',
                fontSize: 14, fontWeight: 600, letterSpacing: '0.02em'
            }
        };
    }

    // Gradient for horizontal bars (left-to-right)
    function barGradient(hexFrom, hexTo) {
        return new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: hexFrom },
            { offset: 1, color: hexTo }
        ]);
    }

    // ═══════════════════════════════════════════════════════════════════
    // CHART 1 — COMMODITY PRICE EVOLUTION (Base 100)
    // ═══════════════════════════════════════════════════════════════════
    function renderComm() {
        if (!chartComm || !data) return;
        const t = lang();
        const d = data.charts.commodities;
        const allNames = ['Cocoa', 'Coffee', 'Sugar', 'Wheat'];

        const series = allNames.map(name => {
            const cd = d[name];
            if (!cd) return null;
            const p = PALETTE[name];
            const isActive = selectedCommodity === 'all' || selectedCommodity === name;
            const basePrice = cd.prices[0];

            return {
                name, type: 'line', smooth: 0.35, symbol: 'none', sampling: 'lttb',
                lineStyle: {
                    width: isActive ? 2.8 : 1,
                    color: isActive ? p.main : hexToRgba(p.main, 0.12),
                    cap: 'round', join: 'round'
                },
                itemStyle: { color: p.main },
                areaStyle: isActive
                    ? { color: areaGradient(p.main, selectedCommodity !== 'all' ? 0.22 : 0.08, 0.01) }
                    : undefined,
                endLabel: {
                    show: isActive, formatter: '{a}',
                    color: p.main, fontFamily: 'DM Sans', fontWeight: 600, fontSize: 11.5, distance: 6,
                    backgroundColor: hexToRgba(p.main, 0.08), borderRadius: 4, padding: [3, 8]
                },
                emphasis: { lineStyle: { width: 3.5, shadowBlur: 14, shadowColor: p.glow }, focus: 'series' },
                animationDuration: 1200, animationEasing: 'cubicOut',
                data: cd.prices.map((v, i) => [cd.dates[i], Math.round((v / basePrice) * 100)])
            };
        }).filter(Boolean);

        const option = {
            backgroundColor: 'transparent',
            title: titleStyle(t.comm),
            tooltip: { ...tipStyle().tooltip, valueFormatter: v => typeof v === 'number' ? v : v },
            legend: { show: false },
            grid: { left: '3%', right: '11%', bottom: '8%', top: '16%', containLabel: true },
            xAxis: {
                type: 'time', ...axisBase(), splitLine: { show: false },
                axisLabel: { ...axisBase().axisLabel, formatter: '{MMM} {yy}', hideOverlap: true }
            },
            yAxis: {
                type: 'value', min: 'dataMin', max: 'dataMax', ...axisBase(),
                axisLabel: { formatter: v => Math.round(v), ...axisBase().axisLabel },
                name: 'Base 100', nameTextStyle: { color: theme().muted, fontSize: 10, fontFamily: 'DM Sans', align: 'right', padding: [0, 6, 0, 0] }
            },
            series
        };
        chartComm.setOption(option, true);
    }

    // ═══════════════════════════════════════════════════════════════════
    // CHART 2 — EUR/USD EXCHANGE RATE
    // ═══════════════════════════════════════════════════════════════════
    function renderFx() {
        if (!chartFx || !data) return;
        const t = lang();
        const fx = data.charts.fx;

        const startIdx = fx.dates.findIndex(d => d >= '2020-01-01');
        const dates = fx.dates.slice(startIdx);
        const values = fx.values.slice(startIdx);

        const option = {
            backgroundColor: 'transparent',
            title: titleStyle(t.fx),
            tooltip: { ...tipStyle().tooltip, valueFormatter: v => typeof v === 'number' ? v.toFixed(2) : v },
            grid: { left: '3%', right: '4%', bottom: '10%', top: '16%', containLabel: true },
            xAxis: {
                type: 'category', data: dates, ...axisBase(),
                splitLine: { show: false },
                axisLabel: { ...axisBase().axisLabel, formatter: v => v.substring(0, 7), rotate: 0, interval: Math.floor(dates.length / 5) }
            },
            yAxis: {
                type: 'value', min: 'dataMin', max: 'dataMax', ...axisBase(),
                axisLabel: { ...axisBase().axisLabel, formatter: v => v.toFixed(2) },
                splitNumber: 4
            },
            series: [{
                name: 'EUR/USD', type: 'line', smooth: 0.35, symbol: 'none',
                lineStyle: { width: 2, color: PALETTE.Fx.main, cap: 'round' },
                itemStyle: { color: PALETTE.Fx.main },
                areaStyle: { color: areaGradient(PALETTE.Fx.main, 0.18, 0.01) },
                animationDuration: 1000, animationEasing: 'cubicOut',
                data: values
            }]
        };
        chartFx.setOption(option, true);
    }

    // ═══════════════════════════════════════════════════════════════════
    // CHART 3 — YoY COMMODITY CHANGE (horizontal bar)
    // ═══════════════════════════════════════════════════════════════════
    function renderYoyComm() {
        if (!chartYoyComm || !data) return;
        const t = lang();
        const d = data.charts.yoy_commodity;

        // Sort by value ascending for visual ranking
        const indices = d.labels.map((_, i) => i).sort((a, b) => d.values[a] - d.values[b]);
        const sortedLabels = indices.map(i => d.labels[i]);
        const sortedValues = indices.map(i => Math.round(d.values[i] * 10) / 10);

        const option = {
            backgroundColor: 'transparent',
            title: titleStyle(t.yoy),
            tooltip: {
                ...tipStyle().tooltip, trigger: 'item',
                formatter: p => {
                    const sign = p.value > 0 ? '+' : '';
                    return `<strong style="font-size:13px">${p.name}</strong><br/><span style="font-size:18px;font-weight:700;color:${p.value > 0 ? '#f87171' : '#4ade80'}">${sign}${p.value.toFixed(1)}%</span>`;
                }
            },
            grid: { left: '3%', right: '16%', bottom: '6%', top: '16%', containLabel: true },
            xAxis: {
                type: 'value', ...axisBase(),
                splitLine: { show: false },
                axisLabel: { show: false }
            },
            yAxis: {
                type: 'category', data: sortedLabels, ...axisBase(),
                axisLabel: { color: theme().text, fontWeight: 600, fontSize: 12.5, fontFamily: 'DM Sans' }
            },
            series: [{
                type: 'bar', barWidth: 28, barCategoryGap: '35%',
                animationDuration: 900, animationEasing: 'cubicOut',
                data: sortedValues.map((rounded, si) => {
                    const name = sortedLabels[si];
                    const isHighlighted = selectedCommodity === 'all' || selectedCommodity === name;
                    const p = PALETTE[name];
                    const baseColor = p ? p.main : (rounded > 0 ? '#f87171' : '#4ade80');
                    return {
                        value: rounded,
                        itemStyle: {
                            color: isHighlighted
                                ? barGradient(hexToRgba(baseColor, 0.7), baseColor)
                                : hexToRgba(baseColor, 0.12),
                            borderRadius: rounded > 0 ? [0, 5, 5, 0] : [5, 0, 0, 5],
                            shadowBlur: isHighlighted ? 12 : 0,
                            shadowColor: isHighlighted ? hexToRgba(baseColor, 0.25) : 'transparent',
                            shadowOffsetX: isHighlighted ? (rounded > 0 ? 4 : -4) : 0
                        }
                    };
                }),
                label: {
                    show: true,
                    position: 'right',
                    fontFamily: 'DM Sans',
                    fontWeight: 600,
                    fontSize: 12,
                    formatter: p => {
                        const sign = p.value > 0 ? '+' : '';
                        return `{val|${sign}${p.value.toFixed(1)}%}`;
                    },
                    rich: {
                        val: {
                            fontSize: 12.5,
                            fontWeight: 700,
                            fontFamily: 'DM Sans',
                            color: theme().text,
                            padding: [0, 0, 0, 6]
                        }
                    }
                }
            }]
        };
        chartYoyComm.setOption(option, true);
    }

    // ═══════════════════════════════════════════════════════════════════
    // CHART 4 — INFLATION TIME SERIES
    // ═══════════════════════════════════════════════════════════════════
    function renderInf() {
        if (!chartYoyInf || !data || !data.charts.inflation_timeseries) return;
        const t = lang();
        const d = data.charts.inflation_timeseries;
        const cats = Object.keys(d);
        if (cats.length === 0) return;

        const dates = d[cats[0]].dates;

        const series = cats.map(c => {
            const relatedComm = COMM_TO_INF[selectedCommodity];
            const isHighlighted = selectedCommodity === 'all' || c === relatedComm || c === 'All Items';
            const col = INF_COLORS[c] || '#666';

            return {
                name: c, type: 'line', smooth: 0.3, symbol: 'none',
                data: d[c].values,
                lineStyle: {
                    width: isHighlighted ? 2.5 : 0.8,
                    opacity: isHighlighted ? 1 : 0.12,
                    color: col, cap: 'round'
                },
                itemStyle: { color: col, opacity: isHighlighted ? 1 : 0.12 },
                areaStyle: (isHighlighted && selectedCommodity !== 'all')
                    ? { color: areaGradient(col, 0.12, 0.01) } : undefined,
                endLabel: {
                    show: isHighlighted,
                    formatter: '{a}', color: col,
                    fontSize: 10.5, fontFamily: 'DM Sans', fontWeight: 600,
                    backgroundColor: hexToRgba(col, 0.08), borderRadius: 4, padding: [2, 6]
                },
                animationDuration: 900, animationEasing: 'cubicOut'
            };
        });

        const option = {
            backgroundColor: 'transparent',
            title: titleStyle(t.inf),
            tooltip: {
                ...tipStyle().tooltip, trigger: 'axis',
                valueFormatter: v => typeof v === 'number' ? v.toFixed(2) + '%' : v
            },
            grid: { left: '3%', right: '22%', bottom: '8%', top: '16%', containLabel: true },
            xAxis: {
                type: 'category', data: dates, ...axisBase(),
                splitLine: { show: false },
                axisLabel: {
                    ...axisBase().axisLabel,
                    formatter: v => {
                        const dt = new Date(v);
                        return dt.toLocaleString('default', { month: 'short' }) + ' ' + String(dt.getFullYear()).slice(2);
                    },
                    interval: Math.max(1, Math.floor(dates.length / 8))
                }
            },
            yAxis: {
                type: 'value', ...axisBase(),
                axisLabel: { ...axisBase().axisLabel, formatter: v => v.toFixed(0) + '%' },
                splitNumber: 5
            },
            series
        };
        chartYoyInf.setOption(option, true);
    }

    // ═══════════════════════════════════════════════════════════════════
    // CHART 5 — SQUEEZE MATRIX (Heatmap)
    // ═══════════════════════════════════════════════════════════════════
    function renderSqueeze() {
        if (!chartSqueeze || !data) return;
        const t = lang();
        const d = data.charts.squeeze_matrix;

        const heatData = [];
        for (let y = 0; y < d.y_labels.length; y++) {
            for (let x = 0; x < d.x_labels.length; x++) {
                const val = Math.round(d.z_values[y][x] * 10) / 10;
                const isActive = selectedCommodity === 'all' || d.x_labels[x] === selectedCommodity;
                heatData.push([x, y, val, isActive]);
            }
        }

        const option = {
            backgroundColor: 'transparent',
            title: titleStyle(t.squeeze),
            tooltip: {
                ...tipStyle().tooltip,
                position: 'top',
                formatter: p => {
                    const xL = d.x_labels[p.value[0]];
                    const yL = d.y_labels[p.value[1]];
                    const v = p.value[2].toFixed(1);
                    const color = p.value[2] > 20 ? '#f87171' : p.value[2] > 0 ? '#fbbf24' : '#4ade80';
                    return `<strong>${yL}</strong> × <strong>${xL}</strong><br/>${t.sqTip}: <span style="font-size:16px;font-weight:700;color:${color}">${v}</span>`;
                }
            },
            grid: { left: '3%', right: '5%', bottom: '14%', top: '14%', containLabel: true },
            xAxis: {
                type: 'category', data: d.x_labels, ...axisBase(),
                axisLabel: { color: theme().text, fontWeight: 600, fontSize: 12, fontFamily: 'DM Sans' },
                splitArea: { show: false }
            },
            yAxis: {
                type: 'category', data: d.y_labels, ...axisBase(),
                axisLabel: { color: theme().text, fontWeight: 500, fontSize: 11, fontFamily: 'DM Sans', width: 180, overflow: 'truncate' },
                splitArea: { show: false }
            },
            visualMap: {
                min: -15, max: 45, calculable: false, show: true,
                orient: 'horizontal', left: 'center', bottom: 2,
                itemWidth: 12, itemHeight: 100,
                inRange: { color: ['#164e63', '#0e7490', '#06b6d4', '#a3e635', '#facc15', '#f97316', '#ef4444', '#b91c1c'] },
                textStyle: { color: theme().muted, fontSize: 10, fontFamily: 'DM Sans' }
            },
            series: [{
                type: 'heatmap',
                data: heatData.map(d => ({
                    value: [d[0], d[1], d[2]],
                    itemStyle: { opacity: d[3] ? 1 : 0.12 }
                })),
                label: {
                    show: true, fontFamily: 'DM Sans', fontWeight: 700, fontSize: 15,
                    formatter: p => {
                        const v = p.value[2];
                        return v === 0 ? '–' : v.toFixed(1);
                    },
                    color: '#fff',
                    textShadowBlur: 6, textShadowColor: 'rgba(0,0,0,0.6)'
                },
                itemStyle: { borderColor: isDark() ? '#0e1117' : '#f6f7fb', borderWidth: 5, borderRadius: 10 },
                emphasis: {
                    itemStyle: { shadowBlur: 20, shadowColor: 'rgba(0,0,0,0.45)', borderColor: '#fff', borderWidth: 2 }
                },
                animationDuration: 700, animationEasing: 'cubicOut'
            }]
        };
        chartSqueeze.setOption(option, true);
    }

    // ─── RENDER ALL ──────────────────────────────────────────────────
    function renderAll() {
        renderComm();
        renderFx();
        renderYoyComm();
        renderInf();
        renderSqueeze();
    }
});
