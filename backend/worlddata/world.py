"""Real-world grounded supply chain reference data.

All coordinates are true coordinates of real cities, ports, and logistics hubs.
Product catalog and cost structures are modeled on public supply chain datasets
(DataCo Smart Supply Chain, UCI) for the consumer-electronics vertical.
"""

# ---------------------------------------------------------------- suppliers
# reliability_bias drives generated shipment history (on-time behaviour);
# actual supplier metrics are always COMPUTED from that history, never displayed raw.
SUPPLIERS = [
    {"code": "SUP-SZX", "name": "Shenzhen Electronics Mfg. Co.", "city": "Shenzhen", "country": "China", "region": "east_asia", "lon": 114.0579, "lat": 22.5431, "reliability_bias": 0.93, "defect_bias": 0.012, "geo_risk": 0.55, "port": "Shenzhen (Yantian)"},
    {"code": "SUP-SHA", "name": "Shanghai Precision Components", "city": "Shanghai", "country": "China", "region": "east_asia", "lon": 121.4737, "lat": 31.2304, "reliability_bias": 0.90, "defect_bias": 0.015, "geo_risk": 0.55, "port": "Shanghai"},
    {"code": "SUP-TPE", "name": "Taipei Semiconductor Group", "city": "Taipei", "country": "Taiwan", "region": "east_asia", "lon": 121.5654, "lat": 25.0330, "reliability_bias": 0.96, "defect_bias": 0.006, "geo_risk": 0.62, "port": "Kaohsiung"},
    {"code": "SUP-SEL", "name": "Seoul Display Technologies", "city": "Seoul", "country": "South Korea", "region": "east_asia", "lon": 126.9780, "lat": 37.5665, "reliability_bias": 0.95, "defect_bias": 0.008, "geo_risk": 0.40, "port": "Busan"},
    {"code": "SUP-OSA", "name": "Osaka Industrial Systems K.K.", "city": "Osaka", "country": "Japan", "region": "east_asia", "lon": 135.5023, "lat": 34.6937, "reliability_bias": 0.97, "defect_bias": 0.004, "geo_risk": 0.35, "port": "Osaka"},
    {"code": "SUP-PEN", "name": "Penang Circuit Works Sdn Bhd", "city": "Penang", "country": "Malaysia", "region": "southeast_asia", "lon": 100.3288, "lat": 5.4141, "reliability_bias": 0.89, "defect_bias": 0.018, "geo_risk": 0.42, "port": "Penang"},
    {"code": "SUP-SGN", "name": "Saigon Assembly Corporation", "city": "Ho Chi Minh City", "country": "Vietnam", "region": "southeast_asia", "lon": 106.6297, "lat": 10.8231, "reliability_bias": 0.86, "defect_bias": 0.022, "geo_risk": 0.48, "port": "Cat Lai"},
    {"code": "SUP-BLR", "name": "Bangalore Components Ltd.", "city": "Bengaluru", "country": "India", "region": "south_asia", "lon": 77.5946, "lat": 12.9716, "reliability_bias": 0.84, "defect_bias": 0.025, "geo_risk": 0.45, "port": "Chennai"},
    {"code": "SUP-MUC", "name": "M\u00fcnchen Pr\u00e4zision GmbH", "city": "Munich", "country": "Germany", "region": "europe", "lon": 11.5820, "lat": 48.1351, "reliability_bias": 0.97, "defect_bias": 0.005, "geo_risk": 0.18, "port": "Hamburg"},
    {"code": "SUP-EIN", "name": "Eindhoven Photonics B.V.", "city": "Eindhoven", "country": "Netherlands", "region": "europe", "lon": 5.4697, "lat": 51.4416, "reliability_bias": 0.96, "defect_bias": 0.006, "geo_risk": 0.15, "port": "Rotterdam"},
    {"code": "SUP-GDL", "name": "Guadalajara Electr\u00f3nica S.A.", "city": "Guadalajara", "country": "Mexico", "region": "north_america", "lon": -103.3496, "lat": 20.6597, "reliability_bias": 0.88, "defect_bias": 0.019, "geo_risk": 0.38, "port": "Manzanillo"},
    {"code": "SUP-AUS", "name": "Austin Fabrication Inc.", "city": "Austin", "country": "United States", "region": "north_america", "lon": -97.7431, "lat": 30.2672, "reliability_bias": 0.94, "defect_bias": 0.009, "geo_risk": 0.20, "port": "Houston"},
]

