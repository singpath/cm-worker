var http = require('http'),
    request = require('request');

var serviceID = "profchris";
var theUrl = "https://codecombat.com/db/user/" + serviceID + "/level.sessions?project=state.complete,levelID,levelName";
//var theUrl = "http://codecombat.com";
var theUrl = "https://codecombat.com/db/user/531c8c3ccf439d790a23af04";
    //Fetch the service url
request(theUrl, function (error, response, body) {
      console.log("----");
      console.log(error);
      console.log(body);
});

  