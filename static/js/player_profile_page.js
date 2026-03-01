/**
 * HOOPS AI - Coach Player Profile Page
 * Loads player profile and renders using shared renderPlayerProfile()
 */
document.addEventListener('DOMContentLoaded', async () => {
  const el = document.getElementById('profilePageContent');
  try {
    const r = await API.get(`/api/players/${PLAYER_ID}/profile`);
    if (!r.data) {
      el.innerHTML = '<div class="empty-state"><span class="material-symbols-outlined">person_off</span><h3>Player not found</h3></div>';
      return;
    }
    const name = r.data.player?.name || '';
    el.innerHTML = `<h2 style="margin-bottom:var(--sp-4);font-size:var(--text-xl);">${name}</h2>` + renderPlayerProfile(r.data);
  } catch {
    el.innerHTML = '<div class="empty-state"><span class="material-symbols-outlined">error</span><p>Failed to load player profile</p></div>';
  }
});
