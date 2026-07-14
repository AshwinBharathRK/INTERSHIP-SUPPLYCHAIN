"""Geospatial helpers: haversine distance, waypoint routes, position interpolation."""
import math

EARTH_RADIUS_KM = 6371.0


def haversine_km(lon1: float, lat1: float, lon2: float, lat2: float) -> float:
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * EARTH_RADIUS_KM * math.asin(math.sqrt(a))


def path_distance_km(waypoints: list[list[float]]) -> float:
    """Total distance along a [lon, lat] waypoint path."""
    total = 0.0
    for i in range(len(waypoints) - 1):
        total += haversine_km(waypoints[i][0], waypoints[i][1], waypoints[i + 1][0], waypoints[i + 1][1])
    return total


def densify_great_circle(lon1: float, lat1: float, lon2: float, lat2: float, n: int = 12) -> list[list[float]]:
    """Return n+1 points along the great circle between two coords (slerp)."""
    phi1, lam1 = math.radians(lat1), math.radians(lon1)
    phi2, lam2 = math.radians(lat2), math.radians(lon2)
    d = 2 * math.asin(
        math.sqrt(
            math.sin((phi2 - phi1) / 2) ** 2
            + math.cos(phi1) * math.cos(phi2) * math.sin((lam2 - lam1) / 2) ** 2
        )
    )
    if d < 1e-9:
        return [[lon1, lat1], [lon2, lat2]]
    pts = []
    for i in range(n + 1):
        f = i / n
        a = math.sin((1 - f) * d) / math.sin(d)
        b = math.sin(f * d) / math.sin(d)
        x = a * math.cos(phi1) * math.cos(lam1) + b * math.cos(phi2) * math.cos(lam2)
        y = a * math.cos(phi1) * math.sin(lam1) + b * math.cos(phi2) * math.sin(lam2)
        z = a * math.sin(phi1) + b * math.sin(phi2)
        lat = math.degrees(math.atan2(z, math.sqrt(x * x + y * y)))
        lon = math.degrees(math.atan2(y, x))
        pts.append([round(lon, 4), round(lat, 4)])
    return pts


def densify_path(waypoints: list[list[float]], seg_points: int = 8) -> list[list[float]]:
    """Densify a multi-waypoint path with great-circle segments."""
    out: list[list[float]] = []
    for i in range(len(waypoints) - 1):
        seg = densify_great_circle(
            waypoints[i][0], waypoints[i][1], waypoints[i + 1][0], waypoints[i + 1][1], seg_points
        )
        if out:
            seg = seg[1:]
        out.extend(seg)
    return out


def position_along_path(waypoints: list[list[float]], progress: float) -> list[float]:
    """Interpolate [lon, lat] at fractional progress (0..1) along the path."""
    progress = max(0.0, min(1.0, progress))
    if progress <= 0:
        return list(waypoints[0])
    if progress >= 1:
        return list(waypoints[-1])
    total = path_distance_km(waypoints)
    target = total * progress
    acc = 0.0
    for i in range(len(waypoints) - 1):
        seg = haversine_km(waypoints[i][0], waypoints[i][1], waypoints[i + 1][0], waypoints[i + 1][1])
        if acc + seg >= target and seg > 0:
            f = (target - acc) / seg
            lon = waypoints[i][0] + (waypoints[i + 1][0] - waypoints[i][0]) * f
            lat = waypoints[i][1] + (waypoints[i + 1][1] - waypoints[i][1]) * f
            return [round(lon, 4), round(lat, 4)]
        acc += seg
    return list(waypoints[-1])
