import React, { Component, Fragment } from 'react';

export default class WebPlayback extends Component {
  statePollingInterval = null
  webPlaybackInstance = null

  state = {
    playerReady: false,
  }

  async handleState(state) {
    if (state) {
      this.props.onPlayerStateChange(state);
    }
  }

  waitForSpotify() {
    return new Promise(resolve => {
      if ('Spotify' in window) {
        resolve();
      } else {
        window.onSpotifyWebPlaybackSDKReady = () => { resolve(); };
      }
    });
  }

  startStatePolling() {
    this.statePollingInterval = setInterval(async () => {
      let state = await this.webPlaybackInstance.getCurrentState();
      await this.handleState(state);
    }, this.props.playerRefreshRateMs || 1000);
  }

  clearStatePolling() {
    clearInterval(this.statePollingInterval);
  }

  async setupWebPlaybackEvents() {
    let { Player } = window.Spotify;

    this.webPlaybackInstance = new Player({
      name: this.props.playerName,
      volume: this.props.playerInitialVolume,
      getOAuthToken: async callback => {
        if (typeof this.props.onPlayerRequestAccessToken !== "undefined") {
          let userAccessToken = await this.props.onPlayerRequestAccessToken();
          callback(userAccessToken);
        }
      }
    });

    this.webPlaybackInstance.on("initialization_error", e => {
      this.props.onPlayerError(e.message);
    });

    this.webPlaybackInstance.on("authentication_error", e => {
      this.props.onPlayerError(e.message);
    });

    this.webPlaybackInstance.on("account_error", e => {
      this.props.onPlayerError(e.message);
    });

    this.webPlaybackInstance.on("playback_error", e => {
      this.props.onPlayerError(e.message);
    });

    this.webPlaybackInstance.on("player_state_changed", async state => {
      await this.handleState(state);
    });

    if (this.props.playerAutoConnect) {
      this.webPlaybackInstance.connect();
    }
  }

  setupWaitingForDevice() {
    return new Promise(resolve => {
      this.webPlaybackInstance.on("ready", data => {
        resolve(data);
      });
    });
  }

  async componentWillMount() {
    // Wait for Spotify to load player
    await this.waitForSpotify();

    // Setup the instance and the callbacks
    await this.setupWebPlaybackEvents();

    // Wait for device to be ready
    let device_data = await this.setupWaitingForDevice();
    this.props.onDeviceReady(device_data);
    this.startStatePolling();
  }

  render() {
    return (<Fragment>{this.props.children}</Fragment>);
  }
};
