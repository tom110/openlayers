import Map from 'ol/Map.js';
import View from 'ol/View.js';
import TileLayer from 'ol/layer/Tile.js';
import OSM from 'ol/source/OSM.js';
import TileWMS from 'ol/source/TileWMS.js';
import Overlay from 'ol/Overlay.js';
import ImageLayer from 'ol/layer/Image.js';
import ImageWMS from 'ol/source/ImageWMS.js';

var $ =require("jquery");


/**
 * overlay的元素
 */
var container = document.getElementById('popup');
var content = document.getElementById('popup-content');
var closer = document.getElementById('popup-closer');

/**
 * 创建一个overlay贴在map上
 */
var overlay = new Overlay({
    element: container,
    autoPan: true, //map会根据overlay的大小平移
    autoPanAnimation: {
        duration: 250 //map适配overlay平移时间
    }
});

/**
 * overlay上的关闭按钮
 */
closer.onclick = function() {
    overlay.setPosition(undefined);
    closer.blur();
    return false;
};


/**
 * geoserver WMS服务
 * */
var wmsSource = new ImageWMS({
    url: 'http://192.168.50.254:12222/geoserver/postgis/wms',
    params: {'LAYERS': 'postgis:环翠区海洋牧场位置 （测绘院）', 'VERSION': '1.1.1'},
    serverType: 'geoserver'
});

var wmsLayer = new ImageLayer({
    source: wmsSource
});




var map = new Map({
    layers: [
        new TileLayer({
            source: new OSM()
        }),
        // new TileLayer({
        //     source: new TileWMS({
        //         url: 'http://192.168.50.254:12222/geoserver/postgis/wms',
        //         params: {
        //             'LAYERS': 'postgis:环翠区海洋牧场位置 （测绘院）',
        //             'TILED': true
        //         }
        //     })
        // }),
        wmsLayer
    ],
    overlays: [overlay],
    target: 'map',
    view: new View({
        center: [122.20985412597656,37.45410919189454],
        zoom: 11,
        projection: 'EPSG:4326'
    })
});

map.on('singleclick', function(evt) {
    var coordinate = evt.coordinate;


    console.log(coordinate);
    var view = map.getView();
    var viewResolution = view.getResolution();
    var source = wmsLayer.getSource();
    var url = source.getGetFeatureInfoUrl(
        evt.coordinate, viewResolution, view.getProjection(),
        {'INFO_FORMAT': 'application/json', 'FEATURE_COUNT': 50});


    // content.innerHTML = '<p>你点击处的坐标为:</p><code>' + coordinate +
    //     '</code>';

    $.ajax({
        url : url,
        type: "GET",
        dataTYPE: "jsonp",
        success : function(json) {
            var result = JSON.stringify(json);
            if(json.features.length>0){
                overlay.setPosition(coordinate);
                var properties=json.features[0].properties;
                var popup_content=$("#popup-content");
                popup_content.empty();
                var popup_content_innerstr="";
                $.each(properties,function(n,v){
                    popup_content_innerstr=popup_content_innerstr+"<span>"+n+":"+v+"</span><br/>"
                });
                popup_content.append(popup_content_innerstr);
            }

        }
    });
});