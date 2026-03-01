/**
 * HOOPS AI — Super Admin Analytics
 */
document.addEventListener('DOMContentLoaded', () => {
  if (!requireSuperAdminAuth()) return;
  loadAnalytics();
});


async function loadAnalytics() {
  try {
    const res = await SuperAdminAPI.get('/api/super/analytics/ai-usage?days=30');
    const d = res.data;

    // Stats cards
    const t = d.totals;
    document.getElementById('statCalls').textContent = t.total_calls.toLocaleString();
    document.getElementById('statTokensIn').textContent = formatTokens(t.total_tokens_in);
    document.getElementById('statTokensOut').textContent = formatTokens(t.total_tokens_out);
    document.getElementById('statCost').textContent = '$' + t.total_cost.toFixed(2);

    renderByAgent(d.by_agent);
    renderDailyTrend(d.daily);
  } catch (err) {
    // handled by API wrapper
  }
}


function renderByAgent(agents) {
  const el = document.getElementById('byAgentContent');
  if (!agents || !agents.length) {
    el.innerHTML = '<div class="empty-state"><span class="material-symbols-outlined">smart_toy</span>No AI usage data yet</div>';
    return;
  }

  const maxCalls = Math.max(...agents.map(a => a.calls));

  el.innerHTML = agents.map(a => {
    const pct = maxCalls > 0 ? Math.round(a.calls / maxCalls * 100) : 0;
    const name = (a.agent || 'unknown').replace(/_/g, ' ');
    return `
      <div style="padding:var(--sp-2) 0;border-bottom:1px solid var(--border);">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
          <span style="text-transform:capitalize;font-weight:500;">${esc(name)}</span>
          <span class="text-muted text-sm">${a.calls} ${a.calls === 1 ? 'call' : 'calls'} · ${formatTokens(a.tokens_in + a.tokens_out)} tokens · $${a.cost.toFixed(3)}</span>
        </div>
        <div style="height:4px;background:var(--bg-card);border-radius:2px;">
          <div style="height:100%;width:${pct}%;background:var(--primary);border-radius:2px;"></div>
        </div>
      </div>
    `;
  }).join('');
}


function renderDailyTrend(daily) {
  const el = document.getElementById('dailyTrendContent');
  if (!daily || !daily.length) {
    el.innerHTML = '<div class="empty-state"><span class="material-symbols-outlined">trending_up</span>No daily data yet</div>';
    return;
  }

  const maxCalls = Math.max(...daily.map(d => d.calls));

  el.innerHTML = `
    <div style="display:flex;align-items:flex-end;gap:2px;height:120px;padding:var(--sp-2) 0;">
      ${daily.map(d => {
        const h = maxCalls > 0 ? Math.max(4, Math.round(d.calls / maxCalls * 100)) : 4;
        return `<div title="${d.date}: ${d.calls} calls" style="flex:1;height:${h}%;background:var(--primary);border-radius:2px 2px 0 0;min-width:4px;"></div>`;
      }).join('')}
    </div>
    <div style="display:flex;justify-content:space-between;padding-top:var(--sp-1);">
      <span class="text-sm text-muted">${daily[0].date}</span>
      <span class="text-sm text-muted">${daily[daily.length - 1].date}</span>
    </div>
  `;
}


function formatTokens(n) {
  if (!n) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}
