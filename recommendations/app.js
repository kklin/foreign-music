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

function newApp(pgClient, spotifyApi) {
  var app = express();
  app.use(cors());

  // TODO: Only allow authenticated users to hit this API.
  app.get('/api/recommendation/:seed', async function(req, res) {
    const userTrackId = req.params.seed;
    const recommendations = await recommendTracks(pgClient, spotifyApi, req.params.seed);
    res.json({
      tracks: recommendations,
    });
  });

  return app;
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

  // Retrieve an access token.
  await spotifyApi.clientCredentialsGrant().then(
    (data) => {
      // Save the access token so that it's used in future calls
      // TODO: Refresh the access token when it expires.
      spotifyApi.setAccessToken(data.body['access_token']);
    },
    (err) => {
      console.error('Something went wrong when retrieving an access token', err);
    });

  const app = newApp(pgClient, spotifyApi);
  console.log('Listening on 8888');
  app.listen(8888);
}

main();
