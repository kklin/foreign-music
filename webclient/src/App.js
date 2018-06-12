import React, { Component } from 'react';

import './App.css';
import Header from './layout/Header.js';

import LoginCallback from './Spotify/LoginCallback.js';

import IntroScreen from './screens/Intro.js';
import RecommendationScreen from './screens/Recommendation.js';

window.onSpotifyWebPlaybackSDKReady = () => {};

export default class App extends Component {
  state = {
    // User's session credentials
    userAccessToken: null,
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
    const { userAccessToken } = this.state;

    return (
      <div className="App">
        <Header />

        <main>
          {!userAccessToken && <IntroScreen />}
          {userAccessToken && <RecommendationScreen userAccessToken={userAccessToken} />}
        </main>
      </div>
    );
  }
};
