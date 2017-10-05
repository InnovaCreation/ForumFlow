var express = require('express');
var router = express.Router();

var md = require('markdown-it')()
	.use(require('markdown-it-katex'))
	.use(require('markdown-it-emoji'))
	.use(require('markdown-it-footnote'))
	.use(require('markdown-it-deflist'))
	.use(require('markdown-it-html5-embed'), {
	  html5embed: {
	  useImageSyntax: true, // Enables video/audio embed with ![]() syntax (default)
	  useLinkSyntax: true   // Enables video/audio embed with []() syntax
	}})
	.use(require("markdown-it-block-image"), {
	  outputContainer: true,
	  containerClassName: "uk-flex uk-flex-center uk-width-1-3@lg uk-width-1-2@m uk-width-5-6@s"
	});

var handle = require('../models/error_handle');

var User = require('../models/user');
var Forum = require('../models/forum');
var Thread = require('../models/thread');
var Post = require('../models/post');

var app = require('../app');

// Get Homepage
router.get('/', function(req, res){
	var f;

	Forum.getByName(req.app.locals.GConfig.RootForum.Name)
	.then((forum) => {
		f = forum;
		return Thread.getByForum(forum.id);
	}, handle.promise_reject)
	.then((thread) => {
		res.render('index', {
			req:req,
			threads:thread,
			forum:f
		});
	}, handle.promise_reject);
});

router.post('/thread_ajax', function(req, res) {
	var title = "";
	var owner = "";

	var thread = null;
	var forum = null;

	Thread.getById(req.body.id).then((t) => {
		// Get thread
		thread = t;
		if (!thread) return Promise.reject();
		title = thread.name;
		return Forum.getById(thread.forum);
	}, handle.promise_reject).then((f) => {
		// Get forum
		forum = f;
		return User.getById(thread.owner);
	}, handle.promise_reject).then((u) => {
		// Get user
		var current_user = req.user ? req.user.id : null;
		var remove_flag = (forum.moderator == current_user || thread.owner == current_user);
		res.render('partials/thread_ajax', {
			title:title,
			id:req.body.id,
			owner:u.name,
			remove_flag:remove_flag,
			layout:false
		});
	}, handle.promise_reject).then(null, ()=>{
		res.send('');
	});
});

router.get('/thread', function(req, res){
	var post;
	Post.getByThread(req.query.id).then((p) => {
		if (!p) return Promise.reject();
		post = p;
		return Thread.getById(req.query.id);
	}, handle.promise_reject).then((t) => {
		res.render('thread/thread', {
			req:req,
			posts:post,
			title:t.name,
			thread:t
		});
	}, handle.promise_reject).then(null, ()=>{
		res.redirect('/');
	});
});

router.get('/remove_thread', function(req, res){
	if (!req.query.id) res.redirect('/');

	var thread;

	Thread.getById(req.query.id).then((t) => {
		thread = t;
		if (!thread) return Promise.reject();
		return Forum.getById(t.forum);
	}, handle.promise_reject).then((f) => {
		if (!f) return Promise.reject();
		if (req.user.id == thread.owner || req.user.id == f.moderator) {
			thread.remove();
			return Post.getByThread(thread.id);
		} else {
			req.flash('error_msg', 'You need to be the owner of that thread');
			return Promise.reject();
		}
	}, handle.promise_reject).then((p) => {
		if (p) p.forEach((post) => { post.remove(); });
		console.log("Remove thread " + thread.id.toString());
		res.redirect('/');
	}, handle.promise_reject).then(null, () => {
		res.redirect('/');
	});
});

var dateformat = require('dateformat');

router.post('/post_ajax', function(req, res) {
	var author = "";
	var content = "";

	Post.getPostById(req.body.id, (err,p) => {
		if (err) throw err;
		content = md.render(p.post);
		User.getUserById(p.owner, (err,u) => {
			if(err) throw err;
			res.render('partials/post_ajax', {
				content:content,
				author:u.name,
				layout:false,
				post:p,
				created_at:dateformat(p.createdAt, "yyyy-mm-dd HH:MM")
			});
		});
	});
});

router.get('/new_thread', function(req, res){
	if (req.query.id) {
		Forum.getForumById(req.query.id, function(err, f) {
			if (err) throw err;
			res.render('thread/new_thread', {
				forum:f
			});
		});
	} else {
		res.redirect('/');
	}
});

function new_post(thread, owner, content, callback) {
	thread.last_floor ++;
	if (!thread.last_floor) thread.last_floor = 0;

	var firstPost = new Post({
		thread: thread.id,
		owner : owner.id,
		post  : content,
		floor : thread.last_floor
	});

	console.log(firstPost);
	thread.save();

	Post.createPost(firstPost, callback);
}

router.post('/new_thread', function(req, res){
	if (req.user) {
		var title = req.body.title;
		var content = req.body.content;
		var forum = req.body.forum;
		var user = req.user;

		// Validation
		req.checkBody('title', 'Title can not be empty').notEmpty();
		req.checkBody('content', 'Content can not be empty').notEmpty();

		var errors = req.validationErrors();

		if(errors){
			res.render('thread/new_thread',{
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

				new_post(t, user, content, function(err,t) {
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

router.get('/new_post', function(req, res){
	if (req.query.id) {
		Thread.getThreadById(req.query.id, function(err, t) {
			if (err) throw err;
			res.render('thread/new_post', {
				thread:t
			});
		});
	} else {
		res.redirect('/');
	}
});

router.post('/new_post', function(req, res){
	if (req.user) {
		var content = req.body.content;
		var thread = req.body.thread;
		var user = req.user;

		// Validation
		req.checkBody('content', 'Content can not be empty').notEmpty();

		var errors = req.validationErrors();

		if(errors){
			res.render('/new_post',{
				errors:errors
			});
		} else {
			Thread.getThreadById(thread, (err,t) => {
				if (err) throw err;
				if (!t) res.redirect('/');
				new_post(t, user, content, function(err,p) {
					if (err) throw err;
					console.log("Create post " + p.id.toString() + " floor   " + p.floor);

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
