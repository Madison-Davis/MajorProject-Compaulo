(function () {
  'use strict';

  // ── Config (greyscale palette) ────────────────────────────────────────────
  var cfg = {
    urls: { globeTexture: 'cortex-content/threejs-globe-ref/assets/textures/earth_dark.jpg' },
    sizes:   { globe: 200, globeDotSize: 2 },
    scale:   { points: 0.025, markers: 0.025, globeScale: 1 },
    colors: {
      globeDotColor:    'rgb(155, 155, 155)',
      globeMarkerColor: 'rgb(200, 200, 200)',
      globeMarkerGlow:  'rgb(255, 255, 255)',
      globeLines:       'rgb(190, 190, 190)',
      globeLinesDots:   'rgb(220, 220, 220)'
    },
    display: { points: true, map: true, lines: true, markers: true, markerLabel: true, markerPoint: true },
    dots: { total: 30 }
  };

  var els = {
    globe: null, atmosphere: null, globePoints: null,
    lineDots: [], markers: [], markerLabel: [], markerPoint: [], lines: [],
    markerHits: []
  };
  var txs  = { markerLabels: [] };
  var grps = { map: null, main: null, globe: null, lines: null, points: null, markers: null, lineDots: null };
  var ctrs = { interval: 20000, selected: null, index: 0 };
  var anims = { rotateSpeed: 0.0025, targetSpeed: 0.0025, hoveredMarkerIndex: -1, spinEnabled: true };

  // ── Shaders ───────────────────────────────────────────────────────────────
  var shaders = { atmosphere: {}, globe: {}, dot: {} };

  shaders.globe.vertexShader = [
    'varying vec3 vNormal; varying vec2 vUv;',
    'void main() {',
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
    '  vNormal = normalize(normalMatrix * normal);',
    '  vUv = uv;',
    '}'
  ].join('\n');

  shaders.globe.fragmentShader = [
    'uniform sampler2D texture;',
    'varying vec3 vNormal; varying vec2 vUv;',
    'void main() {',
    '  vec3 diffuse = texture2D(texture, vUv).xyz;',
    '  float intensity = 1.05 - dot(vNormal, vec3(0.0, 0.0, 1.0));',
    '  vec3 atmosphere = vec3(1.0, 1.0, 1.0) * pow(intensity, 3.0);',
    '  gl_FragColor = vec4(diffuse + atmosphere, 1.0);',
    '}'
  ].join('\n');

  shaders.atmosphere.vertexShader = [
    'varying vec3 vNormal;',
    'void main() {',
    '  vNormal = normalize(normalMatrix * normal);',
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
    '}'
  ].join('\n');

  shaders.atmosphere.fragmentShader = [
    'varying vec3 vNormal;',
    'void main() {',
    '  float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 4.0);',
    '  gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0) * intensity;',
    '}'
  ].join('\n');

  // ── Utils ─────────────────────────────────────────────────────────────────
  function toSphere(lat, lng, scale) {
    var phi   = (90 - lat) * Math.PI / 180;
    var theta = (180 - lng) * Math.PI / 180;
    return {
      x: scale * Math.sin(phi) * Math.cos(theta),
      y: scale * Math.cos(phi),
      z: scale * Math.sin(phi) * Math.sin(theta)
    };
  }

  var GLOBE_R = 200, CURVE_MIN = 20, CURVE_MAX = 200;

  function clamp(n, lo, hi) { return n <= lo ? lo : n >= hi ? hi : n; }

  function coordToPos(lat, lng, r) {
    var phi   = (90 - lat) * Math.PI / 180;
    var theta = (180 - lng) * Math.PI / 180;
    return new THREE.Vector3(
      -r * Math.sin(phi) * Math.cos(theta),
       r * Math.cos(phi),
      -r * Math.sin(phi) * Math.sin(theta)
    );
  }

  function splineFromCoords(latA, lonA, latB, lonB, size) {
    var start = coordToPos(latA, lonA, size);
    var end   = coordToPos(latB, lonB, size);
    var alt   = clamp(start.distanceTo(end) * 0.45, CURVE_MIN, CURVE_MAX);
    var interp = d3.geoInterpolate([lonA, latA], [lonB, latB]);
    var c1 = interp(0.25), c2 = interp(0.75);
    return {
      start: start, end: end,
      mid1: coordToPos(c1[1], c1[0], GLOBE_R + alt),
      mid2: coordToPos(c2[1], c2[0], GLOBE_R + alt)
    };
  }

  function findCountry(name) {
    return data.countries.find(function (c) { return c.name === name; });
  }

  // ── Globe class ───────────────────────────────────────────────────────────
  function Globe() {
    var radius   = cfg.sizes.globe;
    var geometry = new THREE.SphereGeometry(radius, 64, 64);

    grps.globe = new THREE.Group();
    grps.globe.name = 'Globe';

    // globe mesh
    var texture  = loader.load(cfg.urls.globeTexture);
    var globeMat = new THREE.ShaderMaterial({
      uniforms:       { texture: { value: texture } },
      vertexShader:   shaders.globe.vertexShader,
      fragmentShader: shaders.globe.fragmentShader,
      blending:       THREE.AdditiveBlending,
      transparent:    true
    });
    var globe = new THREE.Mesh(geometry, globeMat);
    globe.scale.set(cfg.scale.globeScale, cfg.scale.globeScale, cfg.scale.globeScale);
    els.globe = globe;

    grps.map = new THREE.Group();
    grps.map.name = 'Map';

    return grps.globe;
  }

  // ── Points class ──────────────────────────────────────────────────────────
  function Points(grid) {
    var radius  = cfg.sizes.globe + cfg.sizes.globe * cfg.scale.points;
    var posArr  = [], colArr = [], sizeArr = [];
    var color   = new THREE.Color();

    for (var i = 0; i < grid.length; i++) {
      var pt = toSphere(grid[i].lat, grid[i].lon, radius);
      posArr.push(-pt.x, -pt.y, -pt.z);
      sizeArr.push(cfg.sizes.globeDotSize);
      color.set(cfg.colors.globeDotColor);
      color.toArray(colArr, i * 3);
    }

    var geo = new THREE.BufferGeometry();
    geo.addAttribute('position',    new THREE.BufferAttribute(new Float32Array(posArr),  3));
    geo.addAttribute('customColor', new THREE.BufferAttribute(new Float32Array(colArr),  3));
    geo.addAttribute('size',        new THREE.BufferAttribute(new Float32Array(sizeArr), 1));

    var mat = new THREE.PointsMaterial({ color: cfg.colors.globeDotColor, size: cfg.sizes.globeDotSize });
    var pts = new THREE.Points(geo, mat);

    grps.points = new THREE.Group();
    grps.points.name = 'Points';
    grps.points.add(pts);
    els.globePoints = pts;
  }

  // ── Marker class ──────────────────────────────────────────────────────────
  function Marker(sharedMat, sharedGeo, hitGeo, label, cords, projectData) {
    this.isAnimating = false;
    this.group = new THREE.Group();
    this.group.name = 'Marker';

    // point
    this.point = new THREE.Mesh(sharedGeo, sharedMat);
    this.point.material.color.set(new THREE.Color(cfg.colors.globeMarkerColor));
    this.group.add(this.point);
    els.markerPoint.push(this.point);

    // glow
    this.glow = new THREE.Mesh(sharedGeo, sharedMat.clone());
    this.glow.material.color.set(new THREE.Color(cfg.colors.globeMarkerGlow));
    this.glow.material.opacity = 0.6;
    this.group.add(this.glow);
    els.markerPoint.push(this.glow);

    // invisible hit zone — larger sphere so raycasting is forgiving
    var hitMesh = new THREE.Mesh(hitGeo, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }));
    this.group.add(hitMesh);
    els.markerHits.push({ mesh: hitMesh, data: projectData, point: this.point, group: this.group });

    this.group.position.set(-cords.x, cords.y, -cords.z);
    grps.markers.add(this.group);
  }

  Marker.prototype.animateGlow = function () {
    if (!this.isAnimating) {
      if (Math.random() > 0.99) this.isAnimating = true;
    } else {
      this.glow.scale.x += 0.025; this.glow.scale.y += 0.025; this.glow.scale.z += 0.025;
      this.glow.material.opacity -= 0.005;
      if (this.glow.scale.x >= 4) {
        this.glow.scale.set(1, 1, 1);
        this.glow.material.opacity = 0.6;
        this.isAnimating = false;
      }
    }
  };

  function Markers(countries) {
    var radius  = cfg.sizes.globe + cfg.sizes.globe * cfg.scale.markers;
    var geo     = new THREE.SphereGeometry(2, 15, 15);
    var hitGeo  = new THREE.SphereGeometry(10, 8, 8);
    var mat     = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.8 });

    grps.markers = new THREE.Group();
    grps.markers.name = 'GlobeMarkers';

    for (var i = 0; i < countries.length; i++) {
      var c = countries[i];
      if (c.latitude && c.longitude) {
        var cords = toSphere(+c.latitude, +c.longitude, radius);
        var marker = new Marker(mat, geo, hitGeo, c.name, cords, c);
        els.markers.push(marker);
      }
    }
  }

  // ── Dot / Dots ────────────────────────────────────────────────────────────
  function Dot() {
    this.geometry = new THREE.SphereGeometry(2, 32, 32);
    this.material = new THREE.MeshBasicMaterial({ color: cfg.colors.globeLinesDots, transparent: true, opacity: 0.65 });
    this.mesh     = new THREE.Mesh(this.geometry, this.material);
    this.mesh.visible = false;
    this._path = null; this._pathIndex = 0;
  }

  Dot.prototype.assignToLine = function () {
    if (ctrs.selected) {
      var lines = ctrs.selected.children;
      var line  = lines[Math.floor(Math.random() * lines.length)];
      this._path = line._path;
    }
  };

  Dot.prototype.animate = function () {
    if (!this._path) {
      if (Math.random() > 0.99) { this.assignToLine(); this._pathIndex = 0; }
    } else if (this._pathIndex < this._path.length - 1) {
      this.mesh.visible = true;
      var p = this._path[this._pathIndex++];
      this.mesh.position.set(p.x, p.y, p.z);
    } else {
      this.mesh.visible = false; this._path = null;
    }
  };

  function spawnDots() {
    grps.lineDots = new THREE.Group();
    grps.lineDots.name = 'LineDots';
    for (var i = 0; i < cfg.dots.total; i++) {
      var dot = new Dot();
      grps.lineDots.add(dot.mesh);
      els.lineDots.push(dot);
    }
    grps.globe.add(grps.lineDots);
  }

  // ── Lines ─────────────────────────────────────────────────────────────────
  function buildLine(start, end) {
    var r = cfg.sizes.globe + cfg.sizes.globe * cfg.scale.markers;
    var sp = splineFromCoords(start.latitude, start.longitude, end.latitude, end.longitude, r);
    var curve = new THREE.CubicBezierCurve3(sp.start, sp.mid1, sp.mid2, sp.end);
    var geo   = new THREE.Geometry();
    geo.vertices = curve.getPoints(200);
    var ml  = new MeshLine(); ml.setGeometry(geo);
    var mat = new MeshLineMaterial({ color: cfg.colors.globeLines, transparent: true, opacity: 0.45 });
    var mesh = new THREE.Mesh(ml.geometry, mat);
    mesh._path = geo.vertices;
    return mesh;
  }

  function Lines() {
    var keys = Object.keys(data.connections);
    var total = keys.length;

    grps.lines = new THREE.Group(); grps.lines.name = 'Lines';

    for (var i = 0; i < keys.length; i++) {
      var key   = keys[i];
      var start = findCountry(key);
      var group = new THREE.Group(); group.name = key;
      var dests = data.connections[key];
      for (var j = 0; j < dests.length; j++) {
        if (!dests[j]) continue;
        var mesh = buildLine(start, dests[j]);
        els.lines.push(mesh); group.add(mesh);
      }
      group.visible = false;
      grps.lines.add(group);
    }

    // select first country
    var selectIdx = 0;
    function select() {
      var g = grps.lines.getObjectByName(keys[selectIdx]);
      if (ctrs.selected) ctrs.selected.visible = false;
      ctrs.selected = g;
      if (g) g.visible = true;
    }
    select();

    setInterval(function () {
      selectIdx = (selectIdx + 1) % total;
      els.lineDots = [];
      select();
      if (grps.lineDots) { grps.lineDots.children = []; }
      spawnDots();
    }, ctrs.interval);
  }

  // ── App (container-scoped, no GUI/Stats) ──────────────────────────────────
  var loader;

  function setup(app) {
    app.camera.position.z = cfg.sizes.globe * 2.2;
    app.camera.position.y = 0;
    app.controls.enableDamping = true;
    app.controls.dampingFactor = 0.05;
    app.controls.rotateSpeed   = 0.07;
    app.controls.enableZoom    = false;
    app.controls.enablePan     = false;

    grps.main = new THREE.Group(); grps.main.name = 'Main';

    var globe = new Globe();
    grps.main.add(globe);

    new Points(data.grid);
    grps.globe.add(grps.points);

    var cortexMarkers = CORTEX_PROJECTS.map(function (p) {
      return { name: p.title, latitude: p.lat, longitude: p.lon, description: p.description, link: p.link, theme: p.theme };
    });
    new Markers(cortexMarkers);
    grps.globe.add(grps.markers);

    app.scene.add(grps.main);
  }

  function animate() {
    for (var j = 0; j < els.markers.length; j++) {
      var m = els.markers[j];
      m.point.material.color.set(cfg.colors.globeMarkerColor);
      m.glow.material.color.set(cfg.colors.globeMarkerGlow);
      m.animateGlow();
    }
    for (var k = 0; k < els.markerHits.length; k++) {
      var h = els.markerHits[k];
      var tgt = (h.group.visible && k === anims.hoveredMarkerIndex) ? 3 : 1;
      h.point.scale.x += (tgt - h.point.scale.x) * 0.15;
      h.point.scale.y += (tgt - h.point.scale.y) * 0.15;
      h.point.scale.z += (tgt - h.point.scale.z) * 0.15;
    }
    anims.rotateSpeed += (anims.targetSpeed - anims.rotateSpeed) * 0.05;
    grps.globe.rotation.y -= anims.rotateSpeed;
  }

  window.addEventListener('load', function () {
    var container = document.getElementById('globe-wrap');
    if (!container) return;
    var globeSection = document.getElementById('globe-section');

    var W = container.clientWidth;
    var H = container.clientHeight || W;

    loader = new THREE.TextureLoader();

    var scene    = new THREE.Scene();
    var camera   = new THREE.PerspectiveCamera(60, W / H, 0.1, 10000);
    camera.lookAt(scene.position);
    camera.position.set(0, 15, 30);

    var renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setClearColor(0x000000, 1.0);
    renderer.setSize(W, H);
    renderer.setPixelRatio(window.devicePixelRatio * 1.5);
    renderer.shadowMap.enabled = true;
    renderer.domElement.style.display = 'block';
    container.appendChild(renderer.domElement);

    container.addEventListener('mouseenter', function () { if (anims.spinEnabled) anims.targetSpeed = 0; });
    container.addEventListener('mouseleave', function () { if (anims.spinEnabled) anims.targetSpeed = 0.0025; anims.hoveredMarkerIndex = -1; });

    // ── Side panel (legend + popup) ──────────────────────────────────────────
    var THEMES = ['education','food','water','health','animals','plants','energy','innovation'];
    var activeThemes = new Set(THEMES);
    var currentPopupData = null;
    var dropOpen = false;
    var globeIsVisible = false;

    // ── Legend card — fixed top-left ──────────────────────────────────────────
    var legendEl = document.createElement('div');
    legendEl.style.cssText = 'position:absolute;top:2rem;left:2rem;width:220px;background:#0a0a0a;border:1px solid rgba(255,255,255,0.1);padding:1rem 1.1rem;z-index:20;opacity:0;pointer-events:none;transition:opacity 0.3s ease;';

    // Spin toggle row
    var spinRow = document.createElement('div');
    spinRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:0.85rem;';
    var spinLabel = document.createElement('p');
    spinLabel.textContent = 'ROTATE';
    spinLabel.style.cssText = 'margin:0;font-family:Manrope,sans-serif;font-size:0.58rem;font-weight:700;letter-spacing:0.12em;color:rgba(255,255,255,0.3);';
    var spinToggle = document.createElement('button');
    spinToggle.style.cssText = 'position:relative;width:30px;height:17px;border-radius:9px;border:none;background:rgba(255,255,255,0.65);cursor:pointer;padding:0;flex-shrink:0;transition:background 0.2s;';
    var spinKnob = document.createElement('span');
    spinKnob.style.cssText = 'position:absolute;top:2.5px;left:2.5px;width:12px;height:12px;border-radius:50%;background:#000;transition:transform 0.2s;transform:translateX(13px);';
    spinToggle.appendChild(spinKnob);
    spinToggle.addEventListener('click', function () {
      anims.spinEnabled = !anims.spinEnabled;
      anims.targetSpeed = anims.spinEnabled ? 0.0025 : 0;
      spinToggle.style.background = anims.spinEnabled ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.18)';
      spinKnob.style.transform = anims.spinEnabled ? 'translateX(13px)' : 'translateX(0)';
    });
    spinRow.appendChild(spinLabel);
    spinRow.appendChild(spinToggle);
    legendEl.appendChild(spinRow);

    // Divider
    var divEl = document.createElement('div');
    divEl.style.cssText = 'border-top:1px solid rgba(255,255,255,0.07);margin:0 -1.1rem 0.85rem;';
    legendEl.appendChild(divEl);

    // Filter label
    var filterLabel = document.createElement('p');
    filterLabel.textContent = 'FILTER BY TOPIC';
    filterLabel.style.cssText = 'margin:0 0 0.5rem;font-family:Manrope,sans-serif;font-size:0.58rem;font-weight:700;letter-spacing:0.12em;color:rgba(255,255,255,0.3);';
    legendEl.appendChild(filterLabel);

    // Dropdown trigger
    var dropWrap = document.createElement('div');
    dropWrap.style.cssText = 'position:relative;';
    var dropTrigger = document.createElement('button');
    dropTrigger.style.cssText = 'width:100%;display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);padding:0.38rem 0.7rem;cursor:pointer;font-family:Manrope,sans-serif;font-size:0.7rem;color:#fff;';
    var trigText = document.createElement('span');
    trigText.textContent = 'All Topics';
    var trigArrow = document.createElement('span');
    trigArrow.textContent = '▾';
    trigArrow.style.cssText = 'font-size:0.6rem;color:rgba(255,255,255,0.45);transition:transform 0.18s;margin-left:0.4rem;';
    dropTrigger.appendChild(trigText);
    dropTrigger.appendChild(trigArrow);

    // Dropdown panel
    var dropPanel = document.createElement('div');
    dropPanel.style.cssText = 'display:none;position:absolute;top:100%;left:0;right:0;background:#0f0f0f;border:1px solid rgba(255,255,255,0.12);border-top:none;z-index:20;max-height:200px;overflow-y:auto;';

    function updateTrigText() {
      trigText.textContent = activeThemes.size === THEMES.length ? 'All Topics'
        : activeThemes.size === 0 ? 'None'
        : activeThemes.size + ' of ' + THEMES.length;
    }

    function applyFilter() {
      for (var i = 0; i < els.markerHits.length; i++) {
        var h = els.markerHits[i];
        h.group.visible = activeThemes.has(h.data.theme);
        if (!h.group.visible) h.point.scale.set(1, 1, 1);
      }
      if (currentPopupData && !activeThemes.has(currentPopupData.theme)) hidePopup();
      updateTrigText();
    }

    // All / None toggle row
    var allNoneRow = document.createElement('div');
    allNoneRow.style.cssText = 'display:flex;gap:0.4rem;padding:0.4rem 0.7rem 0.3rem;border-bottom:1px solid rgba(255,255,255,0.07);';
    var allCbs = [];
    function makeToggleBtn(label) {
      var btn = document.createElement('button');
      btn.textContent = label;
      btn.style.cssText = 'flex:1;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);color:rgba(255,255,255,0.6);font-family:Manrope,sans-serif;font-size:0.6rem;font-weight:700;letter-spacing:0.08em;padding:0.22rem 0;cursor:pointer;';
      btn.addEventListener('mouseover', function () { btn.style.background = 'rgba(255,255,255,0.12)'; });
      btn.addEventListener('mouseout',  function () { btn.style.background = 'rgba(255,255,255,0.06)'; });
      return btn;
    }
    var btnAll  = makeToggleBtn('ALL');
    var btnNone = makeToggleBtn('NONE');
    btnAll.addEventListener('click', function (e) {
      e.stopPropagation();
      THEMES.forEach(function (t) { activeThemes.add(t); });
      allCbs.forEach(function (cb) { cb.checked = true; });
      applyFilter();
    });
    btnNone.addEventListener('click', function (e) {
      e.stopPropagation();
      activeThemes.clear();
      allCbs.forEach(function (cb) { cb.checked = false; });
      applyFilter();
    });
    allNoneRow.appendChild(btnAll);
    allNoneRow.appendChild(btnNone);
    dropPanel.appendChild(allNoneRow);

    THEMES.forEach(function (theme) {
      var row = document.createElement('label');
      row.style.cssText = 'display:flex;align-items:center;gap:0.5rem;padding:0.38rem 0.7rem;cursor:pointer;font-family:Manrope,sans-serif;font-size:0.7rem;color:#fff;user-select:none;';
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = true;
      cb.style.cssText = 'accent-color:#aaa;width:11px;height:11px;cursor:pointer;flex-shrink:0;';
      allCbs.push(cb);
      var txt = document.createElement('span');
      txt.textContent = theme.charAt(0).toUpperCase() + theme.slice(1);
      row.appendChild(cb);
      row.appendChild(txt);
      row.addEventListener('mouseover', function () { row.style.background = 'rgba(255,255,255,0.04)'; });
      row.addEventListener('mouseout',  function () { row.style.background = ''; });
      cb.addEventListener('change', function () {
        if (cb.checked) { activeThemes.add(theme); } else { activeThemes.delete(theme); }
        applyFilter();
      });
      dropPanel.appendChild(row);
    });

    dropTrigger.addEventListener('click', function (e) {
      e.stopPropagation();
      dropOpen = !dropOpen;
      dropPanel.style.display = dropOpen ? 'block' : 'none';
      trigArrow.style.transform = dropOpen ? 'rotate(180deg)' : '';
    });
    document.addEventListener('click', function () {
      if (dropOpen) { dropOpen = false; dropPanel.style.display = 'none'; trigArrow.style.transform = ''; }
    });
    dropPanel.addEventListener('click', function (e) { e.stopPropagation(); });

    dropWrap.appendChild(dropTrigger);
    dropWrap.appendChild(dropPanel);
    legendEl.appendChild(dropWrap);
    globeSection.appendChild(legendEl);

    // ── Popup card — absolute middle-left of globe ────────────────────────────
    var popupEl = document.createElement('div');
    popupEl.style.cssText = 'position:absolute;top:35%;left:2rem;transform:translateY(-50%);width:220px;background:#0a0a0a;border:1px solid rgba(255,255,255,0.1);padding:1.5rem 1.1rem 1.1rem;z-index:10;opacity:0;pointer-events:none;transition:opacity 0.2s ease;';
    var popupClose = document.createElement('button');
    popupClose.textContent = '×';
    popupClose.style.cssText = 'position:absolute;top:0.6rem;right:0.7rem;background:none;border:none;color:rgba(255,255,255,0.4);font-size:1.1rem;cursor:pointer;line-height:1;padding:0;font-family:sans-serif;';
    popupClose.addEventListener('click', function () { hidePopup(); });
    var popupTheme = document.createElement('p');
    popupTheme.style.cssText = 'margin:0 0 0.35rem;font-family:Manrope,sans-serif;font-size:0.6rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.35);';
    var popupTitle = document.createElement('h3');
    popupTitle.style.cssText = 'margin:0 0 0.6rem;font-family:Manrope,sans-serif;font-size:0.88rem;font-weight:700;color:#fff;line-height:1.3;';
    var popupDesc = document.createElement('p');
    popupDesc.style.cssText = 'margin:0 0 1rem;font-family:Manrope,sans-serif;font-size:0.76rem;color:rgba(255,255,255,0.55);line-height:1.5;';
    var popupLink = document.createElement('a');
    popupLink.textContent = 'Learn More ↗';
    popupLink.target = '_blank';
    popupLink.style.cssText = 'font-family:Manrope,sans-serif;font-size:0.66rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#fff;text-decoration:none;border:1px solid rgba(255,255,255,0.25);padding:0.38rem 0.8rem;display:inline-block;';
    popupEl.appendChild(popupClose);
    popupEl.appendChild(popupTheme);
    popupEl.appendChild(popupTitle);
    popupEl.appendChild(popupDesc);
    popupEl.appendChild(popupLink);
    globeSection.appendChild(popupEl);

    function showPopup(p) {
      if (!globeIsVisible) return;
      currentPopupData = p;
      popupTheme.textContent = p.theme || '';
      popupTitle.textContent = p.name || '';
      popupDesc.textContent = p.description || '';
      popupLink.href = p.link || '#';
      popupEl.style.opacity = legendEl.style.opacity || '1';
      popupEl.style.pointerEvents = 'auto';
    }
    function hidePopup() {
      currentPopupData = null;
      popupEl.style.opacity = '0';
      popupEl.style.pointerEvents = 'none';
    }

    // Legend + popup both fade with scroll
    function updateSideVisibility() {
      var r = container.getBoundingClientRect();
      var vh = window.innerHeight;
      var visiblePx = Math.max(Math.min(r.bottom, vh) - Math.max(r.top, 0), 0);
      var opacity = Math.min(visiblePx / (r.height * 0.35), 1);
      globeIsVisible = opacity > 0.05;
      legendEl.style.opacity = opacity;
      legendEl.style.pointerEvents = globeIsVisible ? '' : 'none';
      if (currentPopupData) {
        popupEl.style.opacity = String(opacity);
        popupEl.style.pointerEvents = globeIsVisible ? 'auto' : 'none';
      }
      if (!globeIsVisible) { hidePopup(); dropOpen = false; dropPanel.style.display = 'none'; trigArrow.style.transform = ''; }
    }
    window.addEventListener('scroll', updateSideVisibility, { passive: true });
    updateSideVisibility();

    // ── Raycaster ────────────────────────────────────────────────────────────
    var raycaster = new THREE.Raycaster();
    var mouse = new THREE.Vector2(-999, -999);

    container.addEventListener('mousemove', function (e) {
      var rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width)  * 2 - 1;
      mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      var targets = els.markerHits.map(function (h) { return h.mesh; });
      var hits = raycaster.intersectObjects(targets);
      if (hits.length > 0) {
        for (var k = 0; k < els.markerHits.length; k++) {
          if (els.markerHits[k].mesh === hits[0].object && els.markerHits[k].group.visible) {
            anims.hoveredMarkerIndex = k;
            showPopup(els.markerHits[k].data);
            break;
          }
        }
      } else {
        anims.hoveredMarkerIndex = -1;
      }
    });

    var orbitControls = new THREE.OrbitControls(camera, renderer.domElement);

    var app = { scene: scene, camera: camera, controls: orbitControls, renderer: renderer };
    setup(app);

    function loop() {
      animate();
      orbitControls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(loop);
    }
    loop();

    window.addEventListener('resize', function () {
      W = container.clientWidth;
      H = container.clientHeight || W;
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
      renderer.setSize(W, H);
    });
  });
})();
