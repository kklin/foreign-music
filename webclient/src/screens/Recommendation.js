import React, { Component } from 'react';
import WebPlaybackReact from '../Spotify/WebPlaybackReact.js';
import TrackSelector from '../Spotify/TrackSelector.js';
import Search from '../Spotify/Search.js';
import Loader from 'react-loader';
import axios from 'axios';
import NowPlayingScreen from './NowPlaying.js';

export default class IntroScreen extends Component {
  state = {
    userDeviceId: null,
    fetchingRecommendations: false,
    getRecommendationsError: null,
    playerState: null,
  }

  constructor() {
    super();
    this.getRecommendations = this.getRecommendations.bind(this);
  }

  async getRecommendations(userSeedTrack) {
    this.setState({fetchingRecommendations: true});
    try {
      const recommendations = await axios.get(`http://localhost:8888/api/recommendation/${userSeedTrack}`);
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
        <Search
          userAccessToken={userAccessToken}
          searchDelay={500}
          onSelectedCallback={track => this.getRecommendations(track)}/>
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
