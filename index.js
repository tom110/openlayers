import Map from 'ol/Map.js';
import View from 'ol/View.js';
import TileLayer from 'ol/layer/Tile.js';
import OSM from 'ol/source/OSM.js';
import TileWMS from 'ol/source/TileWMS.js';

var map = new Map({
    layers: [
        new TileLayer({
            source: new OSM()
        }),
        new TileLayer({
            source: new TileWMS({
                url: 'http://192.168.50.254:12222/geoserver/postgis/wms',
                params: {
                    'LAYERS': 'postgis:环翠区海洋牧场位置 （测绘院）',
                    'TILED': true
                }
            })
        })
    ],
    target: 'map',
    view: new View({
        projection: 'EPSG:4326',
        center: [0, 0],
        zoom: 2
    })
});