const SpotifyWebApi = require('spotify-web-api-node');
const PostgresClient = require('pg').Client;

const genres = ['edm', 'reggae', 'pop', 'rock', 'folk', 'jazz', 'punk', 'metal', 'blues', 'funk', 'disco', 'rap', 'acoustic', 'grunge', 'jazz'].slice(0, 1);
const nationalities = ['chinese', 'indian', 'indonesian', 'brazilian', 'pakistani', 'nigerian', 'russian', 'japanese', 'mexican', 'ethiopian', 'filipino', 'egyptian', 'vietnamese', 'iranian', 'turkish', 'german', 'italian', 'french'].slice(0, 1);

async function main() {
  const pgClient = new PostgresClient({
    user: 'foreign_music',
    host: 'foreign-music.c0prpxq16lno.us-east-2.redshift.amazonaws.com',
    database: 'prod',
    password: 'i4X$dxzeGBAp',
    port: 5439,
  });
  await pgClient.connect();

  const spotifyApi = new SpotifyWebApi({
    clientId: '33698d56449e4a8c9226f27573756d16',
    clientSecret: 'b9daa0497ddf4aeba11fba6a1479c8c9',
  });

  // Retrieve an access token.
  // TODO: This will probably be switched to Authorization
  // Code Flow from Client Credential Flow once user authentication is needed
  // (for playing music, and saving music to their library).
  await spotifyApi.clientCredentialsGrant().then(
    (data) => {
      // Save the access token so that it's used in future calls
      spotifyApi.setAccessToken(data.body['access_token']);
    },
    (err) => {
      console.log('Something went wrong when retrieving an access token', err);
    });

  await seedPlaylists(pgClient, spotifyApi);
  await pgClient.end();
}

async function seedPlaylists(pgClient, spotifyApi) {
  //spotifyApi.searchArtists('Daniel Caesar').then((resp) => {
  //console.log(resp.body.artists.items[0]);
  //}, console.log);

  return Promise.all(genres.map((genre) => {
    return Promise.all(nationalities.map((nationality) => {
      // TODO: Use maximum pagination.
      return spotifyApi.searchPlaylists(`${nationality} ${genre}`).then((resp) => {
        const playlistSample = getRandomItems(resp.body.playlists.items, 5);

        return Promise.all(playlistSample.map((playlist) => {
          return pgClient.query('INSERT INTO playlists(id, owner_id, name, genre, country) VALUES ($1, $2, $3, $4, $5)',
            [playlist.id, playlist.owner.id, playlist.name.slice(0,128), genre, nationality]);
        }));
        // Get the artist information for each track. Use a cache.
        // Save the artist information. Their name, ID, popularity, occurences in search, genres.
      }, console.error);
    }));
  }));

  //spotifyApi.searchTracks('Best Part (feat H.E.R.)').then((resp) => {
  //console.log(resp.body.tracks.items);
  //}, console.log);

  //spotifyApi.getRecommendations({
  //seed_artists: '7Dx7RhX0mFuXhCOUgB01uM', // JJ Lin.
  //seed_artists: '1dVygo6tRFXC8CSWURQJq2', // Sonu Nigam.
  //seed_tracks: '1RMJOxR6GRPsBHL8qeC2ux', // Best part
  //}).then((resp) => {
  //console.log('Recommended tracks');
  //resp.body.tracks.forEach((track) => {
  //const artists = spotifyApi.getArtist(track.artists[0].id).then((artist) => {
  //console.log(`${track.artists[0].name} - ${track.name} (${artist.body.genres})`);
  //})
  //});
  //}, console.log);
}

async function seedTracks(pgClient, spotifyApi) {
  // For each playlist, get 10 random tracks.
  // TODO: Use maximum pagination.
  //playlistSample.forEach((playlist) => {
  //spotifyApi.getPlaylistTracks(playlist.owner.id, playlist.id).then((resp) => {
  // Save track information to database.
  //const trackSample = getRandomItems(resp.body.items, 10);
  //console.log(trackSample);
  //});
  //});
}

function getRandomItems(arr, n) {
  if (arr.length < n) {
    return arr;
  }

  const randomIndices = new Set();
  while (randomIndices.size != n) {
    randomIndices.add(getRandomNumber(n));
  }

  return Array.from(randomIndices).map((idx) => arr[idx]);
}

function getRandomNumber(n) {
  return Math.floor(Math.random() * n);
}

main();
