import React, { Component } from 'react';
import WebPlaybackReact from './Spotify/WebPlaybackReact.js';
import TrackSelector from './Spotify/TrackSelector.js';

import './App.css';
import Header from './layout/Header.js';

import LoginCallback from './Spotify/LoginCallback.js';

import IntroScreen from './screens/Intro.js';
import NowPlayingScreen from './screens/NowPlaying.js';

window.onSpotifyWebPlaybackSDKReady = () => {};

export default class App extends Component {
  state = {
    // User's session credentials
    userDeviceId: null,
    userAccessToken: null,

    // Player state
    playerState: null
  }

  componentWillMount() {
    LoginCallback({
      onSuccessfulAuthorization: this.onSuccessfulAuthorization.bind(this),
      onAccessTokenExpiration: this.onAccessTokenExpiration.bind(this)
    });
  }

  onSuccessfulAuthorization(accessToken) {
    this.setState({
      userAccessToken: accessToken
    });
  }

  onAccessTokenExpiration() {
    this.setState({
      userDeviceId: null,
      userAccessToken: null,
      playerState: null
    });

    console.error("The user access token has expired.");
  }

  render() {
    let {
      userDeviceId,
      userAccessToken,
      playerState
    } = this.state;

    let webPlaybackSdkProps = {
      playerName: "Spotify React Player",
      playerInitialVolume: 1.0,
      playerRefreshRateMs: 100,
      playerAutoConnect: true,
      onPlayerRequestAccessToken: (() => userAccessToken),
      onDeviceReady: (data) => this.setState({ userDeviceId: data.device_id }),
      onPlayerStateChange: (playerState => this.setState({ playerState })),
      onPlayerError: (playerError => console.error(playerError))
    };

    const mockTracks = [
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

    return (
      <div className="App">
        <Header />

        <main>
          {!userAccessToken && <IntroScreen />}
          {userAccessToken && userDeviceId &&
            <TrackSelector userDeviceId={userDeviceId} userAccessToken={userAccessToken} tracks={mockTracks}/>
          }
          {userAccessToken &&
            <WebPlaybackReact {...webPlaybackSdkProps}>
              {playerState &&
                <NowPlayingScreen playerState={playerState} />
              }
            </WebPlaybackReact>
          }
        </main>
      </div>
    );
  }
};
