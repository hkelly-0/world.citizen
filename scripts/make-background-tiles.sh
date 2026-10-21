#!/bin/sh
# Cuts the map background images into map tiles under public/tiles/.
# Run once from the project root; the generated tiles are bundled with the app.
#
# Needs GDAL (brew install gdal, which includes its Python and numpy) and the
# two public-domain source images,
# saved in the folder given as the first argument:
#   blue-marble.jpg   NASA Blue Marble Next Generation, December 2004, 21600x10800
#     https://eoimages.gsfc.nasa.gov/images/imagerecords/73000/73909/world.topo.bathy.200412.3x21600x10800.jpg
#   NE1_HR_LC_SR_W.tif   Natural Earth I with shaded relief and water, 21600x10800
#     https://naciscdn.org/naturalearth/10m/raster/NE1_HR_LC_SR_W.zip (unzipped)
#
# Usage: scripts/make-background-tiles.sh <source-folder>
set -e

SOURCES="$1"
if [ -z "$SOURCES" ]; then
  echo "Usage: scripts/make-background-tiles.sh <source-folder>"
  exit 1
fi

# The 21600px source images have no extra detail past zoom level 6.
ZOOM_LEVELS=0-6
WEBP_QUALITY=80

make_tiles() {
  input="$1"
  output="$2"
  rm -rf "$output"
  mkdir -p "$output"
  # --xyz: tile numbering MapLibre expects. -p mercator: reproject to the map's projection.
  # -w none: don't generate example web pages.
  gdal2tiles --xyz -p mercator -z "$ZOOM_LEVELS" -w none -r average \
    --tiledriver=WEBP --webp-quality="$WEBP_QUALITY" --processes=8 \
    "$input" "$output"
}

# The Blue Marble JPEG has no map coordinates, so describe it as covering the
# whole world in latitude/longitude (EPSG:4326) before tiling.
gdal_translate -q -of VRT -a_srs EPSG:4326 -a_ullr -180 90 180 -90 \
  "$SOURCES/blue-marble.jpg" "$SOURCES/blue-marble.vrt"
make_tiles "$SOURCES/blue-marble.vrt" public/tiles/satellite

# Recolour the Natural Earth relief to Blue Marble-like colours. The GeoTIFF
# already has map coordinates, and the recoloured copy keeps them.
python3.15 -I scripts/recolour-relief.py \
  "$SOURCES/NE1_HR_LC_SR_W.tif" "$SOURCES/relief-recoloured.tif"
make_tiles "$SOURCES/relief-recoloured.tif" public/tiles/relief
