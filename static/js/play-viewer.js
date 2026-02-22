/**
 * HOOPS AI - Play Viewer (Read-Only)
 * Renders basketball plays with animation playback. No editing.
 */
const PV_OFFENSE = {
  'empty':{name:'Empty',players:[{id:'o1',number:'1',x:50,y:78,type:'offense'},{id:'o2',number:'2',x:30,y:78,type:'offense'},{id:'o3',number:'3',x:70,y:78,type:'offense'},{id:'o4',number:'4',x:40,y:70,type:'offense'},{id:'o5',number:'5',x:60,y:70,type:'offense'}]},
  '5-out':{name:'5-Out',players:[{id:'o1',number:'1',x:50,y:75,type:'offense'},{id:'o2',number:'2',x:15,y:52,type:'offense'},{id:'o3',number:'3',x:85,y:52,type:'offense'},{id:'o4',number:'4',x:8,y:15,type:'offense'},{id:'o5',number:'5',x:92,y:15,type:'offense'}]},
  '4-out-1-in':{name:'4-Out 1-In',players:[{id:'o1',number:'1',x:62,y:58,type:'offense'},{id:'o2',number:'2',x:8,y:15,type:'offense'},{id:'o3',number:'3',x:92,y:15,type:'offense'},{id:'o4',number:'4',x:25,y:55,type:'offense'},{id:'o5',number:'5',x:50,y:18,type:'offense'}]},
  'horns':{name:'Horns',players:[{id:'o1',number:'1',x:50,y:75,type:'offense'},{id:'o2',number:'2',x:8,y:15,type:'offense'},{id:'o3',number:'3',x:92,y:15,type:'offense'},{id:'o4',number:'4',x:35,y:45,type:'offense'},{id:'o5',number:'5',x:65,y:45,type:'offense'}]},
  'box':{name:'Box',players:[{id:'o1',number:'1',x:50,y:82,type:'offense'},{id:'o2',number:'2',x:35,y:38,type:'offense'},{id:'o3',number:'3',x:65,y:38,type:'offense'},{id:'o4',number:'4',x:35,y:18,type:'offense'},{id:'o5',number:'5',x:65,y:18,type:'offense'}]},
  '1-4-high':{name:'1-4 High',players:[{id:'o1',number:'1',x:50,y:75,type:'offense'},{id:'o2',number:'2',x:8,y:45,type:'offense'},{id:'o3',number:'3',x:92,y:45,type:'offense'},{id:'o4',number:'4',x:35,y:45,type:'offense'},{id:'o5',number:'5',x:65,y:45,type:'offense'}]},
};
const PV_DEFENSE = {
  'none':{name:'No Defense',players:[]},
  'man':{name:'Man-to-Man',players:[{id:'d1',number:'X1',x:50,y:72,type:'defense'},{id:'d2',number:'X2',x:18,y:52,type:'defense'},{id:'d3',number:'X3',x:82,y:52,type:'defense'},{id:'d4',number:'X4',x:30,y:28,type:'defense'},{id:'d5',number:'X5',x:70,y:28,type:'defense'}]},
  '23':{name:'2-3 Zone',players:[{id:'d1',number:'X1',x:35,y:62,type:'defense'},{id:'d2',number:'X2',x:65,y:62,type:'defense'},{id:'d3',number:'X3',x:20,y:32,type:'defense'},{id:'d4',number:'X4',x:50,y:25,type:'defense'},{id:'d5',number:'X5',x:80,y:32,type:'defense'}]},
  '32':{name:'3-2 Zone',players:[{id:'d1',number:'X1',x:50,y:65,type:'defense'},{id:'d2',number:'X2',x:25,y:55,type:'defense'},{id:'d3',number:'X3',x:75,y:55,type:'defense'},{id:'d4',number:'X4',x:35,y:25,type:'defense'},{id:'d5',number:'X5',x:65,y:25,type:'defense'}]},
};
const PV_ACTIONS = {
  pass:{name:'Pass',color:'#FBBF24',move:false,ball:true},
  dribble:{name:'Dribble',color:'#34D399',move:true,ball:true},
  cut:{name:'Cut',color:'#F472B6',move:true,ball:false},
  screen:{name:'Screen',color:'#FB923C',move:true,ball:false},
  handoff:{name:'Handoff',color:'#A78BFA',move:true,ball:true},
  shot:{name:'Shot',color:'#F87171',move:false,ball:false},
};

