/**
 * Copyright 2017 Cheng Cao <bobcaocheng@gmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Load our weapons
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const hbs = require('express-handlebars');
const expressValidator = require('express-validator');
const flash = require('connect-flash');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const mongo = require('mongodb');
const mongoose = require('mongoose');

// Load global config
const GlobalConfig = require(path.join(__dirname, 'data/config.json'))

// Connect to database
mongoose.connect(GlobalConfig.DB.Connection + GlobalConfig.DB.Name);
var db = mongoose.connection;

// Setup app
var routes = require('./routes/index');
var users = require('./routes/users');

// Init weapon
var app = express();

// View Engine
app.set('views', path.join(__dirname, 'views'));
app.engine('hbs', hbs({
	defaultLayout:'default',
	extname: '.hbs',
	helpers: {}
}));
app.locals.GConfig = GlobalConfig;
app.set('view engine', 'hbs');

// BodyParser Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

// Set Static Folder
app.use(express.static(path.join(__dirname, 'static')));

// Express Session
app.use(session({
	secret: GlobalConfig.Server.ExpressSecret,
	saveUninitialized: true,
	resave: true
}));

// Passport init
app.use(passport.initialize());
app.use(passport.session());


// Express Validator
app.use(expressValidator({
	errorFormatter: function(param, msg, value) {
		var namespace = param.split('.')
		  , root    = namespace.shift()
		  , formParam = root;

		while(namespace.length) {
			formParam += '[' + namespace.shift() + ']';
		}
		return {
			param : formParam,
			msg   : msg,
			value : value
		};
	}
}));

// Connect Flash
app.use(flash());

// Global Vars
app.use(function (req, res, next) {
	res.locals.success_msg = req.flash('success_msg');
	res.locals.error_msg = req.flash('error_msg');
	res.locals.error = req.flash('error');
	res.locals.user = req.user || null;
	next();
});

// Final setup
app.use('/', routes);
app.use('/users', users);

// Set Port
app.set('port', (process.env.PORT || GlobalConfig.Server.Port));

app.listen(app.get('port'), function(){
	console.log('Server started on port '+app.get('port'));
});
