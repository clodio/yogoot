var express = require('express');
var router = express.Router();
var elasticsearch = require('elasticsearch');
var client = new elasticsearch.Client({
	host: 'localhost:9200',
	log: 'error'
});

/* GET home page. */
router.get('/', function(req, res, next) {
  var size = req.query.size || 10;
  var fields = req.query.fields || 'ALL';
	var index = req.query.index || 'nouveauxvoisins';
	var q = req.query.q || '*';
	var startDate = req.query.startDate || Math.floor(Date.now() ) - 24*3600*1000*1000; //last 24h
	var endDate = req.query.endDate || Math.floor(Date.now());  
  res.render('maps', { 
    title: 'Geolastic', 
    size : size,
    fields : fields,
    index : index,
    q : q,
    startDate : startDate,
    endDate : endDate
  });
});


router.get('/geojson', function(req, res, next) {

	var size = req.query.size || 10;
  var fields = req.query.fields || '';
	var index = req.query.index || 'nouveauxvoisins';
	var startDate = req.query.startDate || Math.floor(Date.now() ) - 24*3600*1000*1000; //last 1000days
	var endDate = req.query.endDate || Math.floor(Date.now());
  var bbox = req.query.bbox || "-16.918945312500004,37.33522435930641,27.026367187500004,55.30413773740139";
  var bboxArray = bbox.split(",");
  var q = req.query.q || '*';
  var filter={}
  if (req.query.bbox) {
    filter={
        "geo_bounding_box" : {
            "geolocation" : {
                "top_left" : {
                    "lat" : bboxArray[3],
                    "lon" : bboxArray[0]
                },
                "bottom_right" : {
                    "lat" : bboxArray[1],
                    "lon" : bboxArray[2]
                }
            }
        }
    };
  }
	client.search({
        index: index,
        type: index,
				size: size,
        body: {
            "query": {
							"bool": {
								"must": [{
									"query_string": {
										"query": q,
										"analyze_wildcard": true
									}
								}, 
                {
									"range": {
										"@timestamp": {
											"gte": startDate,
											"lte": endDate,
											"format": "epoch_millis"
										}
									}
								}],
                "filter": filter,
								"must_not": []
							}
						}
        }
    }, function (error, response) {

			var geoJsons_old ={
        "type": "FeatureCollection",
        "features": []
      };
      var geoJsons =[];
      var geoJsonTemplate = {
					"type": "Feature",
					"geometry": {
						"type": "Point"
					},
					"properties": {}
				}

			var geoJson = {};
			if (response.hits) {
				  response.hits.hits.forEach(function(point) {
            geoJson = geoJsonTemplate;
            geoJson.geometry.coordinates= point["_source"].geolocation;
            geoJson.properties["_id"]=point["_id"];
            if (fields) {
              if (fields="ALL") {
                for (var key in point["_source"]) {
                  if (point["_source"].hasOwnProperty(key)) {
                    geoJson.properties[key] = point["_source"][key];   
                  }
                }
              }
              else {              
                // Add Fields filter
                var queryFieldsTmp = fields.split(",");
                for(var i in queryFieldsTmp) {
                    geoJson.properties[queryFieldsTmp[i]]=point["_source"][queryFieldsTmp[i]] || null;
                }
              }
            }
            else {
              geoJson.properties["@timestamp"]=point["_source"]["@timestamp"];
              geoJson.properties["_id"]=point["_id"];
            }
            // TODO better : probleme de passage par reference de geoJson
            geoJsons.push(JSON.parse(JSON.stringify(geoJson)));
					
				});
			}
		res.send(geoJsons);
	});
});

module.exports = router;
