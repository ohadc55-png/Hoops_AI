/**
 * HOOPS AI - Basketball Play Creator (Vanilla JS)
 * Full play diagramming with animation, bezier curves, templates.
 */
const OFFENSE = {
  'empty':{nameKey:'plays.offense.empty',players:[{id:'o1',number:'1',x:50,y:78,type:'offense'},{id:'o2',number:'2',x:30,y:78,type:'offense'},{id:'o3',number:'3',x:70,y:78,type:'offense'},{id:'o4',number:'4',x:40,y:70,type:'offense'},{id:'o5',number:'5',x:60,y:70,type:'offense'}]},
  '5-out':{nameKey:'plays.offense.5_out',players:[{id:'o1',number:'1',x:50,y:75,type:'offense'},{id:'o2',number:'2',x:15,y:52,type:'offense'},{id:'o3',number:'3',x:85,y:52,type:'offense'},{id:'o4',number:'4',x:8,y:15,type:'offense'},{id:'o5',number:'5',x:92,y:15,type:'offense'}]},
  '4-out-1-in':{nameKey:'plays.offense.4_out_1_in',players:[{id:'o1',number:'1',x:62,y:58,type:'offense'},{id:'o2',number:'2',x:8,y:15,type:'offense'},{id:'o3',number:'3',x:92,y:15,type:'offense'},{id:'o4',number:'4',x:25,y:55,type:'offense'},{id:'o5',number:'5',x:50,y:18,type:'offense'}]},
  'horns':{nameKey:'plays.offense.horns',players:[{id:'o1',number:'1',x:50,y:75,type:'offense'},{id:'o2',number:'2',x:8,y:15,type:'offense'},{id:'o3',number:'3',x:92,y:15,type:'offense'},{id:'o4',number:'4',x:35,y:45,type:'offense'},{id:'o5',number:'5',x:65,y:45,type:'offense'}]},
  'box':{nameKey:'plays.offense.box',players:[{id:'o1',number:'1',x:50,y:82,type:'offense'},{id:'o2',number:'2',x:35,y:38,type:'offense'},{id:'o3',number:'3',x:65,y:38,type:'offense'},{id:'o4',number:'4',x:35,y:18,type:'offense'},{id:'o5',number:'5',x:65,y:18,type:'offense'}]},
  '1-4-high':{nameKey:'plays.offense.1_4_high',players:[{id:'o1',number:'1',x:50,y:75,type:'offense'},{id:'o2',number:'2',x:8,y:45,type:'offense'},{id:'o3',number:'3',x:92,y:45,type:'offense'},{id:'o4',number:'4',x:35,y:45,type:'offense'},{id:'o5',number:'5',x:65,y:45,type:'offense'}]},
};
const DEFENSE = {
  'none':{nameKey:'plays.defense.none',players:[]},
  'man':{nameKey:'plays.defense.man',players:[{id:'d1',number:'X1',x:50,y:72,type:'defense'},{id:'d2',number:'X2',x:18,y:52,type:'defense'},{id:'d3',number:'X3',x:82,y:52,type:'defense'},{id:'d4',number:'X4',x:30,y:28,type:'defense'},{id:'d5',number:'X5',x:70,y:28,type:'defense'}]},
  '23':{nameKey:'plays.defense.23',players:[{id:'d1',number:'X1',x:35,y:62,type:'defense'},{id:'d2',number:'X2',x:65,y:62,type:'defense'},{id:'d3',number:'X3',x:20,y:32,type:'defense'},{id:'d4',number:'X4',x:50,y:25,type:'defense'},{id:'d5',number:'X5',x:80,y:32,type:'defense'}]},
  '32':{nameKey:'plays.defense.32',players:[{id:'d1',number:'X1',x:50,y:65,type:'defense'},{id:'d2',number:'X2',x:25,y:55,type:'defense'},{id:'d3',number:'X3',x:75,y:55,type:'defense'},{id:'d4',number:'X4',x:35,y:25,type:'defense'},{id:'d5',number:'X5',x:65,y:25,type:'defense'}]},
};
const ACTIONS = {
  pass:{nameKey:'plays.action.pass',icon:'⤳',color:'#FBBF24',move:false,ball:true},
  dribble:{nameKey:'plays.action.dribble',icon:'〰',color:'#34D399',move:true,ball:true},
  cut:{nameKey:'plays.action.cut',icon:'→',color:'#F472B6',move:true,ball:false},
  screen:{nameKey:'plays.action.screen',icon:'⊥',color:'#FB923C',move:true,ball:false},
  handoff:{nameKey:'plays.action.handoff',icon:'⇌',color:'#A78BFA',move:true,ball:true},
  shot:{nameKey:'plays.action.shot',icon:'◎',color:'#F87171',move:false,ball:false},
};
const uid=()=>Math.random().toString(36).substr(2,9);
const clamp=(v,a,b)=>Math.min(Math.max(v,a),b);
const deep=(o)=>JSON.parse(JSON.stringify(o));

