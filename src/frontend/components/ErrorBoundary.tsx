import { h, Component, JSX } from "preact";
import { loadScript } from "utils/common";
import { externalLogger } from "../../config.json";

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

  componentDidMount() {
    if (externalLogger) this.loadExternalLogger();
  }

  componentDidCatch(err: Error, errInfo: string): void {
    console.error("caught error", err, errInfo);

    if (!this.state.errors.includes(err)) {
      this.setState({ errors: [...this.state.errors, err] });
    }

    const pluginError = new CustomEvent("pluginError", {
      detail: err,
    });

    window.dispatchEvent(pluginError);
  }

  loadExternalLogger = (): void => {
    loadScript(externalLogger)
      .then(() => {
        console.log("External logger loaded");

        if (this.state.errors.length === 0) return;

        for (const err of this.state.errors) {
          const pluginError = new CustomEvent("pluginError", {
            detail: err,
          });

          window.dispatchEvent(pluginError);
        }

        this.setState({ errros: [] });
      })
      .catch((err) => console.error("Failed to load external logger", err));
  };

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
