import { h, Component, JSX } from "preact";

interface SidebarProps {
  sections: Record<string, () => JSX.Element>;
}

interface SidebarState {
  activeSection: string;
}

export class Sidebar extends Component<SidebarProps, SidebarState> {
  state: SidebarState = {
    activeSection: "",
  };

  setActiveSection = (sectionName: string): void => {
    this.setState({ activeSection: sectionName });
  };

  render() {
    const { sections } = this.props;
    const sectionNames = Object.keys(sections);
    const activeSection = this.state.activeSection || sectionNames[0];

    return (
      <section class="sidebar">
        <nav class="controls__navigation">
          {sectionNames.map((sectionName) => (
            <button
              class="btn btn--clean"
              data-active={activeSection === sectionName}
              onClick={() => this.setActiveSection(sectionName)}
            >
              {sectionName}
            </button>
          ))}
        </nav>

        <div class="">{sections[activeSection]()}</div>
      </section>
    );
  }
}
