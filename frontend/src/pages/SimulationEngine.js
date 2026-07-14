import { shortDate } from "@/lib/format";

// Linear interpolation for waypoint coordinate arrays
export function positionAlongPath(waypoints, progress) {
  if (!waypoints || waypoints.length === 0) return [0, 0, 0];
  if (waypoints.length === 1) return [waypoints[0][0], 0, waypoints[0][1]];
  if (progress <= 0) return [waypoints[0][0], 0, waypoints[0][1]];
  if (progress >= 1) return [waypoints[waypoints.length - 1][0], 0, waypoints[waypoints.length - 1][1]];

  const n = waypoints.length - 1;
  const rawIndex = progress * n;
  const idx = Math.floor(rawIndex);
  const frac = rawIndex - idx;

  const p1 = waypoints[idx];
  const p2 = waypoints[idx + 1];

  // Map Lon -> X, Lat -> Z, 0 -> Y (elevation)
  const x = p1[0] + (p2[0] - p1[0]) * frac;
  const z = p1[1] + (p2[1] - p1[1]) * frac;
  return [x, 0, z];
}

export class SimulationEngine {
  constructor(nodes, products, lanes) {
    this.nodes = nodes || [];
    this.products = products || [];
    this.lanes = lanes || [];
    
    this.initialized = false;
    this.inventory = new Map();
    this.shipments = [];
    this.simTime = new Date("2026-08-01T00:00:00Z");
    this.lastDemandDateStr = "";
    
    // Scenarios config
    this.scenario = "normal";
    this.modifiers = {
      demandWeight: 1.0,
      supplierReliability: 1.0,
      leadTimeMultiplier: 1.0,
      fuelCostMultiplier: 1.0,
      weatherSeverity: 0.0,
      portCongestion: 0.0,
      routeBlockage: false,
      capacityMultiplier: 1.0,
    };
    
    // User expedited lanes
    this.expeditedLanes = new Set(); // Set of lane_ids

    // Accumulators for KPIs
    this.kpis = {
      inventoryValue: 0,
      fulfilledOrders: 0,
      totalOrders: 0,
      lateDeliveries: 0,
      totalDeliveries: 0,
      operatingCost: 0,
      revenue: 0,
      profit: 0,
      stockouts: 0,
      carbonEmissions: 0,
      healthScore: 100,
    };

    this.alerts = [];
  }

