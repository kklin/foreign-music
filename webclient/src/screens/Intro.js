import React, { Component } from 'react';
import Login from '../Spotify/Login.js';

export default class IntroScreen extends Component {
  buttonClick(e) {
    e.preventDefault();
    Login.logInWithSpotify();
  }

  render() {
    return (
      <button className="btn btn-md btn-violet" onClick={this.buttonClick}>Log in with Spotify</button>
    );
  };
}
