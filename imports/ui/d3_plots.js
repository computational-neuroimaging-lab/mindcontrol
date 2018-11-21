import "./module_templates.js"

do_d3_date_histogram = function (result, dom_id) {
    // Defer to make sure we manipulate DOM
    _.defer(function () {
      // Use this as a global variable
      window.d3vis = {}
      //d3.select(dom_id).selectAll("rect").data([]).exit().remove()
      //d3.select(dom_id).selectAll("text").data([]).exit().remove()
      d3.select(dom_id).selectAll("svg").data([]).exit().remove("svg")
      Deps.autorun(function () {

        // On first run, set up the visualiation
        if (Deps.currentComputation.firstRun) {



            var width = 960,
                height = 136,
                cellSize = 17; // cell size

          window.d3vis.margin = {top: 15, right: 5, bottom: 15, left: 5},
          window.d3vis.width = width - window.d3vis.margin.left - window.d3vis.margin.right,
          window.d3vis.height = height - window.d3vis.margin.top - window.d3vis.margin.bottom;
           }

        var formatter = d3.time.format("%Y%m%d")

        //var result = ReactiveMethod.call("getDateHist", selector)
            var valid_vals = result.filter(function(d){
                if (d["_id"]){
                    return true
                    }
                else
                {return false}
                })
            var hist_array = {}
            valid_vals.map(function(d){hist_array[d["_id"]] = d["count"]})
            var scan_dates = valid_vals.map(function(d){return d["_id"]})
            var values = Object.keys(hist_array)
            //console.log(values)
            var lowest = 0
            var highest = _.max(hist_array)

            var minYear = _.min(values).toString().substring(0,4)

            minYear = _.max([minYear,1997])
            maxYear = _.max([2016, maxYear])

            var maxYear = _.max(values).toString().substring(0,4)

            //console.log(highest)

            //console.log("min year", minYear)
            //console.log("maxYear", maxYear)
            var percent = d3.format(".1%"),
                format = d3.time.format("%Y%m%d");

            var color = d3.scale.quantize()
                .domain([lowest, highest])
                .range(d3.range(11).map(function(d) { return "q" + d + "-11"; }));

            var svg = d3.select(dom_id).selectAll("svg")
                .data(d3.range(parseInt(minYear), parseInt(maxYear) + 1))
              .enter().append("svg")
                .attr("width", width)
                .attr("height", height)
                .attr("class", "RdYlGn")
              .append("g")
                .attr("transform", "translate(" + ((width - cellSize * 53) / 2) + "," + (height - cellSize * 7 - 1) + ")");

            svg.append("text")
                .attr("transform", "translate(-6," + cellSize * 3.5 + ")rotate(-90)")
                .style("text-anchor", "middle")
                .text(function(d) { return d; });

            var rect = svg.selectAll(".day")
                .data(function(d) { return d3.time.days(new Date(d, 0, 1), new Date(d + 1, 0, 1)); })
              .enter().append("rect")
                .attr("class", "day")
                .attr("width", cellSize)
                .attr("height", cellSize)
                .attr("x", function(d) { return d3.time.weekOfYear(d) * cellSize; })
                .attr("y", function(d) { return d.getDay() * cellSize; })
                .datum(format);

            rect.append("title")
                .text(function(d) { return d; });

            rect.on("click", function(d){
                console.log(d)
                var currSelect = Session.get("globalSelector")
                if (Object.keys(currSelect).indexOf("demographic") < 0) {
                    currSelect["demographic"] = {}
                }
                currSelect["demographic"]["metrics.DCM_StudyDate"] = parseInt(d)
                Session.set("globalSelector", currSelect)

                Meteor.call("get_subject_ids_from_filter", currSelect["demographic"], function(error, result){
                    console.log("result from get subject ids from filter is", result)
                    var ss = Session.get("subjectSelector")
                    ss["subject_id"]["$in"] = result
                    Session.set("subjectSelector", ss)
                })


                })

            //console.log("going to filter rects")

            rect.filter(function(d) {
                return scan_dates.indexOf(parseInt(d)) >= 0; })
                  .attr("class", function(d) {
                      var new_class = "day " + color(hist_array[d]);
                      //console.log(d,new_class)
                      return new_class
                      })

            svg.selectAll(".month")
                .data(function(d) { return d3.time.months(new Date(d, 0, 1), new Date(d + 1, 0, 1)); })
              .enter().append("path")
                .attr("class", "month")
                .attr("d", monthPath);

            function monthPath(t0) {
              var t1 = new Date(t0.getFullYear(), t0.getMonth() + 1, 0),
                  d0 = t0.getDay(), w0 = d3.time.weekOfYear(t0),
                  d1 = t1.getDay(), w1 = d3.time.weekOfYear(t1);
              return "M" + (w0 + 1) * cellSize + "," + d0 * cellSize
                  + "H" + w0 * cellSize + "V" + 7 * cellSize
                  + "H" + w1 * cellSize + "V" + (d1 + 1) * cellSize
                  + "H" + (w1 + 1) * cellSize + "V" + 0
                  + "H" + (w0 + 1) * cellSize + "Z";
                }

    }); //Deps autorun
  }); //defer
  }// end of function