# ------------------------------------------------------------- warehouses
WAREHOUSES = [
    {"code": "DC-LAX", "name": "Los Angeles Gateway DC", "city": "Los Angeles", "country": "United States", "region": "north_america", "lon": -118.2437, "lat": 34.0522, "capacity": 60000, "demand_weight": 1.25, "docks": 42, "zones": 8},
    {"code": "DC-DFW", "name": "Dallas Fulfillment Hub", "city": "Dallas", "country": "United States", "region": "north_america", "lon": -96.7970, "lat": 32.7767, "capacity": 48000, "demand_weight": 1.00, "docks": 36, "zones": 6},
    {"code": "DC-ORD", "name": "Chicago Regional DC", "city": "Chicago", "country": "United States", "region": "north_america", "lon": -87.6298, "lat": 41.8781, "capacity": 52000, "demand_weight": 1.10, "docks": 38, "zones": 7},
    {"code": "DC-MEM", "name": "Memphis Air Cargo Hub", "city": "Memphis", "country": "United States", "region": "north_america", "lon": -90.0490, "lat": 35.1495, "capacity": 38000, "demand_weight": 0.85, "docks": 28, "zones": 5},
    {"code": "DC-EWR", "name": "Newark East Coast DC", "city": "Newark", "country": "United States", "region": "north_america", "lon": -74.1724, "lat": 40.7357, "capacity": 55000, "demand_weight": 1.18, "docks": 40, "zones": 7},
    {"code": "DC-RTM", "name": "Rotterdam European DC", "city": "Rotterdam", "country": "Netherlands", "region": "europe", "lon": 4.4777, "lat": 51.9244, "capacity": 58000, "demand_weight": 1.08, "docks": 44, "zones": 8},
    {"code": "DC-FRA", "name": "Frankfurt Central DC", "city": "Frankfurt", "country": "Germany", "region": "europe", "lon": 8.6821, "lat": 50.1109, "capacity": 46000, "demand_weight": 0.95, "docks": 32, "zones": 6},
]

# --------------------------------------------------------- customer markets
MARKETS = [
    {"code": "MKT-NYC", "name": "New York Metro", "city": "New York", "country": "United States", "region": "north_america", "lon": -74.0060, "lat": 40.7128, "served_by": "DC-EWR", "weight": 1.30},
    {"code": "MKT-SFO", "name": "San Francisco Bay Area", "city": "San Francisco", "country": "United States", "region": "north_america", "lon": -122.4194, "lat": 37.7749, "served_by": "DC-LAX", "weight": 1.10},
    {"code": "MKT-SEA", "name": "Seattle-Tacoma", "city": "Seattle", "country": "United States", "region": "north_america", "lon": -122.3321, "lat": 47.6062, "served_by": "DC-LAX", "weight": 0.80},
    {"code": "MKT-MIA", "name": "Miami / South Florida", "city": "Miami", "country": "United States", "region": "north_america", "lon": -80.1918, "lat": 25.7617, "served_by": "DC-DFW", "weight": 0.85},
    {"code": "MKT-YYZ", "name": "Toronto / Ontario", "city": "Toronto", "country": "Canada", "region": "north_america", "lon": -79.3832, "lat": 43.6532, "served_by": "DC-ORD", "weight": 0.90},
    {"code": "MKT-LON", "name": "Greater London", "city": "London", "country": "United Kingdom", "region": "europe", "lon": -0.1276, "lat": 51.5072, "served_by": "DC-RTM", "weight": 1.20},
    {"code": "MKT-PAR", "name": "\u00cele-de-France", "city": "Paris", "country": "France", "region": "europe", "lon": 2.3522, "lat": 48.8566, "served_by": "DC-RTM", "weight": 1.05},
    {"code": "MKT-BER", "name": "Berlin-Brandenburg", "city": "Berlin", "country": "Germany", "region": "europe", "lon": 13.4050, "lat": 52.5200, "served_by": "DC-FRA", "weight": 0.85},
    {"code": "MKT-MAD", "name": "Madrid Metro", "city": "Madrid", "country": "Spain", "region": "europe", "lon": -3.7038, "lat": 40.4168, "served_by": "DC-RTM", "weight": 0.75},
    {"code": "MKT-MIL", "name": "Milan / Lombardy", "city": "Milan", "country": "Italy", "region": "europe", "lon": 9.1900, "lat": 45.4642, "served_by": "DC-FRA", "weight": 0.80},
]

