import { Subjects } from "../api/module_tables.js"
import { Session } from 'meteor/session'



if (Meteor.isServer) {
  // This code only runs on the server
  // Only publish tasks that are public or belong to the current user


 Meteor.startup(function () {
  //add email address for outgoing emails
  process.env.MAIL_URL = 'smtps://--email--:--password--@smtp.gmail.com:465/'

    if (Subjects.find().count() === 0) {

      //local json upload
      // if (!Meteor.settings.public.use_url_data){
      //   var fs=require('fs');
        //var file='/Users/md35727/mindcontrol_kesh/data.json'
        // var file = '/Users/md35727/spyder_workspace/ACDS.json'
        // var data=fs.readFileSync(file, 'utf8');
        // var myobject=JSON.parse(data);
  
        // myobject.forEach(function(val,idx,array){
        //         console.log(val.subject_id)
        //         Subjects.insert(val)
        //     })
        // }

      //url json upload
      if(Meteor.settings.public.use_url_data){
        source_json = Meteor.settings.public.startup_json 

        myobject = JSON.parse(HTTP.get(source_json).content)

        console.log("my object is", myobject.length)
        if (Meteor.settings.public.load_if_empty){
          console.log("loading???")
          myobject.forEach(function(val,idx,array){
              console.log(val.subject_id)
              Subjects.insert(val)
          })
        }
      } 
        
    }
        
  });

}