class PlayCreator {
  constructor(container){
    this.el=container;
    this.players=[];this.initPlayers=[];this.actions=[];
    this.selPlayer=null;this.selAction=null;this.dragPlayer=null;
    this.drawing=false;this.curAction=null;
    this.mode='edit';this.playing=false;this.progress=0;this.duration=0;
    this.offTpl='5-out';this.defTpl='none';this.showTpl=true;
    this.saved=[];this.actTime=0;this.ballId=null;this.initBallId=null;this.showBall=false;
    this.editingCurve=null;this.draggingControl=false;
    this.parallelMode=false;this.parallelStart=null;
    this.positioningPhase=false;this.selectedStep=null;this.animId=null;
    this.shareUrl='';this.showShareModal=false;
    this.showConfirmModal=false;this.pendingLoad=null;
    this.showNewConfirm=false;this._currentPlayName=null;
    this.myTeams=[];this.showTeamPicker=null;this._lastSharedPlay=false;
    try{const s=localStorage.getItem('hoops_plays');if(s)this.saved=JSON.parse(s);}catch(e){}
    this.render();
    this._loadServerData();
    // Load from shared URL
    const params=new URLSearchParams(window.location.search);
    const shared=params.get('p');
    if(shared){try{const d=JSON.parse(decodeURIComponent(atob(shared)));this.loadPlay({o:d.o,d:d.d,i:d.i,a:d.a,b:d.b});window.history.replaceState({},'',window.location.pathname);}catch(e){if(typeof Toast!=='undefined')Toast.error(t('plays.toast.invalid_link'));}}
    document.addEventListener('keydown',e=>{if(e.key==='Shift'){this.parallelMode=true;this._updateUI();}if(e.key==='z'&&(e.ctrlKey||e.metaKey)){e.preventDefault();this.undo();}});
    document.addEventListener('keyup',e=>{if(e.key==='Shift'){this.parallelMode=false;this._updateUI();}});
  }
  async _loadServerData(){
    if(typeof API==='undefined'||!API.token)return;
    try{
      const [teamsRes,playsRes]=await Promise.all([API.get('/api/plays/my-teams'),API.get('/api/plays')]);
      this.myTeams=(teamsRes.data||[]);
      const serverPlays=playsRes.data||[];
      // Merge server IDs + share status into localStorage plays
      for(const sp of serverPlays){
        const local=this.saved.find(s=>s.name===sp.name);
        if(local){local.serverId=sp.id;local.shared=sp.shared_with_team;local.teamId=sp.team_id;}
        else{this.saved.push({id:sp.id.toString(),name:sp.name,o:sp.offense_template,d:sp.defense_template,i:sp.players||[],a:sp.actions||[],b:sp.ball_holder_id,serverId:sp.id,shared:sp.shared_with_team,teamId:sp.team_id});}
      }
      this._save();this.render();
    }catch(e){}
  }
  _updateUI(){const b=this.el.querySelector('.pc-parallel-indicator');if(b)b.style.display=this.parallelMode?'inline-flex':'none';}
  _save(){localStorage.setItem('hoops_plays',JSON.stringify(this.saved));}
  _calcDur(){this.duration=this.actions.length>0?Math.max(...this.actions.map(a=>a.t+1.5)):0;}
  _getXY(e){const svg=this.el.querySelector('.pc-svg');if(!svg)return null;const pt=svg.createSVGPoint();pt.x=e.touches?.[0]?.clientX??e.clientX;pt.y=e.touches?.[0]?.clientY??e.clientY;const ctm=svg.getScreenCTM();if(!ctm)return null;const s=pt.matrixTransform(ctm.inverse());return{x:clamp(s.x,4,96),y:clamp(s.y,4,84)};}
  _bez(sx,sy,cx,cy,ex,ey,t){const m=1-t;return{x:m*m*sx+2*m*t*cx+t*t*ex,y:m*m*sy+2*m*t*cy+t*t*ey};}
  _ppos(p){if(this.mode!=='play')return null;const i=this.initPlayers.find(x=>x.id===p.id);if(!i)return null;let x=i.x,y=i.y;for(const a of this.actions.filter(a=>a.pid===p.id&&ACTIONS[a.type]?.move)){const end=a.t+1.2;if(this.progress>=end){x=a.ex;y=a.ey;}else if(this.progress>a.t){const t=(this.progress-a.t)/1.2;const e=t<0.5?2*t*t:1-Math.pow(-2*t+2,2)/2;const ccx=a.cx??(a.sx+a.ex)/2,ccy=a.cy??(a.sy+a.ey)/2;if(a.cx!==undefined){const pt=this._bez(a.sx,a.sy,ccx,ccy,a.ex,a.ey,e);x=pt.x;y=pt.y;}else{const dx=a.ex-a.sx,dy=a.ey-a.sy,d=Math.hypot(dx,dy);x=a.sx+dx*e+(-dy/d)*Math.sin(e*Math.PI)*d*0.12;y=a.sy+dy*e+(dx/d)*Math.sin(e*Math.PI)*d*0.12;}}}return{x,y};}
  _bpos(){if(!this.initBallId)return null;if(this.mode==='edit'){const h=this.players.find(p=>p.id===this.ballId);return h?{x:h.x,y:h.y}:null;}let holder=this.initBallId,bx=null,by=null,mv=false;const pp=(id,at)=>{const i=this.initPlayers.find(p=>p.id===id);if(!i)return null;let x=i.x,y=i.y;for(const a of this.actions.filter(a=>a.pid===id&&ACTIONS[a.type]?.move&&a.t+1.2<=at)){x=a.ex;y=a.ey;}return{x,y};};for(const a of this.actions){const st=a.t,en=st+1.2;if(a.type==='pass'&&a.pid===holder){if(this.progress>=st&&this.progress<en){const t=(this.progress-st)/1.2;const f=pp(a.pid,st);if(f){bx=f.x+(a.ex-f.x)*t;by=f.y+(a.ey-f.y)*t;mv=true;}}else if(this.progress>=en){const o=this.players.filter(p=>p.type==='offense'&&p.id!==a.pid);let c=null,d=1e9;for(const p of o){const q=pp(p.id,st);if(q){const dd=Math.hypot(q.x-a.ex,q.y-a.ey);if(dd<d){d=dd;c=p;}}}if(c)holder=c.id;}}else if((a.type==='dribble'||a.type==='handoff')&&a.pid===holder){if(this.progress>=st&&this.progress<en){const t=(this.progress-st)/1.2;const e=t<0.5?2*t*t:1-Math.pow(-2*t+2,2)/2;const cx=a.cx??(a.sx+a.ex)/2,cy=a.cy??(a.sy+a.ey)/2;if(a.cx!==undefined){const pt=this._bez(a.sx,a.sy,cx,cy,a.ex,a.ey,e);bx=pt.x;by=pt.y;}else{const dx=a.ex-a.sx,dy=a.ey-a.sy,dd=Math.hypot(dx,dy);bx=a.sx+dx*e+(-dy/dd)*Math.sin(e*Math.PI)*dd*0.12;by=a.sy+dy*e+(dx/dd)*Math.sin(e*Math.PI)*dd*0.12;}mv=true;}else if(this.progress>=en&&a.type==='handoff'){const o=this.players.filter(p=>p.type==='offense'&&p.id!==a.pid);let c=null,d=1e9;for(const p of o){const q=pp(p.id,en);if(q){const dd=Math.hypot(q.x-a.ex,q.y-a.ey);if(dd<d){d=dd;c=p;}}}if(c)holder=c.id;}}else if(a.type==='shot'&&a.pid===holder&&this.progress>=st){if(this.progress<en){const t=(this.progress-st)/1.2;bx=a.sx+(a.ex-a.sx)*t;by=a.sy+(a.ey-a.sy)*t-Math.sin(t*Math.PI)*15;mv=true;}else return{x:50,y:7};}}if(!mv){const h2=pp(holder,this.progress);if(h2){bx=h2.x;by=h2.y;}}return bx!==null?{x:bx,y:by}:null;}

