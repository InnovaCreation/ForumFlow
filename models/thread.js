var mongoose = require('mongoose');

var ThreadSchema = mongoose.Schema({
	forum: {
		type: Object,
		index: true
	},
	owner: {
		type: Object
	},
	name: {
		type: String
	},
	last_floor: {
		type: Number
	}
});

var Thread = module.exports = mongoose.model('thread', ThreadSchema);

module.exports.createThread = function(newThread, callback){
	newThread.last_floor = 0;
	newThread.save(callback);
}

module.exports.getThreadsByForum = function(forum,callback){
	Thread.find({forum:forum}, callback);
}

module.exports.getThreadById = function(id, callback){
	Thread.findById(id, callback);
}
