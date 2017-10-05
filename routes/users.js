var express = require('express');
var router = express.Router();
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

var User = require('../models/user');

// Register
router.get('/register', function(req, res){
	res.render('users/register');
});

// Login
router.get('/login', function(req, res){
	res.render('users/login');
});

// Register User
router.post('/register', function(req, res){
	var name = req.body.name;
	var email = req.body.email;
	var username = req.body.username;
	var password = req.body.password;
	var password2 = req.body.password2;

	var usernameRegex = /^[a-zA-Z0-9]+$/;

	// Validation
	req.checkBody('name', _.gettext('Name is required')).notEmpty();
	req.checkBody('email', _.gettext('Email is required')).notEmpty();
	req.checkBody('email', _.gettext('Email is not valid')).isEmail();
	req.checkBody('username', _.gettext('Username is required')).notEmpty();
	req.checkBody('username', _.gettext('Username can not contain special characters')).matches(usernameRegex);
	req.checkBody('password', _.gettext('Password is required')).notEmpty();
	req.checkBody('password2', _.gettext('Passwords do not match')).equals(req.body.password);

	var errors = req.validationErrors();

	if(errors){
		res.render('users/register',{
			errors:errors
		});
	} else {
		var newUser = new User({
			name: name,
			email:email,
			username: username,
			password: password
		});

		User.createUser(newUser, function(err, user){
			if(err) throw err;
			console.log(user);
		});

		req.flash('success_msg', _.gettext('You are registered and can now login'));

		res.redirect('/users/login');
	}
});

passport.use(new LocalStrategy(
	function(username, password, done) {
		User.getUserByUsername(username, function(err, user){
			if(err) throw err;
			if(!user){
				return done(null, false, {message: _.gettext('Unknown User')});
			}

			User.comparePassword(password, user.password, function(err, isMatch){
				if(err) throw err;
				if(isMatch){
					return done(null, user);
				} else {
					return done(null, false, {message: _.gettext('Invalid password')});
				}
			});
		});
	}
));

passport.serializeUser(function(user, done) {
	done(null, user.id);
});

passport.deserializeUser(function(id, done) {
	User.getUserById(id, function(err, user) {
		done(err, user);
	});
});

router.post('/login',
passport.authenticate('local', {successRedirect:'/', failureRedirect:'/users/login',failureFlash: true}),
function(req, res) {
	res.redirect('/');
});

router.get('/logout', function(req, res){
	req.logout();

	req.flash('success_msg', _.gettext('You are logged out'));

	res.redirect('/users/login');
});

module.exports = router;
