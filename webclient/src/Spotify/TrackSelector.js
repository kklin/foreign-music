import React, { Component } from 'react';
import SpotifyWebApi from 'spotify-web-api-js';

export default class TrackSelector extends Component {
  constructor() {
    super();
    this.startPlayback = this.startPlayback.bind(this);
  }

  async componentWillMount() {
    this.webApiInstance = new SpotifyWebApi();
    this.webApiInstance.setAccessToken(this.props.userAccessToken);
  }

  startPlayback() {
    this.webApiInstance.play({
      device_id: this.props.userDeviceId,
      uris: ['spotify:track:1301WleyT98MSxVHPZCA6M'],
    });
  }

  render() {
    return (<button onClick={this.startPlayback}>Play</button>);
  }
};
