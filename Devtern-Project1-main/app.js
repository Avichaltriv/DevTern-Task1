//jshint esversion:6

require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
//const GoogleStrategy = require('passport-google-oauth20').Strategy;


const findOrCreate = require('mongoose-findorcreate');
const http = require('http'); //new
const socketio = require('socket.io');//new
const path = require('path');//new

const app = express();
//const oAuth2Client = new OAuth2Client(); //new1
//let aud; //new1


const server = http.createServer(app); //new
const io = socketio(server);//new

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
  secret: "OpenSpace",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());




mongoose.connect("mongodb://127.0.0.1:27017/userDB", {useNewUrlParser: true, useUnifiedTopology: true});
mongoose.set("useCreateIndex", true);
const Message = mongoose.model('Message', { name: String, message: String });//new
const userSchema = new mongoose.Schema ({
  email: String,
  password: String,
  googleId: String
});
const postSchema = new mongoose.Schema ({
  title: String,
  content: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);
const Post = new mongoose.model("Post", postSchema); 

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

app.get("/", function(req, res){
  res.render("home");
});

app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile"] })
);

app.get("/auth/google/blogs",
  passport.authenticate('google', { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect to blogs.
    res.redirect("/blogs");
  });

app.get("/login", function(req, res){
  res.render("login");
});

app.get("/register", function(req, res){
  res.render("register");
});




app.get("/accounts",function(req,res){
  res.render("accounts");

});





app.get("/blogs", function(req, res){
  User.find({"secret": {$ne: null}}, function(err, foundUsers){
    if (err){
      console.log(err);
    } else {
      if (foundUsers) {
        res.render("blogs", {usersWithblogs: foundUsers});
      }
    }
  });
});

app.get("/all", function(req, res){

  Post.find({}, function(err, posts){
    res.render("all", {
      posts: posts
      });
  });
});

app.get("/submit", function(req, res){
  if (req.isAuthenticated()){
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});

app.post("/submit", function(req, res){

const post = new Post({
  title: req.body.postTitle,
  content: req.body.postBody
});


post.save(function(err){
  if (!err){
      res.redirect("/blogs");
  } else {
    res.redirect("/");
  }
});
});

app.get("/posts/:postId", function(req, res){

  const requestedPostId = req.params.postId;
  
    Post.findOne({_id: requestedPostId}, function(err, post){
      res.render("post", {
        title: post.title,
        content: post.content
      });
    });
  
  });

app.get("/logout", function(req, res){
  res.redirect("/");
});

app.post("/register", function(req, res){

  User.register({username: req.body.username}, req.body.password, function(err, user){
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/blogs");
      });
    }
  });

});

app.post("/login", function(req, res){

  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err){
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/blogs");
      });
    }
  });

});


io.on('connection', socket => {
  console.log('a user connected');

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });

  socket.on('chat message', async msg => {
    const message = new Message(msg);
    await message.save();
    io.emit('chat message', msg);
  });
});


app.get('/index', async (req, res) => {
  const messages = await Message.find();
  res.render('index', { messages }); // Pass messages to the template
});


app.listen(3000, function() {
  console.log("Server started on port 3000.");
});
