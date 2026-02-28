// Dashboard Logic for Customer Churn Reactivation Propensity
// Pure JS client-side simulation (Mocking Python XGBoost backend)

document.addEventListener("DOMContentLoaded", function () {
    // Wait slightly to ensure fonts and DOM are fully ready before Plotly renders
    setTimeout(initDashboard, 100);
});

function initDashboard() {
    // --- 1. Generate Synthetic Data ---
    // Simulating the Python backend calculations in JS for the static portfolio

    // Pseudo-random generator for reproducibility
    function mulberry32(a) {
        return function () {
            var t = a += 0x6D2B79F5;
            t = Math.imul(t ^ t >>> 15, t | 1);
            t ^= t + Math.imul(t ^ t >>> 7, t | 61);
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        }
    }
    const rng = mulberry32(42);

    // Box-Muller transform for normal distribution
    function randn_bm() {
        var u = 0, v = 0;
        while (u === 0) u = rng();
        while (v === 0) v = rng();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }

    // Beta distribution approx
    function rbeta(alpha, beta) {
        var a = 0, b = 0;
        for (let i = 0; i < alpha; i++) a += -Math.log(rng());
        for (let i = 0; i < beta; i++) b += -Math.log(rng());
        return a / (a + b);
    }

    const n_customers = 1000;
    let data = [];
    let clv_array = [];

    for (let i = 0; i < n_customers; i++) {
        // Lognormal(4.5, 0.8)
        let clv = Math.exp(4.5 + randn_bm() * 0.8);
        // Beta(2, 5)
        let score = rbeta(2, 5);
        // Shift score slightly upwards for visual demonstration
        score = Math.min(score * 1.5 + 0.1, 0.99);

        data.push({
            id: i + 1,
            clv: clv,
            score: score
        });
        clv_array.push(clv);
    }

    // Quantiles for CLV Segmentation
    const sorted_clv = [...clv_array].sort((a, b) => a - b);
    const p40 = sorted_clv[Math.floor(0.40 * n_customers)];
    const p75 = sorted_clv[Math.floor(0.75 * n_customers)];

    data.forEach(d => {
        if (d.clv >= p75) d.segment = "High";
        else if (d.clv >= p40) d.segment = "Mid";
        else d.segment = "Low";

        const coupon = d.segment === "High" ? 20 : (d.segment === "Mid" ? 10 : 5);
        const rate = d.segment === "High" ? 0.35 : (d.segment === "Mid" ? 0.16 : 0.05);

        d.coupon = coupon;
        d.expected_roi = (d.clv * d.score * rate) - coupon;
    });

    // --- State Variables ---
    let activeSegment = "All"; // Can be All, High, Mid, Low

    // --- 2. Dashboard Logic ---

    const scoreSlider = document.getElementById('score-slider');
    const budgetSlider = document.getElementById('budget-slider');
    const scoreVal = document.getElementById('score-val');
    const budgetVal = document.getElementById('budget-val');
    const segmentToggles = document.querySelectorAll('.category-toggle');

    const kpiClients = document.getElementById('kpi-clients');
    const kpiRoi = document.getElementById('kpi-roi');
    const tableWrap = document.getElementById('table-wrap');

    const colors = {
        High: "#10b981", // Success green
        Mid: "#6366f1",  // Indigo
        Low: "#f43f5e"   // Rose
    };

    const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';

    // Recompute theme colors based on html data-theme
    function getThemeColors() {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        return {
            chartBg: isDark ? 'rgba(255,255,255,0)' : 'rgba(0,0,0,0)',
            paperBg: isDark ? 'rgba(255,255,255,0)' : 'rgba(0,0,0,0)',
            fontColor: isDark ? '#f8fafc' : '#1e293b',
            gridColor: isDark ? '#334155' : '#e2e8f0',
            success: '#10b981',
            danger: '#ef4444'
        };
    }

    function updateDashboard() {
        const minScore = parseFloat(scoreSlider.value);
        const budget = parseInt(budgetSlider.value);

        scoreVal.innerText = minScore.toFixed(2);
        budgetVal.innerText = "€ " + budget.toLocaleString();

        // Filter logic: Score Threshold + Positive expected ROI + Active Segment Toggle + Min ROI
        let selected = data.filter(d =>
            d.score >= minScore &&
            d.expected_roi >= budget &&
            (activeSegment === "All" || d.segment === activeSegment)
        );

        // Sort by expected ROI desc
        selected.sort((a, b) => b.expected_roi - a.expected_roi);

        // KPIs
        const n_selected = selected.length;
        const total_roi = selected.reduce((sum, d) => sum + d.expected_roi, 0);
        const theme = getThemeColors();

        kpiClients.innerText = n_selected.toLocaleString();
        kpiRoi.innerText = "€ " + Math.round(total_roi).toLocaleString();
        kpiRoi.style.color = total_roi >= 0 ? theme.success : theme.danger;

        if (n_selected === 0) {
            document.getElementById('bar-chart').innerHTML = `<div style="text-align:center; padding:2rem; color:${theme.danger}; font-weight:bold;">Aucun client ne correspond aux critères / No clients match criteria</div>`;
            document.getElementById('scatter-chart').innerHTML = `<div style="text-align:center; padding:2rem; color:${theme.danger}; font-weight:bold;">Graphique vide / Chart is empty</div>`;
            tableWrap.innerHTML = `<div style="text-align:center; padding:2rem; color:${theme.danger}; font-weight:bold;">Tableau vide / Table is empty</div>`;
            return;
        }

        // Top 10 Bar Chart
        let top10 = selected.slice(0, 10);
        let barTrace = {
            type: 'bar',
            x: top10.map(d => d.expected_roi).reverse(),
            y: top10.map(d => "Client " + d.id).reverse(),
            orientation: 'h',
            marker: {
                color: top10.map(d => colors[d.segment]).reverse()
            },
            text: top10.map(d => "€" + Math.round(d.expected_roi)).reverse(),
            textposition: 'auto',
            hoverinfo: 'none'
        };

        const currentLang = document.documentElement.getAttribute('data-lang') || 'fr';

        Plotly.newPlot('bar-chart', [barTrace], {
            title: { text: currentLang === 'fr' ? 'Top 10 Clients (ROI Attendu)' : 'Top 10 Priority Clients (ROI)', font: { color: theme.fontColor } },
            paper_bgcolor: theme.paperBg,
            plot_bgcolor: theme.chartBg,
            font: { color: theme.fontColor, family: 'DM Sans, sans-serif' },
            margin: { l: 80, r: 20, t: 40, b: 40 },
            xaxis: { gridcolor: theme.gridColor, title: "ROI (€)", zerolinecolor: theme.danger },
            yaxis: { gridcolor: theme.gridColor },
            hovermode: !1
        }, { responsive: true, displayModeBar: false });

        // Scatter Chart CLV vs Score
        let tracesData = {};
        ['High', 'Mid', 'Low'].forEach(seg => {
            let segData = selected.filter(d => d.segment === seg);
            if (segData.length > 0) {
                tracesData[seg] = {
                    x: segData.map(d => d.score),
                    y: segData.map(d => d.clv),
                    mode: 'markers',
                    name: seg,
                    marker: {
                        size: segData.map(d => 10 + d.coupon * 0.5),
                        color: colors[seg],
                        opacity: 0.7,
                        line: {
                            color: isDarkMode ? '#1e293b' : '#ffffff',
                            width: 1
                        }
                    },
                    text: segData.map(d => `Client ${d.id}<br>ROI: €${Math.round(d.expected_roi)}`)
                };
            }
        });

        Plotly.newPlot('scatter-chart', Object.values(tracesData), {
            title: { text: currentLang === 'fr' ? 'CLV vs Probabilité de Churn' : 'CLV vs Churn Probability', font: { color: theme.fontColor } },
            paper_bgcolor: theme.paperBg,
            plot_bgcolor: theme.chartBg,
            font: { color: theme.fontColor, family: 'DM Sans, sans-serif' },
            margin: { l: 50, r: 20, t: 40, b: 40 },
            xaxis: { title: currentLang === 'fr' ? "Probabilité (Score)" : "Score", gridcolor: theme.gridColor },
            yaxis: { title: "CLV (€)", gridcolor: theme.gridColor },
            legend: { orientation: 'h', y: -0.2 }
        }, { responsive: true, displayModeBar: false });

        // Pareto Chart
        let cumulativeRoi = [];
        let runningSum = 0;
        selected.forEach(d => {
            runningSum += d.expected_roi;
            cumulativeRoi.push(runningSum / total_roi * 100);
        });

        let paretoBar = {
            type: 'bar',
            x: selected.map((d, i) => i + 1),
            y: selected.map(d => d.expected_roi),
            name: currentLang === 'fr' ? 'ROI Indiv.' : 'Indiv. ROI',
            marker: { color: theme.gridColor }
        };

        let paretoLine = {
            type: 'scatter',
            x: selected.map((d, i) => i + 1),
            y: cumulativeRoi,
            yaxis: 'y2',
            name: currentLang === 'fr' ? '% Cumulé' : 'Cumul %',
            mode: 'lines',
            line: { color: theme.success, width: 3 }
        };

        Plotly.newPlot('pareto-chart', [paretoBar, paretoLine], {
            title: { text: currentLang === 'fr' ? 'Distribution du ROI (Pareto)' : 'ROI Distribution (Pareto)', font: { color: theme.fontColor } },
            paper_bgcolor: theme.paperBg,
            plot_bgcolor: theme.chartBg,
            font: { color: theme.fontColor, family: 'DM Sans, sans-serif' },
            margin: { l: 50, r: 50, t: 40, b: 40 },
            xaxis: { title: "Clients", showgrid: false, gridcolor: theme.gridColor },
            yaxis: { title: "ROI (€)", showgrid: false, gridcolor: theme.gridColor },
            yaxis2: {
                title: "% Cumulé",
                overlaying: 'y',
                side: 'right',
                range: [0, 105],
                showgrid: true,
                gridcolor: theme.gridColor
            },
            legend: { orientation: 'h', y: -0.2 },
            hovermode: 'x unified'
        }, { responsive: true, displayModeBar: false });

        // Table rendering
        let tableHTML = `<table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Churn Score</th>
                    <th>CLV (€)</th>
                    <th>Segment</th>
                    <th>Action (Coupon)</th>
                    <th>Expected Net ROI</th>
                </tr>
            </thead>
            <tbody>`;

        selected.slice(0, 15).forEach(d => {
            tableHTML += `<tr>
                <td><strong>#${d.id}</strong></td>
                <td>${d.score.toFixed(3)}</td>
                <td>€ ${Math.round(d.clv).toLocaleString()}</td>
                <td><span class="badge badge-${d.segment}">${d.segment}</span></td>
                <td style="color:#3b82f6;">€ ${d.coupon.toFixed(2)}</td>
                <td style="color:${d.expected_roi >= 0 ? theme.success : theme.danger}; font-weight:bold;">€ ${d.expected_roi.toFixed(2)}</td>
            </tr>`;
        });
        tableHTML += `</tbody></table>`;
        tableWrap.innerHTML = tableHTML;
    }

    // --- Listeners ---
    scoreSlider.addEventListener('input', updateDashboard);
    budgetSlider.addEventListener('input', updateDashboard);

    segmentToggles.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Remove active class from all
            segmentToggles.forEach(t => t.classList.remove('active'));
            // Add active to clicked
            const target = e.currentTarget;
            target.classList.add('active');

            // Update state and refresh
            activeSegment = target.getAttribute('data-seg');
            updateDashboard();
        });
    });

    // Re-render charts on theme/language change if implemented in shared.js via MutationObserver or events
    const observer = new MutationObserver(() => {
        updateDashboard();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-lang'] });

    // Initial render
    updateDashboard();
}
