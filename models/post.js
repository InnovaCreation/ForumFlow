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
