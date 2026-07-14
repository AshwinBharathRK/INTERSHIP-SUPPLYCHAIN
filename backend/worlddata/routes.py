"""Route construction: realistic multi-modal lanes between suppliers and warehouses."""
from core.geo import densify_great_circle, densify_path, path_distance_km
from worlddata.world import MODE_HANDLING_HOURS, MODE_SPEED_KMH, PORTS, SEA_LANES

ASIA = {"east_asia", "southeast_asia", "south_asia"}


def _sea_waypoints(supplier: dict, warehouse: dict) -> list[list[float]]:
    """Build realistic sea route: supplier -> origin port -> lane -> dest port -> warehouse."""
    origin_port = PORTS[supplier["port"]]
    s_region, w_region = supplier["region"], warehouse["region"]

    if w_region == "north_america":
        dest_port = PORTS["Los Angeles"] if warehouse["lon"] < -100 else PORTS["Newark"]
        if warehouse["code"] in ("DC-DFW", "DC-MEM", "DC-ORD"):
            dest_port = PORTS["Houston"] if warehouse["code"] == "DC-DFW" else PORTS["Newark"]
    else:
        dest_port = PORTS["Rotterdam"] if warehouse["code"] == "DC-RTM" else PORTS["Hamburg"]

    mid: list[list[float]] = []
    if s_region in ASIA and w_region == "north_america":
        if dest_port == PORTS["Los Angeles"]:
            mid = SEA_LANES["transpacific_east"]
        else:  # Asia -> US East via Suez + transatlantic is unrealistic; use Pacific->Panama
            mid = [[145.0, 30.0], [175.0, 33.0], [-155.0, 25.0], [-120.0, 15.0], [-79.9167, 8.95], [-75.0, 20.0], SEA_LANES["gulf_to_east_us"][-1]]
    elif s_region in ASIA and w_region == "europe":
        mid = SEA_LANES["asia_europe"]
    elif s_region == "europe" and w_region == "north_america":
        mid = SEA_LANES["transatlantic_west"]
    elif s_region == "north_america" and w_region == "europe":
        mid = list(reversed(SEA_LANES["transatlantic_west"]))
    elif s_region == "north_america" and w_region == "north_america":
        if supplier["port"] == "Manzanillo" and dest_port == PORTS["Los Angeles"]:
            mid = SEA_LANES["pacific_mx_to_us"]
        elif supplier["port"] in ("Manzanillo", "Houston"):
            mid = SEA_LANES["gulf_to_east_us"]

    raw = [[supplier["lon"], supplier["lat"]], origin_port, *mid, dest_port, [warehouse["lon"], warehouse["lat"]]]
    # de-duplicate consecutive identical points
    pts = [raw[0]]
    for p in raw[1:]:
        if abs(p[0] - pts[-1][0]) > 1e-6 or abs(p[1] - pts[-1][1]) > 1e-6:
            pts.append(p)
    return densify_path(pts, seg_points=6)


def _normalize_antimeridian(pts: list[list[float]]) -> list[list[float]]:
    """Shift longitudes into a continuous space so paths never jump across ±180°.

    deck.gl renders out-of-range longitudes correctly (wrapped), while a raw
    jump from 145° to -170° would draw a line across the whole map.
    """
    out = [[pts[0][0], pts[0][1]]]
    offset = 0.0
    for lon, lat in pts[1:]:
        adj = lon + offset
        while adj - out[-1][0] > 180:
            offset -= 360.0
            adj = lon + offset
        while adj - out[-1][0] < -180:
            offset += 360.0
            adj = lon + offset
        out.append([round(adj, 4), lat])
    return out


def build_route(supplier: dict, warehouse: dict, mode: str) -> dict:
    """Return route dict with waypoints, distance and transit hours."""
    if mode == "sea":
        waypoints = _sea_waypoints(supplier, warehouse)
    else:  # air / road: great-circle
        waypoints = densify_great_circle(supplier["lon"], supplier["lat"], warehouse["lon"], warehouse["lat"], 24)
    waypoints = _normalize_antimeridian(waypoints)
    dist = path_distance_km(waypoints)
    transit_hours = dist / MODE_SPEED_KMH[mode] + MODE_HANDLING_HOURS[mode]
    return {
        "mode": mode,
        "waypoints": waypoints,
        "distance_km": round(dist, 1),
        "transit_hours": round(transit_hours, 1),
    }


def pick_mode(supplier: dict, warehouse: dict, criticality: str) -> str:
    """Choose transport mode from geography + product criticality."""
    same_continent = (
        supplier["region"] == warehouse["region"]
        or (supplier["region"] == "north_america" and warehouse["region"] == "north_america")
        or (supplier["region"] == "europe" and warehouse["region"] == "europe")
    )
    if same_continent:
        return "road"
    return "air" if criticality == "high" else "sea"
