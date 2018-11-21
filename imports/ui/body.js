import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveDict } from 'meteor/reactive-dict';

//import { Tasks } from '../api/tasks.js';
import { Subjects } from '../api/module_tables.js';

import './module_templates.js';
import '../api/publications.js';
import '../api/methods.js';
import './body.html';
import "./qc.js";
import "./custom.js";
import "./qc.html";
import "./custom.html";

var update_subjects = function(product_of_sums){
        Meteor.call("get_subject_ids_from_aggregate", product_of_sums, function(error, result){
            var ss = Session.get("subjectSelector")
            
            ss["subject_id"]["$in"] = result["subject_ids"]

            Session.set("subjectSelector", ss)
            console.log("subjectSelector", ss)
            var assessment = Session.get("Assessment")
            Meteor.call("get_subject_ids_from_aggregate", product_of_sums, function(error, result){
                            var ss = Session.get("subjectSelector")
                            ss["subject_id"]["$in"] = result
                            Session.set("subjectSelector", ss)
                        })
          })

        return 0

}

var run_recursive_update = function(gSelector){
    var all_keys = Object.keys(gSelector)
    var filter = get_filter(all_keys[0])
    update_subjects(filter, all_keys)
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function wait1() {
  console.log('Waiting for DOM load ...');
  await sleep(500);

}

Template.navbar.rendered = function(){
  // $("#login-buttons").hide()
  if (Meteor.settings.public.needs_consent){


    this.autorun(function(){

      consent = Session.get("consent")

      if (Meteor.user()){
        console.log("user is logged in");
        Session.set("consent", true)

        // make sure hte login/logouts have their callbacks
        wait1().then(function(){
          $("#login-name-link").click(function(e){
            wait1().then(function(){
              $("#login-buttons-logout").click(function(e){
                Meteor.logout(function(){
                  Session.set("consent", false);
                  console.log("consent is", Session.get("consent"));
                });
              });
            });
          });

        })
      }
      // show_login = Session.get("show_login")

      if (consent){
        $("#login-buttons").show();
      } else {
        $("#login-buttons").hide();
      }

    })
  }

}

Template.main_body.events({
    "click .reset": function(){
        Session.set("globalSelector", {})
        Session.set("subjectSelector", {"subject_id": {"$in": []}})
        Session.set("uniqueSubjectSelector", [])
        Session.set("product_of_sums", [])
        Session.set("sums", [])
    },

    "click .save": function(){
        var gSelector = Session.get("globalSelector")
        var name = $("#qname").serializeArray()[0]["value"]
        console.log("query name is", name)
        if (name != ""){
            Meteor.call("save_query", name, JSON.stringify(gSelector))
        }

    },

    "click .remove": function(e){
        var product_of_sums = Session.get("product_of_sums")
        var remove_metric = this.name
        console.log("REMOVE", remove_metric)
        console.log("this is", this, "POS is", product_of_sums)
        var key = this.mapper.split("+")
        console.log("SPLIT KEYS", key)

        //delete product_of_sums[key[0]][key[1]][key[2]]

        var updated_POS = []

        for(var i=0; i<product_of_sums.length; i++){
            var f_array = []
            for(var f=0; f<product_of_sums[i].length; f++){
                if(key[0] == i && key[1] == f){
                    //do nothing
                }
                else{
                    f_array.push(product_of_sums[i][f])
                }
            }
            if(f_array.length > 0){
                updated_POS.push(f_array)
            }
        }

        console.log("POS is now", updated_POS)
        if(updated_POS.length == 0){
            Session.set("globalSelector", {})
            Session.set("subjectSelector", {"subject_id": {"$in": []}})
            Session.set("uniqueSubjectSelector", [])
            Session.set("product_of_sums", {"_id": {"$in": []}})
            Session.set("sums", [])
        }
        Session.set("product_of_sums", updated_POS)

        update_subjects(updated_POS)
    },

    "click .removequery": function(e){
        console.log("in removequert, this is",this)
        Meteor.call("removeQuery", this.selector, this.entry_type)
    },

    "click .query": function(e){
        //console.log(this.selector, this.name)
        Session.set("globalSelector", JSON.parse(this.selector))
        var gSelector = JSON.parse(this.selector)
        run_recursive_update(gSelector)
        console.log('click query')


    },

    "click .filter": function(e){
        //console.log(e)
        var element = e.toElement.className.split(" ")//.slice(1).split("-")
        var idx = element.indexOf("filter") + 1
        //console.log("element is", element, "idx of filter is", idx)
        element = element.slice(idx).join(" ").split("+")
        //console.log("element is", element)
        var entry_type = element[0]
        var field = element[1]
        var value = element[2]//.slice(2).join(" ")
        //console.log(entry_type, field, value)

        var gSelector = Session.get("globalSelector")
        if (Object.keys(gSelector).indexOf(entry_type) < 0){
            gSelector[entry_type] = {}
        }

        if (value == "undefined"){
            value = null
        }

        gSelector[entry_type][field] = value

        //console.log("insert subject selector in this filter function", gSelector)

        Session.set("globalSelector", gSelector)
        //THIS IS HACKY
        var filter = get_filter(entry_type)
        if (field=="metrics.DCM_StudyDate"){
            value = parseInt(value)
        }

        filter[field] = value
        //console.log("filter in .filter is", filter)
        var product_of_sums = Session.get("product_of_sums")
        Meteor.call("get_subject_ids_from_aggregate", product_of_sums, function(error, result){
            //console.log("result from get subject ids from filter is", result)
            var ss = Session.get("subjectSelector")
            ss["_id"]["$in"] = result
            Session.set("subjectSelector", ss)
        })

    },

    "click .viewQC": function(e){
        e.preventDefault();
        var element = e.toElement.className.split(" ")//.slice(1).split("-")
        var idx = element.indexOf("viewQC") + 1
        //console.log("element is", element, "idx of filter is", idx)
        element = element.slice(idx).join(" ").split("+")
        //console.log("element is", element)
        var entry_type = element[0]
        var field = element[1]
        console.log("element is", element)
        //var value = element[2]//.slice(2).join(" ")
        console.log("you want to view QC for", entry_type, field)

        Session.set("currentQC", {"entry_type": entry_type, "name": field})

        //$("#modal-fullscreen").modal("show")

    }

})

Template.main_body.helpers({
  use_custom: function(){
    return Meteor.settings.public.use_custom;
  }
})

Template.body_sidebar.helpers({
    currentKeys: function(){
        var gSelector = Session.get("globalSelector")
        //console.log("current query is", gSelector)
        var keys = Object.keys(gSelector)
        return keys

    },

    currentSelector: function(){
        var product_of_sums = Session.get("product_of_sums")
        console.log("current query is", product_of_sums)
       
        if (product_of_sums){
            var keys = Object.keys(product_of_sums)
            //console.log("KEYS", keys)
            var outlist = []
            for(var i=0; i<product_of_sums.length; i++){

                var sub_keys = Object.keys(product_of_sums[i])
                //console.log("SUBKEYS", sub_keys)
                if(product_of_sums[i].length > 1){
                  
                  for(var f=0; f<product_of_sums[i].length; f++){

                    var met_keys = Object.keys(product_of_sums[i][f])
                    //console.log("met_keys", met_keys)
                    for(var k=0; k<met_keys.length; k++){

                        tmp = {}
                        if(met_keys[k].includes("metrics.")){
                            tmp["mapper"] = keys[i]+"+"+sub_keys[f]+"+"+met_keys[k]
                            tmp["name"] = met_keys[k]
                            outlist.push(tmp)
                        }
                    }
                  }
                }
                else{
               
                  var met_keys = Object.keys(product_of_sums[i][0])
                  for(var k=0; k<met_keys.length; k++){
                    tmp = {}
                    if(met_keys[k].includes("metrics.")){
                        tmp["mapper"] = keys[i] + "+0+" + met_keys[k]
                        tmp["name"] = met_keys[k]
                        outlist.push(tmp)
                    }
                  }
                }
          }
          
            //console.log("OUTLIST", outlist)
            return outlist
        }
    },

    savedQueries: function(){
        Meteor.subscribe("userList")
        var user = Meteor.users.findOne(Meteor.userId(), {fields: {username:1, queries:1}})
        console.log("user", user)
        //var userentries = User.find({user:user.username})
        //console.log("userentries", userentries)
        if (user != null){
            if (Object.keys(user).indexOf("queries") >=0){
                return user.queries
            }
        }

        return []
    }



})