  init(scenario = "normal", customModifiers = null) {
    this.scenario = scenario;
    this.simTime = new Date("2026-08-01T00:00:00Z");
    this.lastDemandDateStr = shortDate(this.simTime);
    this.shipments = [];
    this.expeditedLanes.clear();
    
    // Reset KPIs
    this.kpis = {
      inventoryValue: 0,
      fulfilledOrders: 0,
      totalOrders: 0,
      lateDeliveries: 0,
      totalDeliveries: 0,
      operatingCost: 0,
      revenue: 0,
      profit: 0,
      stockouts: 0,
      carbonEmissions: 0,
      healthScore: 100,
    };
    
    this.alerts = [
      { id: "init", ts: this.simTime.toISOString(), type: "info", title: "Simulation Initialized", description: `Started under ${scenario} scenario.` }
    ];

    // Configure modifiers based on scenario
    this.modifiers = {
      demandWeight: 1.0,
      supplierReliability: 1.0,
      leadTimeMultiplier: 1.0,
      fuelCostMultiplier: 1.0,
      weatherSeverity: 0.0,
      portCongestion: 0.0,
      routeBlockage: false,
      capacityMultiplier: 1.0,
    };

    if (scenario === "holiday") {
      this.modifiers.demandWeight = 2.4;
      this.alerts.push({ id: "scen-alert", ts: this.simTime.toISOString(), type: "warning", title: "Holiday Rush Active", description: "Demand across all markets spiked by 2.4x. Watch warehouse buffers." });
    } else if (scenario === "pandemic") {
      this.modifiers.supplierReliability = 0.3;
      this.modifiers.leadTimeMultiplier = 2.0;
      this.alerts.push({ id: "scen-alert", ts: this.simTime.toISOString(), type: "critical", title: "Global Pandemic Lockdown", description: "Supplier reliability plummeted to 30%. Transit lead times doubled." });
    } else if (scenario === "port_closure") {
      this.modifiers.portCongestion = 0.85;
      this.modifiers.leadTimeMultiplier = 3.0;
      this.alerts.push({ id: "scen-alert", ts: this.simTime.toISOString(), type: "critical", title: "Main Sea Port Closed", description: "Vessels delayed at ports. Ocean lead times extended by 3x." });
    } else if (scenario === "natural_disaster") {
      this.modifiers.weatherSeverity = 0.9;
      this.modifiers.routeBlockage = true;
      this.alerts.push({ id: "scen-alert", ts: this.simTime.toISOString(), type: "critical", title: "Severe Typhoon Alert", description: "Flooding on multiple logistics routes. Road shipments delayed." });
    } else if (scenario === "fuel_crisis") {
      this.modifiers.fuelCostMultiplier = 4.0;
      this.alerts.push({ id: "scen-alert", ts: this.simTime.toISOString(), type: "warning", title: "Fuel Price Explosion", description: "Freight rates surged by 400%. Keep an eye on operating margins." });
    } else if (scenario === "bankruptcy") {
      this.modifiers.supplierReliability = 0.15;
      this.alerts.push({ id: "scen-alert", ts: this.simTime.toISOString(), type: "critical", title: "Major Supplier Liquidation", description: "A top raw material supplier filed for bankruptcy. Supply is severely disrupted." });
    } else if (scenario === "custom" && customModifiers) {
      this.modifiers = { ...this.modifiers, ...customModifiers };
    }

    // Initialize Inventory Positions
    this.inventory.clear();
    const whNodes = this.nodes.filter(n => n.node_type === "warehouse");
    
    // Seed inventory positions
    this.products.forEach(p => {
      whNodes.forEach(w => {
        const avgDemand = p.base_demand / 30.0; // ~4 units a day
        const stdDev = avgDemand * 0.25;
        const ltDays = 14.0 * this.modifiers.leadTimeMultiplier;
        const z = 1.65;
        const ss = Math.round(z * stdDev * Math.sqrt(ltDays));
        const rop = Math.round(avgDemand * ltDays + ss);
        const eoq = Math.max(200, Math.round(avgDemand * 30));
        
        // Start with a healthy stock level
        const capacity = Math.round((rop + eoq) * this.modifiers.capacityMultiplier);
        const startingStock = Math.round(rop + 0.4 * eoq);

        this.inventory.set(`${p.sku}@${w.code}`, {
          sku: p.sku,
          product_name: p.name,
          category: p.category,
          warehouse_code: w.code,
          onHand: startingStock,
          onOrder: 0,
          capacity: capacity,
          avgDemand: avgDemand,
          demandStd: stdDev,
          safetyStock: ss,
          reorderPoint: rop,
          eoq: eoq,
          unitCost: p.unit_cost,
          unitPrice: p.unit_price,
          supplierCode: p.suppliers[0],
        });
      });
    });

    this.initialized = true;
    this.recomputeInventoryValue();
  }

  recomputeInventoryValue() {
    let val = 0;
    this.inventory.forEach(item => {
      val += item.onHand * item.unitCost;
    });
    this.kpis.inventoryValue = val;
  }

