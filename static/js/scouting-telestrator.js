/**
 * HOOPS AI — Telestrator (Canvas Drawing Engine)
 * Extracted from scouting.js — the video annotation overlay with
 * freehand, arrow, circle, text, player-marker, spotlight and
 * court-overlay tools, zoom/pan, and inline text editor.
 *
 * Globals consumed (defined in scouting.js, available at call-time):
 *   _annotations, _vjsPlayer, _currentVideo, _playerMarkerNumber,
 *   _playerMarkerTeam, _updateZoomBadge, renderAnnotationTrack,
 *   deleteAnnotation, API, Toast, t()
 */

/* ═══ Telestrator (Canvas Drawing) ════════════════════════ */
const telestrator = {
  canvas: null,
  ctx: null,
  videoEl: null,
  tool: null,       // null = off, 'freehand', 'arrow', 'circle', 'text', 'spotlight'
  color: '#FF0000',
  strokeWidth: 3,
  opacity: 1.0,     // Phase 1.5: global annotation opacity (0.2 - 1.0)
  courtOverlayVisible: false, // Phase 2.2: court zone overlay toggle
  // Phase 4.1: Zoom & Pan
  zoom: 1,
  panX: 0,    // pan offset in % of canvas
  panY: 0,
  _isPanning: false,
  _panStartX: 0,
  _panStartY: 0,
  _panOriginX: 0,
  _panOriginY: 0,
  annotations: [],  // loaded from server
  isDrawing: false,
  currentStroke: null,
  _raf: null,
  _spotlightKeyframes: [],  // [{t, x, y}] — keyframes being built

  init(videoEl, canvasEl) {
    this.videoEl = videoEl;
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext('2d');
    this.annotations = _annotations || [];
    this._resizeCanvas();

    // ResizeObserver to sync canvas with video
    if (this._ro) this._ro.disconnect();
    this._ro = new ResizeObserver(() => {
      this._resizeCanvas();
      // Re-draw annotations after resize (canvas.width/height assignment clears content)
      this.renderFrame(_vjsPlayer ? _vjsPlayer.currentTime() : 0);
    });
    this._ro.observe(canvasEl.parentElement);

    // Pointer events
    canvasEl.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    canvasEl.addEventListener('pointermove', (e) => this.onPointerMove(e));
    canvasEl.addEventListener('pointerup', (e) => this.onPointerUp(e));
    canvasEl.addEventListener('pointerleave', (e) => { if (this.isDrawing) this.onPointerUp(e); });

    // Phase 4.1: Scroll-to-zoom
    canvasEl.parentElement.addEventListener('wheel', (e) => {
      if (!e.ctrlKey && !e.metaKey) return; // only zoom with Ctrl+scroll
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.25 : 0.25;
      this.setZoom(this.zoom + delta, e);
    }, { passive: false });

    // Phase 4.1: Middle-mouse pan
    canvasEl.parentElement.addEventListener('mousedown', (e) => {
      if (e.button === 1 && this.zoom > 1) { // middle click
        e.preventDefault();
        this._isPanning = true;
        this._panStartX = e.clientX;
        this._panStartY = e.clientY;
        this._panOriginX = this.panX;
        this._panOriginY = this.panY;
        canvasEl.parentElement.style.cursor = 'grabbing';
      }
    });
    document.addEventListener('mousemove', (e) => {
      if (!this._isPanning) return;
      const dx = (e.clientX - this._panStartX) / this.canvas.width * 100;
      const dy = (e.clientY - this._panStartY) / this.canvas.height * 100;
      this.panX = this._clampPan(this._panOriginX + dx, 'x');
      this.panY = this._clampPan(this._panOriginY + dy, 'y');
      this._applyZoomTransform();
      this.renderFrame(_vjsPlayer ? _vjsPlayer.currentTime() : 0);
    });
    document.addEventListener('mouseup', (e) => {
      if (this._isPanning) {
        this._isPanning = false;
        canvasEl.parentElement.style.cursor = '';
      }
    });

    // Click-to-edit text annotations — works even without text tool active.
    // Uses capture phase so it fires BEFORE Video.js play/pause toggle.
    // Allows clicking on text annotations to edit/move them regardless of active tool.
    const container = canvasEl.parentElement;
    if (!this._containerTextClickBound) {
      container.addEventListener('pointerdown', (e) => {
        if (this._textEditorEl) return;     // editor already open
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;
        const pct = { x: x / rect.width * 100, y: y / rect.height * 100 };
        const hitAnn = this._hitTestTextAnnotation(pct);
        if (hitAnn) {
          e.stopPropagation();
          e.preventDefault();
          // Deselect current tool so the editor opens cleanly
          if (this.tool) {
            document.querySelectorAll('.draw-tool-btn[data-tool]').forEach(b => b.classList.remove('active'));
            this.setTool(null);
          }
          if (_vjsPlayer && !_vjsPlayer.paused()) _vjsPlayer.pause();
          this._openTextEditor(
            { x: hitAnn.stroke_data.x, y: hitAnn.stroke_data.y },
            hitAnn.timestamp,
            hitAnn
          );
        }
      }, true); // capture phase

      // Cursor hint: show pointer when hovering over editable text annotation
      container.addEventListener('mousemove', (e) => {
        if (this._textEditorEl) { container.style.cursor = ''; return; }
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        if (x < 0 || y < 0 || x > rect.width || y > rect.height) { container.style.cursor = ''; return; }
        const pct = { x: x / rect.width * 100, y: y / rect.height * 100 };
        container.style.cursor = this._hitTestTextAnnotation(pct) ? 'pointer' : '';
      });

      this._containerTextClickBound = true;
    }
  },

  _resizeCanvas() {
    if (!this.canvas || !this.canvas.parentElement) return;
    const parent = this.canvas.parentElement;
    this.canvas.width = parent.clientWidth;
    this.canvas.height = parent.clientHeight;
  },

  setTool(tool) {
    // Close text editor if switching away
    if (this._textEditorEl && tool !== 'text') this._closeTextEditor();
    this.tool = this.tool === tool ? null : tool;
    this.canvas.classList.toggle('drawing', !!this.tool);
  },

  setColor(color) { this.color = color; },

  toPercent(x, y) {
    return { x: x / this.canvas.width * 100, y: y / this.canvas.height * 100 };
  },

  toPixel(px, py) {
    return { x: px / 100 * this.canvas.width, y: py / 100 * this.canvas.height };
  },

  onPointerDown(e) {
    if (!this.tool) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pct = this.toPercent(x, y);

    // Auto-pause
    if (_vjsPlayer && !_vjsPlayer.paused()) _vjsPlayer.pause();

    // ── Spotlight: each click = one keyframe ──
    if (this.tool === 'spotlight') {
      const t = _vjsPlayer ? _vjsPlayer.currentTime() : 0;
      this._spotlightKeyframes.push({ t, x: pct.x, y: pct.y });
      this._updateSpotlightUI();
      this._drawSpotlightPreview();
      return;
    }

    // ── Player Marker: click to place, drag to show movement ──
    if (this.tool === 'player_marker') {
      this.isDrawing = true;
      this.currentStroke = {
        tool: 'player_marker',
        number: _playerMarkerNumber,
        team: _playerMarkerTeam,
        startPct: pct,
        points: [pct],
        timestamp: _vjsPlayer ? _vjsPlayer.currentTime() : 0,
      };
      return;
    }

    // ── Text: open floating editor instead of prompt ──
    if (this.tool === 'text') {
      if (this._textEditorEl) return; // editor already open
      // Check if clicking on an existing text annotation → edit it
      const hitAnn = this._hitTestTextAnnotation(pct);
      if (hitAnn) {
        this._openTextEditor(
          { x: hitAnn.stroke_data.x, y: hitAnn.stroke_data.y },
          hitAnn.timestamp,
          hitAnn
        );
      } else {
        this._openTextEditor(pct, _vjsPlayer ? _vjsPlayer.currentTime() : 0, null);
      }
      return;
    }

    this.isDrawing = true;
    this.currentStroke = {
      tool: this.tool,
      color: this.color,
      width: this.strokeWidth,
      startPct: pct,
      points: [pct],
      timestamp: _vjsPlayer ? _vjsPlayer.currentTime() : 0,
    };
  },

  onPointerMove(e) {
    if (!this.isDrawing || !this.currentStroke) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pct = this.toPercent(x, y);
    this.currentStroke.points.push(pct);
    this._drawPreview();
  },

  async onPointerUp(e) {
    if (!this.isDrawing || !this.currentStroke) return;
    this.isDrawing = false;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const endPct = this.toPercent(x, y);
    const s = this.currentStroke;

    // Build stroke_data
    let strokeData, annType;
    if (s.tool === 'freehand') {
      strokeData = { points: s.points };
      annType = 'freehand';
    } else if (s.tool === 'arrow') {
      strokeData = { x1: s.startPct.x, y1: s.startPct.y, x2: endPct.x, y2: endPct.y };
      annType = 'arrow';
    } else if (s.tool === 'circle') {
      const dx = endPct.x - s.startPct.x;
      const dy = endPct.y - s.startPct.y;
      strokeData = { cx: s.startPct.x, cy: s.startPct.y, r: Math.sqrt(dx*dx + dy*dy) };
      annType = 'circle';
    } else if (s.tool === 'player_marker') {
      const dx = endPct.x - s.startPct.x;
      const dy = endPct.y - s.startPct.y;
      const hasMoved = Math.sqrt(dx*dx + dy*dy) > 2; // threshold to detect drag vs click
      strokeData = {
        number: s.number, team: s.team,
        x: s.startPct.x, y: s.startPct.y,
      };
      if (hasMoved) {
        strokeData.endX = endPct.x;
        strokeData.endY = endPct.y;
      }
      annType = 'player_marker';
    }

    // Save to server
    try {
      const res = await API.post(`/api/scouting/videos/${_currentVideo.id}/annotations`, {
        annotation_type: annType,
        timestamp: s.timestamp,
        duration: 3.0,
        stroke_data: strokeData,
        color: s.color,
        stroke_width: s.width,
        text_content: s.text || null,
      });
      this.annotations.push(res.data);
      renderAnnotationTrack();
    } catch (e) {
      console.error('Save annotation error:', e);
    }

    this.currentStroke = null;
    this._clearCanvas();
    this.renderFrame(_vjsPlayer ? _vjsPlayer.currentTime() : 0);
  },

  _drawPreview() {
    this._clearCanvas();
    if (!this.currentStroke) return;
    const s = this.currentStroke;
    const ctx = this.ctx;
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (s.tool === 'freehand') {
      ctx.beginPath();
      s.points.forEach((p, i) => {
        const px = this.toPixel(p.x, p.y);
        if (i === 0) ctx.moveTo(px.x, px.y);
        else ctx.lineTo(px.x, px.y);
      });
      ctx.stroke();
    } else if (s.tool === 'arrow' && s.points.length > 1) {
      const end = s.points[s.points.length - 1];
      const sp = this.toPixel(s.startPct.x, s.startPct.y);
      const ep = this.toPixel(end.x, end.y);
      this._drawArrow(ctx, sp.x, sp.y, ep.x, ep.y, s.color, s.width);
    } else if (s.tool === 'circle' && s.points.length > 1) {
      const end = s.points[s.points.length - 1];
      const cp = this.toPixel(s.startPct.x, s.startPct.y);
      const ep = this.toPixel(end.x, end.y);
      const r = Math.sqrt((ep.x-cp.x)**2 + (ep.y-cp.y)**2);
      ctx.beginPath();
      ctx.arc(cp.x, cp.y, r, 0, Math.PI * 2);
      ctx.stroke();
    } else if (s.tool === 'player_marker') {
      const endPt = s.points.length > 1 ? s.points[s.points.length - 1] : null;
      const sd = {
        number: s.number, team: s.team,
        x: s.startPct.x, y: s.startPct.y,
      };
      if (endPt) {
        const dx = endPt.x - s.startPct.x;
        const dy = endPt.y - s.startPct.y;
        if (Math.sqrt(dx*dx + dy*dy) > 2) {
          sd.endX = endPt.x;
          sd.endY = endPt.y;
        }
      }
      this._renderPlayerMarker(ctx, sd);
    }
  },

  renderFrame(currentTime) {
    this._clearCanvas();
    const ctx = this.ctx;

    // Force LTR direction on canvas so fillText x = left edge (not right in RTL pages)
    if (ctx) ctx.direction = 'ltr';

    // Court overlay (Phase 2.2) — rendered below annotations
    if (this.courtOverlayVisible) this._drawCourtOverlay(ctx);

    for (const ann of this.annotations) {
      if (ann._hidden) continue; // hidden during text editor preview
      const t0 = ann.timestamp;
      const t1 = t0 + ann.duration;
      if (currentTime < t0 || currentTime > t1) continue;

      // Fade
      let alpha = 1;
      if (currentTime - t0 < 0.3) alpha = (currentTime - t0) / 0.3;
      if (t1 - currentTime < 0.5) alpha = Math.min(alpha, (t1 - currentTime) / 0.5);
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha * this.opacity));

      const sd = ann.stroke_data;
      if (!sd) continue;

      ctx.strokeStyle = ann.color;
      ctx.fillStyle = ann.color;
      ctx.lineWidth = ann.stroke_width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (ann.annotation_type === 'freehand' && sd.points) {
        ctx.beginPath();
        sd.points.forEach((p, i) => {
          const px = this.toPixel(p.x, p.y);
          if (i === 0) ctx.moveTo(px.x, px.y);
          else ctx.lineTo(px.x, px.y);
        });
        ctx.stroke();
      } else if (ann.annotation_type === 'arrow') {
        const sp = this.toPixel(sd.x1, sd.y1);
        const ep = this.toPixel(sd.x2, sd.y2);
        this._drawArrow(ctx, sp.x, sp.y, ep.x, ep.y, ann.color, ann.stroke_width);
      } else if (ann.annotation_type === 'circle') {
        const cp = this.toPixel(sd.cx, sd.cy);
        const rPx = sd.r / 100 * this.canvas.width; // r is in % of width
        ctx.beginPath();
        ctx.arc(cp.x, cp.y, rPx, 0, Math.PI * 2);
        ctx.stroke();
      } else if (ann.annotation_type === 'text') {
        const tp = this.toPixel(sd.x, sd.y);
        const fontSize = (sd.fontSize || 4) / 100 * this.canvas.width;
        const isBold = sd.bold !== false; // default true for backward compat
        const isItalic = sd.italic || false;
        const hasOutline = sd.outline !== false; // default true
        const fontStr = `${isItalic ? 'italic ' : ''}${isBold ? 'bold ' : ''}${fontSize}px Space Grotesk, sans-serif`;
        ctx.font = fontStr;
        const txt = ann.text_content || '';
        // Background box
        if (sd.bgColor) {
          const metrics = ctx.measureText(txt);
          const pad = fontSize * 0.25;
          ctx.fillStyle = sd.bgColor;
          ctx.fillRect(tp.x - pad, tp.y - fontSize - pad, metrics.width + pad * 2, fontSize * 1.3 + pad * 2);
        }
        // Outline (stroke text for readability)
        if (hasOutline) {
          ctx.strokeStyle = 'rgba(0,0,0,0.7)';
          ctx.lineWidth = Math.max(2, fontSize * 0.08);
          ctx.lineJoin = 'round';
          ctx.strokeText(txt, tp.x, tp.y);
        }
        ctx.fillStyle = ann.color;
        ctx.fillText(txt, tp.x, tp.y);
      } else if (ann.annotation_type === 'player_marker') {
        this._renderPlayerMarker(ctx, sd);
      } else if (ann.annotation_type === 'spotlight') {
        ctx.globalAlpha = 1; // spotlight handles its own alpha
        this._renderSpotlight(ctx, ann, currentTime);
      }

      ctx.globalAlpha = 1;
    }
  },

  _drawArrow(ctx, x1, y1, x2, y2, color, width) {
    const headLen = 12;
    const angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    // Arrowhead
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI/6), y2 - headLen * Math.sin(angle - Math.PI/6));
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI/6), y2 - headLen * Math.sin(angle + Math.PI/6));
    ctx.stroke();
  },

  /* ── Player Marker renderer (Phase 2.1) ── */
  _renderPlayerMarker(ctx, sd) {
    const isDefense = sd.team === 'defense';
    const color = isDefense ? '#60A5FA' : '#f48c25';
    const pos = this.toPixel(sd.x, sd.y);
    const r = this.canvas.width * 0.018; // marker radius

    // Circle
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Number text
    const label = isDefense ? `X${sd.number}` : `${sd.number}`;
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${r * 1.1}px Space Grotesk, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, pos.x, pos.y);
    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';

    // Movement arrow if dragged
    if (sd.endX !== undefined && sd.endY !== undefined) {
      const endPos = this.toPixel(sd.endX, sd.endY);
      // Dashed arrow from start to end
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.lineTo(endPos.x, endPos.y);
      ctx.stroke();
      ctx.setLineDash([]);
      // Arrowhead
      const angle = Math.atan2(endPos.y - pos.y, endPos.x - pos.x);
      const hl = 10;
      ctx.beginPath();
      ctx.moveTo(endPos.x, endPos.y);
      ctx.lineTo(endPos.x - hl * Math.cos(angle - Math.PI/6), endPos.y - hl * Math.sin(angle - Math.PI/6));
      ctx.moveTo(endPos.x, endPos.y);
      ctx.lineTo(endPos.x - hl * Math.cos(angle + Math.PI/6), endPos.y - hl * Math.sin(angle + Math.PI/6));
      ctx.stroke();
      // Ghost marker at destination
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.arc(endPos.x, endPos.y, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${r * 1.1}px Space Grotesk, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, endPos.x, endPos.y);
      ctx.textAlign = 'start';
      ctx.textBaseline = 'alphabetic';
      ctx.globalAlpha = 1;
    }
  },

  /* ── Basketball Court Overlay (Phase 2.2) ── */
  _drawCourtOverlay(ctx) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;

    // Half-court proportions (% of canvas, centered)
    // Court is ~94ft × 50ft, half = 47ft × 50ft
    // We map the half court to roughly 80% width, 90% height, centered
    const cx = w * 0.5, cy = h * 0.5;
    const cw = w * 0.80, ch = h * 0.88;
    const left = cx - cw / 2, top = cy - ch / 2;
    const right = left + cw, bottom = top + ch;

    // Outer boundary
    ctx.strokeRect(left, top, cw, ch);

    // Paint / Key (lane): 19ft wide, 19ft deep from baseline
    const paintW = cw * 0.38;  // 19/50
    const paintH = ch * 0.404; // 19/47
    const paintL = cx - paintW / 2;
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
    ctx.fillStyle = 'rgba(239, 68, 68, 0.08)';
    ctx.fillRect(paintL, bottom - paintH, paintW, paintH);
    ctx.strokeRect(paintL, bottom - paintH, paintW, paintH);

    // Free throw circle (6ft radius = ~12.8% of court width)
    const ftRadius = cw * 0.12;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.arc(cx, bottom - paintH, ftRadius, Math.PI, 2 * Math.PI); // top half
    ctx.stroke();
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(cx, bottom - paintH, ftRadius, 0, Math.PI); // bottom half dashed
    ctx.stroke();
    ctx.setLineDash([]);

    // Restricted area (4ft radius arc from basket)
    const basketY = bottom - ch * 0.032; // basket ~1.5ft from baseline
    const raRadius = cw * 0.08;
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
    ctx.beginPath();
    ctx.arc(cx, basketY, raRadius, Math.PI, 2 * Math.PI);
    ctx.stroke();

    // 3-point arc: 23.75ft radius = ~47.5% of court width
    const threeR = cw * 0.475;
    const cornerLen = ch * 0.298; // 14ft corners = 14/47
    ctx.strokeStyle = 'rgba(96, 165, 250, 0.5)';
    ctx.lineWidth = 1.8;
    // Left corner line
    ctx.beginPath();
    ctx.moveTo(left + cw * 0.06, bottom);
    ctx.lineTo(left + cw * 0.06, bottom - cornerLen);
    ctx.stroke();
    // Right corner line
    ctx.beginPath();
    ctx.moveTo(right - cw * 0.06, bottom);
    ctx.lineTo(right - cw * 0.06, bottom - cornerLen);
    ctx.stroke();
    // Arc connecting corners
    const arcStartAngle = Math.asin(cornerLen / threeR);
    ctx.beginPath();
    ctx.arc(cx, basketY, threeR, Math.PI + arcStartAngle, 2 * Math.PI - arcStartAngle);
    ctx.stroke();

    // Basket (small circle)
    ctx.strokeStyle = '#f48c25';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, basketY, cw * 0.015, 0, Math.PI * 2);
    ctx.stroke();

    // Zone labels
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#fff';
    ctx.font = `${w * 0.012}px Space Grotesk, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(t('scouting.court.paint'), cx, bottom - paintH * 0.5);
    ctx.fillText(t('scouting.court.left_corner'), left + cw * 0.06, bottom - cornerLen * 0.4);
    ctx.fillText(t('scouting.court.right_corner'), right - cw * 0.06, bottom - cornerLen * 0.4);
    ctx.fillText(t('scouting.court.top'), cx, bottom - paintH - ch * 0.15);
    ctx.textAlign = 'start';

    ctx.restore();
  },

  /* ── Phase 4.1: Zoom & Pan helpers ── */
  setZoom(newZoom) {
    this.zoom = Math.max(1, Math.min(5, newZoom));
    if (this.zoom === 1) { this.panX = 0; this.panY = 0; }
    else {
      this.panX = this._clampPan(this.panX, 'x');
      this.panY = this._clampPan(this.panY, 'y');
    }
    this._applyZoomTransform();
    this.renderFrame(_vjsPlayer ? _vjsPlayer.currentTime() : 0);
    _updateZoomBadge();
  },

  _clampPan(val) {
    // Clamp so we don't pan outside the video
    const maxPan = (this.zoom - 1) / this.zoom * 50; // max % offset
    return Math.max(-maxPan, Math.min(maxPan, val));
  },

  _applyZoomTransform() {
    const videoEl = this.canvas?.parentElement?.querySelector('video');
    const canvasEl = this.canvas;
    if (!videoEl || !canvasEl) return;
    const tx = `scale(${this.zoom}) translate(${this.panX}%, ${this.panY}%)`;
    videoEl.style.transform = tx;
    canvasEl.style.transform = tx;
  },

  resetZoom() {
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;
    this._applyZoomTransform();
    this.renderFrame(_vjsPlayer ? _vjsPlayer.currentTime() : 0);
    _updateZoomBadge();
  },

  // Transform screen coords to video-space coords (accounting for zoom+pan)
  screenToVideo(x, y) {
    if (this.zoom === 1) return { x, y };
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    // Reverse the transform: canvas is scaled and translated
    const vx = (x - cw / 2) / this.zoom + cw / 2 - (this.panX / 100 * cw);
    const vy = (y - ch / 2) / this.zoom + ch / 2 - (this.panY / 100 * ch);
    return { x: vx, y: vy };
  },

  _clearCanvas() {
    if (this.ctx) this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  },

  async undo() {
    if (!this.annotations.length) return;
    const last = this.annotations.pop();
    try { await API.del(`/api/scouting/annotations/${last.id}`); } catch (e) {}
    this.renderFrame(_vjsPlayer ? _vjsPlayer.currentTime() : 0);
    renderAnnotationTrack();
  },

  async clearAll() {
    for (const ann of [...this.annotations]) {
      try { await API.del(`/api/scouting/annotations/${ann.id}`); } catch (e) {}
    }
    this.annotations = [];
    this._clearCanvas();
    renderAnnotationTrack();
  },

  // ── Spotlight helpers ──────────────────────────────────────
  _updateSpotlightUI() {
    const n = this._spotlightKeyframes.length;
    const status = document.getElementById('spotlightStatus');
    const doneBtn = document.getElementById('spotlightDoneBtn');
    if (n > 0) {
      status.textContent = `${n} pt${n > 1 ? 's' : ''}`;
      status.style.display = 'inline';
      doneBtn.style.display = (n >= 2) ? '' : 'none';
    } else {
      status.textContent = '';
      status.style.display = 'none';
      doneBtn.style.display = 'none';
    }
  },

  _drawSpotlightPreview() {
    this._clearCanvas();
    this.renderFrame(_vjsPlayer ? _vjsPlayer.currentTime() : 0);
    const ctx = this.ctx;
    // Small crosshair markers to show keyframe positions (non-intrusive)
    for (const kf of this._spotlightKeyframes) {
      const px = this.toPixel(kf.x, kf.y);
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      const s = 8;
      ctx.beginPath();
      ctx.moveTo(px.x - s, px.y); ctx.lineTo(px.x + s, px.y);
      ctx.moveTo(px.x, px.y - s); ctx.lineTo(px.x, px.y + s);
      ctx.stroke();
      ctx.restore();
    }
  },

  async saveSpotlight() {
    const kfs = this._spotlightKeyframes;
    if (kfs.length < 2) { Toast.error(t('scouting.spotlight.need_points')); return; }

    // Sort by time
    kfs.sort((a, b) => a.t - b.t);
    const startTime = kfs[0].t;
    const HOLD_SECONDS = 4; // hold at final position after last keyframe
    const duration = (kfs[kfs.length - 1].t - startTime) + HOLD_SECONDS;

    try {
      const res = await API.post(`/api/scouting/videos/${_currentVideo.id}/annotations`, {
        annotation_type: 'spotlight',
        timestamp: startTime,
        duration: Math.max(duration, HOLD_SECONDS),
        stroke_data: { keyframes: kfs },
        color: '#FFD700',
        stroke_width: 3,
        text_content: null,
      });
      this.annotations.push(res.data);
      renderAnnotationTrack();
      Toast.success(t('scouting.spotlight.saved'));
    } catch (e) {
      console.error('Save spotlight error:', e);
      Toast.error(t('scouting.spotlight.save_failed'));
    }

    this._spotlightKeyframes = [];
    this._updateSpotlightUI();
    this._clearCanvas();
    this.renderFrame(_vjsPlayer ? _vjsPlayer.currentTime() : 0);
  },

  _renderSpotlight(ctx, ann, currentTime) {
    const kfs = ann.stroke_data?.keyframes;
    if (!kfs || kfs.length < 2) return;

    // Find surrounding keyframes for interpolation
    let kfBefore = kfs[0], kfAfter = kfs[kfs.length - 1];
    for (let i = 0; i < kfs.length - 1; i++) {
      if (currentTime >= kfs[i].t && currentTime <= kfs[i + 1].t) {
        kfBefore = kfs[i];
        kfAfter = kfs[i + 1];
        break;
      }
    }

    // Interpolate position
    const segDur = kfAfter.t - kfBefore.t;
    const pct = segDur > 0 ? Math.min(1, Math.max(0, (currentTime - kfBefore.t) / segDur)) : 0;
    // Ease in-out
    const ease = pct < 0.5 ? 2 * pct * pct : 1 - Math.pow(-2 * pct + 2, 2) / 2;
    const ix = kfBefore.x + (kfAfter.x - kfBefore.x) * ease;
    const iy = kfBefore.y + (kfAfter.y - kfBefore.y) * ease;
    const pos = this.toPixel(ix, iy);

    const spotR = this.canvas.width * 0.06;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Subtle dark overlay with soft radial gradient cutout — no visible border
    ctx.save();
    const grad = ctx.createRadialGradient(pos.x, pos.y, spotR * 0.5, pos.x, pos.y, spotR * 3);
    grad.addColorStop(0, 'rgba(0,0,0,0)');       // center: fully transparent
    grad.addColorStop(0.3, 'rgba(0,0,0,0)');     // inner area: clear
    grad.addColorStop(0.6, 'rgba(0,0,0,0.15)');  // soft transition
    grad.addColorStop(1, 'rgba(0,0,0,0.3)');     // edges: 30% dim
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  },

  // ── Inline Text Editor (Canva-style) ─────────────────────────
  _textEditorEl: null,   // wrapper div (box + toolbar)
  _textEditorData: null, // { pct, timestamp, fontSize, color, editingAnn }

  _hitTestTextAnnotation(clickPct) {
    const currentTime = _vjsPlayer ? _vjsPlayer.currentTime() : 0;
    for (const ann of this.annotations) {
      if (ann.annotation_type !== 'text') continue;
      if (!ann.stroke_data) continue;
      const t0 = ann.timestamp;
      const t1 = t0 + ann.duration;
      if (currentTime < t0 || currentTime > t1) continue;
      const sd = ann.stroke_data;
      const fontSize = sd.fontSize || 4;
      const txt = ann.text_content || '';

      // Use canvas measureText for accurate width calculation
      let estWidthPct;
      if (this.ctx && txt) {
        const isBold = sd.bold !== false;
        const isItalic = sd.italic || false;
        const fontPx = fontSize / 100 * this.canvas.width;
        this.ctx.font = `${isItalic ? 'italic ' : ''}${isBold ? 'bold ' : ''}${fontPx}px Space Grotesk, sans-serif`;
        const measured = this.ctx.measureText(txt);
        estWidthPct = (measured.width / this.canvas.width) * 100;
      } else {
        const textLen = txt.length || 5;
        estWidthPct = Math.max(fontSize * textLen * 0.6, 12);
      }
      const estHeight = Math.max(fontSize * 2.5, 8);
      const pad = 5;
      if (clickPct.x >= sd.x - pad && clickPct.x <= sd.x + estWidthPct + pad &&
          clickPct.y >= sd.y - estHeight - pad && clickPct.y <= sd.y + pad) {
        return ann;
      }
    }
    return null;
  },

  _openTextEditor(pct, timestamp, existingAnn) {
    this._closeTextEditor();
    const container = this.canvas.parentElement;
    const canvasRect = this.canvas.getBoundingClientRect();
    const isEdit = !!existingAnn;
    const fontSize = isEdit ? (existingAnn.stroke_data?.fontSize || 4) : 4;
    const color = isEdit ? (existingAnn.color || this.color) : this.color;
    const text = isEdit ? (existingAnn.text_content || '') : '';

    this._textEditorData = {
      pct: { ...pct }, timestamp, fontSize, color,
      duration: isEdit ? existingAnn.duration : 3.0,
      editingAnn: existingAnn || null,
      bold: isEdit ? (existingAnn.stroke_data?.bold || false) : true,
      italic: isEdit ? (existingAnn.stroke_data?.italic || false) : false,
      outline: isEdit ? (existingAnn.stroke_data?.outline !== false) : true,
      bgColor: isEdit ? (existingAnn.stroke_data?.bgColor || null) : null,
    };

    // Convert font size from % of canvas width to CSS px
    const fontPx = fontSize / 100 * canvasRect.width;

    // Wrapper: text box on top, toolbar below
    // Force LTR so editor position matches canvas fillText rendering
    const wrap = document.createElement('div');
    wrap.className = 'te-wrap';
    wrap.dir = 'ltr';
    // Position: text baseline at pct.y, so text top ≈ pct.y - fontSize
    const leftPx = pct.x / 100 * canvasRect.width;
    const topPx = (pct.y / 100 * canvasRect.height) - fontPx;
    wrap.style.cssText = `left:${leftPx}px; top:${topPx}px; direction:ltr;`;

    // Text box first, toolbar below
    const boldCls = this._textEditorData.bold ? ' te-toggle-on' : '';
    const italicCls = this._textEditorData.italic ? ' te-toggle-on' : '';
    const outlineCls = this._textEditorData.outline ? ' te-toggle-on' : '';
    const fontStyle = `font-size:${fontPx}px; color:${color};${this._textEditorData.bold ? ' font-weight:bold;' : ' font-weight:normal;'}${this._textEditorData.italic ? ' font-style:italic;' : ''} direction:ltr; text-align:left;`;
    wrap.innerHTML = `
      <div class="te-box" style="${fontStyle}">
        <div class="te-input" contenteditable="true" spellcheck="false" dir="ltr" style="direction:ltr;text-align:left;">${text.replace(/\n/g,'<br>')}</div>
        <div class="te-handle te-handle-br" title="Resize"></div>
      </div>
      <div class="te-toolbar">
        <div class="te-btn te-move" title="Drag to move"><span class="material-symbols-outlined">open_with</span></div>
        <button class="te-btn${boldCls}" data-act="bold" title="Bold"><b>B</b></button>
        <button class="te-btn${italicCls}" data-act="italic" title="Italic"><i>I</i></button>
        <button class="te-btn${outlineCls}" data-act="outline" title="Text Outline"><span class="material-symbols-outlined">border_color</span></button>
        <button class="te-btn" data-act="smaller" title="Smaller"><span class="material-symbols-outlined">text_decrease</span></button>
        <button class="te-btn" data-act="bigger" title="Bigger"><span class="material-symbols-outlined">text_increase</span></button>
        <input type="color" class="te-color" value="${color}" title="Color">
        <button class="te-btn te-btn-del" data-act="delete" title="Delete"><span class="material-symbols-outlined">delete</span></button>
        <button class="te-btn te-btn-ok" data-act="confirm" title="Done"><span class="material-symbols-outlined">check</span></button>
      </div>`;

    container.appendChild(wrap);
    this._textEditorEl = wrap;

    const inputEl = wrap.querySelector('.te-input');
    const boxEl = wrap.querySelector('.te-box');

    // Keep text where user placed it; constrain toolbar to available space
    requestAnimationFrame(() => {
      const contRect = container.getBoundingClientRect();
      const toolbar = wrap.querySelector('.te-toolbar');
      if (!toolbar) return;
      const wrapRect = wrap.getBoundingClientRect();

      // Constrain toolbar max-width so it wraps buttons instead of overflowing
      const spaceRight = contRect.right - wrapRect.left - 4;
      if (toolbar.scrollWidth > spaceRight) {
        toolbar.style.maxWidth = Math.max(spaceRight, 100) + 'px';
      }

      // Vertical: if toolbar goes below container, flip it above the text box
      const tbRect = toolbar.getBoundingClientRect();
      if (tbRect.bottom > contRect.bottom - 4) {
        toolbar.style.marginTop = '0';
        toolbar.style.marginBottom = '4px';
        wrap.insertBefore(toolbar, wrap.firstElementChild);
      }
    });

    // Focus + select all for easy replace
    setTimeout(() => {
      inputEl.focus();
      if (text) { const sel = window.getSelection(); sel.selectAllChildren(inputEl); sel.collapseToEnd(); }
    }, 30);

    // Live preview
    const preview = () => this._textEditorPreview();
    inputEl.addEventListener('input', preview);

    // Toolbar actions
    wrap.querySelectorAll('.te-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const act = btn.dataset.act;
        if (act === 'bold') {
          this._textEditorData.bold = !this._textEditorData.bold;
          boxEl.style.fontWeight = this._textEditorData.bold ? 'bold' : 'normal';
          btn.classList.toggle('te-toggle-on', this._textEditorData.bold);
          preview();
        } else if (act === 'italic') {
          this._textEditorData.italic = !this._textEditorData.italic;
          boxEl.style.fontStyle = this._textEditorData.italic ? 'italic' : 'normal';
          btn.classList.toggle('te-toggle-on', this._textEditorData.italic);
          preview();
        } else if (act === 'outline') {
          this._textEditorData.outline = !this._textEditorData.outline;
          btn.classList.toggle('te-toggle-on', this._textEditorData.outline);
          preview();
        } else if (act === 'smaller' || act === 'bigger') {
          const delta = act === 'bigger' ? 1 : -1;
          this._textEditorData.fontSize = Math.max(1, Math.min(15, this._textEditorData.fontSize + delta));
          const newPx = this._textEditorData.fontSize / 100 * canvasRect.width;
          boxEl.style.fontSize = newPx + 'px';
          preview();
        } else if (act === 'delete') {
          const ann = this._textEditorData.editingAnn;
          this._closeTextEditor();
          if (ann) {
            const idx = this.annotations.findIndex(a => a.id === ann.id);
            if (idx >= 0) deleteAnnotation(idx);
          }
          this.renderFrame(_vjsPlayer ? _vjsPlayer.currentTime() : 0);
        } else if (act === 'confirm') {
          this._saveTextAnnotation();
        }
      });
    });

    // Color picker
    wrap.querySelector('.te-color').addEventListener('input', (e) => {
      this._textEditorData.color = e.target.value;
      boxEl.style.color = e.target.value;
      preview();
    });

    // Keys
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this._saveTextAnnotation(); }
      if (e.key === 'Escape') { this._closeTextEditor(); this.renderFrame(_vjsPlayer ? _vjsPlayer.currentTime() : 0); }
      e.stopPropagation(); // don't trigger Delete-annotation handler
    });

    // ── Drag the whole box to move ──
    this._initTextDrag(wrap, boxEl, canvasRect);

    // ── Corner handle: resize (font size) ──
    this._initTextResize(wrap, boxEl, canvasRect);

    preview();
  },

  _initTextDrag(wrap, boxEl, canvasRect) {
    let dragging = false, sx, sy, ox, oy, opx, opy;
    const startDrag = (e) => {
      dragging = true; sx = e.clientX; sy = e.clientY;
      const r = wrap.getBoundingClientRect(); const pr = wrap.parentElement.getBoundingClientRect();
      ox = r.left - pr.left; oy = r.top - pr.top;
      opx = this._textEditorData.pct.x; opy = this._textEditorData.pct.y;
      e.preventDefault();
    };
    // Drag from box border
    boxEl.addEventListener('mousedown', (e) => {
      if (e.target.closest('.te-handle') || e.target.closest('.te-input')) return;
      startDrag(e);
    });
    // Drag from move handle in toolbar
    const moveBtn = wrap.querySelector('.te-move');
    if (moveBtn) moveBtn.addEventListener('mousedown', (e) => startDrag(e));
    const onMove = (e) => {
      if (!dragging) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      wrap.style.left = (ox + dx) + 'px';
      wrap.style.top = (oy + dy) + 'px';
      this._textEditorData.pct.x = opx + (dx / canvasRect.width) * 100;
      this._textEditorData.pct.y = opy + (dy / canvasRect.height) * 100;
      this._textEditorPreview();
    };
    const onUp = () => { dragging = false; };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    // Store cleanup refs
    this._dragCleanup = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  },

  _initTextResize(wrap, boxEl, canvasRect) {
    const handle = wrap.querySelector('.te-handle-br');
    if (!handle) return;
    let resizing = false, sy, origFontSize;
    handle.addEventListener('mousedown', (e) => {
      resizing = true; sy = e.clientY; origFontSize = this._textEditorData.fontSize;
      e.preventDefault(); e.stopPropagation();
    });
    const onMove = (e) => {
      if (!resizing) return;
      const dy = e.clientY - sy;
      // Drag down = bigger, drag up = smaller
      const deltaSize = (dy / canvasRect.height) * 30;
      this._textEditorData.fontSize = Math.max(1, Math.min(15, origFontSize + deltaSize));
      const newPx = this._textEditorData.fontSize / 100 * canvasRect.width;
      boxEl.style.fontSize = newPx + 'px';
      this._textEditorPreview();
    };
    const onUp = () => { resizing = false; };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    this._resizeCleanup = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  },

  _textEditorPreview() {
    if (!this._textEditorEl || !this._textEditorData) return;
    const inputEl = this._textEditorEl.querySelector('.te-input');
    const text = inputEl ? inputEl.innerText : '';
    this._clearCanvas();
    const d = this._textEditorData;
    const editId = d.editingAnn?.id;
    if (editId) { const o = this.annotations.find(a => a.id === editId); if (o) o._hidden = true; }
    this.renderFrame(_vjsPlayer ? _vjsPlayer.currentTime() : 0);
    if (editId) { const o = this.annotations.find(a => a.id === editId); if (o) delete o._hidden; }
    // Don't draw canvas preview — the inline DOM element IS the preview
  },

  async _saveTextAnnotation() {
    if (!this._textEditorEl || !this._textEditorData) return;
    const inputEl = this._textEditorEl.querySelector('.te-input');
    const text = (inputEl ? inputEl.innerText : '').trim();
    if (!text) { Toast.error(t('scouting.ann.enter_text')); return; }

    const d = this._textEditorData;
    const isEdit = !!d.editingAnn;
    try {
      const strokePayload = {
        x: d.pct.x, y: d.pct.y, fontSize: d.fontSize,
        bold: d.bold, italic: d.italic, outline: d.outline, bgColor: d.bgColor,
      };
      if (isEdit) {
        const res = await API.put(`/api/scouting/annotations/${d.editingAnn.id}`, {
          stroke_data: strokePayload,
          color: d.color, text_content: text,
        });
        const idx = this.annotations.findIndex(a => a.id === d.editingAnn.id);
        if (idx >= 0) this.annotations[idx] = res.data;
      } else {
        const res = await API.post(`/api/scouting/videos/${_currentVideo.id}/annotations`, {
          annotation_type: 'text', timestamp: d.timestamp, duration: 3.0,
          stroke_data: strokePayload,
          color: d.color, stroke_width: 3, text_content: text,
        });
        this.annotations.push(res.data);
      }
      renderAnnotationTrack();
    } catch (e) {
      console.error('Save text error:', e);
      Toast.error(t('scouting.ann.save_failed'));
    }
    this._closeTextEditor();
    this.renderFrame(_vjsPlayer ? _vjsPlayer.currentTime() : 0);
  },

  _closeTextEditor() {
    if (this._textEditorEl) {
      this._textEditorEl.remove();
      this._textEditorEl = null;
      this._textEditorData = null;
      if (this._dragCleanup) { this._dragCleanup(); this._dragCleanup = null; }
      if (this._resizeCleanup) { this._resizeCleanup(); this._resizeCleanup = null; }
    }
  },
};