  applyTpl(){const off=OFFENSE[this.offTpl]?.players||[];const def=DEFENSE[this.defTpl]?.players||[];const all=[...off.map(p=>({...p,id:uid()})),...def.map(p=>({...p,id:uid()}))];this.players=all;this.actions=[];this.actTime=0;this.ballId=null;this.initBallId=null;this.showTpl=false;this.parallelMode=false;this.parallelStart=null;this.editingCurve=null;if(this.offTpl==='empty'){this.initPlayers=[];this.positioningPhase=true;}else{this.initPlayers=deep(all);if(all.some(p=>p.type==='offense'))this.showBall=true;}this.render();}
  confirmPos(){this.initPlayers=deep(this.players);this.positioningPhase=false;if(this.players.some(p=>p.type==='offense'))this.showBall=true;this.render();}
  pickBall(id){this.ballId=id;this.initBallId=id;this.showBall=false;this.render();}
  selAct(type){this.selAction=this.selAction===type?null:type;this.selPlayer=null;this.editingCurve=null;this.render();}
  undo(){if(!this.actions.length)return;const l=this.actions[this.actions.length-1];if(ACTIONS[l.type]?.move){const p=this.players.find(x=>x.id===l.pid);if(p){p.x=l.sx;p.y=l.sy;}}if(l.type==='pass'||l.type==='handoff')this.ballId=l.pid;const rem=this.actions.slice(0,-1);const par=rem.some(a=>a.t===l.t);this.actions=rem;if(!par&&!this.parallelMode)this.actTime=Math.max(0,this.actTime-1.5);this._calcDur();this.render();}
  clearAct(){this.actions=[];this.actTime=0;this.players=deep(this.initPlayers);this.ballId=this.initBallId;this.parallelMode=false;this.parallelStart=null;this.editingCurve=null;this.selectedStep=null;this._calcDur();this.render();}
  async savePlay(){const n=prompt(t('plays.prompt.play_name'));if(!n||!n.trim())return;const entry={id:uid(),name:n.trim(),o:this.offTpl,d:this.defTpl,i:this.initPlayers,a:this.actions,b:this.initBallId};this.saved.push(entry);this._save();this.render();if(typeof API!=='undefined'&&API.token){try{const res=await API.post('/api/plays',{name:n.trim(),offense_template:this.offTpl,defense_template:this.defTpl,players:this.initPlayers,actions:this.actions,ball_holder_id:this.initBallId});if(res.data?.id){entry.serverId=res.data.id;entry.shared=false;this._save();this.render();}}catch(e){}}}
  loadPlay(pl){this.offTpl=pl.o;this.defTpl=pl.d;this.initPlayers=pl.i;this.initBallId=pl.b;const ps=deep(pl.i);let h=pl.b;for(const a of pl.a){if(ACTIONS[a.type]?.move){const i=ps.findIndex(x=>x.id===a.pid);if(i>=0){ps[i].x=a.ex;ps[i].y=a.ey;}}if((a.type==='pass'||a.type==='handoff')&&a.pid===h){const o=ps.filter(p=>p.type==='offense'&&p.id!==a.pid);let c=null,d=1e9;for(const p of o){const dd=Math.hypot(p.x-a.ex,p.y-a.ey);if(dd<d){d=dd;c=p;}}if(c)h=c.id;}}this.ballId=h;this.players=ps;this.actions=pl.a;this.actTime=pl.a.length>0?Math.max(...pl.a.map(a=>a.t))+1.5:0;this.mode='edit';this.showTpl=false;this._calcDur();this.showConfirmModal=false;this.pendingLoad=null;this.render();}
  delPlay(id){this.saved=this.saved.filter(s=>s.id!==id);this._save();this.render();}
  async toggleShare(localId){
    const s=this.saved.find(x=>x.id===localId);if(!s||!s.serverId)return;
    if(s.shared){try{await API.post('/api/plays/'+s.serverId+'/unshare');s.shared=false;s.teamId=null;this._save();this.render();if(typeof Toast!=='undefined')Toast.info(t('plays.toast.unshared'));}catch(e){if(typeof Toast!=='undefined')Toast.error(t('plays.toast.share_failed'));}}
    else{if(this.myTeams.length===0){if(typeof Toast!=='undefined')Toast.error(t('plays.toast.no_teams'));return;}
    if(this.myTeams.length===1){try{await API.post('/api/plays/'+s.serverId+'/share',{team_id:this.myTeams[0].id});s.shared=true;s.teamId=this.myTeams[0].id;this._save();this.render();if(typeof Toast!=='undefined')Toast.success(t('plays.toast.shared_with',{name:this.myTeams[0].name}));}catch(e){if(typeof Toast!=='undefined')Toast.error(t('plays.toast.share_failed'));}}
    else{this.showTeamPicker=localId;this.render();}}
  }
  async shareWithTeam(localId,teamId){
    if(localId==='__toolbar__'&&this._pendingShareServerId){
      try{await API.post('/api/plays/'+this._pendingShareServerId+'/share',{team_id:teamId});const entry=this.saved.find(s=>s.serverId===this._pendingShareServerId);if(entry){entry.shared=true;entry.teamId=teamId;}this._lastSharedPlay=true;this.showTeamPicker=null;this._pendingShareServerId=null;this._save();this.render();const tm=this.myTeams.find(x=>x.id===teamId);if(typeof Toast!=='undefined')Toast.success(t('plays.toast.shared_with',{name:tm?.name||'team'}));}catch(e){if(typeof Toast!=='undefined')Toast.error(t('plays.toast.share_failed'));}
      return;
    }
    const s=this.saved.find(x=>x.id===localId);if(!s||!s.serverId)return;
    try{await API.post('/api/plays/'+s.serverId+'/share',{team_id:teamId});s.shared=true;s.teamId=teamId;this.showTeamPicker=null;this._save();this.render();const tm=this.myTeams.find(x=>x.id===teamId);if(typeof Toast!=='undefined')Toast.success(t('plays.toast.shared_with',{name:tm?.name||'team'}));}catch(e){if(typeof Toast!=='undefined')Toast.error(t('plays.toast.share_failed'));}
  }
  async shareFromToolbar(){
    if(!this.actions.length)return;
    if(typeof API==='undefined'||!API.token){if(typeof Toast!=='undefined')Toast.error(t('plays.toast.not_logged_in'));return;}
    if(this.myTeams.length===0){if(typeof Toast!=='undefined')Toast.error(t('plays.toast.no_teams'));return;}
    // Save play to server first
    const n=this.initPlayers.length>0?prompt(t('plays.prompt.play_name'),this._currentPlayName||''):prompt(t('plays.prompt.play_name'));
    if(!n||!n.trim())return;
    try{
      const res=await API.post('/api/plays',{name:n.trim(),offense_template:this.offTpl,defense_template:this.defTpl,players:this.initPlayers,actions:this.actions,ball_holder_id:this.initBallId});
      if(!res.data?.id){if(typeof Toast!=='undefined')Toast.error(t('plays.toast.save_failed'));return;}
      const serverId=res.data.id;
      // Also add to saved list if not there
      const existing=this.saved.find(s=>s.name===n.trim());
      if(existing){existing.serverId=serverId;}
      else{this.saved.push({id:uid(),name:n.trim(),o:this.offTpl,d:this.defTpl,i:this.initPlayers,a:this.actions,b:this.initBallId,serverId:serverId,shared:false});}
      // Now share
      if(this.myTeams.length===1){
        await API.post('/api/plays/'+serverId+'/share',{team_id:this.myTeams[0].id});
        const entry=this.saved.find(s=>s.serverId===serverId);if(entry){entry.shared=true;entry.teamId=this.myTeams[0].id;}
        this._lastSharedPlay=true;this._save();this.render();
        if(typeof Toast!=='undefined')Toast.success(t('plays.toast.shared_with',{name:this.myTeams[0].name}));
      }else{
        this._pendingShareServerId=serverId;this.showTeamPicker='__toolbar__';this._save();this.render();
      }
    }catch(e){if(typeof Toast!=='undefined')Toast.error(t('plays.toast.save_failed'));}
  }
  share(){if(!this.actions.length)return;const d={o:this.offTpl,d:this.defTpl,i:this.initPlayers,a:this.actions,b:this.initBallId};this.shareUrl=window.location.origin+window.location.pathname+'?p='+btoa(encodeURIComponent(JSON.stringify(d)));this.showShareModal=true;this.render();}
  newPlay(){if(this.actions.length>0||this.initPlayers.length>0){this.showNewConfirm=true;this.render();}else{this._resetToNew();}}
  _resetToNew(){this.players=[];this.initPlayers=[];this.actions=[];this.selPlayer=null;this.selAction=null;this.mode='edit';this.playing=false;this.progress=0;this.duration=0;this.offTpl='5-out';this.defTpl='none';this.showTpl=true;this.actTime=0;this.ballId=null;this.initBallId=null;this.showBall=false;this.editingCurve=null;this.parallelMode=false;this.parallelStart=null;this.positioningPhase=false;this.selectedStep=null;this.showNewConfirm=false;this._currentPlayName=null;this._lastSharedPlay=false;this.render();}
  async newPlaySaveAndNew(){this.showNewConfirm=false;await this.savePlay();this._resetToNew();}

