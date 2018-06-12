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
    playerState: null,
  }

  constructor() {
    super();
    this.getRecommendations = this.getRecommendations.bind(this);
  }

  async getRecommendations() {
    this.setState({fetchingRecommendations: true});
    try {
      const recommendations = await axios.get(`http://localhost:8888/api/recommendation/${this.state.userSeedTrack}`);
      this.setState({
        fetchingRecommendations: false,
        recommendations: recommendations.data.tracks,
      });
    } catch (error) {
      this.setState({fetchingRecommendations: false});
      // TODO: Update UI with error.
    }
  }

  render() {
    const {
      userDeviceId,
      userSeedTrack,
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
        <Search userAccessToken={userAccessToken} onSelectedCallback={val => this.setState({userSeedTrack: val})}/>
        {userSeedTrack &&
          <button onClick={this.getRecommendations}>Get Recommendations</button>
        }
        {this.state.fetchingRecommendations &&
          <Loader/>
        }
        {!this.state.fetchingRecommendations && this.state.recommendations &&
          <TrackSelector userDeviceId={userDeviceId} userAccessToken={userAccessToken} tracks={this.state.recommendations}/>
        }
        <WebPlaybackReact {...webPlaybackSdkProps}>
          {playerState &&
            <NowPlayingScreen playerState={playerState} />
          }
        </WebPlaybackReact>
      </div>
    );
  };
}
