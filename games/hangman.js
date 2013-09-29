exports.construct = function HangMan (bot) {
	this.games = [];
	this.words = ["ball", "butterfly", "leetspeak", "irc", "node"];
	this.cleanUp = function () {
		for (var key = 0; key < this.games.length; key++) {
			if (this.games[key].lastAction < Date.now() - 300000) {
				bot.ircClient.say(owner, "Your hangman game was disbanded because there was no action for 5 minutes.");
				bot.ircClient.say(playIn, "Your hangman game was disbanded because there was no action for 5 minutes.");
			}
		}
	}

	this.start = function (from, command) {
		for (var key = 0; key < this.games.length; key++) {
			if (this.games[key].owner === from && this.games[key].playIn === command[0] ||
				this.games[key].playIn === from && this.games[key].owner === command[0]) {
				bot.ircClient.say(from, "You are already playing a game with " + command[0] + " finish that game first or disband it with 'hangman disband' or wait 5 minutes till the game disbands itself.");
				return;
			}
		}
		var word;
		if (command[1] === "randomword") {
			word = this.words[Math.floor(Math.random() * this.words.length)];
		} else {
			word = command[1];
		}
		if (!word || word === "" || word === " " || !command[0] || command[0] === "") {
			console.log(from, command, word);
			bot.ircClient.say(from, "You need to provide a channel or username as first argument and a word (or 'randomword') as second argument.");
		} else {
			this.games.push({
				owner: from,
				lastAction: Date.now(),
				playIn: command[0],
				accepted: false,
				tried: [],
				guesssLeft: parseInt(command[2]) || 8,
				word: word
			});
			bot.ircClient.say(from, "You have succesfully invited " + command[0] + " to play a game of hangman with you.");
			bot.ircClient.say(command[0], from + " has invited you to play hangman, if you want to play say: 'hangman accept'");
		}
	};
	this.commands = {};
	this.commands.disband = function (from, to, message, command) {
		var count = 0;
		if (!command[0]) {
			for (var key = 0; key < this.games.length; key++) {
				if (this.games[key].owner === from) {
					bot.ircClient.say(this.games[key].playIn, from + " disbanded your game.");
					this.games.splice(key, 1);
					key--;
					count++;
				}
			}
			bot.ircClient.say(from, "Succesfully disbanded " + count + " games that you started (if you only want to leave a specific game say you can add the name of the player you are playing with as argument).");
		} else {
			for (var key = 0; key < this.games.length; key++) {
				if (this.games[key].owner === from && this.games[key].playIn === command[0] ||
					this.games[key].playIn === from && this.games[key].owner === command[0]) {
					this.games[key].splice(key, 1);
					key--;
					count++;
				}
			}
			bot.ircClient.say(from, "Succesfully disbanded your game with " + command[0]);
		}
	}.bind(this);
	this.commands.accept = function (from, to, message, command) {
		var accepted = false;
		for (var key = 0; key < this.games.length; key++) {
			if (this.games[key].playIn === from || (this.games[key].playIn === to && to !== bot.irc.name)) {
				this.games[key].accepted = true;
				bot.ircClient.say(this.games[key].playIn, "You succesfully accepted a game from " + this.games[key].owner + " say 'hangman guess [letter/word]' to guess.");
				bot.ircClient.say(this.games[key].playIn, "The word you have to guess:" + new Array(this.games[key].word.length + 1).join(' _') + " you have " + this.games[key].guesssLeft + " guesss to get it.");
				accepted = true;
			}
		}
		if (!accepted) {
			bot.ircClient.say(from, "Sorry " + from + ", no game to accept :/ maybe you can invite someone?");
		}
	}.bind(this);
	this.commands.games = function () {
		console.log(this.games);
	}.bind(this);
	this.commands.guess = function (from, to, message, command) {
		var guessd = false;
		for (var key = 0; key < this.games.length; key++) {
			if ((this.games[key].playIn === from || this.games[key].playIn === to) && (!command[1] || command[1] === this.games.playIn || command[1] === this.games.owner)) {
				guessd = true;
				if (command[0].length === 1) {
					if (this.inArray(command[0], this.games[key].tried)) {
						bot.ircClient.say(this.games[key].playIn, "The letter " + this.games[key].tried + " has already been guessd.");
						continue;
					}
					this.games[key].tried.push(command[0]);
				}
				if (command[0] === this.games[key].word || this.wordguessd(this.games[key].word, this.games[key].tried)) {
					bot.ircClient.say(this.games[key].playIn, "Congratulations " + from + " you guessd the word '" + this.games[key].word + "' correctly with still " + this.games[key].guesssLeft + " guesss left.");
					this.games.splice(key, 1);
				} else if(command[0].length === 1 && this.letterInWord(this.games[key].word, command[0])) {
					bot.ircClient.say(this.games[key].playIn, "Good " + from + ", " + command[0] + " was right, the current word is: " + this.wordWhenLettersguessd(this.games[key].word, this.games[key].tried) + " and you have " + this.games[key].guesssLeft + " guesss left.");
				} else {
					this.games[key].guesssLeft--;
					if (this.games[key].guesssLeft < 1) {
						bot.ircClient.say(this.games[key].playIn, "Sorry " + from + ", but you have no more guesss left. The word was: " + this.games[key].word);
						this.games.splice(key, 1);
					} else {
						bot.ircClient.say(this.games[key].playIn, "Ouch " + from + ", " + command[0] + " isn't right, the current word is: " + this.wordWhenLettersguessd(this.games[key].word, this.games[key].tried) + " and you have " + this.games[key].guesssLeft + " guesss left.");
					}
				}
			}
		}
		if (!guessd) {
			bot.ircClient.say(from, "Sorry " + from + ", but I couldn't let you guess, are you sure you are playing with someone?");
		}
	}.bind(this);
	this.commands.help = function (from, to, message, command) {
		bot.ircClient.say(from, "You can start a game by saying: hangman start [channel/username] [word OR 'randomword']");
	}.bind(this);
	
	this.letterInWord = function (word, letter) {
		return this.inArray(letter, word);
	};
	this.inArray = function (el, arr) {
		for (var key = 0; key < arr.length; key++) {
			if (arr[key] === el) {
				return true;
			}
		}
		return false;
	};
	this.wordWhenLettersguessd = function (word, letters) {
		var returnWord = "";
		for (var key = 0; key < word.length; key++) {
			if (this.inArray(word[key], letters)) {
				returnWord += word[key] + " ";
			} else {
				returnWord += "_ ";
			}
		}
		return returnWord;
	};
	this.wordguessd = function (word, letters) {
		for (var key = 0; key < word.length; key++) {
			if (!this.inArray(word[key], letters)) {
				return false;
			}
		}
		return true;
	};
};