  applyAction(action) {
    if (!this.initialized) return;

    if (action.type === "expedite") {
      // Toggle expedited lane (mode air vs standard road/sea)
      const { laneId } = action;
      if (this.expeditedLanes.has(laneId)) {
        this.expeditedLanes.delete(laneId);
        this.alerts.push({
          id: `action-${Date.now()}`,
          ts: this.simTime.toISOString(),
          type: "info",
          title: "Lane De-expedited",
          description: `Restored standard shipping rates for lane ${laneId.substring(0,8)}.`
        });
      } else {
        this.expeditedLanes.add(laneId);
        this.alerts.push({
          id: `action-${Date.now()}`,
          ts: this.simTime.toISOString(),
          type: "success",
          title: "Lane Expedited via Air",
          description: `Urgent air freight active for lane ${laneId.substring(0,8)}. Transit times reduced by 75%.`
        });
      }
    } else if (action.type === "adjust_buffer") {
      // Adjust all safety stocks / ROPs by scale
      const { scale } = action; // e.g. 1.5 (increase safety stock by 50%)
      this.inventory.forEach(item => {
        item.safetyStock = Math.round(item.safetyStock * scale);
        item.reorderPoint = Math.round(item.avgDemand * 14 * this.modifiers.leadTimeMultiplier + item.safetyStock);
      });
      this.alerts.push({
        id: `action-${Date.now()}`,
        ts: this.simTime.toISOString(),
        type: "success",
        title: "Buffer Stocks Adjusted",
        description: `Scaled all product reorder points by ${scale}x to manage demand risks.`
      });
    } else if (action.type === "emergency_purchase") {
      // Direct purchase of 500 units to warehouse
      const { sku, warehouseCode } = action;
      const key = `${sku}@${warehouseCode}`;
      const item = this.inventory.get(key);
      if (item) {
        const purchaseQty = 500;
        item.onHand += purchaseQty;
        const purchaseCost = purchaseQty * item.unitCost * 1.5; // 50% premium
        this.kpis.operatingCost += purchaseCost;
        this.recomputeInventoryValue();
        this.alerts.push({
          id: `action-${Date.now()}`,
          ts: this.simTime.toISOString(),
          type: "success",
          title: "Emergency Purchase Completed",
          description: `Directly injected ${purchaseQty} units of ${sku} at ${warehouseCode} DC (costing ${purchaseCost.toLocaleString('en-US', {style:'currency', currency:'USD'})}).`
        });
      }
    } else if (action.type === "stock_transfer") {
      // Move stock between warehouses
      const { sku, fromCode, toCode, qty } = action;
      const keyFrom = `${sku}@${fromCode}`;
      const keyTo = `${sku}@${toCode}`;
      const itemFrom = this.inventory.get(keyFrom);
      const itemTo = this.inventory.get(keyTo);
      if (itemFrom && itemTo && itemFrom.onHand >= qty) {
        itemFrom.onHand -= qty;
        
        // Setup a transfer transit shipment (road, taking 48 hours)
        const laneId = `transfer-${fromCode}-${toCode}`;
        const transitHours = 48.0;
        const shipId = `ship-transfer-${Math.random().toString(36).substr(2, 9)}`;
        
        const fromNode = this.nodes.find(n => n.code === fromCode);
        const toNode = this.nodes.find(n => n.code === toCode);
        const waypoints = [
          [fromNode.lon, fromNode.lat],
          [(fromNode.lon + toNode.lon) / 2, (fromNode.lat + toNode.lat) / 2 + 1],
          [toNode.lon, toNode.lat]
        ];

        this.shipments.push({
          id: shipId,
          sku: sku,
          warehouse_code: toCode,
          supplier_code: fromCode,
          mode: "road",
          carrier: "Digital Twin Trucking",
          qty: qty,
          progress: 0.0,
          transitHours: transitHours,
          waypoints: waypoints,
          value: qty * itemFrom.unitCost,
          isTransfer: true,
          lane_id: laneId,
        });

        itemTo.onOrder += qty;
        this.kpis.operatingCost += qty * itemFrom.unitCost * 0.15; // 15% transfer freight fee
        this.recomputeInventoryValue();
        
        this.alerts.push({
          id: `action-${Date.now()}`,
          ts: this.simTime.toISOString(),
          type: "info",
          title: "Stock Transfer Dispatched",
          description: `Dispatched ${qty} units of ${sku} from ${fromCode} to ${toCode} DC (ETA: 48h).`
        });
      }
    }
  }

  tick(simHours = 1.0) {
    if (!this.initialized) return;

    // Advance clock
    this.simTime = new Date(this.simTime.getTime() + simHours * 60 * 60 * 1000);
    const currentDateStr = shortDate(this.simTime);
    
    // Process shipment transits
    this.processShipmentTransits(simHours);

    // Process daily demand if a new day starts
    if (currentDateStr !== this.lastDemandDateStr) {
      this.processDailyDemand(currentDateStr);
      this.lastDemandDateStr = currentDateStr;
    }

    // Recompute KPIs & Health Score
    this.recomputeInventoryValue();
    this.updateHealthScore();
  }

