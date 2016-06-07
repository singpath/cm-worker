var chai = require('chai'),
  expect = chai.expect,
  targaryen = require('targaryen');

chai.use(targaryen.chai);

describe('A set of rules and data', function() {

  before(function() {

    // when you call setFirebaseData, you can either use the data format
    // of `exportVal` (i.e., with ".value" and ".priority" keys) or just a plain
    // Javascript object. The plain object will be converted to the Firebase format.

      targaryen.setFirebaseData({
          auth:{
              "publicIds":{
                  "cboesch":"github:116418",
                  "sandra":"github:111111"
              },
              "users":{
                  "github:116418":{
                      "publicId":"cboesch",
                      "isAdmin":true
                    },
                  "github:111111":{"publicId":"sandra"}
              }
         
          },
          
          "classMentors": {
              "userAchievements": {
                  "kaplejon": {
                      "services": {
                          "codeCombat": {
                              "id": "kaplejon",
                              "totalAchievements": 5
                          },
                          "codeSchool": {
                              "id": "kaplejon",
                              "totalAchievements": 7
                          },
                          "freeCodeCamp": {
                              "id": "kaplejon",
                              "totalAchievements": "400"
                          }
                      }
                  },
                  "singaporeclouds": {
                      "services": {
                          "codeCombat": {
                              "id": "singaporeclouds",
                              "totalAchievements": 101
                          },
                          "codeSchool": {
                              "id": "singaporeclouds",
                              "totalAchievements": 18
                          },
                          "freeCodeCamp": {
                              "id": "singaporeclouds",
                              "totalAchievements": "319"
                          }
                      }
                  }
              },
              "userProfiles": {
                  "kaplejon": {
                      "services": {
                          "codeCombat": {
                              "details": {
                                  "id": "5551c835559fd68805760616"
                              }
                          },
                          "codeSchool": {
                              "details": {
                                  "id": "markuslendermann"
                              }
                          },
                          "freeCodeCamp": {
                              "details": {
                                  "id": "kaplejon"
                              }
                          }
                      }
                  },
                  "singaporeclouds": {
                      "services": {
                          "codeCombat": {
                              "details": {
                                  "id": "profboesch"
                              }
                          },
                          "codeSchool": {
                              "details": {
                                  "id": "ChrisBoesch"
                              }
                          },
                          "freeCodeCamp": {
                              "details": {
                                  "id": "singaporeclouds"
                              }
                          }
                      }
                  }
              }
          },
      });

    // Users can write their own userProfile and read everyone's userProfiles and userAchievements
    targaryen.setFirebaseRules({
      rules: {
        users: {
          '.read': 'auth !== null',
          '.write': "root.child('users').child(auth.uid).child('isAdmin').val() === true"
        },
        "queue":{
            "tasks":{
                ".read": true,
                ".write": "auth !== null" //"auth !== null"
            }
        },
        "classMentors":{
            "userProfiles":{
                ".read": true,
                ".write": "root.child('auth').child('users').child(auth.uid).child('isAdmin').val() === true"
            },
            "userAchievements":{
                ".read": true,
                ".write": "root.child('auth').child('users').child(auth.uid).child('isAdmin').val() === true"
            }
        }
      }
    });

  });

  it('can be tested', function() {
    
    //everyone can read achievements
    expect(targaryen.users.unauthenticated)
    .can.read.path( "classMentors/userAchievements/kaplejon/services/codeCombat/totalAchievements");
   
    expect(targaryen.users.authenticated)
    .can.read.path( "classMentors/userAchievements/kaplejon/services/codeCombat/totalAchievements");
   
    // admin can write to userAchievements   
    expect({ uid: 'github:116418' })
    .can.write.path( "classMentors/userAchievements/kaplejon/services/codeCombat/totalAchievements");
    
    //non-authenticated can not write to userAchievements
    expect(targaryen.users.unauthenticated)
    .cannot.write.path( "classMentors/userAchievements/kaplejon/services/codeCombat/totalAchievements");
    
    //non-admin can not write to userAchievements
    expect({ uid: 'github:111111' })
    .cannot.write.path( "classMentors/userAchievements/kaplejon/services/codeCombat/totalAchievements");

    //unauthenticated can read to userProfiles  
    expect(targaryen.users.unauthenticated)
    .can.read.path( "classMentors/userProfiles/kaplejon/services/codeCombat/details/id");
   
    expect(targaryen.users.authenticated)
    .can.read.path( "classMentors/userProfiles/kaplejon/services/codeCombat/details/id");
    
      
    // admin can write to userProfiles   
    expect({ uid: 'github:116418' })
    .can.write.path( "classMentors/userProfiles/kaplejon/services/codeCombat/details/id");
    
    //unauthenticated can not write to userProfiles   
    expect(targaryen.users.unauthenticated)
    .cannot.write.path( "classMentors/userProfiles/kaplejon/services/codeCombat/details/id");
    
    //users cannot write to other's userProfiles   
    expect({ uid: 'github:111111' })
    .cannot.write.path( "classMentors/userProfiles/kaplejon/services/codeCombat/details/id");
    
    // Unauthorized users can not enqueue a task. 
    expect(targaryen.users.unauthenticated)
    .cannot.write.path( "queue/tasks");
    
    // Any authorized user can enqueue a task. 
    expect({ uid: 'github:111111' })
    .can.write.path( "queue/tasks");
    
    //Save users to auth/users rather than root/users. 
  });

});