//do_timeseries = function()
d3barplot = function(window, data, bins, formatCount, metric, entry_type){
        // fs_tables is the original table the stuff came from
        //console.log("data is", data)
        var bar_selector = window.d3vis.svg.selectAll("rect")
          .data(data)
        var text_selector = window.d3vis.svg.selectAll(".bar_text")
          .data(data)

        bar_selector
          .enter().append("rect")
          .attr("class", "bar")
        bar_selector
          .attr("x", function(d) { return window.d3vis.x(d._id);})
          .attr("width", window.d3vis.width/(bins)/2+"px")
          .attr("y", function(d) { return window.d3vis.y(d.count); })
          .attr("height", function(d) { return window.d3vis.height - window.d3vis.y(d.count); })
          .attr("fill", "green")
          .attr("shape-rendering","crispEdges")


        bar_selector.enter().append("text")
        .attr("dy", "1em")
        .attr("y", function(d) { return window.d3vis.y(d.count) - 15; })
        .attr("x", function(d) {
              var width = window.d3vis.width/(bins)/2
              return window.d3vis.x(d._id) + width/2;
              })
        .attr("fill", "black")
        .attr("text-anchor", "middle")
        .text(function(d) { return formatCount(d.count); });

        text_selector.enter().append("text")
        .attr("dy", "1em")
        .attr("y", window.d3vis.height+4)
        .attr("x", function(d){
            var width = window.d3vis.width/(bins)/2
            return window.d3vis.x(d._id) + width/2;
        })
        //.attr("transform", "translate(20, 20) rotate(-5)")
        .attr("text-anchor", "middle")
        .attr("fill", "black")
        .attr("font-size", "10px")
        .text(function(d) {
          if(typeof d.label == 'string'){
            return d.label
          } 
          else {
            if (d._id < 1){
              return d3.format(".2f")(d._id)
            } else {
              return d3.format(".1f")(d._id)
            }
          }
         });
        
        var brush = d3.svg.brush()
            .x(window.d3vis.x)
            .extent([_.min(data), _.max(data)])
            .on("brush", brushed)
            .on("brushend", brushend)

        var gBrush = window.d3vis.svg.append("g")
            .attr("class", "brush")
            .call(brush);

        var button = d3.select("body")
            .append("div")
            .attr("class", "and_button")
            .selectAll("div")
            .data(data)
            .text(function(d){return d;});

        gBrush.selectAll("rect")
            .attr("height", window.d3vis.height)
            .on("click", function(d){
                d3.event.stopPropagation();
                console.log("clicked brush rect", d)})


        function brushed() {
          var extent0 = brush.extent()
                      
          if (d3.event.mode === "move") {
                  //console.log("moving")
          }        
          else {
            extent1 = extent0
            
          }
     
        }

        function brushend(){
            var extent0 = brush.extent()

            if ((extent0[1] - extent0[0]) >= 0){

                d3.selectAll(".brush").call(brush.clear());
                var newkey = "metrics."+metric
                var filter = {}

                var gSelector = Session.get("globalSelector")
                

                if (Object.keys(gSelector).indexOf(entry_type) < 0 ){
                    gSelector[entry_type] = {}
                }

                //graphing month of year (1-12)
                if(bins == 12 && Number(text_selector.data()[0]["label"]) == text_selector.data()[0]["_id"]){                   
                    selected_bars = ""

                    for (var i = 0; i<text_selector.data().length; i++){
                       if(text_selector.data()[i]["_id"] >= Math.trunc(extent0[0]) && text_selector.data()[i]["_id"] < extent0[1]){
                        selected_bars = selected_bars+"-"+text_selector.data()[i]["label"]+"-|"                        
                      }
                     } 
                    selected_bars = selected_bars.substring(0, selected_bars.length-1)
                    
                    gSelector[entry_type][newkey] = {$regex: selected_bars}

                    filter[newkey] = {$regex: selected_bars}
                }

                //graphing hour of day (00-23)
                else if(Number(text_selector.data()[0]["label"]) == text_selector.data()[0]["_id"]){                   
                    selected_bars = ""

                    for (var i = 0; i<text_selector.data().length; i++){
                       if(text_selector.data()[i]["_id"] >= Math.trunc(extent0[0]) && text_selector.data()[i]["_id"] < extent0[1]){
                        selected_bars = selected_bars+"1970-01-01T"+text_selector.data()[i]["label"]+"|"                        
                      }
                     } 
                    selected_bars = selected_bars.substring(0, selected_bars.length-1)
                    
                    gSelector[entry_type][newkey] = {$regex: selected_bars}

                    filter[newkey] = {$regex: selected_bars}
                }
                
                //graphing strings
                else if(typeof text_selector.data()[0]["label"] == 'string' && (text_selector.data()[0]["label"]).length){

                   
                    selected_bars = []

                    for (var i = 0; i<text_selector.data().length; i++){
                       if(text_selector.data()[i]["_id"] >= Math.trunc(extent0[0]) && text_selector.data()[i]["_id"] < extent0[1]){
                        selected_bars.push(text_selector.data()[i]["label"]) 
                      }
                     } 

                    gSelector[entry_type][newkey] = {$in: selected_bars}

                    if(selected_bars.length > 1)
                      filter[newkey] = {$in: selected_bars}
                    else
                      filter[newkey] = selected_bars[0]                   
                }

                //graphing number
                else {

                    gSelector[entry_type][newkey] = {$gte: extent0[0], $lte: extent0[1]}

                    filter[newkey] = {$gte: extent0[0], $lte: extent0[1]}
                }

              //AND OR query
              product_of_sums = Session.get("product_of_sums")
              sums = Session.get("sums")
              
              if (Session.get("query_mode") == "OR"){
                sums.push(filter)
                console.log("OR filter", sums)
                Session.set("sums", sums)
              }
              else if(product_of_sums.length == 0 && Session.get("query_mode") == "AND"){
                filter_array = []
                filter_array.push(filter)
                product_of_sums.push(filter_array)
                Session.set("product_of_sums", product_of_sums)

                Meteor.call("get_subject_ids_from_aggregate", product_of_sums, function(error, result){
                  var ss = Session.get("subjectSelector")
                  
                  ss["subject_id"]["$in"] = result

                  Session.set("subjectSelector", ss)
                  //console.log(result)
                  console.log("subjectSelector", ss)
                  
                })
                Session.set("query_mode", "OR")
              }
              else if(Session.get("query_mode") == "AND"){


                sums.push(filter)
                Session.set("query_mode", "OR")
                Session.set("sums", sums)
              }
       
            console.log("Filter: ", filter)
            }

            console.log("ended brushing", extent0)
        }


      };

