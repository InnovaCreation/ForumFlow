var express = require('express');
var router = express.Router();

var User = require('../models/user');
var Forum = require('../models/forum');
var Thread = require('../models/thread');
var Post = require('../models/post');

var app = require('../app');

// Get Homepage
router.get('/', function(req, res){
	Forum.getForumByName(req.app.locals.GConfig.RootForum.Name, function(err, f) {
		if (err) throw err;

		Thread.getThreadsByForum(f.id, function(err, t) {
			if (err) throw err;

			res.render('index', {
				req:req,
				threads:t,
			});
		});
	});
});

router.post('/thread_ajax', function(req, res) {
	var title = "";
	var owner = "";

	Thread.getThreadById(req.body.id, (err,t) => {
		if (err) throw err;
		if (t) {
			title = t.name;
			User.getUserById(t.owner, (err,u) => {
				if(err) throw err;
				res.render('partials/thread_ajax', {
					title:title,
					id:req.body.id,
					owner:u.name,
					layout:false
				});
			});
		} else {
			res.send('');
		}
	});
});

router.get('/thread', function(req, res){
	Post.getPostsByThread(req.query.id, function(err, p) {
		if (err) throw err;
		if (p) {
			Thread.getThreadById(req.query.id, (err,t) => {
				res.render('thread/thread', {
					req:req,
					posts:p,
					title:t.name
				});
			})
		} else {
			res.redirect('/');
		}
	});
});

router.post('/post_ajax', function(req, res) {
	var author = "";
	var content = "";

	Post.getPostById(req.body.id, (err,p) => {
		if (err) throw err;
		content = p.post;
		User.getUserById(p.owner, (err,u) => {
			if(err) throw err;
			res.render('partials/post_ajax', {
				content:content,
				author:u.name,
				layout:false
			});
		});
	});
});

router.get('/new_thread', function(req, res){
	Forum.getForumByName(req.app.locals.GConfig.RootForum.Name, function(err, f) {
		if (err) throw err;
		res.render('thread/new_thread', {
			forum:f
		});
	});
});

router.post('/new_thread', function(req, res){
	if (req.user) {
		var title = req.body.title;
		var content = req.body.content;
		var forum = req.body.forum;
		var user = req.user;

		// Validation
		req.checkBody('title', 'Title can not be empty').notEmpty();
		req.checkBody('content', 'Email can not be empty').notEmpty();

		var errors = req.validationErrors();

		if(errors){
			res.render('users/register',{
				errors:errors
			});
		} else {
			var newThread = new Thread({
				forum: forum,
				owner: user.id,
				name : title
			});

			Thread.createThread(newThread, function(err,t) {
				if (err) throw err;
				var firstPost = new Post({
					thread: t.id,
					owner : user.id,
					post  : content
				});

				Post.createPost(firstPost, function(err,t) {
					if (err) throw err;
					console.log("Create thread " + t.id.toString());

					res.redirect('/');
				});
			});
		}
	} else {
		req.flash('error_msg', 'You need to login first.');

		res.redirect('/users/login');
	}
});

module.exports = router;
