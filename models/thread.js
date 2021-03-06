var handle = require('../models/error_handle');
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
}, {timestamps: true});

var Thread = module.exports = mongoose.model('thread', ThreadSchema);

module.exports.getThreadsByForum = function(forum,callback){
	Thread.find({forum:forum}, callback);
}

module.exports.getThreadById = function(id, callback){
	Thread.findById(id, callback);
}

// Promise
module.exports.createThread = function(newThread){
	newThread.last_floor = 0;
	return newThread.save();
}

module.exports.getByForum = function(forum){
	return Thread.find({forum:forum}).exec(handle.db_callback);
}

module.exports.getByForumSorted = function(forum, sort){
	return Thread.find({forum:forum}).sort(sort).exec(handle.db_callback);
}

module.exports.getById = function(id){
	if (!mongoose.Types.ObjectId.isValid(id)) return Promise.reject("Invalid ID");
	return Thread.findById(id).exec(handle.db_callback);
}
