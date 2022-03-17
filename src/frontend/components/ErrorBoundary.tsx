import { Component, h, JSX } from "preact";

interface Props {
  children: preact.ComponentChildren;
}

export class ErrorBoundary extends Component<Props> {
  state = {
    hasError: false,
    errors: [] as Error[],
  };

  static getDerivedStateFromError(): { hasError: true } {
    return { hasError: true };
  }

  componentDidCatch(err: Error, errInfo: string): void {
    console.error("caught error", err, errInfo);

    if (!this.state.errors.includes(err)) {
      this.setState({ errors: [...this.state.errors, err] });
    }
  }

  render(): JSX.Element | preact.ComponentChildren {
    if (this.state.hasError) {
      return (
        <div class="crash">
          <p>Oops! Something went wrong. Try reloading the plug-in</p>
        </div>
      );
    }

    return this.props.children;
  }
}
