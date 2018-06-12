import React, { Component } from 'react';
import SpotifyWebApi from 'spotify-web-api-js';

export default class Search extends Component {
  state = {
    searchResults: null,
    selectedTrack: null,
  };
  constructor() {
    super();
    this.search = this.search.bind(this);
    this.handleSelection = this.handleSelection.bind(this);
  }

  componentWillMount() {
    this.webApiInstance = new SpotifyWebApi();
    this.webApiInstance.setAccessToken(this.props.userAccessToken);
  }

  async maybeSearch(query) {
    this.setState({selectedTrack: null});
    if (this.searchDebouncer) {
      clearTimeout(this.searchDebouncer);
    }
    if (query) {
      this.searchDebouncer = setTimeout(() => this.search(query), this.props.searchDelay);
    }
  }

  async search(query) {
    const searchResults = await this.webApiInstance.searchTracks(query, {});
    this.setState({searchResults: searchResults.tracks.items});
  }

  handleSelection(e) {
    const selectedId = e.target.value;
    const selectedTrackList = this.state.searchResults.filter((track) => track.id === selectedId);
    if (selectedTrackList.length !== 1) {
      throw new Error(`Unable to find selected track: ${selectedId}`);
    }
    const selectedTrack = selectedTrackList[0];

    this.setState({
      selectedTrack,
      searchResults: null,
    });
    this.props.onSelectedCallback(selectedTrack.id);
  }

  render() {
    const selectedTrackString = this.state.selectedTrack ? trackString(this.state.selectedTrack) : null;
    return (
      <div>
        <input type="text"
          value={selectedTrackString}
          style={{width: "100%"}}
          onChange={(e) => this.maybeSearch(e.target.value)} />
        {this.state.searchResults &&
          <select size="10" onChange={this.handleSelection} style={{width: "100%"}}>
            <option style={{display:'none'}} />
            {this.state.searchResults.map(result =>
              (<option key={result.id} value={result.id}>
                {trackString(result)}
              </option>)
            )}
          </select>
        }
      </div>
    );
  }
};

function trackString(track) {
  return `${track.artists[0].name} - ${track.name}`;
}
