/**
 * This is an example of a basic node.js script that performs
 * the Authorization Code oAuth2 flow to authenticate against
 * the Spotify Accounts.
 *
 * For more information, read
 * https://developer.spotify.com/web-api/authorization-guide/#authorization_code_flow
 */

var express = require('express'); // Express web server framework
var cors = require('cors');
const secrets = require('./secrets');
const {recommendTracks} = require('./recommendations');
const SpotifyWebApi = require('spotify-web-api-node');
const PostgresClient = require('pg').Client;
const util = require('./util');

function newApp(pgClient, spotifyApi) {
  var app = express();
  app.use(cors());

  // TODO: Only allow authenticated users to hit this API.
  app.get('/api/recommendation/:seed', async function(req, res) {
    const userTrackId = req.params.seed;
    try {
      const recommendations = await recommendTracks(pgClient, spotifyApi, req.params.seed);
      res.json({
        tracks: util.getRandomItems(recommendations, 10),
      });
    } catch (err) {
      res.status(500);
      res.json({ error: err.toString() });
    }
  });

  return app;
}

async function setAccessToken(spotifyApi) {
  await spotifyApi.clientCredentialsGrant().then(
    (data) => {
      // Save the access token so that it's used in future calls
      spotifyApi.setAccessToken(data.body['access_token']);

      // Refresh the access token in half of the expiration time (i.e. 30
      // minutes, usually).
      setTimeout(setAccessToken, data.body['expires_in'] * 1000 / 2, spotifyApi);
    },
    (err) => {
      console.error('Something went wrong when retrieving an access token (trying again).', err);
      setAccessToken(spotifyApi);
    });
}

async function main() {
  const pgClient = new PostgresClient({
    user: 'foreign_music',
    host: 'foreign-music.c0prpxq16lno.us-east-2.redshift.amazonaws.com',
    database: 'prod',
    password: secrets.pgPassword,
    port: 5439,
  });
  await pgClient.connect();

  const spotifyApi = new SpotifyWebApi({
    clientId: '33698d56449e4a8c9226f27573756d16',
    clientSecret: secrets.spotifyClientSecret,
  });

  await setAccessToken(spotifyApi);

  const app = newApp(pgClient, spotifyApi);
  console.log('Listening on 8888');
  app.listen(8888);
}

main();
