"""Draws the globe's population lights as map tiles under public/tiles/population/.
Run once from the project root; the generated tiles are bundled with the app.

Needs GDAL (brew install gdal), Python with numpy and Pillow, and GHS-POP's 2025 grid
at 30 arcseconds, unzipped into the folder given as the first argument:
  https://jeodpp.jrc.ec.europa.eu/ftp/jrc-opendata/GHSL/GHS_POP_GLOBE_R2023A/GHS_POP_E2025_GLOBE_R2023A_4326_30ss/V1-0/GHS_POP_E2025_GLOBE_R2023A_4326_30ss_V1_0.zip

Usage: python3 -I scripts/make-population-lights.py <source-folder>

One set of dots is made for the most detailed zoom. Each dot stands for a fixed number of
people (the remainder is rounded randomly, so totals stay right on average) and sits at a
random spot inside its grid cell. Each zoom level out keeps a quarter of the dots, so a
dot stays where it is while zooming instead of the pattern reshuffling.

The grid is not warped to the map's projection first, as resampling would change the
counts: dots are placed in degrees, then converted to Web Mercator pixels.
"""

import json
import os
import shutil
import subprocess
import sys
import tempfile

import numpy as np
from PIL import Image

SOURCE_FILE = "GHS_POP_E2025_GLOBE_R2023A_4326_30ss_V1_0.tif"
OUTPUT = "public/tiles/population"
TILE_SIZE = 256
MIN_ZOOM = 0
# The same as POPULATION_MAX_DETAIL_ZOOM in countryMap.ts, and as far as the globe zooms
# in (MAX_ZOOM_AT_EQUATOR in zoomLimits.ts).
MAX_ZOOM = 7

PEOPLE_PER_DOT_AT_MAX_ZOOM = 500
# How bright a pixel holding one dot is, out of 1.
DOT_BRIGHTNESS = 0.45
GLOW_STRENGTH = 0.12
GLOW_RADIUS = 2
# How far the glow reaches, as the blur is done twice.
GLOW_REACH = 2 * GLOW_RADIUS
# Zoomed out, each screen pixel covers few dots and looks faint, so brightness is multiplied
# by this up to BOOST_FULL_UNTIL_ZOOM, fading away by BOOST_ENDS_AT_ZOOM.
ZOOMED_OUT_BOOST = 1.6
BOOST_FULL_UNTIL_ZOOM = 2
BOOST_ENDS_AT_ZOOM = 6
# Dim pixels are amber and the brightest are near white, so dense cities still look
# different from their surroundings once a pixel is fully opaque.
DIM_COLOUR = np.array([255, 195, 122], dtype=np.float32)
BRIGHT_COLOUR = np.array([255, 245, 225], dtype=np.float32)
# Rows of the grid read at once, to keep memory use down.
ROWS_PER_CHUNK = 500
# Web Mercator tiles stop here.
MAX_LATITUDE = 85.05112878


def box_blur(image, radius):
    """A fast blur, done twice so it looks close to a Gaussian."""
    for _ in range(2):
        for axis in (0, 1):
            size = image.shape[axis]
            padded = np.concatenate(
                [np.zeros_like(np.take(image, [0], axis=axis)), np.cumsum(image, axis=axis, dtype=np.float64)],
                axis=axis,
            )
            after = np.take(padded, np.minimum(np.arange(size) + radius + 1, size), axis=axis)
            before = np.take(padded, np.maximum(np.arange(size) - radius, 0), axis=axis)
            image = (after - before) / (2 * radius + 1)
    return image


def boost_at_zoom(zoom):
    fade = np.clip((zoom - BOOST_FULL_UNTIL_ZOOM) / (BOOST_ENDS_AT_ZOOM - BOOST_FULL_UNTIL_ZOOM), 0, 1)
    return ZOOMED_OUT_BOOST + (1 - ZOOMED_OUT_BOOST) * fade


def make_dots(raw_path, info):
    """Returns the longitude and latitude of every dot at the most detailed zoom."""
    cols, rows = info["size"]
    west, cell_x, _, north, _, cell_y = info["geoTransform"]
    counts = np.memmap(raw_path, dtype="<f4", mode="r", shape=(rows, cols))
    # Fixed seed, so a rerun gives the same dots.
    rng = np.random.default_rng(42)
    longitudes = []
    latitudes = []
    for first_row in range(0, rows, ROWS_PER_CHUNK):
        # The nodata value is negative, so clipping removes it too.
        chunk = np.nan_to_num(counts[first_row : first_row + ROWS_PER_CHUNK], nan=0.0).clip(min=0)
        expected_dots = chunk / PEOPLE_PER_DOT_AT_MAX_ZOOM
        whole_dots = np.floor(expected_dots)
        dots_per_cell = (whole_dots + (rng.random(chunk.shape) < expected_dots - whole_dots)).astype(np.int64)
        dot_rows, dot_cols = np.nonzero(dots_per_cell)
        repeats = dots_per_cell[dot_rows, dot_cols]
        dot_rows = np.repeat(dot_rows, repeats) + first_row
        dot_cols = np.repeat(dot_cols, repeats)
        longitudes.append(west + (dot_cols + rng.random(len(dot_cols))) * cell_x)
        # cell_y is negative.
        latitudes.append(north + (dot_rows + rng.random(len(dot_rows))) * cell_y)
    return np.concatenate(longitudes), np.concatenate(latitudes)


