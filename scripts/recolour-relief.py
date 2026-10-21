"""Recolours the Natural Earth shaded relief to look like NASA Blue Marble:
dark blue ocean, deep green forests, light tan deserts, white ice.

Natural Earth paints each kind of surface in a pale colour, then shades
mountains on top. Each pixel is matched to the surface colours below by its
hue (ignoring how light or dark it is), blended smoothly between the closest
ones, and given the matching Blue Marble-like colour. The pixel's own lightness
relative to its surface colour is then applied, which keeps the mountain shading.

Usage: python3.15 scripts/recolour-relief.py <input.tif> <output.tif>
Needs GDAL's Python bindings and numpy (both come with brew install gdal).
"""

import sys

import numpy as np
from osgeo import gdal

gdal.UseExceptions()

# (surface, Natural Earth colour, new colour). The Natural Earth colours were
# measured from the image; the new colours from Blue Marble at the same places,
# except where its December snow or bare winter trees would be misleading.
SURFACE_COLOURS = [
    ('ocean', (118, 168, 203), (8, 22, 54)),
    ('forest', (176, 200, 174), (28, 48, 16)),
    ('farmland and mixed', (211, 219, 182), (50, 64, 26)),
    ('grassland', (233, 233, 191), (105, 96, 56)),
    ('tundra', (221, 221, 211), (110, 104, 84)),
    ('pale sand desert', (245, 244, 228), (212, 186, 140)),
    ('desert', (238, 228, 212), (186, 160, 122)),
    ('red desert', (226, 210, 184), (165, 122, 82)),
    # Same hue as ice but darker, e.g. the Tibetan Plateau.
    ('high plateau', (214, 217, 220), (144, 124, 94)),
    ('ice', (236, 241, 247), (246, 248, 250)),
]

# How sharply each pixel is matched to its closest surface colours. Smaller
# values give cleaner surfaces; larger values blend neighbouring surfaces more.
MATCH_SHARPNESS = 6.0

# How much lightness counts when matching, compared with hue. Some surfaces
# differ only in lightness (ice and high plateau), but too much would let
# mountain shading change a slope's surface type.
LIGHTNESS_WEIGHT = 0.5

# Rows processed at a time, so the 21600x10800 image fits in memory. Matching
# compares every pixel with every surface colour, so each row uses about 2.5 MB.
ROWS_PER_STRIP = 64


def lightness(rgb):
    """Perceived lightness of each colour, for an array whose last axis is RGB."""
    return rgb @ np.array([0.299, 0.587, 0.114], dtype=np.float32)


def recolour(pixels):
    """Recolours an array of RGB pixels with shape (n, 3), values 0-255."""
    old = np.array([c[1] for c in SURFACE_COLOURS], dtype=np.float32)
    new = np.array([c[2] for c in SURFACE_COLOURS], dtype=np.float32)
    old_lightness = lightness(old)

    pixel_lightness = np.maximum(lightness(pixels), 1.0)

    # Compare hues: scale each pixel to each surface colour's lightness before
    # measuring how far apart they are. Shape (n pixels, n surfaces).
    scale = old_lightness[None, :] / pixel_lightness[:, None]
    scaled = pixels[:, None, :] * scale[:, :, None]
    hue_distance = np.linalg.norm(scaled - old[None, :, :], axis=2)
    # Then add a smaller amount of the lightness difference.
    lightness_distance = LIGHTNESS_WEIGHT * (pixel_lightness[:, None] - old_lightness[None, :])
    distance = np.sqrt(hue_distance ** 2 + lightness_distance ** 2)

    # Closer surface colours get more weight; weights add up to 1 per pixel.
    weights = np.exp(-((distance / MATCH_SHARPNESS) ** 2))
    # Avoid dividing by zero for pixels far from every surface colour: give them
    # the closest surface's colour.
    closest = np.argmin(distance, axis=1)
    weights[np.arange(len(pixels)), closest] += 1e-6
    weights /= weights.sum(axis=1, keepdims=True)

    new_colour = weights @ new
    # Shading: how much lighter or darker this pixel is than its surface colour.
    shading = pixel_lightness / (weights @ old_lightness)
    return np.clip(new_colour * shading[:, None], 0, 255)


def main(input_path, output_path):
    source = gdal.Open(input_path)
    width, height = source.RasterXSize, source.RasterYSize

    output = gdal.GetDriverByName('GTiff').Create(
        output_path, width, height, 3, gdal.GDT_Byte, options=['COMPRESS=DEFLATE'])
    output.SetGeoTransform(source.GetGeoTransform())
    output.SetProjection(source.GetProjection())

    for top in range(0, height, ROWS_PER_STRIP):
        rows = min(ROWS_PER_STRIP, height - top)
        # ReadAsArray gives (bands, rows, columns); recolour wants (pixels, RGB).
        strip = source.ReadAsArray(0, top, width, rows).astype(np.float32)
        pixels = strip.reshape(3, -1).T
        recoloured = recolour(pixels).T.reshape(3, rows, width).astype(np.uint8)
        output.WriteArray(recoloured, 0, top, band_list=[1, 2, 3])
        print(f'{min(top + rows, height)}/{height} rows', end='\r', flush=True)

    output.FlushCache()
    print()


if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit('Usage: python3.15 scripts/recolour-relief.py <input.tif> <output.tif>')
    main(sys.argv[1], sys.argv[2])
