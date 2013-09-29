exports.construct = function BlackJack (bot) {
	this.games = [];
	this.cards = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10];
	
	this.start = function (from, command) {
		for (var key = 0; key < this.games.length; key++) {
			if (this.games[key].playIn === command[0]) {
				bot.ircClient.say("There is already a game going on in " + command[0]);
			}
		}
		bot.ircClient.join(command[0]);
		this.games.push({
			owner: from,
			players: {from: {
				cards: [this.cards[Math.floor(Math.random() * this.cards.length)], this.cards[Math.floor(Math.random() * this.cards.length)]]
			}},
			playIn: command[0],
			started: Date.now()
		});
		bot.ircClient.say(command[0], from + " has started a blackjackgame in this channel.");
		bot.ircClient.say(command[0], "If you want to join say 'blackjack join'");
		bot.ircClient.say(from, "You currently have the following cards: " + cards.join(", ") + " which gives you a total of " + this.sum(this.games[key].players[from].cards) + " if you want another card say 'blackjack card' if you want to stop say 'blackjack done'");
	};
	
	this.commands = {};
	
	this.commands.join = function (from, to, message, command) {
		for (var key = 0; key < this.games.length; key++) {
			if (this.games[key].playIn === to) {
				if (this.games[key].players[from]) {
					bot.ircClient.say(this.games[key].playIn, from + " you already joined this game, say 'blackjack card' to get another card or 'blackjack done' if you are ready.");
				} else {
					this.games[key].players[from] = {
						cards: [this.cards[Math.random() * this.cards.length], this.cards[Math.random() * this.cards.length]]
					};
					bot.ircClient.say(this.games[key].playIn, from + " joined " + this.games[key].owner + "s game.");
					bot.ircClient.say(from, "You currently have the following cards: " + cards.join(", ") + " which gives you a total of " + this.sum(this.games[key].players[from].cards) + " if you want another card say 'blackjack card' if you want to stop say 'blackjack done'");
					return;
				}
			}
		}
		bot.ircClient.say(to, from + " there is no blackjack game in this room yet, why don't you start one?");
	}.bind(this);
	
	this.commands.card = function (from, to, message, command) {
		for (var key = 0; key < this.games.length; key++) {
			if (this.games[key].players[from] && !this.games[key].players[from].done) {
				if (this.sum(this.games[key].players[from].cards) > 20) {
					this.games[key].players[from].done = true;
					if (this.everyoneDone(this.games[key].players)) {
						this.finishGame(key);
					}
					bot.ircClient.say(from, "You already have equal or more than 21, we marked you as done.");
				} else {
					this.games[key].players[from].cards.push(this.cards[Math.floor(Math.random() * this.cards.length)]);
					bot.ircClient.say(from, "You currently have the following cards: " + cards.join(", ") + " which gives you a total of " + this.sum(this.games[key].players[from].cards) + "if you want another card say 'blackjack card' if you want to stop say 'blackjack done");
				}
				return;
			}
		}
		bot.ircClient.say(from, "You aren't playing any game yet, try 'blackjack join'.");
	}.bind(this);
	
	this.commands.done = function (from, to, message, command) {
		for (var key = 0; key < this.games.length; key++) {
			if (this.games[key].players[from] && !this.games[key].players[from].done) {
				this.games[key].players[from].done = true;
				bot.ircClient.say(this.games[key].playIn, from + " is marked as ready.");
				if (this.everyoneDone(this.games[key].players)) {
					this.finishGame(key);
				}
				return;
			}
		}
	}.bind(this);
	
	this.commands.forceEnd = function (from, to, message, command) {
		for (var key = 0; key < this.games.length; key++) {
			if (this.games[key].playIn === to) {
				if (this.games[key].started < Date.now() - 180000) {
					this.finishGame(key);
				} else {
					bot.ircClient.say(this.games[key].playIn, "You can force the game to end in " + Math.round((180000 - Date.now() + this.games[key].started) / 1000) + " seconds.") );
				}
			}
		}
	}.bind(this);
	
	this.commands.status = function (from, to, message, command) {
		for (var key = 0; key < this.games.length; key++) {
			if (this.games[key].playIn === to) {
				var players = [];
				for (var key in this.games[key].players) {
					players.push(key + " (ready)");
				}
				bot.ircClient.say(to, "This game was started by: " + this.games[key].owner + " " + Math.round((Date.now() - this.games[key].started) / 1000) + " seconds ago (you can force a game to end after 3 minutes (180 seconds))");
				bot.ircClient.say(to, "Players: " + players.join(', '));
			}
		}
	}.bind(this);
	
	this.commands.disband = function (from, to, message, command) {
		var count = 0;
		for (var key = 0; key < this.games.length; key++) {
			if (this.games[key].owner === from) {
				bot.ircClient.say(this.games[key].playIn, from + " disbanded your game.");
				this.games.splice(key, 1);
				count++;
			}
		}
		bot.ircClient.say(from, "Disbanded " + count + " games.");
	};
	
	this.finishGame = function (key) {
		this.games[key].players[bot.irc.name] = {
			cards: []
		};
		while (this.sum(this.games[key].players[bot.irc.name].cards) < 17) {
			this.games[key].players[bot.irc.name].cards.push(this.cards[Math.floor(Math.random() * this.cards.length)]);
		}
		var winner = {name: bot.irc.name, points: this.sum(this.games[key].players[bot.irc.name].cards)};
		var scores = [];
		for (var k in this.games[key].players) {
			var score = this.sum(this.games[key].players[k].cards);
			scores.push(k + " (" + score + ")");
			if (score > winner.points) {
				winner.name = k;
				winner.points = score;
			} else if (score === winner.points) {
				winner.name += " and " + k;
			}
		}
		bot.ircClient.say(this.games[key].playIn, winner.name + " won with " + winner.points + " the following people played: " + scores.join(', '));
		this.games.splice(key, 1);
	};
	
	this.everyoneDone = function (obj) {
		for (var key in obj) {
			if (!obj[key].done) {
				return false;
			}
		}
		return true;
	};
	
	this.sum = function sum (arr) {
		var sum = 0, ones = 0;
		for (var key = 0; key < arr.length; key++) {
			if (arr[key] === 1) {
				sum += 11;
				ones++;
			} else {
				sum += arr[key];
			}
		}
		while (sum > 21 && ones > 0) {
			sum -= 10;
			ones--;
		}
		return sum;
	}
};