# ------------------------------------------------------------------- ports
PORTS = {
    "Shenzhen (Yantian)": [114.2734, 22.5779],
    "Shanghai": [121.8055, 31.3389],
    "Kaohsiung": [120.2820, 22.6163],
    "Busan": [129.0403, 35.1028],
    "Osaka": [135.4437, 34.6503],
    "Penang": [100.3510, 5.4074],
    "Cat Lai": [106.7949, 10.7570],
    "Chennai": [80.2960, 13.1027],
    "Hamburg": [9.9312, 53.5461],
    "Rotterdam": [4.1420, 51.9526],
    "Manzanillo": [-104.3140, 19.0629],
    "Houston": [-95.0790, 29.7355],
    "Los Angeles": [-118.2620, 33.7361],
    "Newark": [-74.1445, 40.6840],
    "Singapore": [103.8400, 1.2644],
    "Colombo": [79.8428, 6.9500],
    "Suez": [32.5498, 29.9668],
    "Gibraltar": [-5.4300, 35.9700],
    "Panama": [-79.9167, 8.9500],
}

# canonical open-water waypoints for realistic sea lanes
SEA_LANES = {
    "transpacific_east": [[145.0, 32.0], [170.0, 38.0], [-170.0, 42.0], [-140.0, 38.0], [-125.5, 34.5]],
    "asia_europe": [[103.84, 1.2644], [79.8428, 5.9], [50.0, 12.8], [43.4, 12.6], [32.55, 29.97], [14.0, 36.8], [-5.43, 35.97], [-9.5, 38.5], [-6.0, 48.5], [1.5, 51.0]],
    "transatlantic_west": [[-8.0, 49.5], [-25.0, 47.0], [-45.0, 43.0], [-65.0, 40.5]],
    "gulf_to_east_us": [[-94.5, 28.5], [-85.0, 24.5], [-79.8, 26.5], [-75.0, 35.0]],
    "pacific_mx_to_us": [[-106.0, 18.0], [-112.0, 23.0], [-118.5, 32.0]],
}