def write_tile(pixel_x, pixel_y, tile_x, tile_y, zoom):
    """Draws one tile from the dots on it and within GLOW_REACH of it, as the glow crosses
    tile edges. Returns the file's size in bytes, or 0 if the tile has nothing to show."""
    full_size = TILE_SIZE + 2 * GLOW_REACH
    row = pixel_y - tile_y * TILE_SIZE + GLOW_REACH
    col = pixel_x - tile_x * TILE_SIZE + GLOW_REACH
    nearby = (row >= 0) & (row < full_size) & (col >= 0) & (col < full_size)
    dot_totals = np.zeros((full_size, full_size), dtype=np.float32)
    np.add.at(dot_totals, (row[nearby], col[nearby]), 1)

    # A square root keeps one lone dot visible next to a city holding hundreds.
    glow = np.sqrt(box_blur(dot_totals, GLOW_RADIUS)) * GLOW_STRENGTH
    lights = (np.sqrt(dot_totals) * DOT_BRIGHTNESS + glow) * boost_at_zoom(zoom)
    brightness = lights[GLOW_REACH:-GLOW_REACH, GLOW_REACH:-GLOW_REACH]
    alpha = np.clip(brightness, 0, 1)
    if alpha.max() < 1 / 255:
        return 0
    # Only pixels already past fully opaque turn white.
    whiteness = np.clip((brightness - 0.6) / 1.2, 0, 1)[..., np.newaxis]
    rgba = np.empty((TILE_SIZE, TILE_SIZE, 4), dtype=np.uint8)
    rgba[..., :3] = (DIM_COLOUR * (1 - whiteness) + BRIGHT_COLOUR * whiteness).astype(np.uint8)
    rgba[..., 3] = (alpha * 255).astype(np.uint8)

    folder = os.path.join(OUTPUT, str(zoom), str(tile_x))
    os.makedirs(folder, exist_ok=True)
    path = os.path.join(folder, f"{tile_y}.webp")
    Image.fromarray(rgba).save(path, "WEBP", quality=75, alpha_quality=75, method=4)
    return os.path.getsize(path)


def write_zoom(longitudes, latitudes, zoom):
    world_pixels = TILE_SIZE * 2**zoom
    tiles_across = 2**zoom
    # The grid starts a little west of 180°, so those dots wrap around.
    pixel_x = np.floor((longitudes + 180) / 360 * world_pixels).astype(np.int64) % world_pixels
    mercator = np.log(np.tan(np.pi / 4 + np.radians(latitudes) / 2))
    pixel_y = np.floor((1 - mercator / np.pi) / 2 * world_pixels).astype(np.int64)

    # Sorted by tile, so one tile's dots are found without searching all of them.
    tile_keys = (pixel_y // TILE_SIZE) * tiles_across + pixel_x // TILE_SIZE
    order = np.argsort(tile_keys)
    pixel_x = pixel_x[order]
    pixel_y = pixel_y[order]
    keys, starts, counts = np.unique(tile_keys[order], return_index=True, return_counts=True)
    dots_of_tile = {int(key): (int(start), int(count)) for key, start, count in zip(keys, starts, counts)}

    # Tiles next to one holding dots can show its glow, so they are drawn too.
    tiles = set()
    for key in dots_of_tile:
        tile_y, tile_x = divmod(key, tiles_across)
        for y in range(tile_y - 1, tile_y + 2):
            for x in range(tile_x - 1, tile_x + 2):
                if 0 <= y < tiles_across:
                    tiles.add((x % tiles_across, y))

    tile_count = 0
    byte_count = 0
    for tile_x, tile_y in sorted(tiles):
        slices = []
        for y in range(tile_y - 1, tile_y + 2):
            for x_offset in range(-1, 2):
                # A dot across the antimeridian is moved next to this tile.
                x = tile_x + x_offset
                found = dots_of_tile.get(y * tiles_across + x % tiles_across)
                if found is not None:
                    start, count = found
                    shift = (x - x % tiles_across) * TILE_SIZE
                    slices.append((pixel_x[start : start + count] + shift, pixel_y[start : start + count]))
        tile_pixel_x = np.concatenate([xs for xs, _ in slices])
        tile_pixel_y = np.concatenate([ys for _, ys in slices])
        size = write_tile(tile_pixel_x, tile_pixel_y, tile_x, tile_y, zoom)
        if size > 0:
            tile_count += 1
            byte_count += size
    print(f"zoom {zoom}: {len(longitudes):,} dots, {tile_count} tiles, {byte_count / 1e6:.2f} MB", flush=True)


def main():
    if len(sys.argv) != 2:
        sys.exit("Usage: python3 -I scripts/make-population-lights.py <source-folder>")
    source_path = os.path.join(sys.argv[1], SOURCE_FILE)

    # A plain file of numbers, which numpy can read a part of at a time.
    with tempfile.TemporaryDirectory(dir=sys.argv[1]) as working_folder:
        raw_path = os.path.join(working_folder, "counts.raw")
        subprocess.run(["gdal_translate", "-q", "-of", "ENVI", "-ot", "Float32", source_path, raw_path], check=True)
        info = json.loads(subprocess.run(["gdalinfo", "-json", raw_path], check=True, capture_output=True).stdout)
        longitudes, latitudes = make_dots(raw_path, info)

    inside_map = np.abs(latitudes) < MAX_LATITUDE
    longitudes = longitudes[inside_map]
    latitudes = latitudes[inside_map]
    # A dot appears from the zoom where its rank first falls within that zoom's share.
    ranks = np.random.default_rng(43).random(len(longitudes))

    shutil.rmtree(OUTPUT, ignore_errors=True)
    for zoom in range(MIN_ZOOM, MAX_ZOOM + 1):
        kept = ranks < 4.0 ** (zoom - MAX_ZOOM)
        write_zoom(longitudes[kept], latitudes[kept], zoom)


main()
