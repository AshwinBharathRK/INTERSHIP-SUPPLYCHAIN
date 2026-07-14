import { useQuery } from "@tanstack/react-query";
import { GeoJsonLayer } from "@deck.gl/layers";

/**
 * Self-contained dark world basemap rendered by deck.gl itself.
 * Natural Earth 110m countries, tripled at lon -360 / 0 / +360 so that
 * antimeridian-continuous shipping routes always have land beneath them.
 */
const shiftFeature = (feature, offset) => {
  const shiftRing = (ring) => ring.map(([lon, lat]) => [lon + offset, lat]);
  const g = feature.geometry;
  let coordinates;
  if (g.type === "Polygon") coordinates = g.coordinates.map(shiftRing);
  else if (g.type === "MultiPolygon") coordinates = g.coordinates.map((poly) => poly.map(shiftRing));
  else return feature;
  return { ...feature, geometry: { ...g, coordinates } };
};

import { RGB } from "./theme";

export const useWorldGeo = () => {
  const { data } = useQuery({
    queryKey: ["worldGeo"],
    queryFn: async () => {
      const res = await fetch("/geo/world.json");
      const geo = await res.json();
      const features = [];
      for (const offset of [-360, 0, 360]) {
        for (const f of geo.features) features.push(offset === 0 ? f : shiftFeature(f, offset));
      }
      return { type: "FeatureCollection", features };
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });
  return data;
};

export const makeLandLayer = (world, id = "world-land") =>
  new GeoJsonLayer({
    id,
    data: world || { type: "FeatureCollection", features: [] },
    stroked: true,
    filled: true,
    getFillColor: [...(RGB.land || [22, 30, 43]), 255],
    getLineColor: [...(RGB.border || [92, 112, 138]), 90],
    lineWidthMinPixels: 0.6,
    pickable: false,
  });
