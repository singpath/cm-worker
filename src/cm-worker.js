var Queue = require('firebase-queue'),
    Firebase = require('firebase'),
    http = require('http'),
    request = require('request');


/*
cm-worker.js firebaseUrl=http://firebase.com token=myToken numTasks=1 maxIdle=5

*/

var options={};
var args = process.argv.slice(2);
// node cm-worker.js -t <secret>
if(args[0] == '-t'){
  console.log("creating token");
  var FirebaseTokenGenerator = require("firebase-token-generator");
  var tokenGenerator = new FirebaseTokenGenerator(args[1]);
  var token = tokenGenerator.createToken({ uid: "queue-worker", some: "arbitrary", data: "here" });
  console.log(token);
  process.exit(0);
  
}
else {
  for(var i=0; i<args.length; i++){
      var temp = args[i].split("=")
      options[temp[0]] = temp[1]
      //console.log(temp);  
  }

}
console.log("Listending to url "+options['firebaseUrl']);
console.log("with token "+options['token']);

var firebaseUrl = options['firebaseUrl'];
var ref = new Firebase(firebaseUrl);
var queueRef = new Firebase(firebaseUrl+'/queue');
ref.authWithCustomToken(options['token'], function(error, authData) {
  if (error) {
    console.log("Login Failed!", error);
  } else {
    console.log("Login Succeeded!", authData);
  }
});

// Exit on ctrl-c
// or kill -s SIGINT [process_id] from termina. 
// or pass in a signal from a queue. 
process.on('SIGINT', function () {
  console.log('Got a SIGINT. Goodbye cruel world');
  process.exit(0);
});


var get_service_url = function (service, serviceID) {
  var theUrl = "";
  //console.log("Fetching serviceID "+serviceID+" on "+service);
  if (service == "freeCodeCamp") {
    //console.log("Using freeCodeCamp url " + theUrl);
    theUrl = "https://www.freecodecamp.com/" + serviceID;
  }
 
  else if (service == "codeCombat") {
     //theUrl = "https://codecombat.com/db/user/" + serviceID + "/level.sessions?project=state.complete,levelID,levelName";
     theUrl= "https://codecombat.com/db/user/"+serviceID;
    console.log("Using codeCombat url "+theUrl); 
  }
  
  else if (service == "pivotalExpert") {
    //theUrl = "https://pivotal-expert.firebaseio.com/pivotalExpert/userProfiles/Chris/userAchievements";
    theUrl = "https://pivotal-expert.firebaseio.com/pivotalExpert/userProfiles/"+serviceID+"/userAchievements.json";
    //console.log("Using PivotalEpert url "+theUrl); 
  }
  else if (service == "codeSchool") {
    //console.log("Using codeSchool url");
    theUrl = "https://www.codeschool.com/users/" + serviceID + ".json";
  }
  return theUrl;
}

var get_achievements_from_response = function (service, body) {
  var totalAchievements = 0;
  if (service == "freeCodeCamp") {
    var start = body.indexOf(">[ ");
    var stop = body.indexOf(" ]<");
    totalAchievements = body.substring(start + 3, stop);
    console.log("Free Code Camp levels = " + totalAchievements);
  }
  else if(service == "pivotalExpert"){
    var jsonObject = JSON.parse(body);
    //console.log(body);
    var totalAchievements = 0;
    for (var k in jsonObject) {
       if (jsonObject.hasOwnProperty(k) && jsonObject[k]==true) totalAchievements++;
    }

  }
  else if (service == "codeCombat") {

    var jsonObject = JSON.parse(body);
    //Currently includes stat.complete.false levels
    console.log("Code Combat levels = " + jsonObject.length);
    var theCount = 0;
    for (var i = 0; i < jsonObject.length; i++) {
      if (jsonObject[i].state.complete == true) {
        theCount += 1;
      }

    }
    //console.log("Completed Code Combat levels = " + theCount);
    totalAchievements = theCount;
  }

  else if (service == "codeSchool") {
    var jsonObject = JSON.parse(body);
    var badges = jsonObject['badges'];
    console.log("Code School Badges earned " + badges.length);
    totalAchievements = badges.length;

  }

  //console.log("Fetched totalAchievements " + totalAchievements+ " on "+service); // Show the HTML for homepage.
  return totalAchievements;

}


