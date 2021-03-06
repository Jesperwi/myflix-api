const express = require('express');
const mongoose = require('mongoose');
const Models = require('./models.js');
const cors = require('cors');
const { check, validationResult } = require('express-validator');
const app = express();


const Movies = Models.Movie;
const Users = Models.User;     

mongoose.connect( process.env.CONNECTION_URI,
  { useNewUrlParser: true, useUnifiedTopology: true });

morgan = require('morgan');

bodyParser = require('body-parser');
  
app.use(bodyParser.json());

let auth = require('./auth.js')(app);

const passport = require('passport');  
require('./passport.js');

uuid = require('uuid');

app.use(express.static('public'));

app.use(morgan('common'));

app.use(cors());

 //cors usage
let allowedOrigins = ['http://localhost:8080', 'https://myflixangularjw.netlify.app/', 'https://myflixjw.netlify.app', 'http://localhost:1234', 'https://myflixjw.herokuapp.com/', 'http://localhost:4200', 'https://localhost:4200'];
/**
 * CORS is used as a security for the api.
 */
app.use(cors({
  origin: (origin, callback) => {
    if(!origin) return callback(null, true);
    if(allowedOrigins.indexOf(origin) === -1){ 
      let message = 'The CORS policy for this application doesn’t allow access from origin ' + origin;
      return callback(new Error(message ), false);
    }
    return callback(null, true);
  }
}));

//** GET requests from heroku api*/ 
app.get('/', (req, res) => { 
  res.send('Welcome to my myflix!');
});

//**GET request to get movies collection, password auth with JWT */ 
app.get('/movies', passport.authenticate('jwt', { session: false}), (req, res) => {
  Movies.find()
  .then((movies) => {
    res.status(201).json(movies);
  })
  .catch((err) => {
    console.error(err);
    res.status(500).send('Error: ' + err);
  });
});

//**GET request to get a single movie */ 
app.get('/movies/:Title', passport.authenticate('jwt', { session: false}), (req, res) => {
  Movies.findOne({ Title: req.params.Title})
    .then((movie) => {
      res.status(201).json(movie);
 })
   .catch((err) => {
     console.error(err);
     res.status(500).send('Error: ' + err);
 });
});

//** GET request to get one genre title from the api */
app.get('/movies/Genre/:Title', passport.authenticate('jwt', { session: false}), (req, res) => {
  Movies.findOne({ Title : req.params.Title})
    .then((movie) => {
      res.status(201).json("Genre: " + movie.Genre.Name + ".Description " + movie.Genre.Description);
 })
   .catch((err) => {
     console.error(err);
     res.status(500).send('Error: ' + err);
 });
});

//** GET request to get a directors name from the api */
app.get('/movies/Directors/:Name',  passport.authenticate('jwt', { session: false}), (req, res) => {
  Movies.findOne({ "Director.Name" : req.params.Name})
    .then((movie) => {
      res.status(201).json("Name: "+ movie.Director.Name + ". Bio: " + movie.Director.Bio + " Birth: " + movie.Director.Birth);
 })
   .catch((err) => {
     console.error(err);
     res.status(500).send('Error: ' + err);
 });
});

//** GET request that calls the users collection */
app.get('/users', passport.authenticate('jwt', { session: false}),(req, res)  => {
  Users.find()
    .then((users) => { 
      console.log(users)
      res.json(users);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});

//** Post request that creates a new user */
app.post('/users',
[
    check('Username', 'Username is required').isLength({min: 3}),
    check('Username', 'Username contains non alphanumeric characters - not allowed.').isAlphanumeric(),
    check('Password', 'Password is required').not().isEmpty(),
    check('Email', 'Email does not appear to be valid').isEmail()
], (req, res) => { 
  
  let errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() 
    });
  }
//** HashedPassword gets created */
  let hashedPassword = Users.hashPassword(req.body.Password);

  Users.findOne({ Username: req.body.Username })
    .then((user) => {
      if (user) {
        return res.status(400).send(req.body.Username + 'already exists');
      } else {
        Users
          .create({
            Username: req.body.Username,
            Password: hashedPassword,
            Email: req.body.Email,
            Birthday: req.body.Birthday
          })
          .then((user) =>{res.status(201).json(user) })
        .catch((error) => {
          console.error(error);
          res.status(500).send('Error: ' + error);
        })
      }
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send('Error: ' + error);
    });
});

//** GET request to get the specific user from the api */
app.get('/users/:Username',  (req, res) => {
  Users.findOne({ Username: req.params.Username })
    .then((user) => {
      res.json(user);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});

//** PUT request to edit a user in the api */
app.put('/users/:Username', (req, res) => {

  let hashedPassword = Users.hashPassword(req.body.Password);

  Users.findOneAndUpdate({ Username: req.params.Username }, { $set:
    {
      Username: req.body.Username,
      Password: hashedPassword,
      Email: req.body.Email,
      Birthday: req.body.Birthday
    }
  },
  { new: true }, // This line makes sure that the updated document is returned
  (err, updatedUser) => {
    if(err) {
      console.error(err);
      res.status(500).send('Error: ' + err);
    } else {
      res.json(updatedUser);
    }
  });
});

//** POST request the add a movie to the users api collection */
app.post('/users/:Username/movies/:MovieID', (req, res) => {
  Users.findOneAndUpdate({ Username: req.params.Username }, {
     $push: { FavoriteMovies: req.params.MovieID }
   },
   { new: true }, // This line makes sure that the updated document is returned
  (err, updatedUser) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error: ' + err);
    } else {
      res.json(updatedUser);
    }
  });
});

//** DELETE request that removes a movie from the users collection api */
app.delete('/users/:Username/movies/:MovieID', (req, res) => {
  Users.findOneAndUpdate({ Username: req.params.Username }, {
     $pull: { FavoriteMovies: req.params.MovieID }
   },
   { new: true }, // This line makes sure that the updated document is returned
  (err, updatedUser) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error: ' + err);
    } else {
      res.json(updatedUser);
    }
  });
});

//** DELETE request that removes the user from the users collection in the api */
app.delete('/users/:Username', (req, res) => {
  Users.findOneAndRemove({ Username: req.params.Username })
    .then((user) => {
      if (!user) {
        res.status(400).send(req.params.Username + ' was not found');
      } else {
        res.status(200).send(req.params.Username + ' was deleted.');
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});


//** mounting the middlewares function to see if everything is working */
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

//** listening for request and to make sure its working */
const port = process.env.PORT || 8080;
app.listen(port, '0.0.0.0', () => {
  console.log('Listening on Port' + port);
});