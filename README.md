# mindcontrol
MindControl is an app for quality control of neuroimaging pipeline outputs. 

## Installation

Install meteor 

```
curl https://install.meteor.com/ | sh
```

Clone this repository

```
git clone https://github.com/computational-neuroimaging-lab/mindcontrol.git
```
start the server
```
cd mindcontrol
meteor --settings test_settings.json
```

In a browser navigate to localhost:3000

## Configure

Create a database json file similar to [http://dxugxjm290185.cloudfront.net/hbn/hbn_manifest.json](http://dxugxjm290185.cloudfront.net/hbn/hbn_manifest.json)

* The required key values pairs are `name` `subject_id` `check_masks` and `entry_type`. 
* Make sure `name` is UNIQUE
* `check_masks` is a list with paths relative to a `staticURL`
* Host your database json file on a server and copy/paste its url into the "startup_json" value on `settings.dev.json`
* Define each module in `settings.dev.json` to point to your `entry_type`, and define the module's `staticURL`
