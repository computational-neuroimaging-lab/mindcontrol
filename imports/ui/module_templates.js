import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';


import './module_templates.html';
import "./d3_plots.js"
import './custom.html'
import "./custom.js"


//get filter for histogram data (sent to renderHistogram)
get_filter = function(entry_type){

  var myselect = {}
    var subselect = Session.get("subjectSelector")
    
    myselect["entry_type"] = entry_type
    if (subselect["subject_id"]["$in"].length){
        myselect["subject_id"] = subselect["subject_id"]
    }
    //console.log("myselect is", myselect)

    return myselect
    
    // var or = {}
    // var or_array = []

    // var subselect = Session.get("subjectSelector")
    // for (var i=0; i<subselect["subject_id"]["$in"].length; i++){ 
    //     var sub = {}
    //     sub["subject_id"]= subselect["subject_id"]["$in"][i].split(' - ')[0]
    //     sub["visit_id"]= subselect["subject_id"]["$in"][i].split(' - ')[1]
    //     or_array.push(sub)
    // }
    // if(or_array.length != 0){
    //   or["$or"] = or_array
    // }
    
    // or["entry_type"] = entry_type

    // console.log("myselect is", or)
    
    // return or

}
//get filter for tabular table data (selector)
get_table_filter = function(entry_type){

   
    var myselect = {}
    var subselect = Session.get("subjectSelector")
    
    myselect["entry_type"] = entry_type
    if (subselect["subject_id"]["$in"].length){
        myselect["subject_id"] = subselect["subject_id"]
    }
    //console.log("myselect is", myselect)

    return myselect

}

get_metrics = function(entry_type){
    Meteor.call("get_metric_names", entry_type, function(error, result){
            Session.set(entry_type+"_metrics", result)
        })
        return Session.get(entry_type+"_metrics")
}

get_metrics_labels = function(entry_type){
    Meteor.call("get_metric_labels", entry_type, function(error, result){
            Session.set(entry_type+"_metrics", result)
        })
        return Session.get(entry_type+"_metrics")
}

render_histogram = function(entry_type){
                var metric = Session.get("current_"+entry_type)//"Amygdala"
                if (metric == null){
                    var all_metrics = Session.get(entry_type+"_metrics")
                    if (all_metrics != null){
                        Session.set("current_"+entry_type, all_metrics[0])
                    }

                }

                if (metric != null){
                    var filter = get_filter(entry_type)
                    //console.log("filter is", filter)
                    Meteor.call("getHistogramData", entry_type, metric, filter, function(error, result){

                    var data = result["histogram"]
                    var minval = result["minval"]
                    var maxval = result["maxval"]
                    var bins = result["bins"]

                    if (data.length){
                        do_d3_histogram(data, bins, minval, maxval, metric, "#d3vis_"+entry_type, entry_type)
                    }
                    else{
                        console.log("attempt to clear histogram here")
                        //clear_histogram("#d3vis_"+entry_type)
                    }
                    });
                }
}


Template.base.helpers({
  modules: function(){
    console.log(Meteor.settings.public.modules)
    return Meteor.settings.public.modules
  },
  assessment: function(){
    console.log("retrieving assessment data", Session.get("Assessment"))
    return Meteor.settings.public.modules.find(function(o){return o.entry_type == Session.get("Assessment")})
  }
})

Template.Modal.helpers({
  modules: function(){
    return Meteor.settings.public.modules
  },

  selectedAssessment: function(){
    return Session.get("selected_assessments")
  }
})

