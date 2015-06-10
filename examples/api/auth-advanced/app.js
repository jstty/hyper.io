'use strict';

var hyper    = require('../../../index.js');

var express = require('express');
var passport = require('passport');
var BasicStrategy = require('passport-http');
var GoogleStrategy = require('passport-google').Strategy;


// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.  However, since this example does not
//   have a database of user records, the complete Google profile is serialized
//   and deserialized.
passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(obj, done) {
    done(null, obj);
});
// -------------------------



// -------------------------
passport.use(new BasicStrategy(
    {},
    function(username, password, done) {
        // asynchronous verification, for effect...
        process.nextTick(function () {

            var users = [
                { id: 1, username: 'bob', password: 'secret', email: 'bob@example.com' },
                { id: 2, username: 'joe', password: '123456', email: 'joe@example.com' }
            ];

            function findByUsername(username, fn) {
                for (var i = 0, len = users.length; i < len; i++) {
                    var user = users[i];
                    if (user.username === username) {
                        return fn(null, user);
                    }
                }
                return fn(null, null);
            }

            // Find the user by username.  If there is no user with the given
            // username, or the password is not correct, set the user to `false` to
            // indicate failure.  Otherwise, return the authenticated `user`.
            findByUsername(username, function(err, user) {
                if (err) { return done(err); }
                if (!user) { return done(null, false); }
                if (user.password != password) { return done(null, false); }
                return done(null, user);
            });
        });
    }
));

passport.use(new GoogleStrategy({
        returnURL: 'http://localhost:3000/auth/google/return',
        realm: 'http://localhost:3000/'
    },
    function(identifier, profile, done) {
        // asynchronous verification, for effect...
        process.nextTick(function () {
            profile.identifier = identifier;
            return done(null, profile);
        });
    }
));
// -------------------------


// -------------------------
var app = express.createServer();

// configure Express
app.configure(function() {
    app.use(express.logger());
    app.use(express.cookieParser());
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(express.session({ secret: 'keyboard cat' }));

    // -------------------------
    app.use(passport.initialize());
    app.use(passport.session());
    // -------------------------
});
// -------------------------

// -------------------------
// GET /auth/google
app.get('/auth/google',
    passport.authenticate('google', { failureRedirect: '/login' }),
    function(req, res) {
        res.redirect('/');
    });
// GET /auth/google/return
app.get('/auth/google/return',
    passport.authenticate('google', { failureRedirect: '/login' }),
    function(req, res) {
        res.redirect('/');
    });
// -------------------------


// -------------------------
app.get('/account', function(req, res) {
    if( !req.isAuthenticated() ) {
        return res.redirect('/login');
    }

    res.render('account', { user: req.user });
});
// -------------------------


// -------------------------
// curl -v -I http://127.0.0.1:3000/
// curl -v -I --user bob:secret http://127.0.0.1:3000/
app.get('/',
    // Authenticate using HTTP Basic credentials, with session support disabled.
    passport.authenticate('basic', { session: false }),

    function(req, res){
        res.json({ username: req.user.username, email: req.user.email });
    });

app.listen(3000);
