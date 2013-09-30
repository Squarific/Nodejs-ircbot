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
	
	this.games = {};
	for (var key = 0; key < games.length; key++) {
		try {
			this.games[games[key]] = require("./games/" + games[key] + ".js");
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
					throw err;
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
		irc.server = irc.server || "irc.snoonet.org";
		irc.name = irc.username || irc.name || "urbangamebot";
		irc.name = irc.name.toLowerCase();
		irc.password = irc.password || "mfoaijezmi";
		irc.config = irc.config || {};
		irc.config.channels = irc.config.channels || ["#hangman"];
		this.irc = irc;
		
		console.log("Connecting to the irc server...");
		this.ircClient = new requires.irc.Client(irc.server, irc.name, irc.config);
		this.ircClient.addListener("message", function (from, to, message) {
			from = from.toLowerCase();
			to = to.toLowerCase();
			var command = message.toLowerCase().split(" ");
			if (this.games[command[0]] && typeof this.games[command[0]].commands[command[1]] === "function") {
				var game = command[0],
					cmd = command[1];
				command.splice(0, 2);
				this.games[game].commands[cmd](from, to, message, command);
			} else if (command[0] === this.irc.name || to === this.irc.name) {
				var cmd;
				if (command[0] === this.irc.name) {
					cmd = command[1];
					command.splice(0, 2);
				} else {
					cmd = command[0];
					command.splice(0, 1);
				}
				if (typeof this.commands[cmd] === "function") {
					this.commands[cmd](from, to, message, command)
				}
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
			if (this.irc.password) {
				this.ircClient.say("NickServ", "IDENTIFY " + this.irc.name + " " + this.irc.password);
			}
		}.bind(this));

		this.ircClient.addListener("error", function (err) {
			console.log("IRC ERROR: ", err);
		});
		
		console.log("Initiating games.");
		for (var key in this.games) {
			if (this.games[key] && typeof this.games[key].construct === "function") {
				this.games[key] = new this.games[key].construct(this);
			}
		}
		console.log("Games initiated.");
		
		this.identified = {};
	};
	
	this.commands = {};
	this.commands.join = function (from, to, message, command) {
		if (this.identified[from] && this.identified[from].at > Date.now() - 300000) {
			this.ircClient.join(command[0]);
		} else {
			this.ircClient.say(from, "You are not identified. First identify yourself by messaging me 'identify [password]'");
		}
	}.bind(this);
	this.commands.say = function (from, to, message, command) {
		if (this.identified[from] && this.identified[from].at > Date.now() - 300000) {
			var sayTo = command[0];
			command.splice(0, 1)
			this.ircClient.say(sayTo, command.join(" "));
		} else {
			this.ircClient.say(from, "You are not identified. First identify yourself by messaging me 'identify [password]'");
		}
	}.bind(this);
	this.commands.identify = function (from, to, message, command) {
		if (command[0] === this.irc.password) {
			this.identified[from] = {
				at: Date.now(),
				level: 0
			};
			this.ircClient.say(from, "Succesfully identified.");
		} else {
			this.ircClient.say(from, "Wrong password.");
		}
	}.bind(this);
	this.commands.identified = function (from, to, message, command) {
		if (this.identified[from] && this.identified[from].at > Date.now() - 300000) {
			this.ircClient.say(from, "Yes, " + from + " you are identified for level " + this.identified[from].level + " during another " + Math.round((this.identified[from].at - 300000) / 1000) + " second(s)");
		} else {
			this.ircClient.say(from, "No, " + from + " you are not identified.");
		}
	}.bind(this);
	this.commands.game = function (from, to, message, command) {
		var game = command[0], sayTo;
		command.splice(0, 1);
		if (this.games[game] && typeof this.games[game].start === "function") {
			this.games[game].start(from, command);
		} else {
			var games = [];
			for (var key in this.games) {
				games.push(key);
			}
			if (to !== this.irc.name) {
				sayTo = to;
			} else {
				sayTo = from;
			}
			this.ircClient.say(sayTo, game + " wasn't found, the following games are available: " + games.join(", "))
		}
	}.bind(this);
	this.commands.help = function (from, to, message, command) {
		var cmds = [], sayTo;
		for (var key in this.commands) {
			if (this.commands.hasOwnProperty(key)) {
				cmds.push(key);
			}
		}
		if (to !== this.irc.name) {
			sayTo = to;
		} else {
			sayTo = from;
		}
		this.ircClient.say(sayTo, from + ", the following commands are available: " + cmds.join(", "));
		this.ircClient.say(sayTo, "You can try playing a hangman game: with the command 'game hangman [user/channel] [word or 'randomword'] (optional: amount (number) of guesses allowed)'. There is also a blackjack game, more info at 'blackjack help'");
		this.ircClient.say(sayTo, "My sourcecode can be found at: https://github.com/Squarific/Nodejs-ircbot")
	}.bind(this);
};

console.log("Starting IRCBOT");
SQUARIFIC.ircBot = new SQUARIFIC.IrcBot(requires, ["hangman", "blackjack"]);