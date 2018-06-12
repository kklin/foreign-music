import React, { Component } from 'react';
import SpotifyWebApi from 'spotify-web-api-js';

export default class PlayButton extends Component {
  constructor() {
    super();
    this.startPlayback = this.startPlayback.bind(this);
  }

  componentWillMount() {
    this.webApiInstance = new SpotifyWebApi();
    this.webApiInstance.setAccessToken(this.props.userAccessToken);
  }

  startPlayback() {
    this.webApiInstance.play({
      device_id: this.props.userDeviceId,
      uris: [`spotify:track:${this.props.track.id}`],
    });
  }

  render() {
    return (
      <div>
        <button onClick={this.startPlayback} disabled={!this.props.userDeviceId}>Play</button> ({this.props.track.country}) {this.props.track.artists[0].name} - {this.props.track.name}
      </div>
    );
  }
};