  // Animation
  play(){if(this.playing)return;this.mode='play';this.playing=true;this.progress=0;this._calcDur();this._as=performance.now();this._aloop();}
  _aloop(){if(!this.playing)return;const t=(performance.now()-this._as)/1000;if(t>=this.duration){this.progress=this.duration;this.playing=false;this._svg();this._ctrl();return;}this.progress=t;this._svg();this._ctrl();this.animId=requestAnimationFrame(()=>this._aloop());}
  pause(){this.playing=false;if(this.animId)cancelAnimationFrame(this.animId);}
  stop(){this.pause();this.progress=0;this.mode='edit';this.render();}

  // Events
  _pd(e,p){e.stopPropagation();if(this.mode!=='edit')return;const xy=this._getXY(e);if(!xy)return;if(this.positioningPhase){this.dragPlayer=p;this.selPlayer=p.id;return;}if(this.selAction){this.drawing=true;this.curAction={id:uid(),type:this.selAction,pid:p.id,sx:p.x,sy:p.y,ex:xy.x,ey:xy.y};}else{this.dragPlayer=p;this.selPlayer=p.id;}this.editingCurve=null;}
  _mv(e){const xy=this._getXY(e);if(!xy)return;if(this.drawing&&this.curAction){this.curAction.ex=xy.x;this.curAction.ey=xy.y;this._svg();}else if(this.dragPlayer){const p=this.players.find(x=>x.id===this.dragPlayer.id);if(p){p.x=xy.x;p.y=xy.y;this._svg();}}else if(this.draggingControl&&this.editingCurve){const a=this.actions.find(x=>x.id===this.editingCurve);if(a){a.cx=xy.x;a.cy=xy.y;this._svg();}}}
  _up(){if(this.drawing&&this.curAction){const d=Math.hypot(this.curAction.ex-this.curAction.sx,this.curAction.ey-this.curAction.sy);if(d>5){const ts=this.parallelMode&&this.parallelStart!==null?this.parallelStart:this.actTime;const na={...this.curAction,t:ts};const ex=this.actions.find(a=>a.t===ts&&a.pid===this.curAction.pid);if(!(this.parallelMode&&ex)){this.actions.push(na);this.editingCurve=na.id;if(!this.parallelMode)this.actTime+=1.5;if(ACTIONS[this.curAction.type]?.move){const p=this.players.find(x=>x.id===this.curAction.pid);if(p){p.x=this.curAction.ex;p.y=this.curAction.ey;}}if((this.curAction.type==='pass'||this.curAction.type==='handoff')&&this.curAction.pid===this.ballId){const o=this.players.filter(p=>p.type==='offense'&&p.id!==this.curAction.pid);let c=null,cd=1e9;for(const p of o){const dd=Math.hypot(p.x-this.curAction.ex,p.y-this.curAction.ey);if(dd<cd){cd=dd;c=p;}}if(c)this.ballId=c.id;}}}}this.drawing=false;this.curAction=null;this.dragPlayer=null;this.draggingControl=false;this._calcDur();this.render();}

  _pn(pid){const p=this.players.find(x=>x.id===pid)||this.initPlayers.find(x=>x.id===pid);return p?p.number:'?';}
  _steps(){const g={};this.actions.forEach(a=>{const k=a.t.toFixed(1);if(!g[k])g[k]=[];g[k].push(a);});return Object.entries(g).sort((a,b)=>parseFloat(a[0])-parseFloat(b[0])).map(([t,acts],i)=>({time:parseFloat(t),actions:acts,step:i+1}));}

  render(){this.el.innerHTML=this._html();this._bindEv();this._svg();}
  _ctrl(){const f=this.el.querySelector('.pc-pf');const th=this.el.querySelector('.pc-pt');const tm=this.el.querySelector('.pc-tm');if(f&&this.duration>0){const p=(this.progress/this.duration*100)+'%';f.style.width=p;if(th)th.style.left=p;}if(tm)tm.textContent=this.progress.toFixed(1)+'s / '+this.duration.toFixed(1)+'s';}

