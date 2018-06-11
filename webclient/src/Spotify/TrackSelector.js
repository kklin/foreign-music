import React, { Component } from 'react';
import PlayButton from './PlayButton.js';

export default class TrackSelector extends Component {
  render() {
    return (
      <div>
        {this.props.tracks.map(track => (
          <PlayButton userAccessToken={this.props.userAccessToken}
            userDeviceId={this.props.userDeviceId}
            track={track} />
        ))}
      </div>
    );
  }
};
