#!/bin/sh
# Cuts the satellite background image into map tiles under public/tiles/.
# Run once from the project root; the generated tiles are bundled with the app.
#
# Needs GDAL (brew install gdal) and the public-domain source image, saved in
# the folder given as the first argument:
#   blue-marble.jpg   NASA Blue Marble Next Generation, June 2004, 21600x10800
#     https://eoimages.gsfc.nasa.gov/images/imagerecords/73000/73726/world.topo.bathy.200406.3x21600x10800.jpg
#
# Usage: scripts/make-background-tiles.sh <source-folder>
set -e

SOURCES="$1"
if [ -z "$SOURCES" ]; then
  echo "Usage: scripts/make-background-tiles.sh <source-folder>"
  exit 1
fi

# The 21600px source image has no extra detail past zoom level 6.
ZOOM_LEVELS=0-6
WEBP_QUALITY=80
OUTPUT=public/tiles/satellite

# The Blue Marble JPEG has no map coordinates, so describe it as covering the
# whole world in latitude/longitude (EPSG:4326) before tiling.
gdal_translate -q -of VRT -a_srs EPSG:4326 -a_ullr -180 90 180 -90 \
  "$SOURCES/blue-marble.jpg" "$SOURCES/blue-marble.vrt"

rm -rf "$OUTPUT"
mkdir -p "$OUTPUT"
# --xyz: tile numbering MapLibre expects. -p mercator: reproject to the map's projection.
# -w none: don't generate example web pages.
gdal2tiles --xyz -p mercator -z "$ZOOM_LEVELS" -w none -r average \
  --tiledriver=WEBP --webp-quality="$WEBP_QUALITY" --processes=8 \
  "$SOURCES/blue-marble.vrt" "$OUTPUT"
