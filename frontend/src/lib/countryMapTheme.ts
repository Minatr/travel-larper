/**
 * Colors of a country's map: OpenFreeMap's dark style, recolored in the
 * app's palette when the map loads (CLAUDE.md section 8).
 */
import type { Map as MapLibreMap } from 'maplibre-gl'

/** Sea, as the globe's ocean (globeStyle.ts). */
const SEA_COLOR = '#0a1a33'
/** Land of the country shown: lighter than the dimmed land around. */
export const COUNTRY_LAND_COLOR = '#26354f'
/** Land of the other countries, under the mask. */
export const OUTSIDE_LAND_COLOR = '#111823'

// Paint property name, as setPaintProperty takes it (e.g. 'fill-color').
type PaintProperty = Parameters<MapLibreMap['setPaintProperty']>[1]

/**
 * Recolored layers of the style: layer, paint property, color. A layer
 * missing from the style is skipped.
 */
export const COUNTRY_MAP_COLORS: [string, PaintProperty, string][] = [
  ['background', 'background-color', COUNTRY_LAND_COLOR],
  ['water', 'fill-color', SEA_COLOR],
  ['waterway', 'line-color', SEA_COLOR],
  // Glaciers and ice sheets, near black in the dark style (inland Greenland).
  ['landcover_glacier', 'fill-color', COUNTRY_LAND_COLOR],
  ['landcover_ice_shelf', 'fill-color', COUNTRY_LAND_COLOR],
  ['landuse_residential', 'fill-color', '#2b3b56'],
  ['landuse_park', 'fill-color', '#273a50'],
  ['building', 'fill-color', '#2f3f5b'],
  ['building', 'fill-outline-color', COUNTRY_LAND_COLOR],
  ['aeroway-area', 'fill-color', '#32425e'],
  ['road_area_pier', 'fill-color', '#32425e'],
  ['highway_path', 'line-color', '#32425e'],
  ['highway_minor', 'line-color', '#32425e'],
  ['highway_major_casing', 'line-color', '#1b2537'],
  ['highway_major_inner', 'line-color', '#3a4c6e'],
  ['highway_major_subtle', 'line-color', '#3a4c6e'],
  ['highway_motorway_casing', 'line-color', '#1b2537'],
  ['highway_motorway_inner', 'line-color', '#465c80'],
  ['highway_motorway_subtle', 'line-color', '#465c80'],
  ['railway', 'line-color', '#34425a'],
  ['railway_minor', 'line-color', '#34425a'],
  ['railway_transit', 'line-color', '#34425a'],
  ['boundary_state', 'line-color', '#42536f'],
  ['boundary_country_z0-4', 'line-color', '#5a6b85'],
  ['boundary_country_z5-', 'line-color', '#5a6b85'],
  ['water_name', 'text-color', '#4f6a92'],
  ['water_name', 'text-halo-color', SEA_COLOR],
  ['place_city', 'text-color', '#9aa3b2'],
  ['place_city', 'text-halo-color', COUNTRY_LAND_COLOR],
  ['place_city_large', 'text-color', '#c3cad6'],
  ['place_city_large', 'text-halo-color', COUNTRY_LAND_COLOR],
  ['place_town', 'text-color', '#9aa3b2'],
  ['place_town', 'text-halo-color', COUNTRY_LAND_COLOR],
  ['place_village', 'text-color', '#7d889a'],
  ['place_village', 'text-halo-color', COUNTRY_LAND_COLOR],
  ['place_other', 'text-color', '#7d889a'],
  ['place_other', 'text-halo-color', COUNTRY_LAND_COLOR],
  ['place_suburb', 'text-color', '#7d889a'],
  ['place_suburb', 'text-halo-color', COUNTRY_LAND_COLOR],
  ['place_state', 'text-color', '#6b778b'],
  ['place_state', 'text-halo-color', COUNTRY_LAND_COLOR],
  ['highway_name_other', 'text-color', '#6b778b'],
  ['highway_name_other', 'text-halo-color', COUNTRY_LAND_COLOR],
  ['highway_name_motorway', 'text-color', '#7d889a'],
]

/** Hidden layers: woods use a texture that cannot be recolored. */
export const COUNTRY_MAP_HIDDEN_LAYERS = ['landcover_wood']

/**
 * Border layers kept to land borders: at sea, OpenStreetMap borders follow
 * the territorial waters, ringing every island.
 */
export const LAND_BORDER_LAYERS = [
  'boundary_state',
  'boundary_country_z0-4',
  'boundary_country_z5-',
]

/** Layers drawn above the mask, so the neighbours keep their shapes. */
export const ABOVE_MASK_LAYERS = [
  'water',
  'boundary_country_z0-4',
  'boundary_country_z5-',
]