  _html(){
    const steps=this._steps();
    const isEdit=this.mode==='edit';
    const hasActions=this.actions.length>0;

    // Top toolbar
    let html='<div class="pc"><div class="pc-toolbar"><div class="pc-toolbar-group">'
      +'<button class="btn btn-sm '+(isEdit?'btn-primary':'btn-secondary')+'" data-a="edit"><span class="material-symbols-outlined" style="font-size:18px">edit</span> '+t('plays.btn.edit')+'</button>'
      +'<button class="btn btn-sm '+(this.mode==='play'?'btn-primary':'btn-secondary')+'" data-a="pmode"><span class="material-symbols-outlined" style="font-size:18px">play_arrow</span> '+t('plays.btn.play')+'</button>'
      +'<button class="btn btn-sm btn-secondary" data-a="newPlay"><span class="material-symbols-outlined" style="font-size:18px">add</span> '+t('plays.btn.new')+'</button>'
      +'<span class="pc-parallel-indicator pc-parallel-badge" style="display:'+(this.parallelMode?'inline-flex':'none')+'">'+t('plays.label.parallel')+'</span>'
      +'</div><div class="pc-toolbar-group">'
      +'<button class="btn btn-sm btn-primary" data-a="save"'+(hasActions?'':' disabled')+'><span class="material-symbols-outlined" style="font-size:18px">save</span> '+t('plays.btn.save')+'</button>'
      +'<button class="btn btn-sm btn-secondary" data-a="share"'+(hasActions?'':' disabled')+'><span class="material-symbols-outlined" style="font-size:18px">share</span> '+t('plays.btn.link')+'</button>'
      +'<button class="btn btn-sm btn-secondary" data-a="shareTeam"'+(hasActions?'':' disabled')+' style="'+(this._lastSharedPlay?'background:#22c55e;border-color:#22c55e;color:#fff':'')+'"><span class="material-symbols-outlined" style="font-size:18px">group</span> '+t('plays.btn.share_team')+'</button>'
      +'</div></div>';

    // Body: canvas + sidebar
    html+='<div class="pc-body"><div class="pc-canvas-wrap">'
      +'<svg class="pc-svg" viewBox="0 0 100 88" preserveAspectRatio="xMidYMid meet"></svg>';

    // Left toolbar - Actions (edit mode, not positioning)
    if(isEdit&&!this.positioningPhase){
      html+='<div class="pc-left-toolbar">';
      Object.entries(ACTIONS).forEach(([k,v])=>{
        html+='<button class="pc-tool-btn '+(this.selAction===k?'active':'')+'" data-sa="'+k+'" title="'+t(v.nameKey)+'">'
          +'<span style="color:'+v.color+';font-size:18px">'+v.icon+'</span></button>';
      });
      html+='</div>';
    }

    // Right toolbar - Controls
    if(isEdit){
      html+='<div class="pc-right-toolbar">';
      if(this.positioningPhase){
        html+='<button class="pc-tool-btn" data-a="cpos" title="Confirm positions" style="color:var(--success)"><span class="material-symbols-outlined" style="font-size:20px">check_circle</span></button>';
      }else{
        html+='<button class="pc-tool-btn'+(this.parallelMode?' active':'')+'" data-a="toggleParallel" title="'+t('plays.label.parallel')+'" style="'+(this.parallelMode?'color:#FBBF24;border-color:#FBBF24':'')+'"><span class="material-symbols-outlined" style="font-size:18px">stacks</span></button>'
          +'<button class="pc-tool-btn" data-a="undo" title="Undo (Ctrl+Z)"'+(hasActions?'':' disabled')+'><span class="material-symbols-outlined" style="font-size:18px">undo</span></button>'
          +'<button class="pc-tool-btn" data-a="clr" title="Clear all"'+(hasActions?'':' disabled')+'><span class="material-symbols-outlined" style="font-size:18px">delete_sweep</span></button>'
          +'<div class="pc-tool-sep"></div>'
          +'<button class="pc-tool-btn" data-a="tpl" title="'+t('plays.modal.select_formation')+'"><span class="material-symbols-outlined" style="font-size:18px">dashboard</span></button>'
          +'<button class="pc-tool-btn" data-a="play" title="'+t('plays.btn.play')+'"'+(hasActions?'':' disabled')+'><span class="material-symbols-outlined" style="font-size:18px;color:var(--success)">play_arrow</span></button>';
      }
      html+='</div>';
    }
    if(this.mode==='play'){
      html+='<div class="pc-right-toolbar">'
        +'<button class="pc-tool-btn" data-a="edit" title="'+t('plays.btn.edit')+'"><span class="material-symbols-outlined" style="font-size:18px">edit</span></button>'
        +'<button class="pc-tool-btn" data-a="'+(this.playing?'pause':'play')+'" title="'+t('plays.btn.play')+'"><span class="material-symbols-outlined" style="font-size:18px">'+(this.playing?'pause':'play_arrow')+'</span></button>'
        +'<button class="pc-tool-btn" data-a="stop" title="'+t('plays.btn.play')+'"><span class="material-symbols-outlined" style="font-size:18px">replay</span></button>'
        +'</div>';
    }

    // Status indicators
    if(isEdit&&!this.positioningPhase&&this.selAction){
      html+='<div class="pc-status pc-status-action">'+ACTIONS[this.selAction].icon+' '+t('plays.status.click_drag',{action:t(ACTIONS[this.selAction].nameKey)})+'</div>';
    }
    if(isEdit&&this.parallelMode&&!this.positioningPhase){
      html+='<div class="pc-status pc-status-parallel" style="bottom:calc(var(--sp-3) + 28px)">'+t('plays.status.parallel')+'</div>';
    }
    if(isEdit&&this.positioningPhase){
      html+='<div class="pc-status pc-status-position">'+t('plays.status.position')+'</div>';
    }
    if(isEdit&&this.editingCurve){
      html+='<div class="pc-status pc-status-curve">'+t('plays.status.curve')+'</div>';
    }

    // Template/ball overlays
    html+=(this.showTpl?this._tplHtml():'')+(this.showBall?this._ballHtml():'');
    html+='</div>'; // close pc-canvas-wrap

    // Right sidebar - timeline + saved
    html+='<div class="pc-sidebar"><div class="pc-sidebar-section"><div class="pc-sidebar-title">'+t('plays.sidebar.timeline')+' ('+t('plays.sidebar.steps',{count:steps.length})+')</div>'
      +(steps.length?steps.map(s=>'<div class="pc-timeline-step '+(this.selectedStep===s.time?'active':'')+'" data-st="'+s.time+'"><div style="font-weight:700;margin-bottom:2px">'+t('plays.sidebar.step',{num:s.step})+' <span style="color:var(--text-muted);font-weight:400">'+s.time.toFixed(1)+'s</span></div>'+s.actions.map(a=>'<div class="pc-timeline-action"><span style="color:'+(ACTIONS[a.type]?.color||'#fff')+'">'+(ACTIONS[a.type]?.icon||'')+'</span><span>#'+this._pn(a.pid)+'</span><span style="color:var(--text-muted)">'+(ACTIONS[a.type]?.nameKey?t(ACTIONS[a.type].nameKey):a.type)+'</span><button class="btn-icon" style="width:20px;height:20px;margin-left:auto" data-ec="'+a.id+'"><span class="material-symbols-outlined" style="font-size:14px">timeline</span></button><button class="btn-icon" style="width:20px;height:20px" data-da="'+a.id+'"><span class="material-symbols-outlined" style="font-size:14px">close</span></button></div>').join('')+'</div>').join(''):'<div class="text-xs text-muted" style="padding:var(--sp-2)">'+t('plays.sidebar.no_actions')+'</div>')
      +'</div><div class="pc-sidebar-section"><div class="pc-sidebar-title">'+t('plays.sidebar.saved_plays')+' ('+this.saved.length+')</div>'
      +(this.saved.length?this.saved.map(s=>'<div class="pc-saved-item"><span data-lp="'+s.id+'" style="cursor:pointer;flex:1">'+s.name+(s.shared?'<span class="pc-share-badge" style="margin-left:4px">'+t('plays.badge.shared')+'</span>':'')+'</span>'+(s.serverId?'<button class="btn-icon" style="width:24px;height:24px" data-ts="'+s.id+'" title="'+(s.shared?t('plays.toast.unshared'):t('plays.btn.share_team'))+'"><span class="material-symbols-outlined" style="font-size:14px;color:'+(s.shared?'#22c55e':'var(--text-muted)')+'">group</span></button>':'')+'<button class="btn-icon" style="width:24px;height:24px" data-dp="'+s.id+'"><span class="material-symbols-outlined" style="font-size:14px">delete</span></button></div>').join(''):'<div class="text-xs text-muted" style="padding:var(--sp-2)">'+t('plays.sidebar.no_saved')+'</div>')
      +'</div></div></div>'; // close pc-sidebar, pc-body

    // Playback controls bar
    html+='<div class="pc-controls"><button class="btn-icon" data-a="stop"><span class="material-symbols-outlined">stop</span></button>'
      +'<button class="btn-icon" data-a="'+(this.playing?'pause':'play')+'"><span class="material-symbols-outlined">'+(this.playing?'pause':'play_arrow')+'</span></button>'
      +'<div class="pc-progress" id="pcProg"><div class="pc-pf pc-progress-fill" style="width:'+(this.duration>0?this.progress/this.duration*100:0)+'%"></div><div class="pc-pt pc-progress-thumb" style="left:'+(this.duration>0?this.progress/this.duration*100:0)+'%"></div></div>'
      +'<span class="pc-tm text-xs text-muted" style="min-width:60px;text-align:right">'+this.progress.toFixed(1)+'s / '+this.duration.toFixed(1)+'s</span></div>';

    // Modals
    if(this.showShareModal) html+=this._shareHtml();
    if(this.showConfirmModal) html+=this._confirmHtml();
    if(this.showTeamPicker) html+=this._teamPickerHtml();
    if(this.showNewConfirm) html+=this._newConfirmHtml();

    html+='</div>'; // close pc
    return html;
  }

