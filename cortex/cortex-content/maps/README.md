`land-mask.png` is an 8192 × 4096 binary equirectangular land mask generated
from Natural Earth's public-domain 1:10m land polygons. White is land; black
is water. It includes geographic lake holes, without country-ID shading.

Source: https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_10m_land.geojson
License: https://www.naturalearthdata.com/about/terms-of-use/

To rebuild after downloading the source:

```sh
python3 cortex/scripts/build-land-mask.py /path/to/ne_10m_land.geojson
```

The globe uses the same `coordToPos(latitude, longitude, radius)` conversion
for land dots and project markers. Add project locations in
`cortex-content/data.js` using decimal degrees, positive north/east and
negative south/west. Markers retain their supplied location; they are never
snapped to land. Coastlines are limited by the source map's resolution, and
small islands may fall between background dots.
