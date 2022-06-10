"use strict";

var {exec} = require("child_process").exec;

export functon execute(name, args){
    return exec(name, args);
}