  _tplHtml(){return '<div class="pc-modal"><h2>'+t('plays.modal.select_formation')+'</h2><div class="pc-sidebar-title">'+t('plays.modal.offense')+'</div><div class="pc-tpl-grid">'+Object.entries(OFFENSE).map(([k,v])=>'<button class="pc-tpl-btn '+(this.offTpl===k?'active':'')+'" data-ot="'+k+'">'+t(v.nameKey)+'</button>').join('')+'</div><div class="pc-sidebar-title">'+t('plays.modal.defense')+'</div><div class="pc-tpl-grid" style="grid-template-columns:repeat(2,1fr)">'+Object.entries(DEFENSE).map(([k,v])=>'<button class="pc-tpl-btn '+(this.defTpl===k?'active':'')+'" data-dt="'+k+'">'+t(v.nameKey)+'</button>').join('')+'</div><button class="btn btn-primary btn-lg" data-a="apply" style="margin-top:var(--sp-4);width:100%"><span class="material-symbols-outlined">check</span> '+t('plays.modal.apply_formation')+'</button></div>';}
  _ballHtml(){const o=this.players.filter(p=>p.type==='offense');return '<div class="pc-modal"><h2>'+t('plays.modal.who_has_ball')+'</h2><div class="pc-tpl-grid">'+o.map(p=>'<button class="pc-tpl-btn" data-pb="'+p.id+'">#'+p.number+'</button>').join('')+'</div></div>';}
  _shareHtml(){return '<div class="modal-overlay active" style="z-index:50"><div class="modal" style="max-width:500px"><div class="modal-header"><h3 class="modal-title">'+t('plays.modal.share_play')+'</h3><button class="modal-close" data-a="closeShare"><span class="material-symbols-outlined">close</span></button></div><div class="modal-body"><p style="margin-bottom:var(--sp-3);color:var(--text-secondary)">'+t('plays.modal.share_copy_link')+'</p><div style="display:flex;gap:var(--sp-2)"><input class="input" id="shareUrlInput" value="'+this.shareUrl+'" readonly style="flex:1;font-size:var(--text-xs)"/><button class="btn btn-primary" data-a="copyShare"><span class="material-symbols-outlined" style="font-size:18px">content_copy</span></button></div></div></div></div>';}
  _confirmHtml(){return '<div class="modal-overlay active" style="z-index:50"><div class="modal" style="max-width:400px"><div class="modal-header"><h3 class="modal-title">'+t('plays.modal.load_play')+'</h3><button class="modal-close" data-a="cancelLoad"><span class="material-symbols-outlined">close</span></button></div><div class="modal-body"><p style="color:var(--text-secondary)">'+t('plays.modal.load_play_warning')+'</p></div><div class="modal-footer"><button class="btn btn-secondary" data-a="cancelLoad">'+t('plays.modal.stay')+'</button><button class="btn btn-primary" data-a="confirmLoad">'+t('plays.modal.load_play_confirm')+'</button></div></div></div>';}
  _teamPickerHtml(){return '<div class="modal-overlay active" style="z-index:50"><div class="modal" style="max-width:400px"><div class="modal-header"><h3 class="modal-title">'+t('plays.modal.share_with_team')+'</h3><button class="modal-close" data-a="cancelTeamPick"><span class="material-symbols-outlined">close</span></button></div><div class="modal-body"><p style="color:var(--text-secondary);margin-bottom:var(--sp-3)">'+t('plays.modal.select_team')+'</p><div style="display:flex;flex-direction:column;gap:var(--sp-2)">'+this.myTeams.map(tm=>'<button class="btn btn-secondary" data-tpick="'+tm.id+'" style="justify-content:flex-start"><span class="material-symbols-outlined" style="font-size:18px">groups</span> '+tm.name+'</button>').join('')+'</div></div></div></div>';}
  _newConfirmHtml(){return '<div class="modal-overlay active" style="z-index:50"><div class="modal" style="max-width:420px"><div class="modal-header"><h3 class="modal-title">'+t('plays.modal.new_play')+'</h3><button class="modal-close" data-a="newStay"><span class="material-symbols-outlined">close</span></button></div><div class="modal-body"><p style="color:var(--text-secondary)"><span class="material-symbols-outlined" style="font-size:20px;vertical-align:middle;color:var(--warning)">warning</span> '+t('plays.modal.new_play_warning')+'</p></div><div class="modal-footer" style="gap:var(--sp-2)"><button class="btn btn-secondary" data-a="newStay">'+t('plays.modal.stay')+'</button><button class="btn btn-danger" data-a="newDelete">'+t('plays.modal.new_discard')+'</button><button class="btn btn-primary" data-a="newSave"><span class="material-symbols-outlined" style="font-size:16px">save</span> '+t('plays.modal.save_new')+'</button></div></div></div>';}

  _bindEv(){
    const svg=this.el.querySelector('.pc-svg');
    if(svg){svg.addEventListener('mousemove',e=>this._mv(e));svg.addEventListener('mouseup',()=>this._up());svg.addEventListener('mouseleave',()=>this._up());svg.addEventListener('touchmove',e=>{e.preventDefault();this._mv(e);},{passive:false});svg.addEventListener('touchend',()=>this._up());}
    this.el.querySelectorAll('[data-a]').forEach(b=>{b.addEventListener('click',()=>{const a=b.dataset.a;
      if(a==='edit'){this.pause();this.mode='edit';this.render();}
      else if(a==='pmode'){this.mode='play';this.progress=0;this.render();}
      else if(a==='tpl'){this.showTpl=true;this.render();}
      else if(a==='undo')this.undo();
      else if(a==='clr')this.clearAct();
      else if(a==='save')this.savePlay();
      else if(a==='apply')this.applyTpl();
      else if(a==='cpos')this.confirmPos();
      else if(a==='play')this.play();
      else if(a==='pause')this.pause();
      else if(a==='stop')this.stop();
      else if(a==='share')this.share();
      else if(a==='shareTeam')this.shareFromToolbar();
      else if(a==='toggleParallel'){if(!this.parallelMode){this.parallelMode=true;this.parallelStart=this.actTime;}else{this.parallelMode=false;this.actTime+=1.5;this.parallelStart=null;}this.render();}
      else if(a==='closeShare'){this.showShareModal=false;this.render();}
      else if(a==='copyShare'){const inp=this.el.querySelector('#shareUrlInput');if(inp){navigator.clipboard.writeText(inp.value).then(()=>{if(typeof Toast!=='undefined')Toast.success(t('plays.toast.link_copied'));}).catch(()=>{inp.select();document.execCommand('copy');if(typeof Toast!=='undefined')Toast.success(t('plays.toast.link_copied'));});}}
      else if(a==='confirmLoad'){if(this.pendingLoad)this.loadPlay(this.pendingLoad);}
      else if(a==='cancelLoad'){this.pendingLoad=null;this.showConfirmModal=false;this.render();}
      else if(a==='newPlay')this.newPlay();
      else if(a==='newStay'){this.showNewConfirm=false;this.render();}
      else if(a==='newDelete')this._resetToNew();
      else if(a==='newSave')this.newPlaySaveAndNew();
    });});
    this.el.querySelectorAll('[data-sa]').forEach(b=>{b.addEventListener('click',()=>this.selAct(b.dataset.sa));});
    this.el.querySelectorAll('[data-ot]').forEach(b=>{b.addEventListener('click',()=>{this.offTpl=b.dataset.ot;this.render();});});
    this.el.querySelectorAll('[data-dt]').forEach(b=>{b.addEventListener('click',()=>{this.defTpl=b.dataset.dt;this.render();});});
    this.el.querySelectorAll('[data-pb]').forEach(b=>{b.addEventListener('click',()=>this.pickBall(b.dataset.pb));});
    this.el.querySelectorAll('[data-st]').forEach(el=>{el.addEventListener('click',()=>{const st=parseFloat(el.dataset.st);this.selectedStep=this.selectedStep===st?null:st;this.render();});});
    this.el.querySelectorAll('[data-ec]').forEach(b=>{b.addEventListener('click',e=>{e.stopPropagation();const id=b.dataset.ec;this.editingCurve=this.editingCurve===id?null:id;this._svg();});});
    this.el.querySelectorAll('[data-da]').forEach(b=>{b.addEventListener('click',e=>{e.stopPropagation();this.actions=this.actions.filter(a=>a.id!==b.dataset.da);const ps=deep(this.initPlayers);for(const a of this.actions){if(ACTIONS[a.type]?.move){const i=ps.findIndex(x=>x.id===a.pid);if(i>=0){ps[i].x=a.ex;ps[i].y=a.ey;}}}this.players=ps;this._calcDur();this.render();});});
    this.el.querySelectorAll('[data-lp]').forEach(el=>{el.addEventListener('click',()=>{const p=this.saved.find(s=>s.id===el.dataset.lp);if(!p)return;if(this.actions.length>0){this.pendingLoad=p;this.showConfirmModal=true;this.render();}else{this.loadPlay(p);}});});
    this.el.querySelectorAll('[data-dp]').forEach(b=>{b.addEventListener('click',e=>{e.stopPropagation();this.delPlay(b.dataset.dp);});});
    this.el.querySelectorAll('[data-ts]').forEach(b=>{b.addEventListener('click',e=>{e.stopPropagation();this.toggleShare(b.dataset.ts);});});
    this.el.querySelectorAll('[data-tpick]').forEach(b=>{b.addEventListener('click',()=>{this.shareWithTeam(this.showTeamPicker,parseInt(b.dataset.tpick));});});
    this.el.querySelectorAll('[data-a="cancelTeamPick"]').forEach(b=>{b.addEventListener('click',()=>{this.showTeamPicker=null;this.render();});});
    const prog=this.el.querySelector('#pcProg');
    if(prog){prog.addEventListener('click',e=>{const r=prog.getBoundingClientRect();this.progress=((e.clientX-r.left)/r.width)*this.duration;this.mode='play';this._svg();this._ctrl();});}
  }

