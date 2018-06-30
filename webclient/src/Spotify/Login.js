export default {
  logInWithSpotify: (() => {
    let client_id      = "33698d56449e4a8c9226f27573756d16";
    let redirect_uri   = "https://kklin.github.io/foreign-music";
    let scopes         = "streaming user-read-birthdate user-read-email user-read-private user-modify-playback-state";
    let scopes_encoded = scopes.replace(" ", "%20");

    window.location = [
      "https://accounts.spotify.com/authorize",
      `?client_id=${client_id}`,
      `&redirect_uri=${redirect_uri}`,
      `&scope=${scopes_encoded}`,
      "&response_type=token",
      "&show_dialog=true"
    ].join('');
  })
};
