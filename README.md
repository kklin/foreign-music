# foreign-music

## Database Setup

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
