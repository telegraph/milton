import { h, Component, JSX } from "preact";

interface Props {
  children: JSX.Element[];
}

interface State {
  selectedTab: number;
}

export class Sidebar extends Component<Props, State> {
  state: State = {
    selectedTab: 0,
  };

  setActiveIndex = (tabIndex: number): void => {
    this.setState({ selectedTab: tabIndex });
  };

  render(): JSX.Element {
    const { children } = this.props;
    const { selectedTab } = this.state;

    return (
      <section class="sidebar">
        <nav class="controls__navigation">
          {children.map((childNode, index) => (
            <button
              key={childNode.props.title}
              class="btn btn--clean"
              data-active={selectedTab === index}
              onClick={() => this.setActiveIndex(index)}
            >
              {childNode.props.title}
            </button>
          ))}
        </nav>

        {children[selectedTab]}
      </section>
    );
  }
}
