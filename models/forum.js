var handle = require('../models/error_handle');
var mongoose = require('mongoose');

var ForumSchema = mongoose.Schema({
	name: {
		type: String,
		index: true
	},
	alias: {
		type: String
	},
	moderator: {
		type: Array
	},
	sub_forum: {
		type: Array
	}
});

var Forum = module.exports = mongoose.model('forum', ForumSchema);

module.exports.createForum = function(newForum, callback){
	newForum.save(callback);
}

module.exports.getForumByName = function(name, callback){
	var query = {name: name};
	Forum.findOne(query, callback);
}

module.exports.getForumById = function(id, callback){
	Forum.findById(id, callback);
}

// Using promise - the better method
module.exports.getByName = function(name){
	var query = {name: name};
	return Forum.findOne(query).exec(handle.db_callback);
}

module.exports.getById = function(id){
	if (!mongoose.Types.ObjectId.isValid(id)) return Promise.reject("Invalid ID");
	return Forum.findById(id).exec(handle.db_callback);
}
