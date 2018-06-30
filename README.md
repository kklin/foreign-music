# Foreign Music Discovery

The foreign music finder helps you find music from other countries that is
similar to music you enjoy, but you wouldn't stumble across normally.

Try it at https://morning-forest-21141.herokuapp.com/!

_Note: A Spotify premium account is required_

<img src="/demo.gif?raw=true" width="750px">

## How It Works
The recommendations are generated in three parts.

First, a seed database is generated with representative music for common genres
by analyzing Spotify playlists for each country.

Then, when a user requests recommendations for a specific track, Spotify's recommendation
engine is used to generate recommendations based on the user's track, and a
representative track from the seed database. This way, Spotify's recommendation
engine will be "pulled" towards foreign music, but still consider aspects of
the track that aren't captured by genre (for example, male vs female vocalist
and tempo).

Finally, the list of recommendations are analyzed to determine their countries.
English music is filtered out.

## Next Steps
- Allow users to directly save songs they like to their Spotify library.
- More sophisticated in-app music playback. Users should be able to jump to the
  middle of songs, and the next song should automatically start playing when
- Support non-Spotify-premium members. Rather than play the entire track, it
  should be possible to play samples of the music for them.
- Allow filtering the recommended tracks by language.

## Setup

1. Start a Postgres server. I'm using Amazon RDS.

2. Connect to the Postgres server and create the two necessary tables:

```
CREATE TABLE playlists (
  id text,
  owner_id text,
  name text,
  genre text,
  country text
);
```

```
CREATE TABLE tracks (
  id text,
  playlist_id text,
  name text,
  artist_id text,
  genre text,
  country text
);
```

3. Create a [Spotify application](https://developer.spotify.com/dashboard/applications).

4. Enter the Postgres and Spotify credentials in the [configuration file](./recommendations/secrets.json).
See the [example](./recommendations/secrets.json.example) for reference.

5. Seed the database with `node ./recommendations/recommendations.js seed`.

This will take tens of minutes to complete, but logs should be printed as it
goes through the different country and genre pairs.

6. Start the recommendations server with `cd ./recommendations && npm start`

7. Start the client-facing web server with `cd ./webclient && npm start`.

8. Everything should be ready now! Go to `localhost:3000` and start using the application!

## Adding Countries and Genres

To add a new country or genre, edit the Country and Genre enums in
`./recommendations/recommendations.js`, and re-run the `seed` command. See the
Setup section for more information on the seed command.

_Note: To make the seeding process quicker, you can comment out the genres or
countries that have already been seeded. For example, to add a new genre, add
the genre to the enum, and comment out all the other genres._
