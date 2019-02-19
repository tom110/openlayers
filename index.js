import Map from 'ol/Map.js';
import View from 'ol/View.js';
import TileLayer from 'ol/layer/Tile.js';
import OSM from 'ol/source/OSM.js';
import Overlay from 'ol/Overlay.js';
import ImageLayer from 'ol/layer/Image.js';
import ImageWMS from 'ol/source/ImageWMS.js';

import {WFS, GeoJSON} from 'ol/format.js';
import {Vector as VectorLayer} from 'ol/layer.js';
import VectorSource from 'ol/source/Vector.js';

import {defaults as defaultInteractions, Draw, Modify, Select} from 'ol/interaction.js';
import {defaults as defaultControls, Control} from 'ol/control.js';

import Feature from 'ol/Feature.js';
import Point from 'ol/geom/Point';

/**
 * 引入jquery
 * */
var $ = require("jquery");
/**
 * 存储选中元素存储的变量
 * 保存被选中的元素
 * */
var selectedFeature = null;
/**
 * 存储是否处于添加状态的变量
 * 点击添加元素按钮，设置为true，添加完元素后设置为false，保证一次只添加一个元素
 * */
var addStatusFlag = false;
/**
 * 存储是否处于删除状态的变量
 * */
var deleteStatusFlag=false;


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
closer.onclick = function () {
    //关闭标签的时候把选中元素设置为空
    selectedFeature = null;

    overlay.setPosition(undefined);
    closer.blur();
    return false;
};


/**
 * geoserver WMS服务
 * */
var wmsSource = new ImageWMS({
    url: 'http://192.168.50.254:12222/geoserver/postgis/wms',
    params: {'LAYERS': 'postgis:环翠区海洋牧场位置', 'VERSION': '1.1.1'},
    serverType: 'geoserver'
});
var wmsLayer = new ImageLayer({
    source: wmsSource
});


/**
 * geoserver WFS服务
 *
 * */
var vectorSource = new VectorSource();
var vector = new VectorLayer({
    source: vectorSource,
});


//定义一个选择交互
var select = new Select();


/**
 * 自定义属性修改地图控件
 * */
var ModifyAttrControl = (function (Control) {
    function ModifyAttrControl(opt_options) {
        var options = opt_options || {};

        var button = document.createElement('button');
        button.innerHTML = 'B';
        $(button).attr("title", "属性修改");

        var element = document.createElement('div');
        element.className = 'modify-attr ol-unselectable ol-control';
        element.appendChild(button);

        Control.call(this, {
            element: element,
            target: options.target
        });

        button.addEventListener('click', this.modifyAttr.bind(this), false);
    }

    if (Control) ModifyAttrControl.__proto__ = Control;
    ModifyAttrControl.prototype = Object.create(Control && Control.prototype);
    ModifyAttrControl.prototype.constructor = ModifyAttrControl;

    ModifyAttrControl.prototype.modifyAttr = function modifyAttr() {
        if (overlay.getPosition() != undefined) {
            //** start转换为修改属性界面，拆分span，并给提交按钮添加提交方法
            $("#popup-content").children("span").each(function () {
                var text = $(this).text().split(':');
                $(this).text(text[0] + "：");
                $(this).append("<input type='text' value='" + text[1] + "'></input>");
            });
            $("#popup-content").append("<button class='btn btn-primary' id='modifyAttrBtn'>提交</button>");
            $("#modifyAttrBtn").click(function () {
                var f = selectedFeature;
                //如果存在选中元素
                if (f) {
                    //** start得到所有span和input的值
                    var spanVals = [];
                    var inputVal = [];
                    $("#popup-content").children("span").each(function () {
                        spanVals.push($(this).text().split('：')[0]);
                        inputVal.push($(this).children("input").first().val());
                    });
                    //** end得到所有span和input的值

                    //** start修改值传入feature
                    for (var i = 0; i < spanVals.length; i++) {
                        f.set(spanVals[i], inputVal[i]);
                    }
                    //** end修改值传入feature

                    /**
                     * start----此处修改存在坐标倒置情况，要交换坐标（bate）
                     * 第一次查询坐标是倒置的，修改提交后再此查询坐标就不会倒置了，但是这样再交换坐标就有坐标xy倒置情况，
                     * 解决方式是：因为中国境内所有点的经度都大于维度，所以通过xy值的大小进行倒置操作，所以这里的逻辑是有漏洞的
                     */
                    var coordianates = f.values_.geometry.flatCoordinates;
                    if (coordianates[1] < coordianates[0]) f.values_.geometry.flatCoordinates = [coordianates[1], coordianates[0]];
                    //** end-----此处修改存在坐标倒置情况，要交换坐标

                    f.setGeometryName("geom");  // do this if geometry isn't named 'geometry'
                    var wfs = new WFS({});
                    var transaction = wfs.writeTransaction(null, [f], null, {
                        featureNS: "http://192.168.50.254:12222/geoserver/postgis",
                        featurePrefix: "postgis",
                        featureType: "环翠区海洋牧场位置",
                    });
                    var data = new XMLSerializer().serializeToString(transaction);

                    $.ajax({
                        type: "POST",
                        url: "http://192.168.50.254:12222/geoserver/postgis/wfs",
                        data: data,
                        contentType: "text/xml",
                        success: function (d) {
                            console.log(d);
                        },
                        fail: function (d) {
                            console.log(d);
                        }
                    });

                    //** start 关闭标签
                    overlay.setPosition(undefined);
                    closer.blur();
                    //** end 关闭标签
                } else {
                    alert("选中元素不存在！");
                }

            })
            //** end转换为修改属性界面，拆分span，并给提交按钮添加提交方法
        } else {
            alert("没有指定修改元素！");
        }

    };

    return ModifyAttrControl;
}(Control));