  _svg(){
    const svg=this.el.querySelector('.pc-svg');if(!svg)return;
    // Wood grain court with defs
    let h='<defs>'
      +'<pattern id="woodGrain" patternUnits="userSpaceOnUse" width="8" height="88">'
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
      +'<linearGradient id="paintGradient" x1="0%" y1="0%" x2="0%" y2="100%">'
      +'<stop offset="0%" stop-color="#1E3A5F" stop-opacity="0.15"/>'
      +'<stop offset="100%" stop-color="#1E3A5F" stop-opacity="0.05"/>'
      +'</linearGradient>'
      +'</defs>';

    // Court floor
    h+='<rect width="100" height="88" fill="#C8844A"/>';
    h+='<rect width="100" height="88" fill="url(#woodGrain)"/>';
    h+='<rect x="0" y="0" width="100" height="44" fill="url(#paintGradient)" opacity="0.3"/>';
    h+='<rect x="31" y="2" width="38" height="38" fill="#1E3A5F" opacity="0.08"/>';

    // Court lines (white)
    h+='<rect x="2" y="2" width="96" height="84" fill="none" stroke="#FFFFFF" stroke-width="0.8"/>';
    // 3-point arc
    h+='<path d="M 7 2 L 7 16 C 7 38 25 57 50 57 C 75 57 93 38 93 16 L 93 2" fill="none" stroke="#FFFFFF" stroke-width="0.6" stroke-linejoin="round"/>';
    // Lane (paint)
    h+='<rect x="31" y="2" width="38" height="38" fill="none" stroke="#FFFFFF" stroke-width="0.6"/>';
    // Free throw tick marks - left
    h+='<line x1="29" y1="14" x2="31" y2="14" stroke="#FFFFFF" stroke-width="0.4"/>';
    h+='<line x1="29" y1="22" x2="31" y2="22" stroke="#FFFFFF" stroke-width="0.4"/>';
    h+='<line x1="29" y1="30" x2="31" y2="30" stroke="#FFFFFF" stroke-width="0.4"/>';
    // Free throw tick marks - right
    h+='<line x1="69" y1="14" x2="71" y2="14" stroke="#FFFFFF" stroke-width="0.4"/>';
    h+='<line x1="69" y1="22" x2="71" y2="22" stroke="#FFFFFF" stroke-width="0.4"/>';
    h+='<line x1="69" y1="30" x2="71" y2="30" stroke="#FFFFFF" stroke-width="0.4"/>';
    // Free throw circle (top half solid)
    h+='<circle cx="50" cy="40" r="12" fill="none" stroke="#FFFFFF" stroke-width="0.5"/>';
    // Free throw circle (bottom half dashed)
    h+='<path d="M 38 40 A 12 12 0 0 0 62 40" fill="none" stroke="#FFFFFF" stroke-width="0.5" stroke-dasharray="2,2"/>';
    // Free throw semicircle
    h+='<path d="M 42 2 A 8 8 0 0 0 58 2" fill="none" stroke="#FFFFFF" stroke-width="0.5"/>';
    // Backboard
    h+='<rect x="44" y="2.5" width="12" height="1" fill="#FFFFFF" opacity="0.9"/>';
    h+='<rect x="44" y="2.5" width="12" height="1" fill="none" stroke="#333" stroke-width="0.2"/>';
    // Rim
    h+='<circle cx="50" cy="6" r="1.5" fill="none" stroke="#FF5722" stroke-width="0.5"/>';
    // Net hint
    h+='<line x1="50" y1="3.5" x2="50" y2="4.5" stroke="#888" stroke-width="0.3"/>';
    h+='<path d="M 48.5 6 Q 50 9 51.5 6" fill="none" stroke="#FFFFFF" stroke-width="0.2" opacity="0.5"/>';
    // Half court line
    h+='<line x1="2" y1="86" x2="98" y2="86" stroke="#FFFFFF" stroke-width="0.4" opacity="0.6"/>';
    // Opposing basket semicircle
    h+='<path d="M 38 86 A 12 12 0 0 1 62 86" fill="none" stroke="#FFFFFF" stroke-width="0.4" opacity="0.6"/>';

    // Action lines
    this.actions.forEach((a,idx)=>{const inP=this.mode==='play';const op=inP?0:(this.actions.length>3&&idx<this.actions.length-3?0.25:1);if(inP&&this.progress<a.t)return;const p=inP?Math.min(1,(this.progress-a.t)/1.2):1;h+=this._line(a,p,op,a.id===this.editingCurve);});
    if(this.curAction)h+=this._line(this.curAction,1,0.6,false);

    // Players (larger)
    this.players.forEach(p=>{
      const pos=this.mode==='play'?(this._ppos(p)||p):p;
      const f=p.type==='offense'?'#3B82F6':'#EF4444';
      const s=p.id===this.selPlayer;
      const isBall=this.mode==='edit'&&p.id===this.ballId;
      h+='<g class="pp" data-pid="'+p.id+'" style="cursor:'+(this.mode==='edit'?'grab':'default')+'">';
      if(s) h+='<circle cx="'+pos.x+'" cy="'+pos.y+'" r="6" fill="none" stroke="#FBBF24" stroke-width="0.3" stroke-dasharray="1,0.5" opacity="0.6"/>';
      if(isBall) h+='<circle cx="'+pos.x+'" cy="'+pos.y+'" r="5.5" fill="none" stroke="#F97316" stroke-width="0.8" opacity="0.5"/>';
      h+='<circle cx="'+pos.x+'" cy="'+pos.y+'" r="4.5" fill="'+f+'" stroke="'+(s?'#FBBF24':isBall?'#F97316':'#fff')+'" stroke-width="'+(s||isBall?'1':'0.5')+'"/>';
      h+='<text x="'+pos.x+'" y="'+pos.y+'" text-anchor="middle" dominant-baseline="central" fill="#fff" font-size="3" font-weight="700" font-family="Space Grotesk,sans-serif">'+p.number+'</text></g>';
    });

    // Basketball (floating, with seams)
    const bp=this._bpos();
    if(bp){
      const bx=bp.x, by=bp.y-6;
      h+='<ellipse cx="'+bx+'" cy="'+(bp.y-1)+'" rx="2" ry="0.6" fill="#000" opacity="0.15"/>';
      h+='<circle cx="'+bx+'" cy="'+by+'" r="2.8" fill="#F97316" stroke="#C2410C" stroke-width="0.4"/>';
      h+='<path d="M '+(bx-2.8)+' '+by+' Q '+bx+' '+(by-2)+' '+(bx+2.8)+' '+by+'" fill="none" stroke="#C2410C" stroke-width="0.3"/>';
      h+='<line x1="'+bx+'" y1="'+(by-2.8)+'" x2="'+bx+'" y2="'+(by+2.8)+'" stroke="#C2410C" stroke-width="0.3"/>';
    }

    svg.innerHTML=h;
    svg.querySelectorAll('.pp').forEach(g=>{const pid=g.dataset.pid;const p=this.players.find(x=>x.id===pid);if(p){g.addEventListener('mousedown',e=>this._pd(e,p));g.addEventListener('touchstart',e=>{e.preventDefault();this._pd(e,p);},{passive:false});}});
    svg.querySelectorAll('.pc-cp').forEach(c=>{c.addEventListener('mousedown',e=>{e.stopPropagation();this.draggingControl=true;this.editingCurve=c.dataset.ca;});});
    svg.querySelectorAll('.pc-curve-toggle').forEach(c=>{c.addEventListener('mousedown',e=>{e.stopPropagation();this.editingCurve=c.dataset.ct;this._svg();});});
  }

