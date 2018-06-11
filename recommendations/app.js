/**
 * This is an example of a basic node.js script that performs
 * the Authorization Code oAuth2 flow to authenticate against
 * the Spotify Accounts.
 *
 * For more information, read
 * https://developer.spotify.com/web-api/authorization-guide/#authorization_code_flow
 */

var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
const secrets = require('./secrets');

// TODO: Set these via environment variables.
var client_id = '33698d56449e4a8c9226f27573756d16'; // Your client id
var client_secret = secrets.spotifyClientSecret; // Your secret
// This URI must be whitelisted in the settings page of the Spotify applications UI.
// https://developer.spotify.com/dashboard/applications/33698d56449e4a8c9226f27573756d16.
var redirect_uri = 'http://localhost:8888/callback'; // Your redirect uri

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

var stateKey = 'spotify_auth_state';

var app = express();

app.use(express.static(__dirname + '/public'))
   .use(cors())
   .use(cookieParser());

const mockRecommendations = [
  {
    id: '1301WleyT98MSxVHPZCA6M',
    name: 'Piano Sonata No. 2 in B-Flat Minor, Op. 35: Grave; Doppio movimento',
    country: 'Poland',
    artists: [
      {
        name: 'Frederic Chopin',
        id: 'artist_id',
      },
    ],
  },
  {
    id: '4iV5W9uYEdYUVa79Axb7Rh',
    name: 'Prelude for Piano No. 11 in F-Sharp Minor',
    country: 'Russia',
    artists: [
      {
        name: 'Eduard Abramyan',
        id: 'artist_id',
      },
    ],
  },
];

app.get('/api/recommendation/:seed', function(req, res) {
  const userTrackId = req.params.seed;
  if (userTrackId === 'error') {
    res.status(500).json({
      type: 'error',
      message: 'error',
    });
    return;
  }
  res.json({
    tracks: mockRecommendations
  });
});

app.get('/login', function(req, res) {
  const state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  const scope = 'user-read-private user-read-email';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id,
      scope,
      redirect_uri,
      state,
    }));
});

app.get('/callback', function(req, res) {

  // your application requests refresh and access tokens
  // after checking the state parameter

  const code = req.query.code || null;
  const state = req.query.state || null;
  const storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(stateKey);
    const authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code,
        redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {
      if (error || response.statusCode !== 200) {
        res.redirect('/#' +
          querystring.stringify({
            error: 'invalid_token'
          }));
        return;
      }

      var options = {
        url: 'https://api.spotify.com/v1/me',
        headers: { 'Authorization': 'Bearer ' + body.access_token },
        json: true
      };

      // use the access token to access the Spotify Web API
      request.get(options, function(error, response, body) {
        console.log(body);
      });

      // we can also pass the token to the browser to make requests from there
      res.redirect('/#' +
        querystring.stringify({
          access_token: body.access_token,
          refresh_token: body.refresh_token,
        }));
    });
  }
});

app.get('/refresh_token', function(req, res) {

  // requesting access token from refresh token
  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token;
      res.send({
        'access_token': access_token
      });
    }
  });
});

console.log('Listening on 8888');
app.listen(8888);
