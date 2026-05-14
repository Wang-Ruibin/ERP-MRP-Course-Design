const STORAGE_KEY = "mrp-system-state-v2";

const sampleState = {
  horizon: 12,
  items: [
    { code: "X", name: "产品X", leadTime: 4, onHand: 18, allocated: 10, safetyStock: 5, lotRule: "L4L", lotSize: 0 },
    { code: "Y", name: "产品Y", leadTime: 4, onHand: 16, allocated: 0, safetyStock: 6, lotRule: "L4L", lotSize: 0 },
    { code: "B", name: "部件B", leadTime: 3, onHand: 10, allocated: 0, safetyStock: 0, lotRule: "L4L", lotSize: 0 },
    { code: "C", name: "部件C", leadTime: 2, onHand: 20, allocated: 0, safetyStock: 0, lotRule: "L4L", lotSize: 0 },
    { code: "D", name: "部件D", leadTime: 1, onHand: 0, allocated: 0, safetyStock: 0, lotRule: "FIXED", lotSize: 200 },
    { code: "E", name: "部件E", leadTime: 1, onHand: 30, allocated: 0, safetyStock: 0, lotRule: "FIXED", lotSize: 500 }
  ],
  bom: [
    { parent: "X", child: "B", quantity: 1 },
    { parent: "X", child: "C", quantity: 2 },
    { parent: "Y", child: "C", quantity: 2 },
    { parent: "Y", child: "E", quantity: 1 },
    { parent: "C", child: "D", quantity: 1 },
    { parent: "C", child: "E", quantity: 2 }
  ],
  demands: [
    { itemCode: "X", week: 8, quantity: 103 },
    { itemCode: "Y", week: 7, quantity: 200 }
  ]
};

const state = loadState();
const hasLocalCache = hasPersistedState();
const uiState = {
  mrpPage: 0,
  history: []
};

const refs = {
  horizonInput: document.getElementById("horizonInput"),
  itemsTableBody: document.querySelector("#itemsTable tbody"),
  bomTableBody: document.querySelector("#bomTable tbody"),
  demandsTableBody: document.querySelector("#demandsTable tbody"),
  summaryStrip: document.getElementById("summaryStrip"),
  warningBox: document.getElementById("warningBox"),
  ordersTableBody: document.querySelector("#ordersTable tbody"),
  mrpPager: document.getElementById("mrpPager"),
  mrpTables: document.getElementById("mrpTables"),
  bomCanvas: document.getElementById("bomCanvas"),
  historyTableBody: document.querySelector("#historyTable tbody"),
  updatedAt: document.getElementById("updatedAt"),
  dbStatusBar: document.getElementById("dbStatusBar"),
  loadDbBtn: document.getElementById("loadDbBtn"),
  saveDbBtn: document.getElementById("saveDbBtn"),
  initDbBtn: document.getElementById("initDbBtn"),
  exportExcelBtn: document.getElementById("exportExcelBtn"),
  addItemBtn: document.getElementById("addItemBtn"),
  addBomBtn: document.getElementById("addBomBtn"),
  addDemandBtn: document.getElementById("addDemandBtn"),
  tabs: Array.from(document.querySelectorAll(".tab")),
  emptyStateTemplate: document.getElementById("emptyStateTemplate")
};

let latestResult = null;
let dbStatus = {
  level: window.location.protocol.startsWith("http") ? "warn" : "error",
  text: window.location.protocol.startsWith("http") ? "正在检查数据库连接" : "当前是本地文件模式，数据库功能需通过后端启动"
};

initialize();

function initialize() {
  bindEvents();
  renderAll();
  renderDbStatus();
  recalculate();
  refreshDbStatus(!hasLocalCache);
  loadHistory(true);
}

function bindEvents() {
  refs.loadDbBtn.addEventListener("click", () => loadFromDatabase(false));
  refs.saveDbBtn.addEventListener("click", saveToDatabase);
  refs.initDbBtn.addEventListener("click", initializeDatabase);
  refs.exportExcelBtn.addEventListener("click", exportExcelReport);

  refs.addItemBtn.addEventListener("click", () => {
    syncStateFromTables();
    state.items.push({ code: "", name: "", leadTime: 1, onHand: 0, allocated: 0, safetyStock: 0, lotRule: "L4L", lotSize: 0 });
    renderItemsTable();
    persistState();
  });

  refs.addBomBtn.addEventListener("click", () => {
    syncStateFromTables();
    state.bom.push({ parent: "", child: "", quantity: 1 });
    renderBomTable();
    persistState();
  });

  refs.addDemandBtn.addEventListener("click", () => {
    syncStateFromTables();
    state.demands.push({ itemCode: "", week: 1, quantity: 0 });
    renderDemandsTable();
    persistState();
  });

  refs.horizonInput.addEventListener("change", () => {
    state.horizon = clampNumber(refs.horizonInput.value, 1, 52, 12);
    persistState();
    recalculate();
  });

  refs.tabs.forEach((tab) => {
    tab.addEventListener("click", () => activateTab(tab.dataset.tab));
  });

  refs.itemsTableBody.addEventListener("click", handleRowDelete);
  refs.bomTableBody.addEventListener("click", handleRowDelete);
  refs.demandsTableBody.addEventListener("click", handleRowDelete);
  refs.historyTableBody.addEventListener("click", handleHistoryAction);
  refs.mrpPager.addEventListener("click", handleMrpPagerClick);
  refs.mrpPager.addEventListener("change", handleMrpPagerChange);

  refs.itemsTableBody.addEventListener("change", () => {
    syncStateFromTables();
    renderAll();
    recalculate();
  });

  refs.bomTableBody.addEventListener("change", () => {
    syncStateFromTables();
    renderAll();
    recalculate();
  });

  refs.demandsTableBody.addEventListener("change", () => {
    syncStateFromTables();
    renderAll();
    recalculate();
  });
}

