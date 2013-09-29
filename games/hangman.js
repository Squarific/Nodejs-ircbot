exports = function HangMan (bot) {
	this.games = [];
	this.words = ["ball", "lol", "congrats", "leetspeak", "irc", "yomomma"];
	this.cleanUp = function () {
		for (var key = 0; key < this.games.length; key++) {
			if (this.games[key].lastAction < Date.now() - 300000) {
				bot.ircClient.say(owner, "Your hangman game was disbanded because there was no action for 5 minutes.");
				bot.ircClient.say(playIn, "Your hangman game was disbanded because there was no action for 5 minutes.");
			}
		}
	}
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
	this.wordWhenLettersGuessed = function (word, letters) {
		var returnWord = "";
		for (var key = 0; key < word.length; key++) {
			if (this.inArray(word[key], letters)) {
				returnWord += word[key] + " ";
			} else {
				returnWord += "_ "
			}
		}
		return returnWord;
	};
	this.wordGuessed = function (word, letters) {
		for (var key = 0; key < word.length; key++) {
			if (!this.inArray(word[key], letters)) {
				return false;
			}
		}
		return true;
	};
	this.start = function (from, command) {
		for (var key = 0; key < this.games.length; key++) {
			if (this.games[key].owner === from && this.games[key].playIn === command[0] ||
				this.games[key].playIn === from && this.games[key].owner === command[0]) {
				bot.ircClient.say(from, "You are already playing a game with " + command[0] + " finish that game first or disband it with 'hangman disband' or wait 5 minutes till the game disbands itself.");
			}
		}
		var word;
		if (command[1] === "randomword") {
			word = this.words[Math.floor(Math.random * this.words.length)];
		} else {
			word = command[1];
		}
		if (!word || word === "" || word === " " || !command[0] || command[0] === "") {
			bot.ircClient.say(from, "You need to provide a channel or username as first argument and a word (or 'randomword') as second argument.");
		} else {
			this.games.push({
				owner: from,
				lastAction: Date.now(),
				playIn: command[0],
				accepted: false,
				tried: [],
				guessesLeft: command[2] || 8,
				word: word
			});
			bot.ircClient.say(from, "You have succesfully invited " + command[0] + " to play a game of hangman with you.");
			bot.ircClient.say(command[0], from + " has invited you to play hangman, if you want to play say: 'hangman accept'");
		}
	};
	this.commands = {};
	this.commands.start = this.start.bind(this);
	this.commands.disband = function (from, to, message, command) {
		var count = 0;
		if (!command[0]) {
			for (var key = 0; key < this.games.length; key++) {
				if (this.games[key].owner === from) {
					this.games[key].splice(key, 1);
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
			if (this.games[key].playIn === from || (this.games[key].playIn === to && to !== bot.name)) {
				this.games[key].accepted = true;
				bot.ircClient.say("You succesfully accepted a game from " + this.games[key].owner);
				bot.ircClient.say("The word you have to guesse:" + new Array(this.games[key].word.length + 1).join(' _') + " you have " + this.games[key].guessesLeft + " guesses to get it.");
				accepted = true;
			}
		}
		if (!accepted) {
			bot.ircClient.say("Sorry " + from + ", no game to accept :/ maybe you can invite someone?");
		}
	}.bind(this);
	this.commands.guesse = function (from, to, message, command) {
		var guessed = false;
		for (var key = 0; key < this.games.length; key++) {
			if ((this.games[key].playIn === from || this.games[key].playIn === to) && (!command[1] || command[1] === this.games.playIn || command[1] === this.games.owner)) {
				if (command[0].length === 1) {
					this.games[key].tried.push(command[0]);
				}
				if (command[0] === this.games[key].word || this.wordGuessed(this.games[key].word, this.games[key].tried)) {
					bot.ircClient.say(this.games[key].playIn, "Congratulations " + from + " you guessed the word '" + this.games[key].word + "' correctly with still " + this.games[key].guessesLeft + " guesses left.");
				} else if(command[0].length === 1 && this.letterInWord(this.games[key].word, command[0])) {
					bot.ircClient.say(this.games[key].playIn, "Good " + from + ", " + commmand[0] + " was right, the current word is: " + this.wordWhenLettersGuessed(this.games[key].word, this.games[key].tried) + " and you have" + this.games[key].guessesLeft + " guesses left.");
				} else {
					bor.ircClient.say(this.games[key].playIn, "Ouch " + from + ", " + command[0] + " isn't right, the current word is: " + this.wordWhenLettersGuessed(this.games[key].word, this.games[key].tried) + " and you have " + this.games[key].guessesLeft + " guesses left.");
				}
			}
		}
		if (!guessed) {
			this.games[key].guessesLeft--;
			if (this.games[key].guessesLeft < 1) {
				bot.ircClient.say(this.games[key].playIn, "Sorry " + from + ", but you have no more guesses left. The word was: " + this.games[key].word);
				this.games.splice(key, 1);
			} else {
				bot.ircClient.say(this.games[key].playIn, "Sorry " + from + ", but I couldn't let you guesse, are you sure you are playing with someone?");
			}
		}
	};
	this.commands.help = function (from, to, message, command) {
		bot.ircClient.say(from, "You can start a game by saying: hangman start [channel/username] [word OR 'randomword']");
	}.bind(this);
};