  _line(a,p,op,ed){const{type,sx,sy,ex,ey,cx,cy}=a;const dx=ex-sx,dy=ey-sy,dist=Math.hypot(dx,dy);if(dist<2)return'';const col=ACTIONS[type]?.color||'#fff';const hc=cx!==undefined&&cy!==undefined;const cX=cx??(sx+ex)/2,cY=cy??(sy+ey)/2;let h='<g opacity="'+op+'" style="cursor:pointer">';
    if(type==='screen'){const ang=Math.atan2(ey-sy,ex-sx),pa=ang+Math.PI/2;const ep=hc?this._bez(sx,sy,cX,cY,ex,ey,p):{x:sx+dx*p,y:sy+dy*p};if(hc)h+='<path d="M '+sx+' '+sy+' Q '+cX+' '+cY+' '+ep.x+' '+ep.y+'" fill="none" stroke="'+col+'" stroke-width="0.6"/>';else h+='<line x1="'+sx+'" y1="'+sy+'" x2="'+ep.x+'" y2="'+ep.y+'" stroke="'+col+'" stroke-width="0.6"/>';h+='<line x1="'+(ep.x-3*Math.cos(pa))+'" y1="'+(ep.y-3*Math.sin(pa))+'" x2="'+(ep.x+3*Math.cos(pa))+'" y2="'+(ep.y+3*Math.sin(pa))+'" stroke="'+col+'" stroke-width="1" stroke-linecap="round"/>';}
    else if(type==='shot'){const ep={x:sx+dx*p,y:sy+dy*p};h+='<line x1="'+sx+'" y1="'+sy+'" x2="'+ep.x+'" y2="'+ep.y+'" stroke="'+col+'" stroke-width="0.5" stroke-dasharray="1.5,0.8"/>';if(p===1)h+='<circle cx="'+ep.x+'" cy="'+ep.y+'" r="1.5" fill="none" stroke="'+col+'" stroke-width="0.4"/>';}
    else{const ep=hc?this._bez(sx,sy,cX,cY,ex,ey,p):{x:sx+dx*p,y:sy+dy*p};const da=type==='pass'?'stroke-dasharray="2,1"':type==='dribble'?'stroke-dasharray="1,0.5"':'';if(hc)h+='<path d="M '+sx+' '+sy+' Q '+cX+' '+cY+' '+ep.x+' '+ep.y+'" fill="none" stroke="'+col+'" stroke-width="0.6" '+da+'/>';else h+='<line x1="'+sx+'" y1="'+sy+'" x2="'+ep.x+'" y2="'+ep.y+'" stroke="'+col+'" stroke-width="0.6" '+da+'/>';if(p===1){const ang=hc?Math.atan2(ep.y-cY,ep.x-cX):Math.atan2(dy,dx);h+='<polygon points="'+ep.x+','+ep.y+' '+(ep.x-2*Math.cos(ang-0.4))+','+(ep.y-2*Math.sin(ang-0.4))+' '+(ep.x-2*Math.cos(ang+0.4))+','+(ep.y-2*Math.sin(ang+0.4))+'" fill="'+col+'"/>';}}
    if(ed){const cpx=cx??(sx+ex)/2,cpy=cy??(sy+ey)/2-dist*0.15;h+='<circle cx="'+cpx+'" cy="'+cpy+'" r="1.5" fill="#fff" stroke="'+col+'" stroke-width="0.4" class="pc-cp" data-ca="'+a.id+'" style="cursor:grab"/>';h+='<line x1="'+sx+'" y1="'+sy+'" x2="'+cpx+'" y2="'+cpy+'" stroke="#fff" stroke-width="0.2" stroke-dasharray="1,1" opacity="0.4"/>';h+='<line x1="'+cpx+'" y1="'+cpy+'" x2="'+ex+'" y2="'+ey+'" stroke="#fff" stroke-width="0.2" stroke-dasharray="1,1" opacity="0.4"/>';}
    else if(this.mode==='edit'&&p===1&&type!=='shot'){const mx=hc?this._bez(sx,sy,cX,cY,ex,ey,0.5).x:(sx+ex)/2,my=hc?this._bez(sx,sy,cX,cY,ex,ey,0.5).y:(sy+ey)/2;h+='<circle cx="'+mx+'" cy="'+my+'" r="2" fill="rgba(0,0,0,0.5)" stroke="#fff" stroke-width="0.3" class="pc-curve-toggle" data-ct="'+a.id+'" style="cursor:pointer"/>';h+='<text x="'+mx+'" y="'+(my+0.5)+'" text-anchor="middle" dominant-baseline="central" fill="#fff" font-size="2.5" class="pc-curve-toggle" data-ct="'+a.id+'" style="cursor:pointer;pointer-events:auto">⟳</text>';}
    h+='</g>';return h;
  }
}