function renderAll() {
  sortStateData(state);
  refs.horizonInput.value = state.horizon;
  renderItemsTable();
  renderBomTable();
  renderDemandsTable();
  renderHistory();
}

function renderItemsTable() {
  const meta = getItemMeta(state.items, state.bom, state.demands);
  refs.itemsTableBody.innerHTML = state.items.map((item, index) => `
    <tr>
      <td><span class="kind-tag ${getItemMetaKind(meta, item.code)}">${getItemMetaLabel(meta.get(item.code))}</span></td>
      <td><input type="text" data-table="items" data-index="${index}" data-field="code" value="${escapeAttr(item.code)}"></td>
      <td><input type="text" data-table="items" data-index="${index}" data-field="name" value="${escapeAttr(item.name)}"></td>
      <td><input type="number" min="0" step="1" data-table="items" data-index="${index}" data-field="leadTime" value="${escapeAttr(item.leadTime)}"></td>
      <td><input type="number" min="0" step="1" data-table="items" data-index="${index}" data-field="onHand" value="${escapeAttr(item.onHand)}"></td>
      <td><input type="number" min="0" step="1" data-table="items" data-index="${index}" data-field="allocated" value="${escapeAttr(item.allocated)}"></td>
      <td><input type="number" min="0" step="1" data-table="items" data-index="${index}" data-field="safetyStock" value="${escapeAttr(item.safetyStock)}"></td>
      <td>
        <select data-table="items" data-index="${index}" data-field="lotRule">
          <option value="L4L" ${item.lotRule === "L4L" ? "selected" : ""}>按净需求</option>
          <option value="FIXED" ${item.lotRule === "FIXED" ? "selected" : ""}>固定批量</option>
        </select>
      </td>
      <td><input type="number" min="0" step="1" data-table="items" data-index="${index}" data-field="lotSize" value="${escapeAttr(item.lotSize)}"></td>
      <td><button type="button" class="row-action" data-action="delete" data-table="items" data-index="${index}">删</button></td>
    </tr>
  `).join("");
}

function renderBomTable() {
  const itemCodes = getSortedItemCodes();
  refs.bomTableBody.innerHTML = state.bom.map((row, index) => `
    <tr>
      <td>${renderCodeSelect("bom", index, "parent", row.parent, itemCodes)}</td>
      <td>${renderCodeSelect("bom", index, "child", row.child, itemCodes)}</td>
      <td><input type="number" min="1" step="1" data-table="bom" data-index="${index}" data-field="quantity" value="${escapeAttr(row.quantity)}"></td>
      <td><button type="button" class="row-action" data-action="delete" data-table="bom" data-index="${index}">删</button></td>
    </tr>
  `).join("");
}

function renderDemandsTable() {
  const itemCodes = getSortedItemCodes();
  refs.demandsTableBody.innerHTML = state.demands.map((row, index) => `
    <tr>
      <td>${renderCodeSelect("demands", index, "itemCode", row.itemCode, itemCodes)}</td>
      <td><input type="number" min="1" step="1" data-table="demands" data-index="${index}" data-field="week" value="${escapeAttr(row.week)}"></td>
      <td><input type="number" min="0" step="1" data-table="demands" data-index="${index}" data-field="quantity" value="${escapeAttr(row.quantity)}"></td>
      <td><button type="button" class="row-action" data-action="delete" data-table="demands" data-index="${index}">删</button></td>
    </tr>
  `).join("");
}

function renderCodeSelect(table, index, field, currentValue, options) {
  const optionMarkup = [`<option value="">请选择</option>`]
    .concat(options.map((code) => `<option value="${escapeAttr(code)}" ${code === currentValue ? "selected" : ""}>${escapeHtml(code)}</option>`))
    .join("");

  return `<select data-table="${table}" data-index="${index}" data-field="${field}">${optionMarkup}</select>`;
}

function handleRowDelete(event) {
  const button = event.target.closest("[data-action='delete']");
  if (!button) {
    return;
  }

  const table = button.dataset.table;
  const index = Number(button.dataset.index);
  if (!Number.isInteger(index) || index < 0) {
    return;
  }

  syncStateFromTables();
  state[table].splice(index, 1);
  renderAll();
  recalculate();
}

function handleMrpPagerClick(event) {
  const action = event.target.dataset.action;
  if (!action || !latestResult) {
    return;
  }
  const totalPages = Math.max(1, Math.ceil(latestResult.items.length / 2));
  if (action === "prev") {
    uiState.mrpPage = Math.max(0, uiState.mrpPage - 1);
  }
  if (action === "next") {
    uiState.mrpPage = Math.min(totalPages - 1, uiState.mrpPage + 1);
  }
  renderMrpTables(latestResult);
}

function handleMrpPagerChange(event) {
  if (event.target.id !== "mrpPageSelect" || !latestResult) {
    return;
  }
  const totalPages = Math.max(1, Math.ceil(latestResult.items.length / 2));
  uiState.mrpPage = clampNumber(event.target.value, 0, totalPages - 1, 0);
  renderMrpTables(latestResult);
}

