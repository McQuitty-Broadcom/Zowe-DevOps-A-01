var cmd = require('node-cmd'),
    config = require('./config.json'),
    fs = require('fs'),
    gulp = require('gulp-help')(require('gulp')),
    gulpSequence = require('gulp-sequence'),
    PluginError = require('plugin-error'),
    readlineSync = require('readline-sync');


/**
 * await Job Callback - Callback is made without error if Job completes with 
 * CC < MaxRC in the allotted time
 * @callback awaitJobCallback
 * @param {Error} err 
 */

/**
  * commandObject - object contains command to submit and directory to download output to
  * @object commandObject
  * @param {string} command Command to submit
  * @param {string} dir     Directory to download command output to 
  */


/**
* Runs command and calls back without error if successful
* @param {string}           command           command to run
* @param {string}           dir               directory to log output to
* @param {awaitJobCallback} callback          function to call after completion
* @param {Array}            [expectedOutputs] array of expected strings to be in the output
*/
function simpleCommand(command, dir, callback, expectedOutputs){
  cmd.get(command, function(err, data, stderr) { 
    //log output
    var content = "Error:\n" + err + "\n" + "StdErr:\n" + stderr + "\n" + "Data:\n" + data;
    writeToFile(dir, content);
    
    if(err){
      callback(err);
    } else if (stderr){
      callback(new Error("\nCommand:\n" + command + "\n" + stderr + "Stack Trace:"));
    } else if(typeof expectedOutputs !== 'undefined'){
      verifyOutput(data, expectedOutputs, callback);
    } else {
      callback();
    }
  });
}

/**
* Submits job, verifies successful completion, stores output
* @param {string}           ds                  data-set to submit
* @param {string}           [dir="job-archive"] local directory to download spool to
* @param {number}           [maxRC=0]           maximum allowable return code
* @param {awaitJobCallback} callback            function to call after completion
*/
function submitJobAndDownloadOutput(ds, dir="job-archive", maxRC=0, callback){
  var command = `zowe jobs submit data-set "${ds}" -d ${dir} --rfj`;
  cmd.get(command, function(err, data, stderr) { 
    //log output
    var content = "Error:\n" + err + "\n" + "StdErr:\n" + stderr + "\n" + "Data:\n" + data;
    writeToFile("command-archive/job-submission", content);

    if(err){
      callback(err);
    } else if (stderr){
      callback(new Error("\nCommand:\n" + command + "\n" + stderr + "Stack Trace:"));
    } else {
      data = JSON.parse(data).data;
      retcode = data.retcode;

      //retcode should be in the form CC nnnn where nnnn is the return code
      if (retcode.split(" ")[1] <= maxRC) {
        callback(null);
      } else {
        callback(new Error("Job did not complete successfully. Additional diagnostics:" + JSON.stringify(data,null,1)));
      }
    }
  });
}

/**
* Submits multiple simple commands
* @param {commandObject[]}  commands Array of commandObjects
* @param {awaitJobCallback} callback function to call after completion
*/
function submitMultipleSimpleCommands(commands, callback){
  if(commands.length>0){
    simpleCommand(commands[0].command, commands[0].dir, function(err){
      if(err){
        callback(err);
      } else {
        commands.shift();
        submitMultipleSimpleCommands(commands, callback);
      }
    })
  } else {
    callback();
  }
}

/**
* Runs command and calls back without error if successful
* @param {string}           data            command to run
* @param {Array}            expectedOutputs array of expected strings to be in the output
* @param {awaitJobCallback} callback        function to call after completion
*/
function verifyOutput(data, expectedOutputs, callback){
  expectedOutputs.forEach(function(output){
    if (!data.includes(output)) {
      callback(new Error(output + " not found in response: " + data));
    }
  });
  // Success
  callback();
}

/**
* Writes content to files
* @param {string}           dir     directory to write content to
* @param {string}           content content to write
*/
function writeToFile(dir, content) {
  // Adjusted to account for Windows filename issues with : in the name.
  var d = new Date(), 
    fileName = d.toISOString().split(":").join("-") + ".txt",
    filePath = dir + "/" + fileName;

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  };
  
  fs.writeFileSync(filePath, content, function(err) {
    if(err) {
      return console.log(err);
    }
  });
}

gulp.task('bind-n-grant', 'Bind & Grant Job', function (callback) {
  var ds = config.bindGrantJCL;
  submitJobAndDownloadOutput(ds, "job-archive/bind-n-grant", 4, callback);
});

gulp.task('build-cobol', 'Build COBOL element', function (callback) {
  var command = `zowe endevor generate element ${config.testElement} --type COBOL --override-signout --maxrc 0 --stage-number 1`;

  simpleCommand(command, "command-archive/build-cobol", callback);
});

gulp.task('build-lnk', 'Build LNK element', function (callback) {
      command = `zowe endevor generate element ${config.testElement} --type LNK --override-signout --maxrc 0 --stage-number 1`;

  simpleCommand(command, "command-archive/build-link", callback);
});

gulp.task('build', 'Build Program', gulpSequence('build-cobol','build-lnk'));

gulp.task('cics-refresh', `Refresh(new-copy) ${config.cicsProgram} CICS Program`, function (callback) {
  var command = `zowe cics refresh program "${config.cicsProgram}"`;

  simpleCommand(command, "command-archive/cics-refresh", callback);
});

gulp.task('copy', 'Copy LOADLIB & DBRMLIB to test environment', function (callback) {
  var ds = config.copyJCL;
  submitJobAndDownloadOutput(ds, "job-archive/copy", 4, callback);
});

gulp.task('deploy', 'Deploy Program', gulpSequence('copy','bind-n-grant','cics-refresh'));
