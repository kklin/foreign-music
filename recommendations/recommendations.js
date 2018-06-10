const SpotifyWebApi = require('spotify-web-api-node');
const PostgresClient = require('pg').Client;

const GenreEnum = Object.freeze({
  ACOUSTIC: 'acoustic',
  BLUES: 'blues',
  DISCO: 'disco',
  EDM: 'edm',
  FOLK: 'folk',
  FUNK: 'funk',
  GRUNGE: 'grunge',
  JAZZ: 'jazz',
  METAL: 'metal',
  POP: 'pop',
  PUNK: 'punk',
  RAP: 'rap',
  REGGAE: 'reggae',
  ROCK: 'rock',
});
const genres = Object.values(GenreEnum);

const CountryEnum = Object.freeze({
  BRAZIL: 'brazil',
  CHINA: 'china',
  EGYPT: 'egypt',
  ETHIOPIA: 'ethiopia',
  FRANCE: 'france',
  GERMANY: 'germany',
  INDIA: 'india',
  INDONESIA: 'indonesia',
  IRAN: 'iran',
  ITALY: 'italy',
  JAPAN: 'japan',
  MEXICO: 'mexico',
  NIGERIA: 'nigeria',
  PAKISTAN: 'pakistan',
  PHILLIPINES: 'phillipines',
  RUSSIA: 'russia',
  TURKEY: 'turkey',
  VIETNAM: 'vietnam',
});
const countries = Object.values(CountryEnum).slice(0, 3);

const countryToAdjective = {
  [ CountryEnum.BRAZIL ]: 'brazilian',
  [ CountryEnum.CHINA ]: 'chinese',
  [ CountryEnum.EGYPT ]: 'egyptian',
  [ CountryEnum.ETHIOPIA ]: 'ethiopian',
  [ CountryEnum.FRANCE ]: 'french',
  [ CountryEnum.GERMANY ]: 'german',
  [ CountryEnum.INDIA ]: 'indian',
  [ CountryEnum.INDONESIA ]: 'indonesian',
  [ CountryEnum.IRAN ]: 'iranian',
  [ CountryEnum.ITALY ]: 'italian',
  [ CountryEnum.JAPAN ]: 'japanese',
  [ CountryEnum.MEXICO ]: 'mexican',
  [ CountryEnum.NIGERIA ]: 'nigerian',
  [ CountryEnum.PAKISTAN ]: 'pakistani',
  [ CountryEnum.PHILLIPINES ]: 'filipino',
  [ CountryEnum.RUSSIA ]: 'russian',
  [ CountryEnum.TURKEY ]: 'turkish',
  [ CountryEnum.VIETNAM ]: 'vietnamese',
}

countries.forEach((country) => {
  if (!(country in countryToAdjective)) {
    console.error(`No nationality information for ${country}. ` +
      'Please update countryToAdjective in recommendations.js.');
    process.exit(1);
  }
});

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

  if (process.argv.length < 3) {
    usage();
  }
  switch (process.argv[2]) {
    case 'seed':
      await seedDatabase(pgClient, spotifyApi);
      break;
    case 'recommend':
      if (process.argv.length < 4) {
        usage();
      }
      await recommendTracks(pgClient, spotifyApi, process.argv[3]);
      break;
    case 'list-genres':
      await listAllGenres(pgClient, spotifyApi);
      break;
    case 'analyze-db':
      await analyzeSeedData(pgClient);
      break;
    case 'analyze-artist':
      if (process.argv.length < 4) {
        usage();
      }
      await analyzeArtist(pgClient, spotifyApi, process.argv[3]);
      break;
    default:
      usage();
  }

  await pgClient.end();
}

function usage() {
  console.error(`${process.argv[0]} ${process.argv[1]} seed | recommend <search> | list-genres | analyze-db | analyze-artist <artist>`);
  process.exit(1);
}

async function seedDatabase(pgClient, spotifyApi) {
  for (genre of genres) {
    for (country of countries) {
      console.log(`Seeding ${country} ${genre}`);
      await seedPlaylists(pgClient, spotifyApi, genre, country);
      await seedTracks(pgClient, spotifyApi, genre, country);
    }
  }
}

