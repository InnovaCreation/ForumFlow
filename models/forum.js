var mongoose = require('mongoose');

var ForumSchema = mongoose.Schema({
	name: {
		type: String,
		index: true
	},
	moderator: {
		type: Object
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
