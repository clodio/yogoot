var express = require('express');
var router = express.Router();
var elasticsearch = require('elasticsearch');
var client = new elasticsearch.Client({
	host: 'localhost:9200',
	log: 'trace'
});

router.get('/', function(req, res, next) {

	var size = req.query.size || 10;
  var fields = req.query.fields || '';
	var index = req.query.index || 'locality';
	var startDate = req.query.startDate || Math.floor(Date.now() ) - 24*3600*1000*1000; //last 1000days
	var endDate = req.query.endDate || Math.floor(Date.now());
  // var bbox = req.query.bbox || "-16.918945312500004,37.33522435930641,27.026367187500004,55.30413773740139";
  // var bboxArray = bbox.split(",");
  var q = req.query.q + '*' || '*';
  var filter={}
  // if (req.query.bbox) {
  //   filter={
  //       "geo_bounding_box" : {
  //           "geolocation" : {
  //               "top_left" : {
  //                   "lat" : bboxArray[3],
  //                   "lon" : bboxArray[0]
  //               },
  //               "bottom_right" : {
  //                   "lat" : bboxArray[1],
  //                   "lon" : bboxArray[2]
  //               }
  //           }
  //       }
  //   };
  // }
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

      var responseJsons = [];
			
			if (response && response.hits) {
				  response.hits.hits.forEach(function(data) {
            var responseJson = {};
            for (var key in data["_source"]) {
              // if ( key.indexOf("ligne") >= 0 || key.indexOf("nom") >= 0 || key.indexOf("prenom") >= 0) {
                if (data["_source"].hasOwnProperty(key)) {
                  responseJson[key] = data["_source"][key];   
                }
              // }
            }
            // TODO better : probleme de passage par reference de geoJson
            responseJsons.push(JSON.parse(JSON.stringify(responseJson)));
					
				});
			}
		res.send(responseJsons);
	});
});

module.exports = router;
