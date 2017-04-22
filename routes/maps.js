var express = require('express');
var router = express.Router();
var elasticsearch = require('elasticsearch');
var client = new elasticsearch.Client({
	host: 'localhost:9200',
	log: 'error'
});

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('maps', { title: 'ElasticSearch :)', msg : 'An elasticsearch client using Express.js for Node' });
});


router.get('/geojson', function(req, res, next) {

	var size = req.query.size || 10;
  var fields = req.query.fields || '';
	var index = req.query.index || 'nouveauxvoisins';
	var q = req.query.q || '*';
	var startDate = req.query.startDate || Math.floor(Date.now() ) - 24*3600*1000; //last 24h
	var endDate = req.query.endDate || Math.floor(Date.now());

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
								}, {
									"range": {
										"@timestamp": {
											"gte": startDate,
											"lte": endDate,
											"format": "epoch_millis"
										}
									}
								}],
								"must_not": []
							}
						}
        }
    }, function (error, response) {

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
              // Add Fields filter
              var queryFieldsTmp = fields.split(",");
              for(var i in queryFieldsTmp) {
                  geoJson.properties[queryFieldsTmp[i]]=point["_source"][queryFieldsTmp[i]] || null;
              }
            }
            else {
              geoJson.properties["id_contract_individual"]=point["_source"].id_contract_individual;
              geoJson.properties["id_contract_group"]=point["_source"].id_contract_group;
              geoJson.properties["contract_order_nb"]=point["_source"].contract_order_nb;
            }
            // TODO better : probleme de passage par reference de geoJson
            geoJsons.push(JSON.parse(JSON.stringify(geoJson)));
					
				});
			}
		res.send(geoJsons);
		//res.render('index', { title: 'Result : ', msg: JSON.stringify(geoJsons) });	
	});
});

module.exports = router;