/**
 * 自定义删除控件
 * */
var DeleteElementControl = (function (Control) {
    function DeleteElementControl(opt_options) {
        var options = opt_options || {};

        var button = document.createElement('button');
        button.innerHTML = 'D';
        $(button).attr("title", "元素删除");

        var element = document.createElement('div');
        element.className = 'delete-element ol-unselectable ol-control';
        element.appendChild(button);

        Control.call(this, {
            element: element,
            target: options.target
        });

        button.addEventListener('click', this.deleteElement.bind(this), false);
    }

    if (Control) DeleteElementControl.__proto__ = Control;
    DeleteElementControl.prototype = Object.create(Control && Control.prototype);
    DeleteElementControl.prototype.constructor = DeleteElementControl;

    DeleteElementControl.prototype.deleteElement = function deleteElement() {
        // this.getMap().getView().setRotation(0);
        alert("选择地图删除选中元素！");
        deleteStatusFlag = true;
    };

    return DeleteElementControl;
}(Control));

/**
 * 自定义添加控件
 * */
var AddElementControl = (function (Control) {
    function AddElementControl(opt_options) {
        var options = opt_options || {};

        var button = document.createElement('button');
        button.innerHTML = 'A';
        $(button).attr("title", "元素添加");

        var element = document.createElement('div');
        element.className = 'add-element ol-unselectable ol-control';
        element.appendChild(button);

        Control.call(this, {
            element: element,
            target: options.target
        });

        button.addEventListener('click', this.addElement.bind(this), false);
    }

    if (Control) AddElementControl.__proto__ = Control;
    AddElementControl.prototype = Object.create(Control && Control.prototype);
    AddElementControl.prototype.constructor = AddElementControl;

    AddElementControl.prototype.addElement = function addElement() {
        alert("点击地图添加元素！");
        addStatusFlag = true;
    };

    return AddElementControl;
}(Control));