function handleHistoryAction(event) {
  const button = event.target.closest("[data-history-id]");
  if (!button) {
    return;
  }
  if (button.dataset.historyAction === "delete") {
    deleteHistorySnapshot(button.dataset.historyId);
    return;
  }
  loadHistorySnapshot(button.dataset.historyId);
}

function syncStateFromTables() {
  state.horizon = clampNumber(refs.horizonInput.value, 1, 52, 12);

  state.items = Array.from(refs.itemsTableBody.querySelectorAll("tr"))
    .map((row) => ({
      code: readField(row, "code").toUpperCase().trim(),
      name: readField(row, "name").trim(),
      leadTime: clampNumber(readField(row, "leadTime"), 0, 52, 0),
      onHand: clampNumber(readField(row, "onHand"), 0, Number.MAX_SAFE_INTEGER, 0),
      allocated: clampNumber(readField(row, "allocated"), 0, Number.MAX_SAFE_INTEGER, 0),
      safetyStock: clampNumber(readField(row, "safetyStock"), 0, Number.MAX_SAFE_INTEGER, 0),
      lotRule: readField(row, "lotRule") === "FIXED" ? "FIXED" : "L4L",
      lotSize: clampNumber(readField(row, "lotSize"), 0, Number.MAX_SAFE_INTEGER, 0)
    }))
    .filter((item) => item.code);

  state.bom = Array.from(refs.bomTableBody.querySelectorAll("tr"))
    .map((row) => ({
      parent: readField(row, "parent").toUpperCase().trim(),
      child: readField(row, "child").toUpperCase().trim(),
      quantity: clampNumber(readField(row, "quantity"), 1, Number.MAX_SAFE_INTEGER, 1)
    }))
    .filter((row) => row.parent && row.child);

  state.demands = Array.from(refs.demandsTableBody.querySelectorAll("tr"))
    .map((row) => ({
      itemCode: readField(row, "itemCode").toUpperCase().trim(),
      week: clampNumber(readField(row, "week"), 1, 52, 1),
      quantity: clampNumber(readField(row, "quantity"), 0, Number.MAX_SAFE_INTEGER, 0)
    }))
    .filter((row) => row.itemCode && row.quantity > 0);

  sortStateData(state);
  persistState();
}

function recalculate() {
  try {
    latestResult = calculateMrp(state);
    uiState.mrpPage = Math.min(uiState.mrpPage, Math.max(0, Math.ceil(latestResult.items.length / 2) - 1));
    renderSummary(latestResult);
    renderWarnings(latestResult);
    renderOrders(latestResult);
    renderMrpTables(latestResult);
    renderBomTree(latestResult);
    refs.updatedAt.textContent = `更新时间：${formatDateTime(new Date())}`;
  } catch (error) {
    latestResult = null;
    renderErrorState(error.message || "计算失败");
  }
}

function calculateMrp(currentState) {
  const items = sanitizeItems(currentState.items);
  if (!items.length) {
    return createEmptyResult();
  }

  const itemMap = new Map(items.map((item) => [item.code, item]));
  const bom = sanitizeBom(currentState.bom, itemMap, items);
  const demands = sanitizeDemands(currentState.demands, itemMap, items);
  const itemMeta = getItemMeta(items, bom, demands);
  const horizon = computeHorizon(currentState.horizon, demands, items);
  const topologicalOrder = getTopologicalOrder(items, bom);

  const childrenByParent = new Map();
  const parentCount = new Map(items.map((item) => [item.code, 0]));

  bom.forEach((relation) => {
    if (!childrenByParent.has(relation.parent)) {
      childrenByParent.set(relation.parent, []);
    }
    childrenByParent.get(relation.parent).push(relation);
    parentCount.set(relation.child, (parentCount.get(relation.child) || 0) + 1);
  });

  const resultByItem = {};
  items.forEach((item) => {
    resultByItem[item.code] = createPeriodMatrix(horizon, item);
  });

  demands.forEach((demand) => {
    resultByItem[demand.itemCode].gross[demand.week] += demand.quantity;
    resultByItem[demand.itemCode].sources[demand.week].push(`独立需求 W${demand.week}`);
  });

  topologicalOrder.forEach((code) => {
    const item = itemMap.get(code);
    const matrix = resultByItem[code];
    matrix.projected[0] = Math.max(0, item.onHand - item.allocated);

    for (let week = 1; week <= horizon; week += 1) {
      const availableBefore = matrix.projected[week - 1];
      const gross = matrix.gross[week];
      const required = gross + item.safetyStock;

      if (availableBefore < required) {
        const netNeed = required - availableBefore;
        const plannedReceipt = applyLotRule(netNeed, item);
        matrix.net[week] = netNeed;
        matrix.receipts[week] = plannedReceipt;

        const releaseWeek = Math.max(0, week - item.leadTime);
        matrix.releases[releaseWeek] += plannedReceipt;
        matrix.releaseTargets[releaseWeek].push({
          receiptWeek: week,
          quantity: plannedReceipt
        });
      }

      matrix.projected[week] = availableBefore + matrix.receipts[week] - gross;
    }

    const children = childrenByParent.get(code) || [];
    children.forEach((relation) => {
      const childMatrix = resultByItem[relation.child];
      for (let week = 0; week <= horizon; week += 1) {
        const releaseQty = matrix.releases[week];
        if (releaseQty <= 0) {
          continue;
        }
        childMatrix.gross[week] += releaseQty * relation.quantity;
        childMatrix.sources[week].push(`${code} 下达 ${releaseQty} x ${relation.quantity}`);
      }
    });
  });

  const roots = items
    .filter((item) => (parentCount.get(item.code) || 0) === 0)
    .sort((left, right) => compareCodes(left.code, right.code, itemMeta, itemMap))
    .map((item) => item.code);

  const orders = buildOrders(items, resultByItem, horizon, itemMeta, itemMap);
  const warnings = collectWarnings(items, bom, demands, resultByItem);

  return {
    horizon,
    items,
    bom,
    demands,
    roots,
    itemMeta,
    resultByItem,
    orders,
    warnings
  };
}

