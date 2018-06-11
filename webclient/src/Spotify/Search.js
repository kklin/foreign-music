import React, { Component } from 'react';
import SpotifyWebApi from 'spotify-web-api-js';

export default class Search extends Component {
  state = {
    searchResults: null,
    query: null,
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

  async search() {
    this.props.onSelectedCallback(null);
    if (!this.state.query) {
      return
    }

    const searchResults = await this.webApiInstance.searchTracks(this.state.query, {});
    this.setState({searchResults: searchResults.tracks.items});
  }

  handleSelection(e) {
    this.setState({selected: e.target.value});
    this.props.onSelectedCallback(e.target.value);
  }

  render() {
    return (
      <div>
        {this.state.searchResults &&
          <select size="10" onChange={this.handleSelection}>
            {this.state.searchResults.map(result =>
              (<option key={result.id} value={result.id}>
                {result.artists[0].name} - {result.name}
                </option>)
            )}
          </select>
        }
        <input type="text" onChange={e => this.setState({query: e.target.value})} />
        <button onClick={this.search}>Search</button>
      </div>
    );
  }
};