  processShipmentTransits(simHours) {
    const arrivedShipments = [];
    const activeShipments = [];

    this.shipments.forEach(s => {
      // Expedited Air reduction
      let isExpedited = this.expeditedLanes.has(s.lane_id);
      let effectiveTransitHours = s.transitHours;
      if (isExpedited) effectiveTransitHours = s.transitHours * 0.25; // 4x speed

      // Weather / Port Congestion delays
      let delayFactor = 1.0;
      if (s.mode === "sea") delayFactor += this.modifiers.portCongestion * 1.5;
      if (s.mode === "road" && this.modifiers.routeBlockage) delayFactor += 1.8;
      effectiveTransitHours *= delayFactor;

      const progressDelta = simHours / effectiveTransitHours;
      s.progress = Math.min(1.0, s.progress + progressDelta);

      if (s.progress >= 1.0) {
        arrivedShipments.push(s);
      } else {
        activeShipments.push(s);
      }
    });

    this.shipments = activeShipments;

    // Process arrivals
    arrivedShipments.forEach(s => {
      const key = `${s.sku}@${s.warehouse_code}`;
      const item = this.inventory.get(key);
      if (item) {
        item.onHand = Math.min(item.capacity, item.onHand + s.qty);
        item.onOrder = Math.max(0, item.onOrder - s.qty);
        
        // Operating freight cost accumulation
        const distanceCost = s.qty * 0.08; // basic distance freight formula
        const modeMultiplier = s.mode === "air" ? 5.0 : (s.mode === "road" ? 1.5 : 0.6);
        const fuelCost = distanceCost * modeMultiplier * this.modifiers.fuelCostMultiplier;
        
        this.kpis.operatingCost += fuelCost;
        this.kpis.totalDeliveries += 1;

        // Carbon calculation
        const carbonFactor = s.mode === "air" ? 0.5 : (s.mode === "road" ? 0.12 : 0.015);
        this.kpis.carbonEmissions += s.qty * 12 * carbonFactor; // 12km avg distance multiplier

        this.alerts.push({
          id: `arrival-${Date.now()}-${s.id}`,
          ts: this.simTime.toISOString(),
          type: "success",
          title: `Delivery Arrived — ${s.sku}`,
          description: `${s.qty} units replenished at ${s.warehouse_code} from ${s.supplier_code}.`
        });
      }
    });
  }

  processDailyDemand(dateStr) {
    const isHoliday = this.scenario === "holiday";
    const demandWeight = this.modifiers.demandWeight;

    this.inventory.forEach(item => {
      // Calculate daily demand
      const mu = item.avgDemand * demandWeight;
      const sigma = item.demandStd;
      // Normal distribution drawer
      const u1 = Math.random() || 0.0001;
      const u2 = Math.random() || 0.0001;
      const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
      const demand = Math.max(0, Math.round(mu + z * sigma));

      const fulfilled = Math.min(demand, item.onHand);
      const unmet = demand - fulfilled;

      item.onHand -= fulfilled;

      this.kpis.totalOrders += demand;
      this.kpis.fulfilledOrders += fulfilled;
      this.kpis.revenue += fulfilled * item.unitPrice;
      this.kpis.operatingCost += fulfilled * item.unitCost; // cost of goods sold

      if (unmet > 0) {
        this.kpis.stockouts += unmet;
        this.kpis.operatingCost += unmet * item.unitPrice * 0.35; // lost-sales / stockout penalty cost
        
        if (Math.random() < 0.22) { // limit spam
          this.alerts.push({
            id: `stockout-${Date.now()}-${item.sku}-${item.warehouse_code}`,
            ts: this.simTime.toISOString(),
            type: "critical",
            title: `Stockout — ${item.sku}`,
            description: `Lost sales of ${unmet} units at ${item.warehouse_code} due to empty racks.`
          });
        }
      }

      // Reorder logic trigger
      const available = item.onHand + item.onOrder;
      if (available <= item.reorderPoint) {
        // Find lane
        const lane = this.lanes.find(l => l.supplier_code === item.supplierCode && l.warehouse_code === item.warehouse_code);
        if (lane) {
          const reorderQty = item.eoq;
          const transitHours = lane.transit_hours;
          const poId = `po-${Math.random().toString(36).substr(2, 9)}`;
          
          // Random supplier failure/delay
          let reliability = this.modifiers.supplierReliability;
          const isReliable = Math.random() < reliability;
          let delayHours = 0;
          if (!isReliable) {
            delayHours = Math.round(Math.random() * 72 + 24); // 1-4 days delay
            this.kpis.lateDeliveries += 1;
          }

          this.shipments.push({
            id: poId,
            sku: item.sku,
            warehouse_code: item.warehouse_code,
            supplier_code: item.supplierCode,
            mode: lane.mode,
            carrier: sCarrier(lane.mode),
            qty: reorderQty,
            progress: 0.0,
            transitHours: transitHours + delayHours,
            waypoints: lane.waypoints,
            value: reorderQty * item.unitCost,
            lane_id: lane.id,
          });

          item.onOrder += reorderQty;

          if (Math.random() < 0.25) {
            this.alerts.push({
              id: `reorder-${Date.now()}-${item.sku}`,
              ts: this.simTime.toISOString(),
              type: "info",
              title: `Replenishment Dispatched — ${item.sku}`,
              description: `Ordered ${reorderQty} units from ${item.supplierCode} to ${item.warehouse_code} (ETA: ${Math.round((transitHours + delayHours)/24)}d).`
            });
          }
        }
      }
    });

    // Holding cost accumulation per day
    let dailyHolding = 0;
    this.inventory.forEach(item => {
      // 25% annual holding rate
      dailyHolding += (item.onHand * item.unitCost * 0.25) / 365.0;
    });
    this.kpis.operatingCost += dailyHolding;
  }