class PlayViewer {
  constructor(container, data, opts = {}) {
    this.el = container;
    this.initPlayers = data.players || [];
    this.actions = data.actions || [];
    this.initBallId = data.ball_holder_id || null;
    this.offTpl = data.offense_template || 'empty';
    this.defTpl = data.defense_template || 'none';
    this.playing = false;
    this.progress = 0;
    this.duration = 0;
    this.animId = null;
    this.staticMode = opts.static || false;

    // Compute final player positions from actions
    this.players = JSON.parse(JSON.stringify(this.initPlayers));
    this.ballId = this.initBallId;
    for (const a of this.actions) {
      if (PV_ACTIONS[a.type]?.move) {
        const p = this.players.find(x => x.id === a.pid);
        if (p) { p.x = a.ex; p.y = a.ey; }
      }
      if ((a.type === 'pass' || a.type === 'handoff') && a.pid === this.ballId) {
        const o = this.players.filter(p => p.type === 'offense' && p.id !== a.pid);
        let c = null, d = 1e9;
        for (const p of o) { const dd = Math.hypot(p.x - a.ex, p.y - a.ey); if (dd < d) { d = dd; c = p; } }
        if (c) this.ballId = c.id;
      }
    }

    this._calcDur();
    this._render();
  }

  _calcDur() {
    this.duration = this.actions.length > 0 ? Math.max(...this.actions.map(a => a.t + 1.5)) : 0;
  }

  _bez(sx, sy, cx, cy, ex, ey, t) {
    const m = 1 - t;
    return { x: m*m*sx + 2*m*t*cx + t*t*ex, y: m*m*sy + 2*m*t*cy + t*t*ey };
  }