/*
// Uncomment to include authenticated access. 
ref.authWithCustomToken('<YOUR_TOKEN_HERE>', function(err, authData){
    if (err) {
      console.log("Login failed with error: ", error);
    } else {
      console.log("Authenticated successfully with payload: ", authData);
    }
});
*/

var update_profile_and_clear_task = function (err, data, reject, resolve) {
  if (err) {
    console.log("Error updating " + err);
    reject(err);
  } else {
    console.log("Successfully updated. Resolving task. " + JSON.stringify(data));
    resolve(data);
    data["updated"] = Firebase.ServerValue.TIMESTAMP;
    ref.child('logs/profileUpdates').push(data); //, function (err) {if (err){ } else {}});    
  }
}

var update_achievements_and_clear_queue = function (location, theData, data, reject, resolve) {
  // data = {"id":"cboesch","service":"pivotalExpert","count":1}
  var profileUpdate = "classMentors/userProfiles/"+data['id']+"/services/"+data['service'];
  var updateData = {"lastUpdate":Firebase.ServerValue.TIMESTAMP, "totalAchievements":data['count']};
  console.log("Will update "+profileUpdate+" with "+JSON.stringify(updateData));
  
  //Update the user profile as well.  
  ref.child(profileUpdate).update(updateData);
  
  
  // update the userAchievements as well. Only the worker can edit this location. 
  ref.child(location).set(theData, function (err) {
    update_profile_and_clear_task(err, data, reject, resolve);
  });

  
}

var fetch_service_url = function (theUrl, data, service, serviceID, reject, resolve, error, response, body, callback) {
  //console.log("requested url " + theUrl + " since the service is " + service);
  if (!error && response.statusCode == 200) {

    var totalAchievements = get_achievements_from_response(service, body);
    data.count = totalAchievements;
    var location = "classMentors/userAchievements/" + data.id + "/services/" + service;
    var theData = { "totalAchievements": data.count, "id": serviceID };

    callback(location, theData, data, reject, resolve);
  }
  else {
    console.log("There was an error fetching " + theUrl + " status code " + response.statusCode + " error " + error);
  }
}

var get_profile = function (service_response_body, task_data, reject, resolve) {
  var jsonObject = JSON.parse(service_response_body);
  var service = task_data.service;
  var services = jsonObject['services']
  //console.log(services);
  // If the user does not have the service it will be skipped. 
  if (services.hasOwnProperty(service)) {
    var serviceID = services[service]['details']['id'];

    var theUrl = get_service_url(service, serviceID);
    // Reject bad requests
    if (theUrl == "") {
      resolve("Non-supported service " + service);
      //reject("Non-supported service " + service);
    }
    else {
    //Fetch the service url  
      request(theUrl, function (error, response, body) {
        console.log(error);
        fetch_service_url(theUrl, task_data, service, serviceID, reject, resolve, error, response, body, update_achievements_and_clear_queue);
      });
    }

  }
}

// Called by Queue when new tasks are present. 
var process_task = function (data, progress, resolve, reject) {
  console.log("service " + data.service + " for user " + data.id);
  var service = data.service;
  var user = data.id;

  //Fetch the userProfile from ClassMentors
  var userProfileUrl = firebaseUrl+"/classMentors/userProfiles/" + user + ".json";
  console.log("Fetching profile "+userProfileUrl);  
  request(userProfileUrl, function (error, response, body) {
    //TODO: handle profile fetch error. 
    //TODO: check that response is valid. 
    //TODO: If valid, process profile. 
    //console.log('Get profile.');
    //console.log(body);
    get_profile(body, data, reject, resolve);

  });
}

// Do not run the server when loading as a module. 
if (require.main === module) {
  var queue = new Queue(queueRef, process_task);

  // Export modules if we aren't running the worker so that we can test functions. 
} else {

  module.exports = {
    "get_service_url": get_service_url,
    "get_achievements_from_response": get_achievements_from_response,
    "update_achievements_and_clear_queue": update_achievements_and_clear_queue,
    "fetch_service_url": fetch_service_url,
    "process_task": process_task,
    "get_profile": get_profile,
    "update_profile_and_clear_task": update_profile_and_clear_task
  }
}

