var requires = {};
requires.irc = require("irc");
requires.mysql = require("mysql");

var SQUARIFIC = {};
SQUARIFIC.IrcBot = function IrcBot (requires, games, database, irc) {
	if (!this instanceof SQUARIFIC.IrcBot) {
		throw "IrcBot is a constructor function";
	}
	
	var needed = ["irc", "mysql"];
	if (typeof requires !== "object") {
		throw "No library provided";
	}
	for (var key = 0; key < needed.length; key++) {
		if (!requires[needed[key]]) {
			throw "The library: '" + needed[key] + "' was not present NEEDED: " + needed + " PROVIDED: " + requires;
		}
	}
	
	console.log("All librarys required were found.");
	console.log("Loading the following games: '" + games.join(', ') + "'");
	
	for (var key = 0; key < games.length; key++) {
		try {
			this.games[games[key]] = require("games/" + games[key] + ".js");
		} catch (e) {
			console.log(e);
		}
	}
	
	console.log("Game loading done.");
	
	database = database || {};
	database.host = database.host || "localhost";
	database.user = database.user || "ircbot";
	database.password = database.password || database.pass || "ircbot";
	var db = database.database || "ircbot";
	delete database.database;
	this.database = requires.mysql.createConnection(database);
	
	this.createDB = function createDB () {
		console.log("Creating the database if it doesn't exist yet.");
		this.database.query("CREATE DATABASE IF NOT EXISTS " + database.database, function (err) {
			if (err) {
				console.log(err);
			}
			this.database.query("USE " + database.database, function (err) {
				if (err) {
					throw err;;
				}
				console.log("Selected database " + database.database);
				this.createTable();
			}.bind(this));
		}.bind(this));
	};
	
	this.createTable = function createTable () {
		console.log("Creating the table if it doesn't exist yet.");
		this.database.query("CREATE TABLE IF NOT EXISTS messages (`from` VARCHAR(255), `to` VARCHAR(255), message TEXT);", function (err) {
			if (err) {
				console.log(err);
			}
			console.log("Constructing IrcClient");
			this.constructIrc();
		}.bind(this));
	};
	
	console.log("Connecting to the database...");
	
	this.database.connect(function (err) {
		database.database = db;
		if (err) {
			console.log(err);
		}
		this.createDB();
	}.bind(this));
	
	this.constructIrc = function constructIrc () {
		irc = irc || {};
		irc.server = irc.server || "chat.freenode.net";
		irc.name = irc.username || irc.name || "Theubercoolguyo";
		irc.config = irc.config || {};
		irc.config.channels = irc.config.channels || ["#node.js"];
		this.irc = irc;
		
		console.log("Connecting to the irc server...");
		this.ircClient = new requires.irc.Client(irc.server, irc.name, irc.config);
		this.ircClient.addListener("message", function (from, to, message) {
			var command = message.split(" ");
			if (command[0] === this.irc.name || to === this.irc.name) {
				if (command[0] === this.irc.name) {
					command.splice(0, 2);
				} else {
					command.splice(0, 1);
				}
				this.commands[command[0]](from, to, message, command)
			}
			this.database.query("INSERT INTO messages SET ?", {from: from, to: to, message: message}, function (err, result) {
				if (err) {
					console.log("Database Error. ", err, result);
				}
			});
			console.log(from, to, message);
		}.bind(this));
		this.ircClient.addListener("registered", function () {
			console.log("Connected to the irc server.");
		});
		
		console.log("Initiating games.");
		for (var key in this.games) {
			if (typeof this.games[key].init === "function") {
				this.games[key].init(this);
			}
		}
		console.log("Games initiated.");
	};
	
	this.commands = {};
	this.commands.say = function (from, to, message, command) {
		if (this.identified[from].at > Date.now() - 300000) {
			var sayTo = command[0];
			command.splice(0, 1)
			this.ircClient.say(sayTo, command.join(" "));
		} else {
			this.ircClient.say(from, "You are not identified. First identify yourself by messaging me 'identify [password]'");
		}
	}.bind(this);
	this.commands.identify = function (from, to, message, command) {
		if (command[0] === "lolled1") {
			this.identified[from] = {
				at: Date.now(),
				level: 0
			};
		} else {
			this.ircClient.say(from, "Wrong password.");
		}
	}.bind(this);
	this.commands.identified = function (from, to, message, command) {
		if (this.identified[from] && this.identified[from].at > Date.now() - 300000) {
			this.ircClient.say(to, "Yes, " + from + " you are identified for level " + this.identified[from].level + " during another " + Math.round((this.identified[from].at - 300000) / 1000) " second(s)");
		} else {
			this.ircClient.say(to, "No, " + from + " you are not identified.");
		}
	}.bind(this);
	this.commands.game = function (from, to, message, command) {
		var game = command[0];
		command.splice(0, 1);
		if (this.games[game] && typeof this.games[game].start === "function") {
			this.games[game].start(command);
		}
	}.bind(this);
	this.commands.help = function (from, to, message, command) {
		var cmds = [];
		for (var key in this.commands) {
			if (this.commands.hasOwnProperty(key)) {
				cmds.push(key);
			}
		}
		this.ircClient(to, from + ", the following commands are available: " + cmds.join(", "));
	}.bind(this);
};

console.log("Starting IRCBOT");
SQUARIFIC.ircBot = new SQUARIFIC.IrcBot(requires, ["hangman"]);