async function seedPlaylists(pgClient, spotifyApi, genre, country) {
  const nationality = countryToAdjective[country];

  return spotifyApi.searchPlaylists(`${nationality} ${genre}`, { limit: 50 }).then((resp) => {
    const playlistSample = getRandomItems(resp.body.playlists.items, 5);
    return Promise.all(playlistSample.map((playlist) => {
      return pgClient.query('INSERT INTO playlists(id, owner_id, name, genre, country) VALUES ($1, $2, $3, $4, $5)',
        [playlist.id, playlist.owner.id, playlist.name.slice(0,128), genre, country]);
    }));
  });
}

const targetNumPlaylists = 5;
const targetNumTracks = 50;

async function seedTracks(pgClient, spotifyApi, genre, country) {
  const playlists = await pgClient.query({
    text: 'SELECT * FROM playlists WHERE genre = $1 AND country = $2 LIMIT $3',
    values: [genre, country, targetNumPlaylists]
  });

  const playlistSample = getRandomItems(playlists.rows, targetNumPlaylists);
  const numTracksPerPlaylist = Math.ceil(targetNumTracks / playlistSample.length);
  return Promise.all(playlistSample.map(async (playlist) => {
    const tracksResp = await spotifyApi.getPlaylistTracks(playlist.owner_id, playlist.id, { limit: 50 });
    const trackSample = getRandomItems(
      tracksResp.body.items.filter((track) => {
        return track.track && track.track.id && track.track.name &&
          track.track.artists.length != 0 && track.track.artists[0].id;
      }), 10);
    return Promise.all(trackSample.map((track) => {
      return pgClient.query({
        text: 'INSERT INTO tracks(id, playlist_id, name, artist_id, genre, country) VALUES ($1, $2, $3, $4, $5, $6)',
        values: [track.track.id, playlist.id, track.track.name, track.track.artists[0].id, genre, country],
      });
    }));
  }));
}

async function recommendTracks(pgClient, spotifyApi, seedTrackName) {
  const seedTrackInfo = await spotifyApi.searchTracks(seedTrackName);
  const seedTrackArtistInfo = await spotifyApi.getArtist(seedTrackInfo.body.tracks.items[0].artists[0].id);
  const seedTrackGenres = seedTrackArtistInfo.body.genres;
  console.log(`Seed tracks genres: ${seedTrackGenres}`);


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
  // TODO: Limit responses in API call to getRecommendations.
  recommendations.body.tracks.slice(0, 10).forEach(printTrack);
}

async function listAllGenres(pgClient, spotifyApi) {
  const artistIds = await pgClient.query('SELECT DISTINCT artist_id FROM tracks');
  const genresSet = new Set();
  for (let i = 0; i < artistIds.rows.length; i += 50) {
    const ids = artistIds.rows.slice(i, i + 50).map(row => row.artist_id);
    const artists = await spotifyApi.getArtists(ids);
    artists.body.artists.forEach((artist) => {
      artist.genres.forEach(genre => genresSet.add(genre));
    });
  }
  console.log(genresSet);
}

async function analyzeSeedData(pgClient) {
  for (genre of genres) {
    for (country of countries) {
      const numTracksResp = await pgClient.query({
        text: 'SELECT COUNT(*) FROM tracks WHERE country = $1 AND genre = $2',
        values: [ country, genre ],
      });
      const numTracks = numTracksResp.rows[0].count;

      if (numTracks < targetNumTracks) {
        console.log(`${country} ${genre} has ${numTracks} seed tracks. ` +
          `Expected ${targetNumTracks} tracks`);
      }
    }
  }
}

async function analyzeArtist(pgClient, spotifyApi, artistQuery) {
  const artistResp = await spotifyApi.searchArtists(artistQuery);
  if (artistResp.body.artists.items.length === 0) {
    console.error(`Unable to find information for artist "${artistQuery}".`);
    process.exit(1);
  }
  const artist = artistResp.body.artists.items[0];

  console.log(`Name: ${artist.name}`);
  console.log(`Genres: ${artist.genres}`);
  console.log(`Country: ${getCountryForArtist(artist)}`);
}

const genreToCountry = {
  'c-pop': CountryEnum.CHINA,
  'mandopop': CountryEnum.CHINA,
};

function getCountryForArtist(artist) {
  for (genre of artist.genres) {
    const lowerCaseGenre = genre.toLowerCase();

    if (lowerCaseGenre in genreToCountry) {
      return genreToCountry[lowerCaseGenre];
    }

    for (country of countries) {
      if (lowerCaseGenre.includes(country.toLowerCase())) {
        return country;
      }
      if (lowerCaseGenre.includes(countryToAdjective[country].toLowerCase())) {
        return country;
      }
    }
  }
  return 'UNKNOWN';
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
