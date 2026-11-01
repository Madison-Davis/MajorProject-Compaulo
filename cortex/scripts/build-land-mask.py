"""Build an equirectangular binary PNG from Natural Earth land GeoJSON.

Usage: python3 cortex/scripts/build-land-mask.py /path/to/ne_10m_land.geojson
Source (public domain): https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_10m_land.geojson
No third-party dependencies. Geographic bounds: -180..180 longitude, 90..-90 latitude.
"""

import json
import math
from pathlib import Path
import struct
import sys
import zlib


def build(source, output, width=8192, height=4096):
    pixels = [bytearray(width) for _ in range(height)]
    features = json.loads(Path(source).read_text())["features"]
    for feature in features:
        geometry = feature["geometry"]
        polygons = geometry["coordinates"] if geometry["type"] == "MultiPolygon" else [geometry["coordinates"]]
        for polygon in polygons:
            crossings = {}
            # Even/odd scan conversion includes exterior rings and lake holes.
            for ring in polygon:
                projected = [((lon + 180) / 360 * width, (90 - lat) / 180 * height) for lon, lat, *_ in ring]
                for (x1, y1), (x2, y2) in zip(projected, projected[1:] + projected[:1]):
                    if y1 == y2:
                        continue
                    start = max(0, math.ceil(min(y1, y2) - 0.5))
                    stop = min(height, math.ceil(max(y1, y2) - 0.5))
                    for row in range(start, stop):
                        x = x1 + (row + 0.5 - y1) / (y2 - y1) * (x2 - x1)
                        crossings.setdefault(row, []).append(x)
            for row, intersections in crossings.items():
                intersections.sort()
                for left, right in zip(intersections[::2], intersections[1::2]):
                    start = max(0, math.ceil(left - 0.5))
                    stop = min(width, math.ceil(right - 0.5))
                    if stop > start:
                        pixels[row][start:stop] = b'\xff' * (stop - start)

    def chunk(kind, payload):
        return struct.pack('>I', len(payload)) + kind + payload + struct.pack('>I', zlib.crc32(kind + payload))

    png = b'\x89PNG\r\n\x1a\n'
    png += chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 0, 0, 0, 0))
    png += chunk(b'IDAT', zlib.compress(b''.join(b'\0' + row for row in pixels), 9))
    png += chunk(b'IEND', b'')
    Path(output).write_bytes(png)
    return pixels


if __name__ == '__main__':
    build(sys.argv[1], Path(__file__).resolve().parents[1] / 'cortex-content/maps/land-mask.png')
