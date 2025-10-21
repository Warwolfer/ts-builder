/**
 * Copyright Component
 * Shared copyright footer for all TerraSphere Builder pages
 */

class CopyrightComponent {
  constructor() {
    this.version = "v2.0";
    this.copyrightYears = "2016-2025";
    this.teamName = "Team Terrasphere";
  }

  // Render the copyright HTML
  render() {
    return `
      <div id="copyright">
        <span class="cpr">TS2 Builder <span class="version">${this.version}</span> © ${this.copyrightYears} ${this.teamName}</span>
        <span class="cpr">All visuals and music belong to their respective owners.</span>
      </div>
    `;
  }

  // Insert copyright into the page at the specified container
  insertInto(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = this.render();
    } else {
      // Silently handle missing container
    }
  }

  // Append copyright to the page body (default behavior)
  appendToBody() {
    document.body.insertAdjacentHTML("beforeend", this.render());
  }

  // Replace existing copyright element
  replace() {
    const existingCopyright = document.getElementById("copyright");
    if (existingCopyright) {
      existingCopyright.outerHTML = this.render();
    } else {
      this.appendToBody();
    }
  }
}

// Create global instance
window.CopyrightComponent = CopyrightComponent;

// Auto-initialize if DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    // Auto-replace existing copyright if found
    const copyright = new CopyrightComponent();
    copyright.replace();
  });
} else {
  // DOM is already ready
  const copyright = new CopyrightComponent();
  copyright.replace();
}