function sanitizeItems(items) {
  const unique = new Map();
  items.forEach((item) => {
    if (!item.code) {
      return;
    }
    unique.set(item.code.toUpperCase().trim(), {
      code: item.code.toUpperCase().trim(),
      name: item.name.trim() || item.code.toUpperCase().trim(),
      leadTime: clampNumber(item.leadTime, 0, 52, 0),
      onHand: clampNumber(item.onHand, 0, Number.MAX_SAFE_INTEGER, 0),
      allocated: clampNumber(item.allocated, 0, Number.MAX_SAFE_INTEGER, 0),
      safetyStock: clampNumber(item.safetyStock, 0, Number.MAX_SAFE_INTEGER, 0),
      lotRule: item.lotRule === "FIXED" ? "FIXED" : "L4L",
      lotSize: clampNumber(item.lotSize, 0, Number.MAX_SAFE_INTEGER, 0)
    });
  });

  const values = Array.from(unique.values());
  const meta = getItemMeta(values, state.bom, state.demands);
  return values.sort((left, right) => compareItems(left, right, meta));
}

function sanitizeBom(bom, itemMap, items) {
  const meta = getItemMeta(items, bom, state.demands);
  return bom
    .filter((relation) => itemMap.has(relation.parent) && itemMap.has(relation.child) && relation.parent !== relation.child)
    .map((relation) => ({
      parent: relation.parent.toUpperCase().trim(),
      child: relation.child.toUpperCase().trim(),
      quantity: clampNumber(relation.quantity, 1, Number.MAX_SAFE_INTEGER, 1)
    }))
    .sort((left, right) => {
      const parentCmp = compareCodes(left.parent, right.parent, meta, itemMap);
      if (parentCmp !== 0) {
        return parentCmp;
      }
      const childCmp = compareCodes(left.child, right.child, meta, itemMap);
      if (childCmp !== 0) {
        return childCmp;
      }
      return left.quantity - right.quantity;
    });
}

function sanitizeDemands(demands, itemMap, items) {
  const meta = getItemMeta(items, state.bom, demands);
  return demands
    .filter((demand) => itemMap.has(demand.itemCode))
    .map((demand) => ({
      itemCode: demand.itemCode.toUpperCase().trim(),
      week: clampNumber(demand.week, 1, 52, 1),
      quantity: clampNumber(demand.quantity, 0, Number.MAX_SAFE_INTEGER, 0)
    }))
    .filter((demand) => demand.quantity > 0)
    .sort((left, right) => {
      const codeCmp = compareCodes(left.itemCode, right.itemCode, meta, itemMap);
      if (codeCmp !== 0) {
        return codeCmp;
      }
      if (left.week !== right.week) {
        return left.week - right.week;
      }
      return left.quantity - right.quantity;
    });
}

function computeHorizon(configuredHorizon, demands, items) {
  return clampNumber(configuredHorizon, 1, 52, 12);
}

function createPeriodMatrix(horizon, item) {
  return {
    item,
    gross: createNumberArray(horizon),
    net: createNumberArray(horizon),
    projected: createNumberArray(horizon),
    receipts: createNumberArray(horizon),
    releases: createNumberArray(horizon),
    sources: Array.from({ length: horizon + 1 }, () => []),
    releaseTargets: Array.from({ length: horizon + 1 }, () => [])
  };
}

function createNumberArray(horizon) {
  return Array.from({ length: horizon + 1 }, () => 0);
}

function getTopologicalOrder(items, bom) {
  const codes = items.map((item) => item.code);
  const indegree = new Map(codes.map((code) => [code, 0]));
  const adjacency = new Map(codes.map((code) => [code, []]));

  bom.forEach((relation) => {
    adjacency.get(relation.parent).push(relation.child);
    indegree.set(relation.child, indegree.get(relation.child) + 1);
  });

  const queue = codes.filter((code) => indegree.get(code) === 0).sort();
  const ordered = [];

  while (queue.length) {
    const code = queue.shift();
    ordered.push(code);

    adjacency.get(code).forEach((child) => {
      indegree.set(child, indegree.get(child) - 1);
      if (indegree.get(child) === 0) {
        queue.push(child);
        queue.sort();
      }
    });
  }

  if (ordered.length !== items.length) {
    throw new Error("BOM 结构存在循环依赖，无法计算。");
  }

  return ordered;
}

function applyLotRule(netNeed, item) {
  if (netNeed <= 0) {
    return 0;
  }
  if (item.lotRule === "FIXED" && item.lotSize > 0) {
    return Math.ceil(netNeed / item.lotSize) * item.lotSize;
  }
  return netNeed;
}