Template.Modal.events({
  "change #module-select": function(event, template){
    var assessment = $(event.currentTarget).val()    
    selected_assessments = Session.get("selected_assessments")

    if(assessment == "Select All"){
      selected_modules = Meteor.settings.public.modules
      for (var i=0; i<selected_modules.length; i++){
        if(selected_assessments.indexOf(selected_modules[i].entry_type) < 0)
          selected_assessments.push(selected_modules[i].entry_type)
      }
      Session.set("selected_assessments", selected_assessments)
    }


    if (selected_assessments.indexOf(assessment) < 0 && assessment != "Select All")
      selected_assessments.push(assessment)
    Session.set("selected_assessments", selected_assessments)
  },

  "click .remove": function(e){
    var remove_assessment = this
    console.log("Removed", remove_assessment)
    selected_assessments = Session.get("selected_assessments")

    for (var i=0; i<selected_assessments.length; i++){
      if(selected_assessments[i] == remove_assessment){
        selected_assessments.splice(i, 1)
      }
    }
    
    Session.set("selected_assessments", selected_assessments)
  },

  "click .sendEmail": function(e){

    var recipientEmail = ''
      
    recipientEmail = document.getElementById("emailInput").value
    console.log("email", recipientEmail)
    if(recipientEmail == ''){
        alert("Please enter a valid email address.")
    }
    else{
        product_of_sums = Session.get("product_of_sums")
        selected_assessments = Session.get("selected_assessments")
        document.getElementById("sendBtn").innerHTML = 'loading json...'
        // var dialog = document.getElementById('window');  
        // dialog.show();  
        // document.getElementById('description').innerHTML = 'Files will be sent to ' +recipientEmail+ '.'
        // document.getElementById('exit').onclick = function() {  
        //     dialog.close();  
        //     var modal = document.getElementById("modal_close")
        //     modal.click()
        // };  
        Meteor.call("get_subject_ids_from_aggregate", product_of_sums, function(error, result){
              //console.log("result from get subject ids from filter is", result)

              Meteor.call("email_json_assessments", selected_assessments, result, recipientEmail, function(error){
                  //alert('Email sent.')
                  document.getElementById("sendBtn").innerHTML = 'Send'
                  if(error){
                    alert("Something went wrong. The files may be too large. Consider sending multiple files by splitting the assessments.")
                  }
                  else{
                    var dialog = document.getElementById('window');  
                    dialog.show();  
                    document.getElementById('description').innerHTML = 'Files will be sent to ' +recipientEmail+ '.'
                    document.getElementById('exit').onclick = function() {  
                        dialog.close();  
                        var modal = document.getElementById("modal_close")
                        modal.click()
                    };  
                  }
                  
              })
                      
        })
        
    }
        
  },

  "click .emailCsv": function(e){

    document.getElementById("emailField").style.display = "block";
    var recipientEmail = ''

    const node = document.getElementById("sendBtn")
    node.addEventListener("click", function(event){
    
      recipientEmail = document.getElementById("emailInput").value
      console.log("email", recipientEmail)

      if(recipientEmail == ''){
          alert("Please enter a valid email address.")
      }
      else{
          product_of_sums = Session.get("product_of_sums")
          selected_assessments = Session.get("selected_assessments")
          document.getElementById("sendBtn").innerHTML = 'loading csv...'
          Meteor.call("get_subject_ids_from_aggregate", product_of_sums, function(error, result){
                //console.log("result from get subject ids from filter is", result)

                Meteor.call("email_csv_assessments", selected_assessments, result, recipientEmail, function(error){
                    alert('Email sent.')
                    document.getElementById("sendBtn").innerHTML = 'Send'
                })
                        
          })
      }
    })     
  },


  "click .downloadJson": function(e){

      product_of_sums = Session.get("product_of_sums")
      selected_assessments = Session.get("selected_assessments")
      Meteor.call("get_subject_ids_from_aggregate", product_of_sums, function(error, result){
            //console.log("result from get subject ids from filter is", result)

            Meteor.call("download_json_assessments", selected_assessments, result, function(error, json_data){
                  if(Meteor.isClient){
                    var sub = {"subject_ids": result['subject_ids']}
                    var sub_data = JSON.stringify(sub, null, 2)
                    Meteor.call('download_json', 'subject_download.json', sub_data)     
                    Meteor.call('download_json', 'assessment_download.json', json_data)               
                  }
            })
                    
      })    
  },

  "click .downloadCsv": function(e){
    product_of_sums = Session.get("product_of_sums")
    selected_assessments = Session.get("selected_assessments")
    Meteor.call("get_subject_ids_from_aggregate", product_of_sums, function(error, result){
            //console.log("result from get subject ids from filter is", result)
            Meteor.call("download_csv_assessments", selected_assessments, result, function(error, c_data){
                    if(Meteor.isClient){
                        Meteor.call("download_csv", 'assessment_download.csv', c_data);
                    }
            })

    })
    
  },

  "click .close_modal": function(e){
    Meteor.call("clear_subjects")
    Session.set("selected_assessments", [])
    Session.set("loaded_assessments", {})
  }
})