var map = new Map({
    controls: defaultControls().extend([
        new ModifyAttrControl(),
        new DeleteElementControl(),
        new AddElementControl()
    ]),
    interactions: defaultInteractions().extend([select]),
    layers: [
        new TileLayer({
            source: new OSM()
        }),
        /**
         * 添加TileMWS的方式之一
         new TileLayer({
            source: new TileWMS({
                url: 'http://192.168.50.254:12222/geoserver/postgis/wms',
                params: {
                    'LAYERS': 'postgis:环翠区海洋牧场位置',
                    'TILED': true
                }
            })
        }),
         **/
        wmsLayer,
        vector
    ],
    overlays: [overlay],
    target: 'map',
    view: new View({
        /**
         * 设置地图中心点和显示级别
         center: [122.20985412597656,37.45410919189454],
         zoom: 11,
         **/
        projection: 'EPSG:4326'
    })
});


/**
 * http请求WFS数据
 * **/
fetch('http://192.168.50.254:12222/geoserver/postgis/wfs?' +
    'service=wfs&' +
    'version=2.0.0&' +
    'request=GetFeature&' +
    'typeNames=postgis:环翠区海洋牧场位置&' +
    'outputFormat=application/json',
    {method: 'GET'}
).then(function (response) {
        return response.json();
    }
).then(function (json) {
        var features = new GeoJSON().readFeatures(json);
        vectorSource.addFeatures(features);
        map.getView().fit(vectorSource.getExtent());
    }
);

/**
 * 定义地图单击事件
 * */
map.on('singleclick', function (evt) {
    var coordinate = evt.coordinate;
    // console.log(coordinate);

    if (addStatusFlag) {

        var feature = new Feature({
            geom: new Point([coordinate[0], coordinate[1]])
        });
        var xml = new WFS({}).writeTransaction([feature], null, null, {
            featureNS: "http://192.168.50.254:12222/geoserver/postgis",//该图层所在工作空间的uri
            featurePrefix: "postgis",//工作空间名称
            featureType: "环翠区海洋牧场位置",//图层名称
        });

        var serializer = new XMLSerializer();
        var featString = serializer.serializeToString(xml);//需要把字符串序列化为xml格式

        $.ajax({
            url: "http://192.168.50.254:12222/geoserver/postgis/wfs",
            type: "POST",
            data: featString,
            contentType: 'text/xml',
            success: function (req) {

                console.log(req);
            }
        });


        addStatusFlag = false;
    } else {
        var view = map.getView();
        var viewResolution = view.getResolution();
        var source = wmsLayer.getSource();
        var url = source.getGetFeatureInfoUrl(
            evt.coordinate, viewResolution, view.getProjection(),
            {'INFO_FORMAT': 'application/json', 'FEATURE_COUNT': 50});

        $.ajax({
            url: url,
            type: "GET",
            dataTYPE: "jsonp",
            success: function (json) {
                var result = JSON.stringify(json);
                if (json.features.length > 0) {
                    overlay.setPosition(coordinate);
                    var properties = json.features[0].properties;
                    var popup_content = $("#popup-content");
                    popup_content.empty();
                    var popup_content_innerstr = "";
                    $.each(properties, function (n, v) {
                        popup_content_innerstr = popup_content_innerstr + "<span>" + n + ":" + v + "</span><br/>"
                    });
                    popup_content.append(popup_content_innerstr);
                }
            }
        });
    }

});

/**
 * 设置选中事件
 * */
select.setActive(true);
var selected = select.getFeatures();
selected.on('add', function (evt) {
    selectedFeature = evt.element;
    if(deleteStatusFlag){
        var f=selectedFeature;
        var xml = new WFS({}).writeTransaction(null, null, [f], {
            featureNS: "http://192.168.50.254:12222/geoserver/postgis",//该图层所在工作空间的uri
            featurePrefix: "postgis",//工作空间名称
            featureType: "环翠区海洋牧场位置",//图层名称
        });

        var serializer = new XMLSerializer();
        var featString = serializer.serializeToString(xml);//需要把字符串序列化为xml格式

        $.ajax({
            url: "http://192.168.50.254:12222/geoserver/postgis/wfs",
            type: "POST",
            data: featString,
            contentType: 'text/xml',
            success: function (req) {
                console.log(req);
            }
        });


        deleteStatusFlag = false;
    }
});