function buildOrders(items, resultByItem, horizon, itemMeta, itemMap) {
  const orders = [];

  items.forEach((item) => {
    const matrix = resultByItem[item.code];
    for (let releaseWeek = 0; releaseWeek <= horizon; releaseWeek += 1) {
      matrix.releaseTargets[releaseWeek].forEach((target) => {
        orders.push({
          itemCode: item.code,
          itemName: item.name,
          releaseWeek,
          receiptWeek: target.receiptWeek,
          quantity: target.quantity,
          source: matrix.sources[target.receiptWeek].length ? matrix.sources[target.receiptWeek].join("；") : "系统计算"
        });
      });
    }
  });

  return orders.sort((left, right) => {
    if (left.releaseWeek !== right.releaseWeek) {
      return left.releaseWeek - right.releaseWeek;
    }
    const codeCmp = compareCodes(left.itemCode, right.itemCode, itemMeta, itemMap);
    if (codeCmp !== 0) {
      return codeCmp;
    }
    return left.receiptWeek - right.receiptWeek;
  });
}

function collectWarnings(items, bom, demands, resultByItem) {
  const warnings = [];
  const referencedCodes = new Set();

  bom.forEach((relation) => {
    referencedCodes.add(relation.parent);
    referencedCodes.add(relation.child);
  });
  demands.forEach((demand) => referencedCodes.add(demand.itemCode));

  if (!items.length) {
    warnings.push("暂无物料主数据。");
  }
  if (!demands.length) {
    warnings.push("暂无独立需求。");
  }

  const unusedItems = items.filter((item) => !referencedCodes.has(item.code));
  if (unusedItems.length) {
    warnings.push(`存在未参与计算的物料：${unusedItems.map((item) => item.code).join("、")}`);
  }

  items.forEach((item) => {
    if (resultByItem[item.code].releases[0] > 0) {
      warnings.push(`${item.code} 存在第 1 周前就要下达的计划，请关注提前期。`);
    }
  });

  return warnings;
}

function renderSummary(result) {
  const totalOrders = result.orders.length;
  const totalQty = result.orders.reduce((sum, order) => sum + order.quantity, 0);
  const urgentOrders = result.orders.filter((order) => order.releaseWeek === 0).length;

  refs.summaryStrip.innerHTML = [
    summaryCard("物料数", result.items.length, "已按产品、部件自动排序"),
    summaryCard("订货建议", totalOrders, "系统生成的计划下达记录"),
    summaryCard("总订货量", totalQty, "全部计划订单数量合计"),
    summaryCard("紧急下达", urgentOrders, urgentOrders ? "需在第 1 周前下达" : "暂无紧急单")
  ].join("");
}

function renderDbStatus() {
  refs.dbStatusBar.innerHTML = `<span class="status-pill ${escapeHtml(dbStatus.level)}">数据库状态：${escapeHtml(dbStatus.text)}</span>`;
}

function setDbStatus(level, text) {
  dbStatus = { level, text };
  renderDbStatus();
}

function renderWarnings(result) {
  if (!result.warnings.length) {
    refs.warningBox.innerHTML = "";
    return;
  }

  refs.warningBox.innerHTML = `
    <section class="warning-box">
      <h3>计算提示</h3>
      <ul>${result.warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("")}</ul>
    </section>
  `;
}

function summaryCard(label, value, note) {
  return `<article class="summary-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong><span>${escapeHtml(note)}</span></article>`;
}

function renderOrders(result) {
  if (!result.orders.length) {
    refs.ordersTableBody.innerHTML = `<tr><td colspan="5">${renderInlineEmpty("当前数据下没有形成订货建议。")}</td></tr>`;
    return;
  }

  refs.ordersTableBody.innerHTML = result.orders.map((order) => `
    <tr>
      <td>${escapeHtml(order.itemCode)}<div class="inline-note">${escapeHtml(order.itemName)}</div></td>
      <td>${formatWeek(order.releaseWeek)}</td>
      <td>${formatWeek(order.receiptWeek)}</td>
      <td>${order.quantity}</td>
      <td>${escapeHtml(order.source)}</td>
    </tr>
  `).join("");
}

function renderMrpTables(result) {
  if (!result.items.length) {
    refs.mrpPager.innerHTML = "";
    renderEmptyNode(refs.mrpTables);
    return;
  }

  const total = result.items.length;
  const totalPages = Math.max(1, Math.ceil(total / 2));
  uiState.mrpPage = Math.min(Math.max(uiState.mrpPage, 0), totalPages - 1);
  const startIndex = uiState.mrpPage * 2;
  const pageItems = result.items.slice(startIndex, startIndex + 2);
  const weekHeaders = ["提前"].concat(Array.from({ length: result.horizon }, (_, index) => `W${index + 1}`));

  refs.mrpPager.innerHTML = `
    <div class="mrp-pager-group">
      <button type="button" data-action="prev" ${uiState.mrpPage === 0 ? "disabled" : ""}>上一页</button>
      <button type="button" data-action="next" ${uiState.mrpPage === totalPages - 1 ? "disabled" : ""}>下一页</button>
    </div>
    <div class="mrp-pager-group">
      <span class="inline-note">当前第 ${uiState.mrpPage + 1} / ${totalPages} 页，每页 2 项</span>
      <select id="mrpPageSelect">
        ${Array.from({ length: totalPages }, (_, pageIndex) => {
          const first = result.items[pageIndex * 2];
          const second = result.items[pageIndex * 2 + 1];
          const label = second
            ? `${first.code}/${second.code}`
            : `${first.code}`;
          return `<option value="${pageIndex}" ${pageIndex === uiState.mrpPage ? "selected" : ""}>第 ${pageIndex + 1} 页: ${escapeHtml(label)}</option>`;
        }).join("")}
      </select>
    </div>
  `;

  refs.mrpTables.innerHTML = pageItems.map((item) => {
    const matrix = result.resultByItem[item.code];
    return `
      <article class="mrp-card">
        <header>
          <div>
            <p class="mini-label">MRP Card</p>
            <h3>${escapeHtml(item.code)} / ${escapeHtml(item.name)}</h3>
          </div>
          <div class="mrp-meta">${getItemMetaLabel(result.itemMeta.get(item.code))} | LT=${item.leadTime} 周 | 批量=${item.lotRule === "FIXED" ? `固定 ${item.lotSize}` : "按净需求"}</div>
        </header>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>项目</th>
                ${weekHeaders.map((week) => `<th>${escapeHtml(week)}</th>`).join("")}
              </tr>
            </thead>
            <tbody>
              ${renderMetricRow("毛需求", matrix.gross)}
              ${renderMetricRow("预计可得", matrix.projected)}
              ${renderMetricRow("净需求", matrix.net)}
              ${renderMetricRow("计划接收", matrix.receipts)}
              ${renderMetricRow("计划下达", matrix.releases)}
            </tbody>
          </table>
        </div>
      </article>
    `;
  }).join("");
}

