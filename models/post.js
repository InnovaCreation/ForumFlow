var handle = require('../models/error_handle');
var mongoose = require('mongoose');

var PostSchema = mongoose.Schema({
	thread: {
		type: Object,
		index: true
	},
	owner: {
		type: Object
	},
	post: {
		type: String
	},
	floor: {
		type: Number
	}
}, { timestamps: true});

var Post = module.exports = mongoose.model('post', PostSchema);

module.exports.createPost = function(newPost, callback){
	newPost.save(callback);
}

module.exports.getPostsByThread = function(thread,callback){
	Post.find({thread:thread}, callback);
}

module.exports.getPostById = function(id, callback){
	Post.findById(id, callback);
}

// Promise
module.exports.getByThread = function(thread){
	return Post.find({thread:thread}).exec(handle.db_callback);
}

module.exports.getById = function(id){
	if (!mongoose.Types.ObjectId.isValid(id)) return Promise.reject("Invalid ID");
	return Post.findById(id).exec(handle.db_callback);
}