  updateHealthScore() {
    // Fill rate health
    const fillRate = this.kpis.totalOrders > 0 ? (this.kpis.fulfilledOrders / this.kpis.totalOrders) * 100 : 100;
    
    // Stockout count penalty
    const stockoutPenalty = Math.min(30, this.kpis.stockouts * 0.08);

    // Cost efficiency margin
    const profitMargin = this.kpis.revenue > 0 ? ((this.kpis.revenue - this.kpis.operatingCost) / this.kpis.revenue) * 100 : 100;
    const marginPenalty = profitMargin < 10 ? Math.min(25, (10 - profitMargin) * 2) : 0;

    let score = Math.round(fillRate * 0.6 + profitMargin * 0.4 - stockoutPenalty - marginPenalty);
    score = Math.max(10, Math.min(100, score));
    this.kpis.healthScore = score;
  }

  getKPIs() {
    const netProfit = this.kpis.revenue - this.kpis.operatingCost;
    const fillRate = this.kpis.totalOrders > 0 ? (this.kpis.fulfilledOrders / this.kpis.totalOrders) * 100 : 100;
    const otd = this.kpis.totalDeliveries > 0 ? ((this.kpis.totalDeliveries - this.kpis.lateDeliveries) / this.kpis.totalDeliveries) * 100 : 92.5;

    // Overstock count
    let overstock = 0;
    this.inventory.forEach(item => {
      if (item.onHand > item.capacity * 0.85) overstock++;
    });

    return {
      inventoryValue: this.kpis.inventoryValue,
      revenue: this.kpis.revenue,
      operatingCost: this.kpis.operatingCost,
      profit: netProfit,
      fillRate: fillRate,
      otd: otd,
      carbonEmissions: this.kpis.carbonEmissions,
      healthScore: this.kpis.healthScore,
      stockouts: this.kpis.stockouts,
      overstock: overstock,
      activeShipmentsCount: this.shipments.length,
    };
  }