function renderMetricRow(label, values) {
  return `
    <tr>
      <td class="mrp-row-label">${escapeHtml(label)}</td>
      ${values.map((value, index) => `<td>${index === 0 ? (value || "-") : (value || "")}</td>`).join("")}
    </tr>
  `;
}

function renderBomTree(result) {
  if (!result.items.length) {
    renderEmptyNode(refs.bomCanvas);
    return;
  }

  const itemMap = new Map(result.items.map((item) => [item.code, item]));
  const childrenByParent = new Map();

  result.bom.forEach((relation) => {
    if (!childrenByParent.has(relation.parent)) {
      childrenByParent.set(relation.parent, []);
    }
    childrenByParent.get(relation.parent).push(relation);
  });

  refs.bomCanvas.innerHTML = result.roots.map((rootEntry) => {
    const rootCode = typeof rootEntry === "string" ? rootEntry : rootEntry && rootEntry.code ? rootEntry.code : "";
    const rootItem = itemMap.get(rootCode);
    if (!rootItem) {
      return "";
    }
    return `
      <section class="bom-root">
        <div class="bom-root-head">
          <h3>${escapeHtml(rootItem.code)} / ${escapeHtml(rootItem.name)}</h3>
          <div class="bom-chip">
            <strong>${escapeHtml(rootItem.code)}</strong>
            <span>${escapeHtml(rootItem.name)}</span>
            <span>LT ${rootItem.leadTime}</span>
            <span>${rootItem.lotRule === "FIXED" ? `固定批量 ${rootItem.lotSize}` : "按净需求"}</span>
          </div>
        </div>
        ${renderBomChildren(rootCode, childrenByParent, itemMap, new Set([rootCode]))}
      </section>
    `;
  }).join("");
}

function renderBomChildren(parentCode, childrenByParent, itemMap, visiting) {
  const children = childrenByParent.get(parentCode) || [];
  return children.map((relation) => {
    const child = itemMap.get(relation.child);
    if (!child) {
      return "";
    }
    if (visiting.has(relation.child)) {
      return `<div class="bom-node"><div class="bom-chip"><strong>${escapeHtml(relation.child)}</strong><span>检测到循环引用</span></div></div>`;
    }

    const nextVisiting = new Set(visiting);
    nextVisiting.add(relation.child);

    return `
      <div class="bom-node">
        <div class="bom-chip">
          <strong>${escapeHtml(child.code)}</strong>
          <span>${escapeHtml(child.name)}</span>
          <span>用量 ${relation.quantity}</span>
          <span>LT ${child.leadTime}</span>
          <span>${child.lotRule === "FIXED" ? `固定批量 ${child.lotSize}` : "按净需求"}</span>
        </div>
        ${renderBomChildren(relation.child, childrenByParent, itemMap, nextVisiting)}
      </div>
    `;
  }).join("");
}

function renderHistory() {
  if (!uiState.history.length) {
    refs.historyTableBody.innerHTML = `<tr><td colspan="5">${renderInlineEmpty("还没有历史导出记录。")}</td></tr>`;
    return;
  }

  refs.historyTableBody.innerHTML = uiState.history.map((entry) => `
    <tr>
      <td>${escapeHtml(entry.createdAt)}</td>
      <td>${escapeHtml(entry.reportName)}</td>
      <td>${entry.itemCount}</td>
      <td>${entry.orderCount}</td>
      <td class="history-actions">
        <button type="button" class="history-action" data-history-id="${entry.id}" data-history-action="load">载入</button>
        <button type="button" class="history-action row-action" data-history-id="${entry.id}" data-history-action="delete">删</button>
      </td>
    </tr>
  `).join("");
}

function renderErrorState(message) {
  refs.summaryStrip.innerHTML = summaryCard("错误", "1", message);
  refs.warningBox.innerHTML = "";
  refs.ordersTableBody.innerHTML = `<tr><td colspan="5">${renderInlineEmpty(message)}</td></tr>`;
  refs.mrpPager.innerHTML = "";
  refs.mrpTables.innerHTML = "";
  refs.bomCanvas.innerHTML = "";
  refs.updatedAt.textContent = "";
}

