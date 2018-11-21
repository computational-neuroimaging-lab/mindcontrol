import { Subjects } from "./module_tables.js"
import { Email } from 'meteor/email'
import setimmediate from 'setimmediate';

Meteor.methods({

    getDateHist: function(entry_type, metric){
            //console.log("running the aggregate")
            if (Meteor.isServer){
                var metric_name = "metrics."+metric
                var foo = Subjects.aggregate([{$match: {"entry_type": entry_type}},{$group:{_id:"$"+metric_name, count:{$sum:1}}}])
                //console.log(foo)
                return foo
            }
      },

    getHistogramData: function(entry_type, metric, filter){
          
          if (Meteor.isServer){
          
          var no_null = filter
          no_null["entry_type"] = entry_type
          var metric_name = "metrics."+metric
          
          if (Object.keys(no_null).indexOf(metric_name) >=0 ){
              no_null[metric_name]["$nin"] = [null, "NaN"]
          }
          else{
              no_null[metric_name] = {$nin: [null, "NaN"]}
          }          

          var temp = Subjects.find(no_null, {sort: [[metric_name, "descending"]]}).fetch()
          var metric_numbers = 0
          var metric_strings = 0
          var metric_times = 0

          //summing float, string, and time values
          for(var i=0; i<temp.length; i++){
            curr_metric = temp[i]["metrics"][metric]
            if (typeof curr_metric == "number"){
              metric_numbers+=1
            }
            else if (typeof curr_metric == "string" && (curr_metric.includes("1970-01-01T", 0) ||
                                                        curr_metric.includes("T00:00:00.00Z", 0))){
              metric_times+=1
            }
            else if (typeof curr_metric == "string"){
              metric_strings+=1
            }
          }

          
          if(metric_numbers > metric_strings && metric_numbers > metric_times){
            if (Object.keys(no_null).indexOf(metric_name) >=0 ){
              no_null[metric_name]["$not"] = {"$type": "string"}
            }
            else{
              no_null[metric_name] = {$not: {"$type": "string"}}
            }
          }
          else if (metric_strings > metric_numbers && metric_strings > metric_times){
            if (Object.keys(no_null).indexOf(metric_name) >=0 ){
              no_null[metric_name]["$type"] = "string"
            }
            else{
              no_null[metric_name] = {$type: "string"}
            }
          }
          else if (metric_times > metric_strings && metric_times > metric_numbers){
            if (Object.keys(no_null).indexOf(metric_name) >=0 ){
              no_null[metric_name]["$type"] = "string"
              no_null[metric_name]["$ne"] = null
            }
            else{
              no_null[metric_name] = {"$type": "string"}
              no_null[metric_name] = {"$ne": null}
            }

          }
          console.log("NO NULL QUERY", no_null)
          var metric_element = Subjects.find(no_null, {sort: [[metric_name, "descending"]], limit: 1}).fetch()[0]["metrics"][metric]

          //checking if value is a number
          if(typeof metric_element == "number"){

            var minval = Subjects.find(no_null, {sort: [[metric_name, "ascending"]], limit: 1}).fetch()[0]["metrics"][metric]
            var maxval = Subjects.find(no_null, {sort: [[metric_name, "descending"]], limit: 1}).fetch()[0]["metrics"][metric]
            var bins = 20
            var bin_size = (maxval-minval)/(bins+1)
            if(bin_size == 0){
              bin_size = ((maxval*1.05) - (minval*0.95))/(bins+1)
            }

            console.log("the bin size is", bin_size)

            if (bin_size){
                  var foo = Subjects.aggregate([{$match: no_null},
                      {$project: {lowerBound: {$subtract: ["$metrics."+metric,
                          {$mod: ["$metrics."+metric, bin_size]}]}}},
                      {$group: {_id: "$lowerBound", count: {$sum: 1}}}])
                  var output = {}

                  output["histogram"] = _.sortBy(foo, "_id")
                  if (minval < 0){
                    output["minval"] = minval*1.05
                  } else {
                    output["minval"] = minval*0.95
                  }

                  output["maxval"] = maxval*1.05
                  output["bins"] = bins
                  console.log(output)
                  return output
            }
            else{
                  var output= {}
                  output["histogram"] = []
                  output["minval"] = 0
                  output["maxval"] = 0
                  return output
            }

        }
        //checking if value is formatted as date in UTC
        else if(typeof metric_element == "string" && metric_element.includes("1970-01-01T", 0)){

          var foo = Subjects.aggregate([{$match: no_null},
              { $project: 
                { bin: 
                   { "$substr": ["$metrics."+metric, 11, 2] },
                }
              },
              {$group: { _id: "$bin", count: {$sum: 1} } } ])

          // var data = Subjects.aggregate([{$match: no_null},
          //     { $project: 
          //       { bin: 
          //          { $dateFromString: {dateString: '$metrics.'+metric}}
          //       } 
          //     },
          //     {$group: { _id: "$bin", count: {$sum: 1} } } ])
          var output = {}
  
          output["histogram"] = _.sortBy(foo, "_id")

          for(var i=0; i<output["histogram"].length; i++){
            output["histogram"][i]["label"] = output["histogram"][i]["_id"];
            output["histogram"][i]["_id"] = Number(output["histogram"][i]["_id"]);
          }

          output["minval"] = -0.5
          output["maxval"] = 24
          output["bins"] = 24
          console.log(output)
          return output
            

        }
        //checking if value is formatted as a time in UTC
        else if(typeof metric_element == "string" && metric_element.includes("T00:00:00.00Z", 0)){

          var foo = Subjects.aggregate([{$match: no_null},
              { $project: 
                { bin: 
                   { "$substr": ["$metrics."+metric, 5, 2] },
                }
              },
              {$group: { _id: "$bin", count: {$sum: 1} } } ])

          // var data = Subjects.aggregate([{$match: no_null},
          //     { $project: 
          //       { bin: 
          //          { $dateFromString: {dateString: '$metrics.'+metric}}
          //       } 
          //     },
          //     {$group: { _id: "$bin", count: {$sum: 1} } } ])
          var output = {}
  
          output["histogram"] = _.sortBy(foo, "_id")

          for(var i=0; i<output["histogram"].length; i++){
            output["histogram"][i]["label"] = output["histogram"][i]["_id"];
            output["histogram"][i]["_id"] = Number(output["histogram"][i]["_id"]);
          }

          output["minval"] = 0.5
          output["maxval"] = 13
          output["bins"] = 12
          console.log(output)
          return output
        }
        //if value is just a string
        else if(typeof metric_element == "string"){

          var distinct_metric_values = Subjects.distinct(metric_name)
          
          var foo = Subjects.aggregate([
            {$match: no_null},
            {$project: 
              {bin: "$metrics."+metric}
            },
            {$group: {_id: "$bin", count: {$sum: 1}}}])

          var output = {}
          output["histogram"] = _.sortBy(foo, "_id")

          for(var i=0; i<output["histogram"].length; i++){
            output["histogram"][i]["label"] = output["histogram"][i]["_id"];
            output["histogram"][i]["_id"] = i+1;
          }

          if(output["histogram"].length > 1){
            output["minval"] = output["histogram"][0]["_id"]*((output["histogram"].length-1)/output["histogram"].length)
            output["maxval"] = output["histogram"][output["histogram"].length-1]["_id"]*((output["histogram"].length+1)/output["histogram"].length)
          }
          else {
            output["minval"] = 0.5
            output["maxval"] = 2.25
          }
          output["bins"] = output["histogram"].length
          console.log(output)
          return output
        }
        }
      },

    get_subject_ids_from_filter: function(filter){
        if (Meteor.isServer){
            var subids = []
            var cursor = Subjects.find(filter,{subject_id:1, _id:0})
            //console.log("the filter in this method is", filter, cursor.count())
            var foo = cursor.forEach(function(val){subids.push(val.subject_id)})
            //console.log("the number subjects to filter by are",filter, subids.length)
            return subids
        }

    },


    get_subject_ids_from_aggregate: function(product_of_sums){

        function get_product_of_sum_dict(sums){
          var sub_filter = {}
          sub_filter["$or"] = sums
          return sub_filter
        }

        if(Meteor.isServer){
          var subids = []
         
          metric_array = []
         
          keys = []
          console.log("pre_POS", product_of_sums)

          //get all metrics in POS and create sub-filter
          for(var i=0; i<product_of_sums.length; i++){
            if(product_of_sums[i].length > 1){
              
              for(var f=0; f<product_of_sums[i].length; f++){
                keys = Object.keys(product_of_sums[i][f])
                for(var k=0; k<keys.length; k++){
                  if(keys[k].includes("metrics.")){
                      metric_array.push(keys[k])
                  }
                }
              }
            }
            else{
           
              keys = Object.keys(product_of_sums[i][0])
              for(var k=0; k<keys.length; k++){
                if(keys[k].includes("metrics.")){
                    metric_array.push(keys[k])
                }
              }
            }
          }
          metric_array = _.uniq(metric_array)
       

          console.log("Selected Metrics: ", metric_array)

         //constructing aggregate query
          group = {}
          group["_id"] = "$subject_id"

          for(var i=0; i<metric_array.length; i++){
            m = metric_array[i].split('.')[1]
            group[m] = {"$push": "$"+metric_array[i]} 
          }


          match = {}
          match_and_array = []

          for(var i=0; i<product_of_sums.length; i++){
            if(product_of_sums[i].length > 1){
              or_array  = []
              onedict = {}
              mtemp_or_dictionary = {}
                    for(var f=0; f<product_of_sums[i].length; f++){
                      keys = Object.keys(product_of_sums[i][f])
                      
                        if(keys[0].includes("metrics.")){
                              onedict[(keys[0].split('.')[1])] = product_of_sums[i][f][keys[0]]
                              or_array.push(onedict)
                              onedict = {}
                          }        
                    }
              
              mtemp_or_dictionary = get_product_of_sum_dict(or_array)
              match_and_array.push(mtemp_or_dictionary)
              console.log("mtemp_OR_KEYS", mtemp_or_dictionary)
            }
            else if (product_of_sums[i].length == 1){
              
              and_dict = {}
              keys = Object.keys(product_of_sums[i][0])
             
                if(keys[0].includes("metrics.")){
                    
                    and_dict[(keys[0].split('.')[1])] = product_of_sums[i][0][keys[0]]

                }
              
              match_and_array.push(and_dict)
            }
          }


          console.log("groupin", group)
          console.log("matchin", match_and_array)
          match["$and"] = match_and_array
          
          group_element = {"$group": group}
          match_element = {"$match": match}

          aggregate_array = [group_element]

          for(var i=0; i<metric_array.length; i++){
            aggregate_array.push({"$unwind": "$"+metric_array[i].split(".")[1]})
          }

          aggregate_array.push(match_element)
          

          console.log("aggregate query", aggregate_array)
          //Session.set("Aggregate Query" , aggregate_array)
          var cursor = Subjects.aggregate(aggregate_array,{subject_id:1, _id:0})
          console.log("AGG CURSOR DATA", cursor)
          var foo = cursor.forEach(function(val){subids.push(val._id)})
          //console.log("SUB_IDS", subids)

          return subids
        }
    },

    updateQC: function(qc, form_data){
        console.log(form_data)
        Subjects.update({entry_type: qc.entry_type, name:qc.name}, {$set: form_data})
    },

    get_metric_names: function(entry_type){

        if (Meteor.isServer){
            var settings = _.find(Meteor.settings.public.modules, function(x){return x.entry_type == entry_type})


            if (settings.metric_names){
              return settings.metric_names     
            }
            no_null= {metrics: {$ne: {}}, "entry_type": entry_type}
            var dude = Subjects.findOne(no_null)
            if (dude){
                return Object.keys(dude["metrics"])
            }
        }

    },

    get_metric_labels: function(entry_type){

        if (Meteor.isServer){
            var settings = _.find(Meteor.settings.public.modules, function(x){return x.entry_type == entry_type})
            metriclabels_json = Meteor.settings.public.metric_labels

            mylabels = JSON.parse(HTTP.get(metriclabels_json).content)
            var labels_dict = {}

            for (var key in mylabels){
              if(mylabels.hasOwnProperty(key)){
                var value = mylabels[key]
                labels_dict[key] = value
              }
            }

            var temp = []
            if (settings.metric_names){
              
              for(var i=0; i<settings.metric_names.length; i++)
                  temp.push(settings.metric_names[i]+"- "+labels_dict[settings.metric_names[i]])
              return temp
              //return settings.metric_names     
            }


            no_null= {metrics: {$ne: {}}, "entry_type": entry_type}
            var dude= Subjects.findOne(no_null)
 
            if (dude){
                var keys = Object.keys(dude["metrics"])

                for(var i=0; i<keys.length; i++){
                  if(labels_dict[keys[i]]){
                    temp.push(keys[i]+"- "+labels_dict[keys[i]]) 
                  }
                  else
                    temp.push(keys[i])
                }
                return temp
            }
            //console.log("DUDE IS", dude)
        }
    },

    clear_subjects: function(){
      Subjects.remove({})
    },

    add_assessment_subjects: function(entry_type){
      if (Meteor.isServer){
          var fs=require('fs');
          var file='/Users/md35727/spyder_workspace/'+entry_type+'.json'
          var data=fs.readFileSync(file, 'utf8');
          var myobject=JSON.parse(data);
          console.log("FILE READ", file)

          myobject.forEach(function(val,idx,array){
                  //console.log(val.subject_id)
                  Subjects.insert(val)
          })
      }
    },

    email_json_assessments: function(entry_types, result, emailAddress){
        var query = {}
        var assessment_json = []
        
        for(var i=0; i<entry_types.length; i++){
          query["entry_type"] = entry_types[i]
          query["subject_id"] = {"$in": result}
         
          if(Subjects.find({"entry_type":entry_types[i]}).count() == 0){
            Meteor.call("add_assessment_subjects", entry_types[i], function(error, result){
              //console.log("add assessment called")

            })
          }
          var d = Subjects.find(query, {subject_id:1, _id:0}).fetch()

          d.forEach(function(val,idx,array){
                  assessment_json.push(val)
          })
        }   
    
        var fs = require('fs')
        const JSON = require('circular-json')
        var data = JSON.stringify(assessment_json, null, 2)

        var sub = {"subject_ids": result}
        var sub_data = JSON.stringify(sub, null, 2)


        //var json = JSON.stringify(data),
        // var blob = require('blob');
        // //var b = new Blob(['hi', 'constructing', 'a', 'blob']);
        // var b = new blob([data], {type: "application/json"})
        // var url = window.URL.createObjectURL(b);

        var attachments = [
                      {   // data uri as an attachment
                          filename: 'assessment.json',
                          path: 'data:text/json;charset=utf-8,' + encodeURIComponent(data)
                      },
                      {   // data uri as an attachment
                          filename: 'subjects.json',
                          path: 'data:text/json;charset=utf-8,' + encodeURIComponent(sub_data)
                      }]
        var ref = 'data:text/json;charset=utf-8,' + encodeURIComponent(data)
        Meteor.call(
                  'sendEmail',
                  emailAddress,
                  'cnlnoreply@gmail.com',
                  'Assessment Data',
                  attachments
                );    
    },

    email_csv_assessments: function(entry_types, result, emailAddress){

        var query = {}
        var assessment_json = []
        var fields = ['entry_type', 'subject_id']
        for(var i=0; i<entry_types.length; i++){

          if(Subjects.find({"entry_type":entry_types[i]}).count() == 0){
                      Meteor.call("add_assessment_subjects", entry_types[i], function(error, result){
                        //console.log("add assessment called")
                      })
                    }

          no_null= {metrics: {$ne: {}}, "entry_type": entry_types[i]}
          var dude= Subjects.findOne(no_null)
          if(dude){
            var keys = Object.keys(dude["metrics"])
            for(var f=0; f<keys.length; f++){
                        fields.push('metrics.'+keys[f])
                      }
          }         

          query["entry_type"] = entry_types[i]
          query["subject_id"] = {"$in": result['subject_ids']}
               
          var d = Subjects.find(query, {subject_id:1, _id:0}).fetch()

          d.forEach(function(val,idx,array){
                  assessment_json.push(val)
                  //console.log("val.metrics", val.metrics)
          })
        }   
        
        //download assessments of qualifying subjects     
        const Json2csvParser = require('json2csv').Parser;
        const json2csvParser = new Json2csvParser({fields, delimiter: ',', quote: '' })
        const csv = json2csvParser.parse(assessment_json)
        
        var attachments = [
                      {   // data uri as an attachment
                          filename: 'assessment.csv',
                          path: 'data:text/plain;charset=utf-8' + encodeURI('entry_type, '+csv)
                      }]
        Meteor.call(
                  'sendEmail',
                  emailAddress,
                  'cnlnoreply@gmail.com',
                  'Assessment Data',
                  'csv files attached'
                  //attachments
                );   
    },

    sendEmail: function(to_email, from_email, subject_title, files) {   
        // Make sure that all arguments are strings.
        //check([to, from, subject, text], [String]);

        // Let other method calls from the same client start running, without
        // waiting for the email sending to complete.
        this.unblock();
        Email.send({ to: to_email,
                     from: from_email,
                     subject: subject_title,
                     attachments: files});   
    },

    download_json_assessments: function(entry_types, result){
        var query = {}
        var assessment_json = []
        
        for(var i=0; i<entry_types.length; i++){
          query["entry_type"] = entry_types[i]
          query["subject_id"] = {"$in": result['subject_ids']}
         
          if(Subjects.find({"entry_type":entry_types[i]}).count() == 0){
            Meteor.call("add_assessment_subjects", entry_types[i], function(error, result){
              //console.log("add assessment called")

            })
          }
          var d = Subjects.find(query, {subject_id:1, _id:0}).fetch()

          d.forEach(function(val,idx,array){
                  assessment_json.push(val)
          })
        }   
    
        
        var fs = require('fs')
        const JSON = require('circular-json')
        var data = JSON.stringify(assessment_json, null, 2)

        return data
      
    },

    download_json: function(filename, text) {
        var element = document.createElement('a');
        element.setAttribute('href', 'data:text/json;charset=utf-8,' + encodeURIComponent(text));
        element.setAttribute('download', filename);

        element.style.display = 'none';
        document.body.appendChild(element);

        element.click();

        document.body.removeChild(element);
              
    },

    download_csv: function(filename, csv) {

        //console.log("download csv", csv)
        var element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8' + encodeURI('entry_type, '+csv));
        element.setAttribute('download', filename);

        element.style.display = 'none';
        document.body.appendChild(element);

        element.click();

        document.body.removeChild(element);
    },


    download_csv_assessments: function(entry_types, result){     
      
        var query = {}
        var assessment_json = []
        var fields = ['entry_type', 'subject_id']
        for(var i=0; i<entry_types.length; i++){

          if(Subjects.find({"entry_type":entry_types[i]}).count() == 0){
                      Meteor.call("add_assessment_subjects", entry_types[i], function(error, result){
                        //console.log("add assessment called")
                      })
                    }

          no_null= {metrics: {$ne: {}}, "entry_type": entry_types[i]}
          var dude= Subjects.findOne(no_null)
          if(dude){
            var keys = Object.keys(dude["metrics"])
            for(var f=0; f<keys.length; f++){
                        fields.push('metrics.'+keys[f])
                      }
          }         

          query["entry_type"] = entry_types[i]
          query["subject_id"] = {"$in": result['subject_ids']}
               
          var d = Subjects.find(query, {subject_id:1, _id:0}).fetch()

          d.forEach(function(val,idx,array){
                  assessment_json.push(val)
                  //console.log("val.metrics", val.metrics)
          })

        }   
        
        //download assessments of qualifying subjects     
        const Json2csvParser = require('json2csv').Parser;
        const json2csvParser = new Json2csvParser({fields, delimiter: ',', quote: '' })
        const csv = json2csvParser.parse(assessment_json)
        
        return csv

    },  

    save_query: function(name, gSelector){
        var topush = {"name": name, "selector": gSelector}
        Meteor.users.update(this.userId, {$push: {queries: topush}})
    },

    removeQuery: function(query, name){

        console.log("query is", query, name)
        var topull = {"name": name, "selector": query}
        Meteor.users.update(this.userId, {$pull: {queries: topull}})

    },

    get_generator: function(entry_type){
        if (Meteor.isServer){
          var myjson = {};
          myjson = JSON.parse(Assets.getText("generator.json"));
          if (entry_type == null){
              return myjson
        }
        else{
          console.log("entry_Type", entry_type)
          //console.log("myjson", myjson.modules)
          var output =  myjson.modules.find(function(o){return o.entry_type == entry_type})
          console.log("output is", output)
          return output
        }}
    },

    launch_clouder: function(command){
      if (Meteor.isServer){
          var sys = Npm.require('sys')
          var exec = Npm.require('child_process').exec;
          function puts(error, stdout, stderr) {
               sys.puts(stdout)
               console.log("done")
           }
          exec(command, puts);
      }
    }

  });