  getAIAlerts() {
    // Analyze current state and return 4 structured recommendations/alerts
    const engineAlerts = [];
    
    // 1. Stockout Risk warning
    const inventoryList = Array.from(this.inventory.values());
    const stockoutRisks = inventoryList
      .map(item => {
        const dos = item.onHand / Math.max(item.avgDemand, 0.01);
        return { item, dos };
      })
      .filter(x => x.dos < 3.0)
      .sort((a,b) => a.dos - b.dos);

    if (stockoutRisks.length > 0) {
      const topRisk = stockoutRisks[0];
      const revenueAtRisk = Math.round(topRisk.item.avgDemand * 14 * topRisk.item.unitPrice);
      engineAlerts.push({
        id: `ai-stockout-${topRisk.item.sku}`,
        type: "stockout_risk",
        severity: "critical",
        title: `Critical Stockout Imminent: ${topRisk.item.sku}`,
        description: `${topRisk.item.product_name} at ${topRisk.item.warehouse_code} has only ${topRisk.dos.toFixed(1)} days of supply left (safety buffer depleted).`,
        impact: `~${revenueAtRisk.toLocaleString('en-US', {style:'currency', currency:'USD'})} revenue exposed over lead time`,
        action: "Switch transit lane to expedited Air Freight or trigger emergency stock purchase.",
      });
    }

    // 2. Supplier Risk warning
    const lateDeliveriesRate = this.kpis.totalDeliveries > 0 ? (this.kpis.lateDeliveries / this.kpis.totalDeliveries) * 100 : 0;
    if (this.modifiers.supplierReliability < 0.5 || lateDeliveriesRate > 20) {
      engineAlerts.push({
        id: "ai-supplier-risk",
        type: "supplier_risk",
        severity: "warning",
        title: "Widespread Supplier Delays",
        description: "Stochastic shipping delays detected. Order backlog is piling up due to poor supplier lead time fulfillment.",
        impact: "Fulfillment SLA penalties up to 10% of revenue",
        action: "Increase reorder buffers and scale safety stock to 1.5x in actions panel.",
      });
    }

    // 3. Overstock warning
    const overstocks = inventoryList.filter(item => item.onHand > item.capacity * 0.85);
    if (overstocks.length > 0) {
      const topOverstock = overstocks[0];
      const dailyHoldingCost = (topOverstock.onHand * topOverstock.unitCost * 0.25) / 365.0;
      engineAlerts.push({
        id: `ai-overstock-${topOverstock.sku}`,
        type: "inventory_surplus",
        severity: "warning",
        title: `Excess Inventory Surplus: ${topOverstock.sku}`,
        description: `${topOverstock.sku} at ${topOverstock.warehouse_code} is running at ${(topOverstock.onHand / topOverstock.capacity * 100).toFixed(0)}% capacity.`,
        impact: `Holding costs costing ~${dailyHoldingCost.toLocaleString('en-US', {style:'currency', currency:'USD'})}/day`,
        action: "Temporarily pause procurement reorder point or transfer stock to other sister DCs.",
      });
    }

    // 4. Cost/Fuel Alert
    if (this.modifiers.fuelCostMultiplier > 2.0) {
      const loss = this.kpis.operatingCost * 0.18; // Fuel drag estimation
      engineAlerts.push({
        id: "ai-fuel-alert",
        type: "financial_risk",
        severity: "warning",
        title: "Transportation Cost Spikes",
        description: "Skyrocketing fuel prices are dragging operational margins down.",
        impact: `~${loss.toLocaleString('en-US', {style:'currency', currency:'USD'})} freight rate surcharge drag`,
        action: "Reroute long-distance air freight to sea carriers where possible to conserve budget.",
      });
    }

    // Default healthy alert if nothing critical
    if (engineAlerts.length === 0) {
      engineAlerts.push({
        id: "ai-healthy",
        type: "health",
        severity: "success",
        title: "Supply Chain Operating Smoothly",
        description: "Demand is matching inventory intake perfectly. Lead times are within safety tolerances.",
        impact: "Zero lost sales registered in the current cycle",
        action: "Continue monitoring. Keep standard procurement configurations active.",
      });
    }

    return engineAlerts;
  }

  getVisualData() {
    // Map lanes and active shipments for rendering
    const mappedShipments = this.shipments.map(s => {
      const pos = positionAlongPath(s.waypoints, s.progress);
      return {
        id: s.id,
        sku: s.sku,
        qty: s.qty,
        progress: s.progress,
        position: pos,
        mode: s.mode,
        isTransfer: s.isTransfer,
        warehouse_code: s.warehouse_code,
        supplier_code: s.supplier_code,
      };
    });

    return {
      shipments: mappedShipments,
      nodes: this.nodes.map(n => {
        let status = "healthy";
        if (n.node_type === "warehouse") {
          // Calculate average status
          const skuItems = Array.from(this.inventory.values()).filter(x => x.warehouse_code === n.code);
          const hasCritical = skuItems.some(item => item.onHand <= item.safetyStock * 0.2);
          const hasLow = skuItems.some(item => item.onHand <= item.reorderPoint);
          if (hasCritical) status = "critical";
          else if (hasLow) status = "low";
        }
        return {
          ...n,
          status,
        };
      }),
      lanes: this.lanes,
    };
  }
}

// Carrier names helper
function sCarrier(mode) {
  const CARRIERS = {
    air: ["FedEx Express", "DHL Aviation", "Cathay Cargo", "Lufthansa Cargo"],
    road: ["Schneider National", "J.B. Hunt", "XPO Logistics", "DB Schenker"],
    sea: ["Maersk Line", "MSC", "CMA CGM", "COSCO Shipping"],
  };
  const list = CARRIERS[mode] || CARRIERS.road;
  return list[Math.floor(Math.random() * list.length)];
}