function createEmptyResult() {
  return {
    horizon: state.horizon || 12,
    items: [],
    bom: [],
    demands: [],
    roots: [],
    itemMeta: new Map(),
    resultByItem: {},
    orders: [],
    warnings: ["暂无可计算的数据。"]
  };
}

function renderInlineEmpty(text) {
  return `<div class="empty-state"><h3>${escapeHtml(text)}</h3></div>`;
}

function renderEmptyNode(node) {
  node.innerHTML = refs.emptyStateTemplate.innerHTML;
}

function activateTab(tabName) {
  refs.tabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.tab === tabName);
  });
  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `${tabName}Panel`);
  });
}

async function refreshDbStatus(autoLoad = false) {
  if (!window.location.protocol.startsWith("http")) {
    setDbStatus("error", "当前是本地文件模式，数据库功能需通过后端启动");
    return;
  }

  try {
    const payload = await apiJsonRequest("/api/health");
    setDbStatus("ok", `MySQL 已连接，当前库：${payload.database}`);
    if (autoLoad) {
      await loadFromDatabase(true);
      await loadHistory(true);
    }
  } catch (error) {
    setDbStatus("warn", error.message || "后端已启动，但数据库尚未初始化");
  }
}

async function loadFromDatabase(silent = false) {
  if (!window.location.protocol.startsWith("http")) {
    if (!silent) {
      window.alert("请先通过 Python 后端打开系统，再使用数据库功能。");
    }
    return;
  }

  try {
    setDbStatus("warn", "正在从数据库读取数据");
    const payload = await apiJsonRequest("/api/data");
    replaceState(payload.data);
    renderAll();
    recalculate();
    await loadHistory(true);
    setDbStatus("ok", "已从 MySQL 读取最新数据");
  } catch (error) {
    setDbStatus("error", error.message || "读取数据库失败");
    if (!silent) {
      window.alert(error.message || "读取数据库失败");
    }
  }
}

async function saveToDatabase() {
  if (!window.location.protocol.startsWith("http")) {
    window.alert("请先通过 Python 后端打开系统，再使用数据库功能。");
    return;
  }

  try {
    syncStateFromTables();
    setDbStatus("warn", "正在保存到数据库");
    await apiJsonRequest("/api/data", {
      method: "POST",
      body: JSON.stringify({ data: state })
    });
    setDbStatus("ok", "当前页面数据已保存到 MySQL");
  } catch (error) {
    setDbStatus("error", error.message || "保存数据库失败");
    window.alert(error.message || "保存数据库失败");
  }
}

async function initializeDatabase() {
  if (!window.location.protocol.startsWith("http")) {
    window.alert("请先通过 Python 后端打开系统，再使用数据库功能。");
    return;
  }

  try {
    setDbStatus("warn", "正在初始化数据库");
    const payload = await apiJsonRequest("/api/init-db", { method: "POST" });
    replaceState(payload.data);
    renderAll();
    recalculate();
    await loadHistory(true);
    setDbStatus("ok", "数据库已初始化为题目样例数据");
  } catch (error) {
    setDbStatus("error", error.message || "初始化数据库失败");
    window.alert(error.message || "初始化数据库失败");
  }
}

async function exportExcelReport() {
  if (!window.location.protocol.startsWith("http")) {
    window.alert("请先通过 Python 后端打开系统，再使用数据库功能。");
    return;
  }
  if (!latestResult || !latestResult.items.length) {
    window.alert("当前没有可导出的报表数据。");
    return;
  }

  try {
    syncStateFromTables();
    recalculate();
    setDbStatus("warn", "正在生成 Excel 报表");

    const response = await fetch("/api/export-excel", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        data: state,
        result: serializeResult(latestResult)
      })
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.message || `导出失败：${response.status}`);
    }

    const blob = await response.blob();
    const disposition = response.headers.get("Content-Disposition") || "";
    const match = disposition.match(/filename="?([^"]+)"?/i);
    const filename = match ? decodeURIComponent(match[1]) : "mrp-report.xlsx";

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);

    await loadHistory(true);
    setDbStatus("ok", "Excel 报表已导出，并写入历史记录");
  } catch (error) {
    setDbStatus("error", error.message || "Excel 导出失败");
    window.alert(error.message || "Excel 导出失败");
  }
}

async function loadHistory(silent = false) {
  if (!window.location.protocol.startsWith("http")) {
    return;
  }
  try {
    const payload = await apiJsonRequest("/api/history");
    uiState.history = Array.isArray(payload.history) ? payload.history : [];
    renderHistory();
  } catch (error) {
    uiState.history = [];
    renderHistory();
    if (!silent) {
      window.alert(error.message || "读取历史失败");
    }
  }
}

async function loadHistorySnapshot(historyId) {
  if (!window.location.protocol.startsWith("http")) {
    return;
  }
  try {
    const payload = await apiJsonRequest(`/api/history/${historyId}`);
    replaceState(payload.data);
    renderAll();
    recalculate();
    activateTab("orders");
    setDbStatus("ok", `已载入历史记录：${payload.reportName}`);
  } catch (error) {
    window.alert(error.message || "读取历史详情失败");
  }
}

async function deleteHistorySnapshot(historyId) {
  if (!window.location.protocol.startsWith("http")) {
    return;
  }
  const confirmed = window.confirm("确定删除这条历史导出记录吗？");
  if (!confirmed) {
    return;
  }
  try {
    await apiJsonRequest(`/api/history/${historyId}`, { method: "DELETE" });
    uiState.history = uiState.history.filter((entry) => String(entry.id) !== String(historyId));
    renderHistory();
    setDbStatus("ok", "历史导出记录已删除");
  } catch (error) {
    window.alert(error.message || "删除历史记录失败");
  }
}