Template.module.helpers({
  selector: function(){
    return get_table_filter(this.entry_type)
  },
  table: function(){ 
    return TabularTables[this.entry_type]
  },
  histogram: function(){
    return this.graph_type == "histogram"
  },
  date_histogram: function(){
    return this.graph_type == "datehist"
  },
  metric: function(){
          return get_metrics_labels(this.entry_type)
      },
  currentMetric: function(){
          console.log("currentmetric: ", Session.get("current_"+this.entry_type))
          return Session.get("current_"+this.entry_type)
      }
})

Template.module.events({
 "change #metric-select": function(event, template){
     var metric = $(event.currentTarget).val()
     console.log("metric: ", metric.split('- ')[0])
     Session.set("current_"+this.entry_type, metric.split('- ')[0])
 },
 "click .clouder": function(event, template){
     var cmd = Meteor.settings.public.clouder_cmd
     Meteor.call("launch_clouder", cmd)
 },
 "click .and": function(event, template){
      Session.set("query_mode", "AND")
  },
 "click .or": function(event, template){
      Session.set("query_mode", "OR")
  },
 "click .done": function(event, template){
      Session.set("query_mode", "DONE")
      product_of_sums = Session.get("product_of_sums")
      sums = Session.get("sums")
      
      if(sums.length != 0){
          product_of_sums.push(sums)
          Session.set("product_of_sums", product_of_sums)

          console.log("SUMS called after DONE Click", sums)
          Meteor.call("get_subject_ids_from_aggregate", product_of_sums, function(error, result){
            var ss = Session.get("subjectSelector")
            
            ss["subject_id"]["$in"] = result["subject_ids"]

            Session.set("subjectSelector", ss)
            //console.log(result)
            console.log("subjectSelector", ss)
            var assessment = Session.get("Assessment")
            Meteor.call("get_subject_ids_from_aggregate", product_of_sums, function(error, result){
                              var ss = Session.get("subjectSelector")
                              ss["subject_id"]["$in"] = result
                              Session.set("subjectSelector", ss)
                        })
          })
          
          sums = []
          Session.set("sums", [])
        }     
        //console.log("DONE CLICK POS", product_of_sums)
  },
  'click .downloadWindow': function (e) {
    Modal.show('Modal')
    selected_assessments = []
    Session.set("selected_assessments", selected_assessments)
  }
})

Template.base.rendered = function(){
  if (!this.rendered){
      this.rendered = true
  }

  this.autorun(function() {
      Meteor.settings.public.modules.forEach(function(self, idx, arr){
        if (self.graph_type == "histogram" && self.entry_type == Session.get("Assessment")){
          console.log("rendering histogram", self.entry_type)
          render_histogram(self.entry_type)
        }
      })
  });
}

Template.body_sidebar.helpers({
  modules: function(){
    return Meteor.settings.public.modules
  }
})

Template.body_sidebar.onCreated(function() {
  const instance = this;
  instance.state = new ReactiveDict();  
  instance.state.set('loaded', {});
  Meteor.call("clear_subjects")
  Session.set("loaded_assessments", {})

})

function loadNewSubjects(module, templateInstance) {
  //const loaded = templateInstance.state.get('loaded');
  var loaded = Session.get("loaded_assessments")
    if (loaded[module])
      console.log("already loaded subjects from assessment", module)
    else {
      Meteor.call("add_assessment_subjects", module, function(error, result){
                console.log("add assessment called: "+module)
                
            }) 
      loaded[module] = true;
    } 
  
  // return if assessment subjects are already loaded
  // if (loaded[module])
  //   console.log("already loaded subjects from assessment", module)
  // else {
  //   Meteor.call("add_assessment_subjects", module, function(error, result){
  //             console.log("add assessment called")
  //         }) 
    
  // }

  // else load module and set as loaded
  Session.set("Assessment", module)
  loaded[module] = true;
  Session.set("loaded_assessments", loaded)
  templateInstance.state.set('loaded', loaded);
}

Template.body_sidebar.events({
  "change #module-select": function(event, template){
    var module_name = $(event.currentTarget).val()
    loadNewSubjects(module_name, template); 
  }
})