  _ppos(p) {
    const i = this.initPlayers.find(x => x.id === p.id);
    if (!i) return null;
    let x = i.x, y = i.y;
    for (const a of this.actions.filter(a => a.pid === p.id && PV_ACTIONS[a.type]?.move)) {
      const end = a.t + 1.2;
      if (this.progress >= end) { x = a.ex; y = a.ey; }
      else if (this.progress > a.t) {
        const t = (this.progress - a.t) / 1.2;
        const e = t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2) / 2;
        const ccx = a.cx ?? (a.sx + a.ex) / 2, ccy = a.cy ?? (a.sy + a.ey) / 2;
        if (a.cx !== undefined) {
          const pt = this._bez(a.sx, a.sy, ccx, ccy, a.ex, a.ey, e);
          x = pt.x; y = pt.y;
        } else {
          const dx = a.ex - a.sx, dy = a.ey - a.sy, d = Math.hypot(dx, dy);
          x = a.sx + dx*e + (-dy/d) * Math.sin(e*Math.PI) * d * 0.12;
          y = a.sy + dy*e + (dx/d) * Math.sin(e*Math.PI) * d * 0.12;
        }
      }
    }
    return { x, y };
  }

  _bpos() {
    if (!this.initBallId) return null;
    if (this.staticMode) {
      const h = this.players.find(p => p.id === this.ballId);
      return h ? { x: h.x, y: h.y } : null;
    }
    let holder = this.initBallId, bx = null, by = null, mv = false;
    const pp = (id, at) => {
      const i = this.initPlayers.find(p => p.id === id);
      if (!i) return null;
      let x = i.x, y = i.y;
      for (const a of this.actions.filter(a => a.pid === id && PV_ACTIONS[a.type]?.move && a.t + 1.2 <= at)) {
        x = a.ex; y = a.ey;
      }
      return { x, y };
    };
    for (const a of this.actions) {
      const st = a.t, en = st + 1.2;
      if (a.type === 'pass' && a.pid === holder) {
        if (this.progress >= st && this.progress < en) {
          const t = (this.progress - st) / 1.2;
          const f = pp(a.pid, st);
          if (f) { bx = f.x + (a.ex - f.x)*t; by = f.y + (a.ey - f.y)*t; mv = true; }
        } else if (this.progress >= en) {
          const o = this.players.filter(p => p.type === 'offense' && p.id !== a.pid);
          let c = null, d = 1e9;
          for (const p of o) { const q = pp(p.id, st); if (q) { const dd = Math.hypot(q.x - a.ex, q.y - a.ey); if (dd < d) { d = dd; c = p; } } }
          if (c) holder = c.id;
        }
      } else if ((a.type === 'dribble' || a.type === 'handoff') && a.pid === holder) {
        if (this.progress >= st && this.progress < en) {
          const t = (this.progress - st) / 1.2;
          const e = t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2) / 2;
          const cx = a.cx ?? (a.sx + a.ex) / 2, cy = a.cy ?? (a.sy + a.ey) / 2;
          if (a.cx !== undefined) {
            const pt = this._bez(a.sx, a.sy, cx, cy, a.ex, a.ey, e);
            bx = pt.x; by = pt.y;
          } else {
            const dx = a.ex - a.sx, dy = a.ey - a.sy, dd = Math.hypot(dx, dy);
            bx = a.sx + dx*e + (-dy/dd)*Math.sin(e*Math.PI)*dd*0.12;
            by = a.sy + dy*e + (dx/dd)*Math.sin(e*Math.PI)*dd*0.12;
          }
          mv = true;
        } else if (this.progress >= en && a.type === 'handoff') {
          const o = this.players.filter(p => p.type === 'offense' && p.id !== a.pid);
          let c = null, d = 1e9;
          for (const p of o) { const q = pp(p.id, en); if (q) { const dd = Math.hypot(q.x - a.ex, q.y - a.ey); if (dd < d) { d = dd; c = p; } } }
          if (c) holder = c.id;
        }
      } else if (a.type === 'shot' && a.pid === holder && this.progress >= st) {
        if (this.progress < en) {
          const t = (this.progress - st) / 1.2;
          bx = a.sx + (a.ex - a.sx)*t;
          by = a.sy + (a.ey - a.sy)*t - Math.sin(t*Math.PI)*15;
          mv = true;
        } else return { x: 50, y: 7 };
      }
    }
    if (!mv) { const h2 = pp(holder, this.progress); if (h2) { bx = h2.x; by = h2.y; } }
    return bx !== null ? { x: bx, y: by } : null;
  }

  _line(a, p) {
    const { type, sx, sy, ex, ey, cx, cy } = a;
    const dx = ex - sx, dy = ey - sy, dist = Math.hypot(dx, dy);
    if (dist < 2) return '';
    const col = PV_ACTIONS[type]?.color || '#fff';
    const hc = cx !== undefined && cy !== undefined;
    const cX = cx ?? (sx + ex) / 2, cY = cy ?? (sy + ey) / 2;
    let h = '<g>';
    if (type === 'screen') {
      const ang = Math.atan2(ey - sy, ex - sx), pa = ang + Math.PI / 2;
      const ep = hc ? this._bez(sx, sy, cX, cY, ex, ey, p) : { x: sx + dx*p, y: sy + dy*p };
      if (hc) h += '<path d="M '+sx+' '+sy+' Q '+cX+' '+cY+' '+ep.x+' '+ep.y+'" fill="none" stroke="'+col+'" stroke-width="0.6"/>';
      else h += '<line x1="'+sx+'" y1="'+sy+'" x2="'+ep.x+'" y2="'+ep.y+'" stroke="'+col+'" stroke-width="0.6"/>';
      h += '<line x1="'+(ep.x-3*Math.cos(pa))+'" y1="'+(ep.y-3*Math.sin(pa))+'" x2="'+(ep.x+3*Math.cos(pa))+'" y2="'+(ep.y+3*Math.sin(pa))+'" stroke="'+col+'" stroke-width="1" stroke-linecap="round"/>';
    } else if (type === 'shot') {
      const ep = { x: sx + dx*p, y: sy + dy*p };
      h += '<line x1="'+sx+'" y1="'+sy+'" x2="'+ep.x+'" y2="'+ep.y+'" stroke="'+col+'" stroke-width="0.5" stroke-dasharray="1.5,0.8"/>';
      if (p === 1) h += '<circle cx="'+ep.x+'" cy="'+ep.y+'" r="1.5" fill="none" stroke="'+col+'" stroke-width="0.4"/>';
    } else {
      const ep = hc ? this._bez(sx, sy, cX, cY, ex, ey, p) : { x: sx + dx*p, y: sy + dy*p };
      const da = type === 'pass' ? 'stroke-dasharray="2,1"' : type === 'dribble' ? 'stroke-dasharray="1,0.5"' : '';
      if (hc) h += '<path d="M '+sx+' '+sy+' Q '+cX+' '+cY+' '+ep.x+' '+ep.y+'" fill="none" stroke="'+col+'" stroke-width="0.6" '+da+'/>';
      else h += '<line x1="'+sx+'" y1="'+sy+'" x2="'+ep.x+'" y2="'+ep.y+'" stroke="'+col+'" stroke-width="0.6" '+da+'/>';
      if (p === 1) {
        const ang = hc ? Math.atan2(ep.y - cY, ep.x - cX) : Math.atan2(dy, dx);
        h += '<polygon points="'+ep.x+','+ep.y+' '+(ep.x-2*Math.cos(ang-0.4))+','+(ep.y-2*Math.sin(ang-0.4))+' '+(ep.x-2*Math.cos(ang+0.4))+','+(ep.y-2*Math.sin(ang+0.4))+'" fill="'+col+'"/>';
      }
    }
    h += '</g>';
    return h;
  }

  _svg() {
    const svg = this.el.querySelector('.pv-svg');
    if (!svg) return;
    const isAnim = !this.staticMode;

    // Court
    let h = '<defs>'
      +'<pattern id="pvWood" patternUnits="userSpaceOnUse" width="8" height="88">'
      +'<rect width="8" height="88" fill="#C17F4E"/>'
      +'<rect x="0" y="0" width="8" height="88" fill="#B8733F" opacity="0.3"/>'
      +'<line x1="0" y1="0" x2="0" y2="88" stroke="#A05A2C" stroke-width="0.3" opacity="0.4"/>'
      +'<line x1="4" y1="0" x2="4" y2="88" stroke="#D4956A" stroke-width="0.2" opacity="0.3"/>'
      +'<rect x="1" y="5" width="6" height="0.5" fill="#A05A2C" opacity="0.15"/>'
      +'<rect x="2" y="20" width="4" height="0.3" fill="#D4956A" opacity="0.1"/>'
      +'<rect x="0" y="35" width="8" height="0.4" fill="#A05A2C" opacity="0.12"/>'
      +'<rect x="1" y="50" width="5" height="0.3" fill="#D4956A" opacity="0.08"/>'
      +'<rect x="3" y="65" width="3" height="0.5" fill="#A05A2C" opacity="0.1"/>'
      +'<rect x="0" y="80" width="7" height="0.3" fill="#D4956A" opacity="0.12"/>'
      +'<line x1="2" y1="0" x2="2" y2="88" stroke="#A05A2C" stroke-width="0.15" opacity="0.2"/>'
      +'<line x1="6" y1="0" x2="6" y2="88" stroke="#D4956A" stroke-width="0.15" opacity="0.15"/>'
      +'</pattern>'
      +'<linearGradient id="pvPaint" x1="0%" y1="0%" x2="0%" y2="100%">'
      +'<stop offset="0%" stop-color="#1E3A5F" stop-opacity="0.15"/>'
      +'<stop offset="100%" stop-color="#1E3A5F" stop-opacity="0.05"/>'
      +'</linearGradient></defs>';

    h += '<rect width="100" height="88" fill="#C8844A"/>';
    h += '<rect width="100" height="88" fill="url(#pvWood)"/>';
    h += '<rect x="0" y="0" width="100" height="44" fill="url(#pvPaint)" opacity="0.3"/>';
    h += '<rect x="31" y="2" width="38" height="38" fill="#1E3A5F" opacity="0.08"/>';

    // Court lines
    h += '<rect x="2" y="2" width="96" height="84" fill="none" stroke="#FFFFFF" stroke-width="0.8"/>';
    h += '<path d="M 7 2 L 7 16 C 7 38 25 57 50 57 C 75 57 93 38 93 16 L 93 2" fill="none" stroke="#FFFFFF" stroke-width="0.6" stroke-linejoin="round"/>';
    h += '<rect x="31" y="2" width="38" height="38" fill="none" stroke="#FFFFFF" stroke-width="0.6"/>';
    h += '<line x1="29" y1="14" x2="31" y2="14" stroke="#FFFFFF" stroke-width="0.4"/>';
    h += '<line x1="29" y1="22" x2="31" y2="22" stroke="#FFFFFF" stroke-width="0.4"/>';
    h += '<line x1="29" y1="30" x2="31" y2="30" stroke="#FFFFFF" stroke-width="0.4"/>';
    h += '<line x1="69" y1="14" x2="71" y2="14" stroke="#FFFFFF" stroke-width="0.4"/>';
    h += '<line x1="69" y1="22" x2="71" y2="22" stroke="#FFFFFF" stroke-width="0.4"/>';
    h += '<line x1="69" y1="30" x2="71" y2="30" stroke="#FFFFFF" stroke-width="0.4"/>';
    h += '<circle cx="50" cy="40" r="12" fill="none" stroke="#FFFFFF" stroke-width="0.5"/>';
    h += '<path d="M 38 40 A 12 12 0 0 0 62 40" fill="none" stroke="#FFFFFF" stroke-width="0.5" stroke-dasharray="2,2"/>';
    h += '<path d="M 42 2 A 8 8 0 0 0 58 2" fill="none" stroke="#FFFFFF" stroke-width="0.5"/>';
    h += '<rect x="44" y="2.5" width="12" height="1" fill="#FFFFFF" opacity="0.9"/>';
    h += '<rect x="44" y="2.5" width="12" height="1" fill="none" stroke="#333" stroke-width="0.2"/>';
    h += '<circle cx="50" cy="6" r="1.5" fill="none" stroke="#FF5722" stroke-width="0.5"/>';
    h += '<line x1="50" y1="3.5" x2="50" y2="4.5" stroke="#888" stroke-width="0.3"/>';
    h += '<path d="M 48.5 6 Q 50 9 51.5 6" fill="none" stroke="#FFFFFF" stroke-width="0.2" opacity="0.5"/>';
    h += '<line x1="2" y1="86" x2="98" y2="86" stroke="#FFFFFF" stroke-width="0.4" opacity="0.6"/>';
    h += '<path d="M 38 86 A 12 12 0 0 1 62 86" fill="none" stroke="#FFFFFF" stroke-width="0.4" opacity="0.6"/>';

    // Action lines
    if (isAnim) {
      this.actions.forEach(a => {
        if (this.progress < a.t) return;
        const p = Math.min(1, (this.progress - a.t) / 1.2);
        h += this._line(a, p);
      });
    } else {
      this.actions.forEach(a => { h += this._line(a, 1); });
    }

    // Players
    const ps = isAnim ? this.initPlayers : this.players;
    ps.forEach(p => {
      const pos = isAnim ? (this._ppos(p) || p) : p;
      const f = p.type === 'offense' ? '#3B82F6' : '#EF4444';
      h += '<circle cx="'+pos.x+'" cy="'+pos.y+'" r="4.5" fill="'+f+'" stroke="#fff" stroke-width="0.5"/>';
      h += '<text x="'+pos.x+'" y="'+pos.y+'" text-anchor="middle" dominant-baseline="central" fill="#fff" font-size="3" font-weight="700" font-family="Space Grotesk,sans-serif">'+p.number+'</text>';
    });

    // Basketball
    const bp = this._bpos();
    if (bp) {
      const bx = bp.x, by = bp.y - 6;
      h += '<ellipse cx="'+bx+'" cy="'+(bp.y-1)+'" rx="2" ry="0.6" fill="#000" opacity="0.15"/>';
      h += '<circle cx="'+bx+'" cy="'+by+'" r="2.8" fill="#F97316" stroke="#C2410C" stroke-width="0.4"/>';
      h += '<path d="M '+(bx-2.8)+' '+by+' Q '+bx+' '+(by-2)+' '+(bx+2.8)+' '+by+'" fill="none" stroke="#C2410C" stroke-width="0.3"/>';
      h += '<line x1="'+bx+'" y1="'+(by-2.8)+'" x2="'+bx+'" y2="'+(by+2.8)+'" stroke="#C2410C" stroke-width="0.3"/>';
    }

    svg.innerHTML = h;
  }

  _render() {
    if (this.staticMode) {
      this.el.innerHTML = '<div class="pv-canvas-wrap"><svg class="pv-svg" viewBox="0 0 100 88" preserveAspectRatio="xMidYMid meet"></svg></div>';
      this._svg();
      return;
    }
    const pct = this.duration > 0 ? (this.progress / this.duration * 100) : 0;
    this.el.innerHTML = '<div class="pv">'
      + '<div class="pv-canvas-wrap"><svg class="pv-svg" viewBox="0 0 100 88" preserveAspectRatio="xMidYMid meet"></svg></div>'
      + '<div class="pv-controls">'
      + '<button class="btn-icon pv-btn" data-pv="stop"><span class="material-symbols-outlined">replay</span></button>'
      + '<button class="btn-icon pv-btn" data-pv="' + (this.playing ? 'pause' : 'play') + '"><span class="material-symbols-outlined">' + (this.playing ? 'pause' : 'play_arrow') + '</span></button>'
      + '<div class="pv-progress" id="pvProg"><div class="pv-progress-fill" style="width:'+pct+'%"></div><div class="pv-progress-thumb" style="left:'+pct+'%"></div></div>'
      + '<span class="pv-tm">' + this.progress.toFixed(1) + 's / ' + this.duration.toFixed(1) + 's</span>'
      + '</div></div>';
    this._bindEv();
    this._svg();
  }

  _ctrl() {
    const f = this.el.querySelector('.pv-progress-fill');
    const th = this.el.querySelector('.pv-progress-thumb');
    const tm = this.el.querySelector('.pv-tm');
    if (f && this.duration > 0) {
      const p = (this.progress / this.duration * 100) + '%';
      f.style.width = p;
      if (th) th.style.left = p;
    }
    if (tm) tm.textContent = this.progress.toFixed(1) + 's / ' + this.duration.toFixed(1) + 's';
  }

  _bindEv() {
    this.el.querySelectorAll('[data-pv]').forEach(b => {
      b.addEventListener('click', () => {
        const a = b.dataset.pv;
        if (a === 'play') this.play();
        else if (a === 'pause') this.pause();
        else if (a === 'stop') this.stop();
      });
    });
    const prog = this.el.querySelector('#pvProg');
    if (prog) {
      prog.addEventListener('click', e => {
        const r = prog.getBoundingClientRect();
        this.progress = ((e.clientX - r.left) / r.width) * this.duration;
        this._svg();
        this._ctrl();
      });
    }
  }

  play() {
    if (this.playing) return;
    this.playing = true;
    if (this.progress >= this.duration) this.progress = 0;
    this._as = performance.now() - this.progress * 1000;
    this._updatePlayBtn();
    this._aloop();
  }

  _aloop() {
    if (!this.playing) return;
    const t = (performance.now() - this._as) / 1000;
    if (t >= this.duration) {
      this.progress = this.duration;
      this.playing = false;
      this._svg();
      this._ctrl();
      this._updatePlayBtn();
      return;
    }
    this.progress = t;
    this._svg();
    this._ctrl();
    this.animId = requestAnimationFrame(() => this._aloop());
  }

  pause() {
    this.playing = false;
    if (this.animId) cancelAnimationFrame(this.animId);
    this._updatePlayBtn();
  }

  stop() {
    this.pause();
    this.progress = 0;
    this._svg();
    this._ctrl();
  }

  _updatePlayBtn() {
    const btn = this.el.querySelector('[data-pv="play"], [data-pv="pause"]');
    if (btn) {
      btn.dataset.pv = this.playing ? 'pause' : 'play';
      btn.innerHTML = '<span class="material-symbols-outlined">' + (this.playing ? 'pause' : 'play_arrow') + '</span>';
      // Re-bind
      btn.onclick = () => this.playing ? this.pause() : this.play();
    }
  }

  destroy() {
    this.pause();
    this.el.innerHTML = '';
  }
}
