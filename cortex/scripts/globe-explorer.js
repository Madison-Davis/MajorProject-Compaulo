(function () {
  'use strict';

  // The UI consumes project records only; rendering and coordinates stay in globe.js.
  window.createGlobeExplorer = function (options) {
    var category = 'conservation', technologies = new Set();
    var selectedId = null, matches = [], categoryButtons = [];
    var pageIndex = 0, pageSize = 3;
    var root = document.createElement('div');
    root.className = 'globe-explorer';
    function el(tag, className, text, parent) {
      var node = document.createElement(tag);
      if (className) node.className = className;
      if (text != null) node.textContent = text;
      if (parent) parent.appendChild(node);
      return node;
    }
    function button(text, className, parent, action) {
      var node = el('button', className, text, parent);
      node.type = 'button'; node.addEventListener('click', action);
      return node;
    }
    var nav = el('nav', 'explorer-categories', null, root);
    nav.setAttribute('aria-label', 'Technology project categories');
    ['all'].concat(THEMES).forEach(function (key) {
      var b = button(key === 'all' ? 'All projects' : CORTEX_CATEGORIES[key].label, '', nav, function () {
        category = key; technologies.clear(); buildTechnologyFilters(); refresh();
      });
      categoryButtons.push({ key: key, button: b });
    });
    var workspace = el('div', 'explorer-workspace', null, root);
    var left = el('aside', 'explorer-sidebar explorer-filters', null, workspace);
    left.setAttribute('aria-label', 'Category information and project filters');
    var sidebarScroll = el('div', 'explorer-sidebar-scroll', null, left);
    sidebarScroll.tabIndex = 0;
    sidebarScroll.setAttribute('aria-label', 'Scroll filters and projects');
    var introPanel = el('section', 'explorer-panel explorer-intro-panel', null, sidebarScroll);
    var categoryTitle = el('h1', '', '', introPanel);
    var categoryDescription = el('p', 'explorer-muted', '', introPanel);
    var stats = el('div', 'explorer-stats', null, introPanel);
    var projectStat = el('strong', '', '', stats);
    var regionStat = el('span', '', '', stats);
    var filterPanel = el('section', 'explorer-panel explorer-filter-panel', null, sidebarScroll);
    var filtersHeader = el('div', 'explorer-results-header', null, filterPanel);
    el('h2', '', 'Filters', filtersHeader);
    var form = el('div', 'explorer-filter-fields', null, filterPanel);
    var technologyField = el('fieldset', 'explorer-technologies', null, form);
    el('legend', 'explorer-label', 'Technology', technologyField);
    var technologyOptions = el('div', 'explorer-checks', null, technologyField);
    function selectFilter(label, values) {
      var wrapper = el('label', 'explorer-label', label, form);
      var select = el('select', 'explorer-input', null, wrapper);
      values.forEach(function (value, i) {
        var option = el('option', '', value, select); option.value = i ? value : '';
      });
      select.addEventListener('change', refresh);
      return select;
    }
    var region = selectFilter('Region', ['All regions'].concat(Array.from(new Set(CORTEX_PROJECTS.map(function (p) { return p.region; }))).sort()));
    var stage = selectFilter('Development stage', ['All stages', 'Research', 'Pilot', 'Deployed', 'Not specified']);
    var filterActions = el('div', 'explorer-filter-actions', null, filterPanel);
    button('Reset filters', 'explorer-text-button', filterActions, function () {
      search.value = ''; region.value = ''; stage.value = ''; technologies.clear();
      buildTechnologyFilters(); refresh();
    });
    var viewing = el('div', 'explorer-rotation', null, form);
    el('p', 'explorer-label', 'Rotation', viewing);
    var spin = button('Pause rotation', 'explorer-control-button', viewing, function () {
      options.setSpin(!options.isSpinning()); updateSpin();
    });
    function updateSpin() {
      spin.textContent = options.isSpinning() ? 'Pause rotation' : 'Resume rotation';
      spin.setAttribute('aria-pressed', String(!options.isSpinning()));
    }
    var projectsPanel = el('section', 'explorer-panel explorer-projects-panel', null, sidebarScroll);
    var resultsHeader = el('div', 'explorer-results-header', null, projectsPanel);
    el('h2', '', 'Projects', resultsHeader);
    var count = el('span', 'explorer-muted', '', resultsHeader);
    count.setAttribute('role', 'status');
    var searchLabel = el('label', 'explorer-label', 'Find a project', projectsPanel);
    var search = el('input', 'explorer-input', null, searchLabel);
    search.type = 'search'; search.placeholder = 'Name, place, or technology';
    search.addEventListener('input', refresh);
    var sortLabel = el('label', 'explorer-label explorer-sort', 'Sort projects', projectsPanel);
    var sort = el('select', 'explorer-input', null, sortLabel);
    [['asc', 'A → Z'], ['desc', 'Z → A']].forEach(function (entry) {
      var option = el('option', '', entry[1], sort); option.value = entry[0];
    });
    sort.addEventListener('change', function () { pageIndex = 0; renderProjects(); });
    var resultList = el('div', 'explorer-results', null, projectsPanel);
    var pagination = el('div', 'explorer-pagination', null, projectsPanel);
    var previous = button('←', 'explorer-control-button', pagination, function () { pageIndex--; renderProjects(); });
    previous.setAttribute('aria-label', 'Previous projects');
    var pageStatus = el('span', 'explorer-muted', '', pagination);
    pageStatus.setAttribute('role', 'status');
    var next = button('→', 'explorer-control-button', pagination, function () { pageIndex++; renderProjects(); });
    next.setAttribute('aria-label', 'Next projects');
    var scrollCue = button('More below ↓', 'explorer-scroll-cue', left, function () {
      sidebarScroll.scrollBy({ top: Math.max(160, sidebarScroll.clientHeight * 0.65), behavior: 'smooth' });
    });
    scrollCue.setAttribute('aria-label', 'Scroll down for more filters and projects');
    function updateScrollCue() {
      scrollCue.hidden = sidebarScroll.scrollHeight - sidebarScroll.scrollTop - sidebarScroll.clientHeight < 3;
    }
    sidebarScroll.addEventListener('scroll', updateScrollCue, { passive: true });
    if (typeof ResizeObserver !== 'undefined') {
      var sidebarObserver = new ResizeObserver(updateScrollCue);
      [sidebarScroll, introPanel, filterPanel, projectsPanel].forEach(function (node) { sidebarObserver.observe(node); });
    }
    window.addEventListener('resize', updateScrollCue);
    var center = el('section', 'explorer-globe', null, workspace);
    center.setAttribute('aria-label', 'Interactive project globe');
    center.appendChild(options.container);
    var globeHint = el('p', 'explorer-globe-hint', 'Drag to explore · Hover a dot for details · Click to keep it selected', center);
    var right = el('aside', 'explorer-panel explorer-details', null, workspace);
    right.setAttribute('aria-label', 'Project details');
    var detailHeader = el('div', 'explorer-detail-header', null, right);
    el('p', 'explorer-eyebrow', 'PROJECT SPOTLIGHT', detailHeader);
    var clear = button('×', 'explorer-close', detailHeader, function () { selectedId = null; options.highlight(null); renderDetails(null); markSelection(); });
    clear.setAttribute('aria-label', 'Clear selected project');
    var detailBody = el('div', 'explorer-detail-body', null, right);
    var selectionNote = el('p', 'explorer-selection-note', '', right);
    options.section.appendChild(root);
    // Size the square from the actual center column, including short windows.
    // Viewport-height guesses can overflow when headers or text wrap.
    function fitGlobe() {
      var availableHeight = center.clientHeight - globeHint.offsetHeight - 16;
      var size = Math.max(1, Math.floor(Math.min(center.clientWidth, availableHeight)));
      options.container.style.setProperty('--globe-size', size + 'px');
    }
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(fitGlobe).observe(center);
    window.addEventListener('resize', fitGlobe);
    fitGlobe();

    function buildTechnologyFilters() {
      technologyOptions.replaceChildren();
      var values = category === 'all'
        ? Array.from(new Set(CORTEX_PROJECTS.map(function (p) { return p.technology; }))).sort()
        : CORTEX_CATEGORIES[category].technologies;
      values.forEach(function (value) {
        var label = el('label', 'explorer-check', null, technologyOptions);
        var checkbox = el('input', '', null, label); checkbox.type = 'checkbox';
        checkbox.checked = technologies.has(value);
        el('span', '', value, label);
        checkbox.addEventListener('change', function () {
          if (checkbox.checked) technologies.add(value); else technologies.delete(value);
          refresh();
        });
      });
    }
    function refresh() {
      var base = CORTEX_PROJECTS.filter(function (p) { return category === 'all' || p.theme === category; });
      var query = search.value.trim().toLowerCase();
      matches = base.filter(function (p) {
        return (!technologies.size || technologies.has(p.technology)) &&
          (!region.value || p.region === region.value) && (!stage.value || p.stage === stage.value) &&
          (!query || [p.title, p.location, p.technology, p.description].join(' ').toLowerCase().includes(query));
      });
      categoryTitle.textContent = category === 'all' ? 'Explore technology' : CORTEX_CATEGORIES[category].label;
      categoryDescription.textContent = category === 'all' ? 'Discover projects working toward a more resilient world.' : CORTEX_CATEGORIES[category].description;
      projectStat.textContent = base.length + ' projects';
      regionStat.textContent = new Set(base.map(function (p) { return p.region; })).size + ' regions';
      categoryButtons.forEach(function (entry) { entry.button.setAttribute('aria-pressed', String(entry.key === category)); });
      options.filter(new Set(matches.map(function (p) { return p.id; })));
      if (selectedId && !matches.some(function (p) { return p.id === selectedId; })) {
        selectedId = null; renderDetails(null); options.highlight(null);
      }
      count.textContent = matches.length + ' shown';
      if (!selectedId) renderDetails(null);
      pageIndex = 0;
      renderProjects();
    }
    function sortedProjects() {
      return matches.slice().sort(function (a, b) {
        var order = a.title.localeCompare(b.title, 'en', { sensitivity: 'base' });
        return sort.value === 'desc' ? -order : order;
      });
    }
    function renderProjects() {
      var sorted = sortedProjects();
      var pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
      pageIndex = Math.max(0, Math.min(pageIndex, pageCount - 1));
      pagination.hidden = sorted.length <= pageSize;
      previous.disabled = pageIndex === 0;
      next.disabled = pageIndex === pageCount - 1;
      pageStatus.textContent = 'Page ' + (pageIndex + 1) + ' of ' + pageCount;
      resultList.replaceChildren();
      if (!matches.length) {
        el('p', 'explorer-empty', 'No projects match these filters. Try resetting them or choosing another category.', resultList);
        renderDetails(null);
      }
      sorted.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize).forEach(function (p) {
        var item = button('', 'explorer-project', resultList, function () {
          select(p); options.focus(p); updateSpin();
        });
        item.dataset.projectId = p.id;
        el('span', 'explorer-project-name', p.title, item);
        el('span', 'explorer-project-location', p.location, item);
        el('span', 'explorer-project-stage', p.demo ? p.stage + ' · Demo' : p.stage, item);
      });
      markSelection();
      updateScrollCue();
    }
    function markSelection() {
      resultList.querySelectorAll('button').forEach(function (item) {
        item.setAttribute('aria-pressed', String(item.dataset.projectId === selectedId));
      });
    }
    function renderDetails(p) {
      detailBody.replaceChildren();
      clear.hidden = !p;
      if (!p) {
        el('div', 'explorer-empty-orbit', '◎', detailBody);
        el('h2', '', matches.length ? 'A world of possibilities' : 'No projects in view', detailBody);
        el('p', 'explorer-muted', matches.length ? 'Hover over a project dot to explore its work, or choose a project from the list.' : 'Adjust the filters to discover more projects.', detailBody);
        selectionNote.textContent = 'Every dot represents a project location.';
        return;
      }
      el('span', 'explorer-badge', CORTEX_CATEGORIES[p.theme].label, detailBody);
      el('h2', '', p.title || p.name, detailBody);
      el('p', 'explorer-location', p.location, detailBody);
      el('p', 'explorer-project-description', p.description, detailBody);
      var facts = el('dl', 'explorer-facts', null, detailBody);
      [['Technology', p.technology], ['Stage', p.stage], ['Region', p.region]].forEach(function (fact) {
        el('dt', '', fact[0], facts); el('dd', '', fact[1], facts);
      });
      if (p.impact) {
        var impact = el('div', 'explorer-impact', null, detailBody);
        el('p', 'explorer-eyebrow', 'WHAT IT WORKS TOWARD', impact);
        el('p', '', p.impact, impact);
      }
      el('p', 'explorer-coordinates', Math.abs(p.latitude).toFixed(3) + '° ' + (p.latitude < 0 ? 'S' : 'N') + ' / ' + Math.abs(p.longitude).toFixed(3) + '° ' + (p.longitude < 0 ? 'W' : 'E'), detailBody);
      if (p.link && /^https?:\/\//.test(p.link)) {
        var link = el('a', 'explorer-project-link', 'Visit project ↗', detailBody);
        link.href = p.link; link.target = '_blank'; link.rel = 'noopener noreferrer';
      }
      if (p.demo) el('p', 'explorer-demo-note', 'Demo project · Fictional information for this preview.', detailBody);
      selectionNote.textContent = selectedId ? 'Selected project · Click × to clear' : 'Hover preview · Click the dot to keep it selected';
    }
    function normalize(p) { return Object.assign({}, p, { latitude: p.latitude == null ? p.lat : p.latitude, longitude: p.longitude == null ? p.lon : p.longitude }); }
    function select(p) { selectedId = p.id; renderDetails(normalize(p)); options.highlight(p.id); markSelection(); }
    buildTechnologyFilters(); refresh(); renderDetails(null); updateSpin(); updateScrollCue();
    return {
      hover: function (p) { if (!selectedId) renderDetails(p ? normalize(p) : null); },
      select: select,
      updateSpin: updateSpin
    };
  };
})();
