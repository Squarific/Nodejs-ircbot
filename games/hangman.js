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
	this.start = function (from, command) {
		var word;
		if (command[1] === "randomword") {
			word = this.words[Math.floor(Math.random * this.words.length)];
		} else {
			word = command[1];
		}
		this.games.push({
			owner: from,
			lastAction: Date.now(),
			playIn: command[0],
			accepted: false,
			word: word
		});
		bot.ircClient.say(command[0], from + " has invited you to play hangman, if you want to play say: 'hangman accept'");
	};
	this.commands = {};
	this.commands.start = this.start.bind(this);
	this.commands.disband = function (from, to, message, command) {
		
	}.bind(this);
	this.commands.accept = function (from, to, message, command) {
		
	}.bind(this);
	this.commands.help = function (from, to, message, command) {
		
	}.bind(this);
};