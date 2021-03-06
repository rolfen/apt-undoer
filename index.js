#!/usr/bin/env node

'use strict';

const defaultLogFile = "/var/log/apt/history.log";

const process = require('process');
var argv = require('minimist')(process.argv.slice(2));
var fs = require('fs');
 

if(argv.help) {
	console.log("LIST");
	console.log("  apt-history [<property>] [--from <N>] [--limit <N>]");
	console.log("SINGLE ITEM");
	console.log("  apt-history <index> [<property>] [--as-apt-arguments]");
	console.log("COMMON OPTIONS");
	console.log("  Specify data: {--input <file>|--stdin}");
	console.log("NOTES");
	console.log("  Common APT properties:");
	console.log("    Commandline, Requested-By, Install, Start-Date, End-Date, Purge, Remove");
	console.log("  Defaults:");
	console.log("    apt-history Commandline --from 0 --limit 5 --input " + defaultLogFile);
	return;
} 

if(argv.input) {
	// input file is specified
	fs.readFile(argv.input, 'utf8', function(err, content) {
	    main(content);
	});
} else if(argv.s || argv.stdin) {
	// read from stdin
	readStdin(function(stdinText) {
		main(stdinText);
	});	
} else {
	// try to find apt log
	fs.readFile(defaultLogFile, 'utf8', function(err, content) {
	    main(content);
	});
}

function readStdin(onEnd) {
	var stdin = process.stdin;
	var inputChunks = [];

	stdin.resume();
	stdin.setEncoding('utf8');

	stdin.on('data', function (chunk) {
	    inputChunks.push(chunk);
	});

	stdin.on('end', function() {
		var stdinText = inputChunks.join();
		onEnd(stdinText);
	});
}


function main(logText) {

	var stdout = process.stdout;

	var transactions = parseAptLog(logText);

	var propertyNames = ["Commandline"]; // default

	if(!isNaN(argv["_"][0])) {

		// first argument is a numerical index, show single record

		var index = parseInt(argv["_"][0]);
		var record = transactions[index];

		// then second argument may be the property names
		propertyNames = argv["_"][1] ? argv["_"][1].split(',') : null;

		if (propertyNames) {
			// show specific properties in the record
			var out = propertyNames.map(function(propName, n){
				return(record[propName]);
			}).join("\t");
			if(typeof(record) !== "undefined") {
				if (argv["as-apt-arguments"]) {
					out = out.replace(/\([^\(]+\)/g,'').replace(/ , /g,' ').trim();
				} 			
			}
			console.log(out);
		} else {
			console.dir(record);
		}

	} else {
		// list

		propertyNames = argv["_"][0] ? argv["_"][0].split(',') : propertyNames;

		// What's wrong with piping to tail? Meh. 
		if(argv["limit"] && !isNaN(argv["limit"])) {
			var sampleSize =argv["limit"];
		} else {
			var sampleSize = 10;
		}

		// Having sample size bigger than actual data messes with indices
		sampleSize = Math.min(sampleSize, transactions.length);

		if((typeof(argv["from"]) !== "undefined") && !isNaN(argv["from"])) {
			var tailOffset = parseInt(argv["from"]);
		} else {
			var tailOffset = transactions.length - sampleSize;
		}

		var output = transactions.splice(tailOffset, sampleSize).map(function(transaction, n) {
			//if(transaction[propertyName] !== undefined) {
				return (tailOffset + n) +  "\t" + propertyNames.map(function(propName,n ){
					return transaction[propName];
				}).join("\t");
			//} 
		}).filter(l => l !== undefined);

		console.log(output.join("\n"));		
	}
};

function parseAptLog(logText) {
	// parse APT history log (string) into object
	return ( 
		logText.split("\n\n").map(function(transaction){
	    	var lines = transaction.split("\n");
	    	var attributes = {};
	    	lines.forEach(function(line){
	    		var attributeTuple = line.split(': ',2);
	    		if(attributeTuple.length == 2) {
		    		attributes[attributeTuple[0]] = attributeTuple[1];
	    		}
	    	})
	    	return(attributes);
	    })
    );
}

