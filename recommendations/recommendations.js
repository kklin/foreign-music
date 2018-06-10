const SpotifyWebApi = require('spotify-web-api-node');
const PostgresClient = require('pg').Client;
const secrets = require('./secrets');

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
  SOUL: 'soul',
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
  KOREA: 'korea',
  MEXICO: 'mexico',
  NIGERIA: 'nigeria',
  PAKISTAN: 'pakistan',
  PHILLIPINES: 'phillipines',
  RUSSIA: 'russia',
  SWEDEN: 'sweden',
  TURKEY: 'turkey',
  VIETNAM: 'vietnam',
});
const countries = Object.values(CountryEnum);

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
  [ CountryEnum.KOREA ]: 'korean',
  [ CountryEnum.MEXICO ]: 'mexican',
  [ CountryEnum.NIGERIA ]: 'nigerian',
  [ CountryEnum.PAKISTAN ]: 'pakistani',
  [ CountryEnum.PHILLIPINES ]: 'filipino',
  [ CountryEnum.RUSSIA ]: 'russian',
  [ CountryEnum.SWEDEN ]: 'swedish',
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
    password: secrets.pgPassword,
    port: 5439,
  });
  await pgClient.connect();

  const spotifyApi = new SpotifyWebApi({
    clientId: '33698d56449e4a8c9226f27573756d16',
    clientSecret: secrets.spotifyClientSecret,
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
      const recommendations = (await recommendTracks(pgClient, spotifyApi, process.argv[3]))
        .filter(track => track.preview_url);
      getRandomItems(recommendations, 15).forEach(printTrack);
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
    case 'analyze-db-track-countries':
      const artistIds = await pgClient.query('SELECT DISTINCT artist_id FROM tracks LIMIT 100');
      for (let i = 0; i < artistIds.rows.length; i += 50) {
        const ids = artistIds.rows.slice(i, i + 50).map(row => row.artist_id);
        const artists = await spotifyApi.getArtists(ids);
        artists.body.artists.forEach((artist) => {
          if (artist.genres.length == 0) {
            return;
          }
          console.log(`${artist.name} (${artist.genres}): ${getCountryForArtist(artist)}`);
        });
      }
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
  const seededTypes = new Set();
  try {
    const seededTypesResp = await pgClient.query({
      text: `SELECT DISTINCT country, genre FROM tracks`,
    });
    seededTypesResp.rows.forEach((row) => {
      seededTypes.add(row);
    });
  } catch (err) {
    console.error('Failed to get currently seeded tracks. ' +
      'Going to assume the database is empty.');
    console.error(err);
  }

  for (genre of genres) {
    for (country of countries) {
      if (seededTypes.has({genre, country})) {
        console.log(`${country} ${genre} already seeded. Skipping.`)
      }

      console.log(`Seeding ${country} ${genre}`);
      try {
        await seedPlaylists(pgClient, spotifyApi, genre, country);
      } catch (err) {
        console.error(`Unexpected error while seeding playlists. Going to try to continue seeding tracks anyways. ${err}`);
      }

      try {
        await seedTracks(pgClient, spotifyApi, genre, country);
      } catch (err) {
        console.error(`Unexpected error while seeding tracks: ${err}`);
      }
    }
  }
}

async function seedPlaylists(pgClient, spotifyApi, genre, country) {
  const nationality = countryToAdjective[country];

  let playlists;
  try {
    const playlistsResp = await spotifyApi.searchPlaylists(`${nationality} ${genre}`, { limit: 50 })
    playlists = playlistsResp.body.playlists.items;
  } catch (err) {
    console.error(`Failed to search playlists for ${country} ${genre}: ${err}`);
    return;
  }

  const playlistSample = getRandomItems(playlists, 5);
  return Promise.all(playlistSample.map((playlist) => {
    return pgClient.query('INSERT INTO playlists(id, owner_id, name, genre, country) VALUES ($1, $2, $3, $4, $5)',
      [playlist.id, playlist.owner.id, playlist.name.slice(0,128), genre, country]);
  }));
}

const targetNumPlaylists = 5;
const targetNumTracks = 50;

async function seedTracks(pgClient, spotifyApi, genre, country) {
  let playlists;
  try {
    const playlistsQuery = await pgClient.query({
      text: 'SELECT * FROM playlists WHERE genre = $1 AND country = $2 LIMIT $3',
      values: [genre, country, targetNumPlaylists]
    });
    playlists = playlistsQuery.rows;
  } catch (err) {
    console.error(`Failed to retrieve playlists for ${genre} ${country} from database: ${err}`);
    return;
  }

  if (playlists.length == 0) {
    console.error(`No playlists in database for ${genre} ${country}`);
    return;
  }

  const playlistSample = getRandomItems(playlists, targetNumPlaylists);
  const numTracksPerPlaylist = Math.ceil(targetNumTracks / playlistSample.length);
  return Promise.all(playlistSample.map(async (playlist) => {
    let tracks;
    try {
      const tracksResp = await spotifyApi.getPlaylistTracks(playlist.owner_id, playlist.id, { limit: 50 });
      tracks = tracksResp.body.items;
    } catch (err) {
      console.error(`Failed to get playlist tracks: ${err}`);
      return;
    }

    const usableTracks = tracks.filter((track) => {
      return track.track && track.track.id && track.track.name &&
        track.track.artists.length != 0 && track.track.artists[0].id;
    });
    const trackSample = getRandomItems(usableTracks, 10);

    return Promise.all(trackSample.map((track) => {
      return pgClient.query({
        text: 'INSERT INTO tracks(id, playlist_id, name, artist_id, genre, country) VALUES ($1, $2, $3, $4, $5, $6)',
        values: [track.track.id, playlist.id, track.track.name, track.track.artists[0].id, genre, country],
      });
    }));
  }));
}

async function recommendTracks(pgClient, spotifyApi, userTrackName) {
  let searchResult;
  try {
    searchResult = await spotifyApi.searchTracks(userTrackName);
  } catch (err) {
    throw new Error(`Failed to search for user track`);
  }

  if (searchResult.body.tracks.items === 0) {
    throw new Error('No results for track');
  }
  const userTrackInfo = searchResult.body.tracks.items[0];

  const seedTrackArtistInfo = await spotifyApi.getArtist(userTrackInfo.artists[0].id);
  const seedTrackGenres = seedTrackArtistInfo.body.genres;

  let foreignSeedTypes;
  try {
    // TODO: Not sure why WHERE genre = ANY($1) isn't working. The current way is
    // more prone to SQL injection.
    const placeholders = seedTrackGenres.map((_, i) => '$' + (i + 1)).join(',');
    const seedsQuery = await pgClient.query({
      text: `SELECT DISTINCT country, genre FROM tracks WHERE genre IN (${placeholders}) ORDER BY RANDOM() LIMIT 8`,
      values: seedTrackGenres,
    });
    foreignSeedTypes = seedsQuery.rows;
  } catch (err) {
    throw new Error(`Failed to query database for seed tracks: ${err}`)
  }

  if (foreignSeedTypes.length === 0) {
    throw new Error('No seed data');
  }

  const allRecommendations = [];
  await Promise.all(foreignSeedTypes.map(async (foreignSeedType) => {
    let foreignSeedTracks;
    try {
      const tracksQuery = await pgClient.query({
        text: 'SELECT id FROM tracks WHERE genre = $1 AND country = $2 ORDER BY RANDOM() LIMIT 1',
        values: [foreignSeedType.genre, foreignSeedType.country],
      });
      foreignSeedTracks = tracksQuery.rows;
    } catch (err) {
      console.error('Failed to query database for seed tracks for ' +
        `${foreignSeedType.country} ${foreignSeedType.genre}: ${err}. Skipping.`)
      return;
    }

    if (foreignSeedTracks.length === 0) {
      console.error(`No seed data for ${foreignSeedType.country} ${foreignSeedType.genre}. Skipping.`);
      return;
    }

    console.log(`Getting recommendations for seed ${foreignSeedType.country} ${foreignSeedType.genre}`);
    let recommendations;
    try {
      const recommendationsResp = await spotifyApi.getRecommendations({
        seed_tracks: [userTrackInfo.id, foreignSeedTracks[0].id],
        limit: 50,
      });
      recommendations = recommendationsResp.body.tracks;
    } catch (err) {
      // TODO: Should these be thrown errors?
      console.error('Failed to get Spotify recommendations for tracks ' +
        `(${userTrackInfo.id}, foreignSeedTracks[0].id): ${err}`);
      return;
    }

    let recommendationsWithCountry;
    try {
      recommendationsWithCountry = await analyzeTracks(pgClient, spotifyApi, recommendations);
    } catch (err) {
      throw new Error(`Failed to get country information: ${err}`);
    }
    allRecommendations.push(
      ...recommendationsWithCountry
      .filter(track => track.country));
  }));
  return allRecommendations;
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

async function analyzeTracks(pgClient, spotifyApi, tracks) {
  const artistsResp = await spotifyApi.getArtists(tracks.map(track => track.artists[0].id));
  const artistToCountry = {};
  artistsResp.body.artists.forEach((artist) => {
    artistToCountry[artist.id] = getCountryForArtist(artist);
  });

  return tracks.map(
    track => Object.assign(track, { country: artistToCountry[track.artists[0].id] })
  );
}

const genreToCountry = {
  'carioca': CountryEnum.BRAZIL,
  'mandopop': CountryEnum.CHINA,
};

const genrePrefixToCountry = {
  'c-': CountryEnum.CHINA,
  'k-': CountryEnum.KOREA,
  'j-': CountryEnum.JAPAN,
};

function getCountryForArtist(artist) {
  for (genre of artist.genres) {
    const lowerCaseGenre = genre.toLowerCase();

    for (genreString of Object.keys(genreToCountry)) {
      if (lowerCaseGenre.includes(genreString)) {
        return genreToCountry[genreString];
      }
    }

    for (genrePrefix of Object.keys(genrePrefixToCountry)) {
      if (lowerCaseGenre.startsWith(genrePrefix)) {
        return genrePrefixToCountry[genrePrefix];
      }
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
  return null;
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

async function printTrack(track) {
  console.log(`${track.artists[0].name} - ${track.name} (${track.country}) (${track.preview_url})`);
}

main();
