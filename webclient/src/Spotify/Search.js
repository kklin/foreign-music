import React, { Component } from 'react';
import SpotifyWebApi from 'spotify-web-api-js';

export default class Search extends Component {
  state = {
    searchResults: null,
    selected: null,
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
    if (this.searchDebouncer) {
      clearTimeout(this.searchDebouncer);
    }
    this.searchDebouncer = setTimeout(() => this.search(query), this.props.searchDelay);
  }

  async search(query) {
    const searchResults = await this.webApiInstance.searchTracks(query, {});
    this.setState({searchResults: searchResults.tracks.items});
  }

  // TODO: Picking first item in list doesn't work.
  handleSelection(e) {
    this.setState({selected: e.target.value});
    this.props.onSelectedCallback(e.target.value);
  }

  render() {
    return (
      <div>
        <input type="text" onChange={(e) => e.target.value && this.maybeSearch(e.target.value)} />
        {this.state.searchResults &&
          <select size="10" onChange={this.handleSelection}>
            {this.state.searchResults.map(result =>
              (<option key={result.id} value={result.id}>
                {result.artists[0].name} - {result.name}
                </option>)
            )}
          </select>
        }
      </div>
    );
  }
};
