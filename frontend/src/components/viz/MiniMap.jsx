import React, { useMemo } from "react";
import { DeckGL } from "@deck.gl/react";
import { PathLayer, ScatterplotLayer } from "@deck.gl/layers";
import { WebMercatorViewport } from "@deck.gl/core";
import { RGB } from "@/lib/theme";
import { useWorldGeo, makeLandLayer } from "@/lib/useWorldGeo";

/** Compact route map for one shipment: route path + current position. */
export const MiniMap = ({ waypoints = [], position, mode = "sea", height = 220 }) => {
  const world = useWorldGeo();

  const viewState = useMemo(() => {
    if (!waypoints.length) return { longitude: 0, latitude: 20, zoom: 0.6 };
    let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
    waypoints.forEach(([lon, lat]) => {
      minLon = Math.min(minLon, lon);
      maxLon = Math.max(maxLon, lon);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
    });
    try {
      const vp = new WebMercatorViewport({ width: 420, height }).fitBounds(
        [
          [minLon, minLat],
          [maxLon, maxLat],
        ],
        { padding: 34 }
      );
      return { longitude: vp.longitude, latitude: vp.latitude, zoom: Math.min(vp.zoom, 5) };
    } catch (e) {
      return { longitude: waypoints[0][0], latitude: waypoints[0][1], zoom: 1.5 };
    }
  }, [waypoints, height]);

  const layers = useMemo(() => {
    const color = mode === "air" ? RGB.blue : mode === "road" ? RGB.amber : RGB.cyan;
    return [
      makeLandLayer(world, "mini-land"),
      new PathLayer({
        id: "route",
        data: [{ path: waypoints }],
        getPath: (d) => d.path,
        getColor: [...color, 170],
        getWidth: 2.5,
        widthUnits: "pixels",
        capRounded: true,
        jointRounded: true,
      }),
      new ScatterplotLayer({
        id: "endpoints",
        data: [
          { pos: waypoints[0], c: [...RGB.neutral, 200], r: 4 },
          { pos: waypoints[waypoints.length - 1], c: [...RGB.green, 220], r: 4 },
          ...(position ? [{ pos: position, c: [...color, 255], r: 6 }] : []),
        ],
        getPosition: (d) => d.pos,
        getFillColor: (d) => d.c,
        getRadius: (d) => d.r,
        radiusUnits: "pixels",
        stroked: true,
        getLineColor: [255, 255, 255, 70],
        lineWidthMinPixels: 1,
      }),
    ];
  }, [waypoints, position, mode, world]);

  if (!waypoints.length) return null;

  return (
    <div
      className="relative overflow-hidden rounded-lg border border-[hsl(var(--stroke-soft)/0.6)]"
      style={{ height, background: "#070b11" }}
      data-testid="shipment-mini-map"
    >
      <DeckGL initialViewState={viewState} controller={false} layers={layers} />
    </div>
  );
};
