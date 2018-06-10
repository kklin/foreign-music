const SpotifyWebApi = require('spotify-web-api-node');
const PostgresClient = require('pg').Client;

const genres = ['edm', 'reggae', 'pop', 'rock', 'folk', 'jazz', 'punk', 'metal', 'blues', 'funk', 'disco', 'rap', 'acoustic', 'grunge', 'jazz'].slice(0, 5);
const nationalities = ['chinese', 'indian', 'indonesian', 'brazilian', 'pakistani', 'nigerian', 'russian', 'japanese', 'mexican', 'ethiopian', 'filipino', 'egyptian', 'vietnamese', 'iranian', 'turkish', 'german', 'italian', 'french'].slice(0, 5);

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

  //for (genre of genres) {
    //for (nationality of nationalities) {
      //console.log(`Seeding ${nationality} ${genre}`);
      //await seedPlaylists(pgClient, spotifyApi, genre, nationality);
      //await seedTracks(pgClient, spotifyApi, genre, nationality);
    //}
  //}

  //await recommendTracks(pgClient, spotifyApi, 'californication');
  await listAllGenres(pgClient, spotifyApi);
  await pgClient.end();
}

async function seedPlaylists(pgClient, spotifyApi, genre, nationality) {
  // TODO: Use maximum pagination.
  return spotifyApi.searchPlaylists(`${nationality} ${genre}`).then((resp) => {
    const playlistSample = getRandomItems(resp.body.playlists.items, 5);
    return Promise.all(playlistSample.map((playlist) => {
      return pgClient.query('INSERT INTO playlists(id, owner_id, name, genre, country) VALUES ($1, $2, $3, $4, $5)',
        [playlist.id, playlist.owner.id, playlist.name.slice(0,128), genre, nationality]);
    }));
  });
}

async function seedTracks(pgClient, spotifyApi, genre, nationality) {
  const playlists = await pgClient.query({
    text: 'SELECT * FROM playlists WHERE genre = $1 AND country = $2',
    values: [genre, nationality]
  });
  const playlistSample = getRandomItems(playlists.rows, 5);
  return Promise.all(playlistSample.map(async (playlist) => {
    const tracksResp = await spotifyApi.getPlaylistTracks(playlist.owner_id, playlist.id);
    const trackSample = getRandomItems(tracksResp.body.items, 10);
    return Promise.all(trackSample.map((track) => {
      return pgClient.query({
        text: 'INSERT INTO tracks(id, playlist_id, name, artist_id, genre, country) VALUES ($1, $2, $3, $4, $5, $6)',
        values: [track.track.id, playlist.id, track.track.name, track.track.artists[0].id, genre, nationality],
      });
    }));
  }));
}

async function recommendTracks(pgClient, spotifyApi, seedTrackName) {
  const seedTrackInfo = await spotifyApi.searchTracks(seedTrackName);
  const seedTrackArtistInfo = await spotifyApi.getArtist(seedTrackInfo.body.tracks.items[0].artists[0].id);
  const seedTrackGenres = seedTrackArtistInfo.body.genres;
  const availableGenres = await pgClient.query({
    text: 'SELECT DISTINCT country, genre FROM tracks',
  });
  const availableGenresToCountries = {};
  availableGenres.rows.forEach((row) => {
    if (!(row.genre in availableGenresToCountries)) {
      availableGenresToCountries[row.genre] = [];
    }
    availableGenresToCountries[row.genre].push(row.country);
  });

  const genreIntersect = [];
  seedTrackGenres.forEach((genre) => {
    if (genre in availableGenresToCountries) {
      genreIntersect.push(genre);
    }
  });

  if (genreIntersect.length === 0) {
    console.log('No data :(');
    return;
  }

  console.log(`Country options: ${availableGenresToCountries[genreIntersect[0]]}`);
  const country = getRandomItems(availableGenresToCountries[genreIntersect[0]], 1)[0];
  console.log(`Searching in ${country} ${genreIntersect[0]}`);

  const foreignSeedTracks = await pgClient.query({
    text: 'SELECT id FROM tracks WHERE genre = $1 AND country = $2 LIMIT 1',
    values: [genreIntersect[0], country],
  });

  const recommendations = await spotifyApi.getRecommendations({
    seed_tracks: [seedTrackInfo.body.tracks.items[0].id, foreignSeedTracks.rows[0].id],
  });
  recommendations.body.tracks.slice(0, 10).forEach(printTrack);
}

async function listAllGenres(pgClient, spotifyApi) {
  const artistIds = await pgClient.query('SELECT DISTINCT artist_id FROM tracks');
  const genresSet = new Set();
  for (let i = 0; i < artistIds.rows.length; i += 50) {
    // TODO: Why is ID null?
    const ids = artistIds.rows.slice(i, i + 50).map(row => row.artist_id).filter((id) => id !== null);
    console.log(ids);
    const artists = await spotifyApi.getArtists(ids);
    artists.body.artists.forEach((artist) => {
      artist.genres.forEach(genre => genresSet.add(genre));
    });
  }
  console.log(genresSet);
}

function getRandomItems(arr, n) {
  if (arr.length < n) {
    return arr;
  }

  const randomIndices = new Set();
  while (randomIndices.size != n) {
    randomIndices.add(getRandomNumber(arr.length));
  }

  return Array.from(randomIndices).map((idx) => arr[idx]);
}

function getRandomNumber(n) {
  return Math.floor(Math.random() * n);
}

function printTrack(track) {
  console.log(`${track.artists[0].name} - ${track.name} (${track.preview_url})`);
}

main();
