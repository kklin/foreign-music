import React, { Component } from 'react';
import WebPlaybackReact from '../Spotify/WebPlaybackReact.js';
import TrackSelector from '../Spotify/TrackSelector.js';
import Search from '../Spotify/Search.js';
import Loader from 'react-loader';
import axios from 'axios';
import NowPlayingScreen from './NowPlaying.js';
import SpotifyWebApi from 'spotify-web-api-js';

export default class IntroScreen extends Component {
  state = {
    userDeviceId: null,
    userMarket: null,
    fetchingRecommendations: false,
    getRecommendationsError: null,
    playerState: null,
  }

  constructor() {
    super();
    this.getRecommendations = this.getRecommendations.bind(this);
  }

  componentDidMount() {
    this.fetchUserMarket();
  }

  async fetchUserMarket() {
    const webApiInstance = new SpotifyWebApi();
    webApiInstance.setAccessToken(this.props.userAccessToken);
    try {
      const userInfo = await webApiInstance.getMe();
      this.setState({userMarket: userInfo.country});
    } catch (err) {
      console.error(`Failed to get user market: ${err}`);
      setTimeout(this.fetchUserMarket, 1000);
    }
  }

  async getRecommendations(userSeedTrack, market) {
    this.setState({fetchingRecommendations: true});
    try {
      const recommendations = await axios.get(`https://arcane-garden-26602.herokuapp.com/api/recommendation/${userSeedTrack}?market=${market}`);
      this.setState({
        fetchingRecommendations: false,
        recommendations: recommendations.data.tracks,
        getRecommendationsError: null,
      });
    } catch (error) {
      this.setState({fetchingRecommendations: false});
      if (error.response && error.response.data && error.response.data.error) {
        this.setState({getRecommendationsError: error.response.data.error});
      } else {
        this.setState({getRecommendationsError: error.toString()});
      }
    }
  }

  render() {
    const {
      userDeviceId,
      userMarket,
      playerState
    } = this.state;
    const {userAccessToken} = this.props;

    const webPlaybackSdkProps = {
      playerName: "Foreign Music Player",
      playerInitialVolume: 1.0,
      playerRefreshRateMs: 100,
      playerAutoConnect: true,
      onPlayerRequestAccessToken: (() => userAccessToken),
      onDeviceReady: (data) => this.setState({ userDeviceId: data.device_id }),
      onPlayerStateChange: (playerState => this.setState({ playerState })),
      onPlayerError: (playerError => console.error(playerError))
    };
    return (
      <div>
        {userMarket &&
          <Search
            userAccessToken={userAccessToken}
            searchDelay={500}
            onSelectedCallback={track => this.getRecommendations(track, userMarket)}/>
        }
        {this.state.fetchingRecommendations &&
          <Loader/>
        }
        {!this.state.fetchingRecommendations && this.state.recommendations &&
          <TrackSelector userDeviceId={userDeviceId} userAccessToken={userAccessToken} tracks={this.state.recommendations}/>
        }
        {!this.state.fetchingRecommendations && this.state.getRecommendationsError &&
           <h2 className="action-red">{this.state.getRecommendationsError}</h2>
        }
        <WebPlaybackReact {...webPlaybackSdkProps}>
          {userDeviceId &&
            <NowPlayingScreen playerState={playerState} userAccessToken={userAccessToken} userDeviceId={userDeviceId} />
          }
        </WebPlaybackReact>
      </div>
    );
  };
}
