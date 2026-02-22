/* =========================================================
   dashboard_omnirag.js — BevCo NOVA Intelligence Dashboard
   ========================================================= */

(function () {
  'use strict';

  /* ── 0. Fetch analytics data ── */
  const DATA_URL = 'https://raw.githubusercontent.com/R-midolli/agentic_rag_pipeline/main/data/analytics.json';
  let DATA = null;

  async function init() {
    try {
      const r = await fetch(DATA_URL);
      DATA = await r.json();
    } catch (e) {
      console.warn('NOVA: Could not fetch live data, using fallback.');
      DATA = window.__NOVA_FALLBACK_DATA || null;
    }
    if (!DATA) { console.error('NOVA: No data available.'); return; }
    renderKPIs();
    renderCategoryChart();
    renderRegionChart();
    renderTrendChart();
    renderSentimentChart();
    renderChannelChart();
    renderTopProducts();
    initNova();
  }

  /* ── Helpers ── */
  const fmt = n => {
    if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return n.toLocaleString('en');
  };
  const fmtBRL = n => 'R$ ' + fmt(n);
  const isDark = () => document.documentElement.dataset.theme !== 'light';
  const textColor = () => isDark() ? '#c0c8d8' : '#4a5568';
  const gridColor = () => isDark() ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)';
  const CAT_COLORS = { refrigerante: '#5b8cff', suco: '#22d3ee', energetico: '#f59e0b', agua: '#a78bfa' };
  const REG_COLORS = { norte: '#f59e0b', nordeste: '#22d3ee', 'centro-oeste': '#a78bfa', sudeste: '#5b8cff', sul: '#ec4899' };
  const YEAR_COLORS = ['#334155', '#475569', '#64748b', '#5b8cff', '#818cf8', '#a78bfa'];
  const charts = {};

  function baseOpts() {
    return {
      backgroundColor: 'transparent',
      textStyle: { fontFamily: "'DM Sans', sans-serif", color: textColor() },
      grid: { top: 50, right: 20, bottom: 30, left: 60, containLabel: true },
      tooltip: {
        trigger: 'axis',
        backgroundColor: isDark() ? 'rgba(14,17,23,.92)' : 'rgba(255,255,255,.95)',
        borderColor: isDark() ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.08)',
        textStyle: { color: isDark() ? '#f0f2f7' : '#1a202c', fontFamily: "'DM Sans', sans-serif" }
      }
    };
  }

  /* ── 1. KPIs ── */
  function renderKPIs() {
    const k = DATA.kpis;
    setText('kpi-revenue', fmtBRL(k.total_revenue));
    setText('kpi-transactions', fmt(k.total_transactions));
    setText('kpi-products', k.unique_products);
    setText('kpi-cities', k.unique_cities);
    setText('kpi-avg-price', 'R$ ' + k.avg_price.toFixed(2));
    setText('kpi-sentiment', k.avg_sentiment > 0 ? '+' + k.avg_sentiment.toFixed(3) : k.avg_sentiment.toFixed(3));
  }
  function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }

  /* ── 2. Revenue by Category ── */
  function renderCategoryChart() {
    const el = document.getElementById('chart-category');
    if (!el) return;
    const c = echarts.init(el);
    charts.category = c;
    const d = DATA.revenue_by_category;
    c.setOption({
      ...baseOpts(),
      tooltip: { ...baseOpts().tooltip, trigger: 'item', formatter: p => `<b>${p.name}</b><br/>R$ ${fmt(p.value)}` },
      series: [{
        type: 'pie', radius: ['42%', '72%'], center: ['50%', '55%'],
        itemStyle: { borderRadius: 8, borderColor: isDark() ? '#0e1117' : '#f6f7fb', borderWidth: 3 },
        label: { color: textColor(), fontSize: 13, fontWeight: 600, formatter: '{b}\n{d}%' },
        emphasis: { label: { fontSize: 15, fontWeight: 700 } },
        data: d.map(x => ({ name: x.category.charAt(0).toUpperCase() + x.category.slice(1), value: x.revenue, itemStyle: { color: CAT_COLORS[x.category] || '#888' } }))
      }]
    });
  }

  /* ── 3. Revenue by Region ── */
  function renderRegionChart() {
    const el = document.getElementById('chart-region');
    if (!el) return;
    const c = echarts.init(el);
    charts.region = c;
    const d = DATA.revenue_by_region;
    c.setOption({
      ...baseOpts(),
      xAxis: { type: 'category', data: d.map(x => x.region.charAt(0).toUpperCase() + x.region.slice(1)), axisLabel: { color: textColor() }, axisLine: { lineStyle: { color: gridColor() } } },
      yAxis: { type: 'value', axisLabel: { color: textColor(), formatter: v => fmtBRL(v) }, splitLine: { lineStyle: { color: gridColor() } } },
      series: [{ type: 'bar', barWidth: '55%', data: d.map(x => ({ value: x.revenue, itemStyle: { color: REG_COLORS[x.region] || '#5b8cff', borderRadius: [6, 6, 0, 0] } })),
        label: { show: true, position: 'top', color: textColor(), fontSize: 11, fontWeight: 600, formatter: p => fmtBRL(p.value) }
      }]
    });
  }

  /* ── 4. Monthly Trend ── */
  function renderTrendChart() {
    const el = document.getElementById('chart-trend');
    if (!el) return;
    const c = echarts.init(el);
    charts.trend = c;
    const years = [...new Set(DATA.monthly_trend.map(x => x.year))];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    c.setOption({
      ...baseOpts(),
      legend: { data: years.map(String), textStyle: { color: textColor() }, top: 5 },
      xAxis: { type: 'category', data: months, axisLabel: { color: textColor() }, axisLine: { lineStyle: { color: gridColor() } } },
      yAxis: { type: 'value', axisLabel: { color: textColor(), formatter: v => fmtBRL(v) }, splitLine: { lineStyle: { color: gridColor() } } },
      series: years.map((yr, i) => ({
        name: String(yr), type: 'line', smooth: true, symbol: 'none',
        lineStyle: { width: yr === years[years.length - 1] ? 3 : 1.5, opacity: yr === years[years.length - 1] ? 1 : 0.5 },
        itemStyle: { color: YEAR_COLORS[i] || '#5b8cff' },
        data: DATA.monthly_trend.filter(x => x.year === yr).map(x => x.revenue)
      }))
    });
  }

  /* ── 5. Sentiment Distribution ── */
  function renderSentimentChart() {
    const el = document.getElementById('chart-sentiment');
    if (!el) return;
    const c = echarts.init(el);
    charts.sentiment = c;
    const d = DATA.sentiment_distribution;
    const colors = ['#ef4444', '#f97316', '#94a3b8', '#22d3ee', '#22c55e'];
    c.setOption({
      ...baseOpts(),
      xAxis: { type: 'category', data: d.map(x => x.bucket), axisLabel: { color: textColor(), fontSize: 11 }, axisLine: { lineStyle: { color: gridColor() } } },
      yAxis: { type: 'value', axisLabel: { color: textColor(), formatter: v => fmt(v) }, splitLine: { lineStyle: { color: gridColor() } } },
      series: [{ type: 'bar', barWidth: '60%', data: d.map((x, i) => ({ value: x.count, itemStyle: { color: colors[i], borderRadius: [6, 6, 0, 0] } })),
        label: { show: true, position: 'top', color: textColor(), fontSize: 11, fontWeight: 600, formatter: p => fmt(p.value) }
      }]
    });
  }

  /* ── 6. Channel Revenue ── */
  function renderChannelChart() {
    const el = document.getElementById('chart-channel');
    if (!el) return;
    const c = echarts.init(el);
    charts.channel = c;
    const d = DATA.revenue_by_channel;
    const chColors = ['#5b8cff', '#8b5cf6', '#22d3ee', '#f59e0b', '#ec4899', '#22c55e'];
    c.setOption({
      ...baseOpts(),
      tooltip: { ...baseOpts().tooltip, trigger: 'item' },
      series: [{
        type: 'pie', radius: ['42%', '72%'], center: ['50%', '55%'], roseType: 'radius',
        itemStyle: { borderRadius: 6, borderColor: isDark() ? '#0e1117' : '#f6f7fb', borderWidth: 2 },
        label: { color: textColor(), fontSize: 12, fontWeight: 600, formatter: '{b}\n{d}%' },
        data: d.map((x, i) => ({ name: x.channel.charAt(0).toUpperCase() + x.channel.slice(1), value: x.revenue, itemStyle: { color: chColors[i] } }))
      }]
    });
  }

  /* ── 7. Top Products Table ── */
  function renderTopProducts() {
    const el = document.getElementById('top-products-body');
    if (!el) return;
    el.innerHTML = DATA.top_products.map((p, i) => `
      <tr>
        <td style="font-weight:700;color:var(--accent);">#${i + 1}</td>
        <td>${p.product}</td>
        <td><span class="tech-tag" style="font-size:.72rem;padding:3px 8px;">${p.category}</span></td>
        <td style="font-weight:700;">R$ ${fmt(p.revenue)}</td>
        <td>${fmt(p.units)}</td>
        <td style="color:${p.avg_sentiment >= 0 ? '#22c55e' : '#ef4444'};font-weight:600;">${p.avg_sentiment >= 0 ? '+' : ''}${p.avg_sentiment.toFixed(3)}</td>
      </tr>
    `).join('');
  }

  /* ── 8. NOVA AI Assistant (Gemini Client-Side) ── */
  function initNova() {
    const form = document.getElementById('nova-form');
    const input = document.getElementById('nova-input');
    const output = document.getElementById('nova-output');
    const keyInput = document.getElementById('gemini-key');
    const suggestions = document.querySelectorAll('.nova-suggestion');

    if (!form) return;

    suggestions.forEach(btn => {
      btn.addEventListener('click', () => {
        input.value = btn.dataset.q;
        form.dispatchEvent(new Event('submit'));
      });
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const q = input.value.trim();
      const key = keyInput?.value?.trim();
      if (!q) return;
      if (!key) { output.innerHTML = '<p style="color:#f59e0b;">⚠️ Please enter your Gemini API key above.</p>'; return; }

      output.innerHTML = '<div class="nova-loading"><div class="nova-pulse"></div> NOVA is analyzing your question...</div>';

      const systemPrompt = `You are NOVA, BevCo's AI Chief Intelligence Officer. You provide sharp, data-driven answers based on the company's internal sales data. 
Always cite specific numbers. Use markdown formatting with headers, bullet points and tables when helpful. Keep responses concise (max 300 words).
If asked to generate recommendations, be specific and actionable.
The user speaks English or French — respond in the same language as the question.`;

      const payload = {
        contents: [{ parts: [{ text: `${systemPrompt}\n\n--- BEVCO INTERNAL DATA ---\n${DATA.llm_context}\n--- END DATA ---\n\nQuestion: ${q}` }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 1024 }
      };

      try {
        const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        });
        const json = await resp.json();
        const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          output.innerHTML = '<div class="nova-response">' + simpleMarkdown(text) + '</div>';
        } else {
          output.innerHTML = '<p style="color:#ef4444;">Error: ' + JSON.stringify(json?.error?.message || 'Unknown error') + '</p>';
        }
      } catch (err) {
        output.innerHTML = '<p style="color:#ef4444;">Network error: ' + err.message + '</p>';
      }
    });
  }

  /* Simple markdown renderer */
  function simpleMarkdown(md) {
    let html = md
      .replace(/^### (.+)$/gm, '<h4 style="color:var(--accent);margin:12px 0 6px;">$1</h4>')
      .replace(/^## (.+)$/gm, '<h3 style="color:var(--text);margin:16px 0 8px;">$1</h3>')
      .replace(/^# (.+)$/gm, '<h2 style="color:var(--text);margin:20px 0 10px;">$1</h2>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code style="background:rgba(91,140,255,.1);padding:2px 6px;border-radius:4px;font-size:.85em;">$1</code>')
      .replace(/^- (.+)$/gm, '<li style="margin:4px 0;padding-left:4px;">$1</li>')
      .replace(/\n\n/g, '</p><p style="margin:8px 0;line-height:1.7;">')
      .replace(/\n/g, '<br>');
    // Wrap loose <li> in <ul>
    html = html.replace(/((?:<li[^>]*>.*?<\/li>\s*)+)/g, '<ul style="margin:8px 0 8px 16px;list-style:disc;">$1</ul>');
    return '<p style="margin:8px 0;line-height:1.7;">' + html + '</p>';
  }

  /* ── 9. Resize Handler ── */
  window.addEventListener('resize', () => {
    Object.values(charts).forEach(c => c?.resize?.());
  });

  /* ── 10. Theme change: re-render ── */
  const obs = new MutationObserver(() => {
    renderCategoryChart();
    renderRegionChart();
    renderTrendChart();
    renderSentimentChart();
    renderChannelChart();
  });
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  /* Start */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
