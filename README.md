# E-Portfolio

The personal portfolio site of **Wang Sai**, live at **https://www.silaswang.space**.

It is a small static site: plain HTML, CSS and JavaScript, with no build step. Every push to the `main` branch is deployed automatically by [Vercel](https://vercel.com).

## What is on the site

- **Home page** (`index.html`): hero, about, projects, contact and blog sections.
- **Project page** (`lighting-design.html`): the write-up for *Lighting Design* ("FLY ME To THE MOON"), with a button to play the game.
- **English / 中文 switch**: the text is translated in the browser and the choice is remembered.
- **Motion**: scroll parallax, a particle background, a custom cursor and click effects. Parallax and particles respect the visitor's "reduce motion" setting, and parallax is halved on phones.
- **Responsive layout** with a mobile menu.

## Project: Lighting Design

A two-player interactive game controlled by hand tracking (p5.js and ml5.js), built with a team for a university assignment. It runs in the browser and needs a webcam. The playable copy lives in [`projects/lighting-design/`](projects/lighting-design/); its README explains the controls, the file layout and the project history.

## Folder structure

```text
E-Portfolio/
├── index.html              Home page
├── lighting-design.html    Project page for Lighting Design
├── styles.css              Styles for both pages
├── app.js                  Cursor, menu, parallax, particles, language switch
├── images/                 Pictures used by the pages
└── projects/
    └── lighting-design/    The playable game (has its own README)
```

Folder and file names are lowercase, with hyphens and no spaces. Windows treats `Images` and `images` as the same folder, but web servers (including Vercel) do not, so mixed case can work on your own computer and then break online.

## Run it locally

```bash
python -m http.server 5500
```

Then open <http://localhost:5500>. Use a local server rather than opening the files directly, so the game can load its images and sounds. Browsers allow webcam access on `localhost`.

## Adding another project

1. Put the project's files in `projects/<project-name>/`.
2. Add a page `<project-name>.html` next to `index.html`, and link to it from the projects section of `index.html`.
3. Keep names lowercase, with hyphens instead of spaces.

## Credits

The Lighting Design game was made by a team; the original repository is [Ko0808/p5Projection](https://github.com/Ko0808/p5Projection). This repo keeps a trimmed copy so the game can be played from the portfolio site.
