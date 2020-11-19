import { h, Component } from "preact";

export class ErrorBoundry extends Component {
  state = {
    hasError: false,
  };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(err, errInfo) {
    console.error(err, errInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div class="crash">
          <p>Oops! Something went wrong. Try reloading the plug-in</p>
          <p>
            If things keep crashing email{" "}
            <a href="mailto:andrew.mason@telegraph.co.uk">
              andrew.mason@telegraph.co.uk
            </a>
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
