import { h, Component, JSX } from "preact";

interface Props {
  children: preact.ComponentChildren;
}

export class ErrorBoundary extends Component<Props> {
  state = {
    hasError: false,
  };

  static getDerivedStateFromError(): { hasError: true } {
    return { hasError: true };
  }

  componentDidCatch(err: Error, errInfo: string): void {
    console.error(err, errInfo);
  }

  render(): JSX.Element | preact.ComponentChildren {
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