import '../imports/startup/accounts-config.js';
import '../imports/ui/body.js';
import "../imports/ui/routers.js"

globalSelector = {}
subjectSelector = {"subject_id": {"$in": []}}
product_of_sums = []
sums = []

 Meteor.startup(function () {

          Session.set("globalSelector", globalSelector)
          Session.set("subjectSelector", subjectSelector)
          Session.set("product_of_sums", product_of_sums)
          Session.set("sums", sums)
    });
