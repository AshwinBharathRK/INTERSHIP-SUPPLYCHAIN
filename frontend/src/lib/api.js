import axios from "axios";

export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API_BASE = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API_BASE, timeout: 30000 });

export const fetchers = {
  kpis: () => api.get("/kpis").then((r) => r.data),
  events: (limit = 50) => api.get(`/events?limit=${limit}`).then((r) => r.data),
  nodes: (type) => api.get(`/nodes${type ? `?node_type=${type}` : ""}`).then((r) => r.data),
  products: () => api.get("/products").then((r) => r.data),
  lanes: () => api.get("/lanes").then((r) => r.data),
  shipments: (params = "") => api.get(`/shipments${params}`).then((r) => r.data),
  shipmentDetail: (id) => api.get(`/shipments/${id}`).then((r) => r.data),
  inventory: (params = "") => api.get(`/inventory${params}`).then((r) => r.data),
  inventorySummary: () => api.get("/inventory/summary").then((r) => r.data),
  warehouses: () => api.get("/warehouses").then((r) => r.data),
  warehouseThreed: (code) => api.get(`/warehouses/${code}/threed`).then((r) => r.data),
  simState: () => api.get("/sim/state").then((r) => r.data),
  simToggle: () => api.post("/sim/toggle").then((r) => r.data),
  simSpeed: (speed) => api.post("/sim/speed", { speed }).then((r) => r.data),
  forecast: (productId, warehouseId, horizon) =>
    api
      .get(
        `/ml/forecast?product_id=${productId}${warehouseId ? `&warehouse_id=${warehouseId}` : ""}&horizon=${horizon}`
      )
      .then((r) => r.data),
  risk: () => api.get("/ml/risk").then((r) => r.data),
  optimization: (sku, warehouse) =>
    api.get(`/ml/optimization?sku=${sku}&warehouse=${warehouse}`).then((r) => r.data),
  abc: () => api.get("/analytics/abc").then((r) => r.data),
  sankey: () => api.get("/analytics/sankey").then((r) => r.data),
  heatmap: (dim = "category") => api.get(`/analytics/heatmap?dim=${dim}`).then((r) => r.data),
  network: () => api.get("/analytics/network").then((r) => r.data),
  revenue: (days = 90, by = "total") =>
    api.get(`/analytics/revenue?days=${days}&by=${by}`).then((r) => r.data),
  insights: () => api.get("/ai/insights").then((r) => r.data),
  chatHistory: (sessionId) => api.get(`/ai/history?session_id=${sessionId}`).then((r) => r.data),
  clearChat: (sessionId) => api.delete(`/ai/history?session_id=${sessionId}`).then((r) => r.data),
};

export const exportUrl = (kind) => `${API_BASE}/export/${kind}`;