async function apiJsonRequest(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || `请求失败：${response.status}`);
  }
  return payload;
}

function serializeResult(result) {
  return {
    horizon: result.horizon,
    items: result.items,
    bom: result.bom,
    demands: result.demands,
    roots: result.roots,
    orders: result.orders,
    warnings: result.warnings,
    resultByItem: Object.fromEntries(
      Object.entries(result.resultByItem).map(([code, matrix]) => [
        code,
        {
          gross: matrix.gross,
          net: matrix.net,
          projected: matrix.projected,
          receipts: matrix.receipts,
          releases: matrix.releases
        }
      ])
    )
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return deepClone(sampleState);
    }
    const parsed = JSON.parse(raw);
    return normalizeState(parsed);
  } catch (error) {
    return deepClone(sampleState);
  }
}

function hasPersistedState() {
  try {
    return Boolean(localStorage.getItem(STORAGE_KEY));
  } catch (error) {
    return false;
  }
}

function replaceState(nextState) {
  const normalized = normalizeState(nextState);
  state.horizon = normalized.horizon;
  state.items.splice(0, state.items.length, ...normalized.items);
  state.bom.splice(0, state.bom.length, ...normalized.bom);
  state.demands.splice(0, state.demands.length, ...normalized.demands);
  sortStateData(state);
  persistState();
}

function normalizeState(input) {
  const safeInput = input || {};
  return {
    horizon: clampNumber(safeInput.horizon, 1, 52, sampleState.horizon),
    items: Array.isArray(safeInput.items) ? safeInput.items : deepClone(sampleState.items),
    bom: Array.isArray(safeInput.bom) ? safeInput.bom : deepClone(sampleState.bom),
    demands: Array.isArray(safeInput.demands) ? safeInput.demands : deepClone(sampleState.demands)
  };
}

function sortStateData(targetState) {
  const meta = getItemMeta(targetState.items, targetState.bom, targetState.demands);
  const itemLookup = new Map(targetState.items.map((item) => [item.code, item]));

  targetState.items.sort((left, right) => compareItems(left, right, meta));
  targetState.bom.sort((left, right) => {
    const parentCmp = compareCodes(left.parent, right.parent, meta, itemLookup);
    if (parentCmp !== 0) {
      return parentCmp;
    }
    const childCmp = compareCodes(left.child, right.child, meta, itemLookup);
    if (childCmp !== 0) {
      return childCmp;
    }
    return left.quantity - right.quantity;
  });
  targetState.demands.sort((left, right) => {
    const codeCmp = compareCodes(left.itemCode, right.itemCode, meta, itemLookup);
    if (codeCmp !== 0) {
      return codeCmp;
    }
    if (left.week !== right.week) {
      return left.week - right.week;
    }
    return left.quantity - right.quantity;
  });
}

function getItemMeta(items, bom, demands) {
  const childSet = new Set((bom || []).map((relation) => upperCode(relation.child)));
  const demandSet = new Set((demands || []).map((demand) => upperCode(demand.itemCode)));
  const meta = new Map();

  (items || []).forEach((item) => {
    const code = upperCode(item.code);
    const isProduct = demandSet.has(code) || !childSet.has(code);
    meta.set(code, {
      kind: isProduct ? "product" : "component",
      rank: isProduct ? 0 : 1,
      label: isProduct ? "产品" : "部件",
      sortName: (item.name || code || "").trim()
    });
  });

  return meta;
}

function compareItems(left, right, meta) {
  const leftMeta = meta.get(left.code) || { rank: 0, sortName: left.name || left.code };
  const rightMeta = meta.get(right.code) || { rank: 0, sortName: right.name || right.code };
  if (leftMeta.rank !== rightMeta.rank) {
    return leftMeta.rank - rightMeta.rank;
  }
  const codeCmp = left.code.localeCompare(right.code, "en");
  if (codeCmp !== 0) {
    return codeCmp;
  }
  return leftMeta.sortName.localeCompare(rightMeta.sortName, "zh-CN");
}

function compareCodes(leftCode, rightCode, meta, itemMap) {
  const leftItem = itemMap.get(leftCode) || { code: leftCode, name: leftCode };
  const rightItem = itemMap.get(rightCode) || { code: rightCode, name: rightCode };
  return compareItems(leftItem, rightItem, meta);
}

function getItemMetaLabel(meta) {
  return meta && meta.label ? meta.label : "产品";
}

function getItemMetaKind(metaMap, code) {
  const meta = metaMap.get(code);
  return meta && meta.kind ? meta.kind : "product";
}

function upperCode(value) {
  return value ? String(value).toUpperCase() : "";
}

function persistState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function readField(row, field) {
  const element = row.querySelector(`[data-field="${field}"]`);
  return element ? element.value : "";
}

function getSortedItemCodes() {
  const clone = normalizeState(state);
  sortStateData(clone);
  return Array.from(new Set(clone.items.map((item) => item.code).filter(Boolean)));
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.round(number)));
}

function formatWeek(week) {
  return week === 0 ? "第 1 周前" : `第 ${week} 周`;
}

function formatDateTime(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d} ${h}:${min}`;
}

function escapeHtml(text) {
  return String(text === undefined || text === null ? "" : text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttr(text) {
  return escapeHtml(text);
}