clear_histogram = function(dom_id){
  d3.select(dom_id).selectAll("rect").data([]).exit().remove();
  d3.select(dom_id).selectAll("text").data([]).exit().remove();
  d3.select("#d3vis_T1w").append("text").text("Nothing to show right now").attr("x", 0).attr("y", 50).attr("dy", "2em")
    .attr("fill", "#d9534f")

}

do_d3_histogram = function (values, bins, minval, maxval, metric, dom_id, entry_type) {
    // Defer to make sure we manipulate DOM
    _.defer(function () {
        //console.log("HELLO, ATTEMPTING TO DO TABLE!!", fs_tables)
      // Use this as a global variable
      window.d3vis = {}
      Deps.autorun(function () {
        d3.select(dom_id).selectAll("rect").data([]).exit().remove()
        d3.select(dom_id).selectAll("text").data([]).exit().remove()
        // On first run, set up the visualiation
        if (Deps.currentComputation.firstRun) {
          window.d3vis.margin = {top: 15, right: 25, bottom: 15, left: 30},
          window.d3vis.width = 900 - window.d3vis.margin.left - window.d3vis.margin.right,
          window.d3vis.height = 125 - window.d3vis.margin.top - window.d3vis.margin.bottom;

          window.d3vis.x = d3.scale.linear()
              .range([0, window.d3vis.width]);

          window.d3vis.y = d3.scale.linear()
              .range([window.d3vis.height, 0]);

          window.d3vis.color = d3.scale.category10();



          window.d3vis.svg = d3.select(dom_id)
              .attr("width", window.d3vis.width + window.d3vis.margin.left + window.d3vis.margin.right)
              .attr("height", window.d3vis.height + window.d3vis.margin.top + window.d3vis.margin.bottom)
            .append("g")
              .attr("class", "wrapper")
              .attr("transform", "translate(" + window.d3vis.margin.left + "," + window.d3vis.margin.top + ")");

          window.d3vis.xAxis = d3.svg.axis()
                                .scale(window.d3vis.x)
                                .orient("bottom")
          //                      .tickFormat(d3.format(",.0f"))

          window.d3vis.svg.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(0," + window.d3vis.height + ")")
          //     .call(window.d3vis.xAxis);
           }


        //var values = get_histogram(fs_tables, metric, bins)
        window.d3vis.x.domain([minval, maxval]);

        window.d3vis.y.domain([0, d3.max(values, function(d) { return d.count; })]);


        var formatCount = d3.format(",.0f");
        d3barplot(window, values, bins, formatCount, metric, entry_type)

    });
  })
  }