# ---------------------------------------------------------------- products
# unit economics modeled on consumer electronics supply chain benchmarks
PRODUCTS = [
    {"sku": "ELX-1001", "name": "Aurora X1 Smartphone", "category": "Smartphones", "unit_cost": 312.0, "unit_price": 699.0, "weight_kg": 0.24, "volume_m3": 0.0009, "suppliers": ["SUP-SZX", "SUP-SGN"], "base_demand": 88, "q4_lift": 1.85, "criticality": "high"},
    {"sku": "ELX-1002", "name": "Aurora X1 Pro Smartphone", "category": "Smartphones", "unit_cost": 455.0, "unit_price": 999.0, "suppliers": ["SUP-SZX", "SUP-TPE"], "weight_kg": 0.25, "volume_m3": 0.0009, "base_demand": 54, "q4_lift": 2.0, "criticality": "high"},
    {"sku": "ELX-2001", "name": "Titan 15 Ultrabook", "category": "Laptops", "unit_cost": 618.0, "unit_price": 1299.0, "suppliers": ["SUP-TPE", "SUP-SHA"], "weight_kg": 1.6, "volume_m3": 0.006, "base_demand": 42, "q4_lift": 1.6, "criticality": "high"},
    {"sku": "ELX-2002", "name": "Titan 13 Air Laptop", "category": "Laptops", "unit_cost": 512.0, "unit_price": 1049.0, "suppliers": ["SUP-TPE", "SUP-PEN"], "weight_kg": 1.2, "volume_m3": 0.005, "base_demand": 36, "q4_lift": 1.55, "criticality": "medium"},
    {"sku": "ELX-3001", "name": "Nova Tab 11", "category": "Tablets", "unit_cost": 218.0, "unit_price": 449.0, "suppliers": ["SUP-SHA", "SUP-SGN"], "weight_kg": 0.48, "volume_m3": 0.0018, "base_demand": 47, "q4_lift": 1.9, "criticality": "medium"},
    {"sku": "ELX-3002", "name": "Nova Tab 13 Pro", "category": "Tablets", "unit_cost": 342.0, "unit_price": 799.0, "suppliers": ["SUP-SHA", "SUP-SEL"], "weight_kg": 0.62, "volume_m3": 0.0022, "base_demand": 24, "q4_lift": 1.7, "criticality": "medium"},
    {"sku": "ELX-4001", "name": "Pulse Band 5 Fitness Tracker", "category": "Wearables", "unit_cost": 38.0, "unit_price": 129.0, "suppliers": ["SUP-SZX", "SUP-SGN"], "weight_kg": 0.05, "volume_m3": 0.0002, "base_demand": 120, "q4_lift": 2.2, "criticality": "low"},
    {"sku": "ELX-4002", "name": "Pulse Watch Ultra", "category": "Wearables", "unit_cost": 142.0, "unit_price": 399.0, "suppliers": ["SUP-SZX", "SUP-SEL"], "weight_kg": 0.09, "volume_m3": 0.0003, "base_demand": 62, "q4_lift": 2.1, "criticality": "medium"},
    {"sku": "ELX-5001", "name": "MeshLink WiFi 7 Router", "category": "Networking", "unit_cost": 96.0, "unit_price": 249.0, "suppliers": ["SUP-PEN", "SUP-SZX"], "weight_kg": 0.65, "volume_m3": 0.004, "base_demand": 55, "q4_lift": 1.25, "criticality": "medium"},
    {"sku": "ELX-5002", "name": "MeshLink Enterprise AP", "category": "Networking", "unit_cost": 178.0, "unit_price": 449.0, "suppliers": ["SUP-PEN", "SUP-MUC"], "weight_kg": 0.9, "volume_m3": 0.005, "base_demand": 28, "q4_lift": 1.1, "criticality": "high"},
    {"sku": "ELX-6001", "name": "EchoPod Wireless Earbuds", "category": "Audio", "unit_cost": 52.0, "unit_price": 179.0, "suppliers": ["SUP-SGN", "SUP-SZX"], "weight_kg": 0.06, "volume_m3": 0.0003, "base_demand": 135, "q4_lift": 2.4, "criticality": "low"},
    {"sku": "ELX-6002", "name": "EchoBar Soundbar 700", "category": "Audio", "unit_cost": 188.0, "unit_price": 479.0, "suppliers": ["SUP-SGN", "SUP-OSA"], "weight_kg": 3.8, "volume_m3": 0.03, "base_demand": 22, "q4_lift": 1.8, "criticality": "low"},
    {"sku": "ELX-7001", "name": "Vision 27\" 4K Monitor", "category": "Displays", "unit_cost": 205.0, "unit_price": 499.0, "suppliers": ["SUP-SEL", "SUP-SHA"], "weight_kg": 6.2, "volume_m3": 0.06, "base_demand": 38, "q4_lift": 1.35, "criticality": "medium"},
    {"sku": "ELX-7002", "name": "Vision 32\" ProArt Display", "category": "Displays", "unit_cost": 415.0, "unit_price": 1099.0, "suppliers": ["SUP-SEL", "SUP-OSA"], "weight_kg": 9.5, "volume_m3": 0.09, "base_demand": 14, "q4_lift": 1.3, "criticality": "medium"},
    {"sku": "ELX-8001", "name": "Fusion A17 SoC Chipset", "category": "Components", "unit_cost": 87.0, "unit_price": 149.0, "suppliers": ["SUP-TPE"], "weight_kg": 0.01, "volume_m3": 0.00005, "base_demand": 210, "q4_lift": 1.4, "criticality": "high"},
    {"sku": "ELX-8002", "name": "PowerCell Li-Ion Battery Pack", "category": "Components", "unit_cost": 21.0, "unit_price": 49.0, "suppliers": ["SUP-SEL", "SUP-BLR"], "weight_kg": 0.3, "volume_m3": 0.0004, "base_demand": 240, "q4_lift": 1.5, "criticality": "high"},
    {"sku": "ELX-8003", "name": "OptiSense Camera Module", "category": "Components", "unit_cost": 34.0, "unit_price": 79.0, "suppliers": ["SUP-OSA", "SUP-EIN"], "weight_kg": 0.03, "volume_m3": 0.0001, "base_demand": 165, "q4_lift": 1.45, "criticality": "high"},
    {"sku": "ELX-9001", "name": "HyperDrive 2TB NVMe SSD", "category": "Storage", "unit_cost": 92.0, "unit_price": 229.0, "suppliers": ["SUP-SEL", "SUP-TPE"], "weight_kg": 0.05, "volume_m3": 0.0001, "base_demand": 74, "q4_lift": 1.5, "criticality": "medium"},
    {"sku": "ELX-9002", "name": "VaultStore 8TB Enterprise HDD", "category": "Storage", "unit_cost": 148.0, "unit_price": 329.0, "suppliers": ["SUP-BLR", "SUP-PEN"], "weight_kg": 0.72, "volume_m3": 0.0009, "base_demand": 31, "q4_lift": 1.15, "criticality": "medium"},
    {"sku": "ELX-9501", "name": "VoltEdge 100W GaN Charger", "category": "Accessories", "unit_cost": 18.0, "unit_price": 59.0, "suppliers": ["SUP-GDL", "SUP-SZX"], "weight_kg": 0.18, "volume_m3": 0.0003, "base_demand": 190, "q4_lift": 1.9, "criticality": "low"},
    {"sku": "ELX-9502", "name": "FlexMount Pro Laptop Stand", "category": "Accessories", "unit_cost": 22.0, "unit_price": 79.0, "suppliers": ["SUP-GDL", "SUP-AUS"], "weight_kg": 1.1, "volume_m3": 0.004, "base_demand": 58, "q4_lift": 1.4, "criticality": "low"},
    {"sku": "ELX-9503", "name": "AeroPad Wireless Charging Pad", "category": "Accessories", "unit_cost": 14.0, "unit_price": 45.0, "suppliers": ["SUP-AUS", "SUP-GDL"], "weight_kg": 0.22, "volume_m3": 0.0004, "base_demand": 105, "q4_lift": 1.75, "criticality": "low"},
]

CARRIERS = {
    "sea": ["Maersk Line", "MSC", "CMA CGM", "COSCO Shipping", "Hapag-Lloyd", "Evergreen Marine"],
    "air": ["FedEx Express", "UPS Air Cargo", "DHL Aviation", "Cathay Cargo", "Lufthansa Cargo"],
    "road": ["Schneider National", "J.B. Hunt", "DSV Road", "XPO Logistics", "DB Schenker"],
}

MODE_SPEED_KMH = {"sea": 38.0, "air": 720.0, "road": 68.0}
MODE_HANDLING_HOURS = {"sea": 96.0, "air": 28.0, "road": 10.0}
ORDERING_COST = {"sea": 420.0, "air": 980.0, "road": 260.0}
HOLDING_RATE_ANNUAL = 0.22  # % of unit cost per year
