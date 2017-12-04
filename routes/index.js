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

function forum_page(req,res,fname) {
	var f;

	Forum.getByName(fname)
	.then((forum) => {
		f = forum;

		var order = '-updatedAt';
		if (req.query.order)
			order = req.query.order;
		return Thread.getByForumSorted(forum.id, order);
	}, handle.promise_reject)
	.then((thread) => {
		res.render('forum/forum', {
			req:req,
			threads:thread,
			forum:f,
			forum_display_name: f.alias ? f.alias : f.name,
			layout:false
		});
	}, handle.promise_reject).then(null, handle.promise_reject_end);
}

function forum_session(req,res,fname) {
	res.render('index', {
		req:req,
		type:"forum",
		id:fname
	});
}

function thread_page(req,res,tid) {
	var post, thread;

	var order = 'floor';
	if (req.query.order) order = req.query.order;
	Post.getByThreadSorted(tid, order).then((p) => {
		// Get the posts list in the thread
		if (!p) return Promise.reject();
		post = p;
		// Get the thread itself
		return Thread.getById(tid);
	}, handle.promise_reject).then((t) => {
		thread = t;
		// Get the forum it belongs to
		return Forum.getById(thread.forum);
	}, handle.promise_reject).then((f) => {
		// render
		res.render('thread/thread', {
			req:req,
			posts:post,
			title:thread.name,
			thread:thread,
			forum:f,
			forum_display_name: f.alias ? f.alias : f.name,
			layout:false
		});
	}, handle.promise_reject).then(null, ()=>{
		res.redirect('/');
	});
}

function thread_session(req,res,tid) {
	res.render('index', {
		req:req,
		type:"thread",
		id:tid
	});
}

function thread_reply_page(req, res, id){
	if (id) {
		Thread.getById(id).then((t) => {
			res.render('thread/new_post', {
				thread:t,
				layout:false
			});
		}, handle.promise_reject_end);
	} else {
		res.redirect('/');
	}
}

function thread_reply(req,res,content,thread,user){
	// Reject illegal case
	if (!thread || !user) {
		res.json({FFstate:"api_call_illegal"});
		return;
	}

	// Validation
	req.checkBody('content', _.gettext('Content can not be empty')).notEmpty();

	var errors = req.validationErrors();

	if(errors){
		res.json({FFstate:"errors", errors:errors});
	} else {
		Thread.getById(thread).then((t) => {
			if (!t) {
				errors = [{msg:"Thread not found"}];
				return Promise.reject();
			}
			return new_post(t, user, content);
		}, handle.promise_reject).then((p) => {
			console.log("Create post " + p.id.toString() + " floor   " + p.floor);

			res.json({FFstate:"ok", pid:p.id});
		}, (err) => {
			console.log(err);
			res.json({FFstate:"errors", errors:errors});
		});
	}
}

// Get (session)
router.get('/', function(req, res){
	if (req.query) {
		// Has query, let's take a look
		if (req.query.forum) { forum_session(req,res,req.query.forum); return; }
		if (req.query.thread) { thread_session(req,res,req.query.thread); return; }
	}
	// Show default root forum
	console.log("Showing root forum");
	forum_session(req,res,req.app.locals.GConfig.RootForum.Name);
});

// POST (ajax)
router.post('/ajax', function(req, res){
	// Has query, let's take a look
	console.debug("[POST]");
	console.debug(req.body);

	// Page view request
	if (req.body.forum) { forum_page(req,res,req.body.forum); return; }
	if (req.body.thread) { thread_page(req,res,req.body.thread); return; }
	if (req.body.reply_thread) { thread_reply_page(req,res,req.body.reply_thread); return; }
});

// POST API (ajax)
router.post('/api', function(req, res){
	// Has query, let's take a look
	console.debug("[POST API]");
	console.debug(req.body);

	// API Action
	if (req.body.reply_thread) { thread_reply(req, res, req.body.content, req.body.reply_thread, req.user); return; }
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
			req.flash('error_msg', _.gettext('You need to be the owner of that thread'));
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
				created_at:dateformat(p.createdAt, _.gettext("yyyy-mm-dd HH:MM"))
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

function new_post(thread, owner, content) {
	thread.last_floor ++;
	if (!thread.last_floor) thread.last_floor = 0;

	var p = new Post({
		thread: thread.id,
		owner : owner.id,
		post  : content,
		floor : thread.last_floor
	});

	thread.save();

	Post.createPost(p);

	return p;
}

router.post('/new_thread', function(req, res){
	if (req.user) {
		var title = req.body.title;
		var content = req.body.content;
		var forum = req.body.forum;
		var user = req.user;

		// Validation
		req.checkBody('title', _.gettext('Title can not be empty')).notEmpty();
		req.checkBody('content', _.gettext('Content can not be empty')).notEmpty();

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

				new_post(t, user, content).then((t) => {
					console.log("Create thread " + t.id.toString());

					res.redirect('/');
				}, handle.promise_reject_end);
			});
		}
	} else {
		req.flash('error_msg', _.gettext('You need to login first.'));

		res.redirect('/users/login');
	}
});

module.exports = router;
