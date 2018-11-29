// @flow
import React, { Component } from 'react';

type State = {
  activated: boolean
};

export default class Engine extends Component<{}, State> {
  gameContainerRef = null;

  constructor(props: {}) {
    super(props);
    this.state = { activated: false };
  }

  render() {
    const { activated } = this.state;
    if (activated) {
      return (
        <div
          id="engine"
          ref={(container) => {
            this.gameContainerRef = container;
          }}
        />
      );
    }
    return (
      <div className="activate" id="engine" onClick={() => this.activate()}>
          click to play
      </div>
    );
  }

  activate() {
    this.setState({ activated: true });
  }
}
