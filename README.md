# 9x9 Go Web Game (vs. Computer AI)

A lightweight, zero-dependency implementation of the traditional board game Go (Weiqi) played on a 9x9 grid against a heuristic automated opponent. Built natively using HTML5, CSS3, and Vanilla JavaScript.

## Live Demo
[Play the game live here!]([https://uni85.github.io/Game-of-GO-against-AI_AIGOO/])

## Features
- **Dynamic Board Generation:** Automatically scales and renders a 9x9 intersection layout.
- **Traditional Grid Styling:** Uses smart absolute-positioned layout tricks to ensure stones snap accurately onto line intersections instead of containment squares.
- **Heuristic AI Engine:** An automated computer opponent that evaluates defensive and offensive moves based on territory threat, direct captures, and center-board placement priorities.
- **Rule Enforcement Engine:** Automated tracking for connected group structures, multi-stone capture logic, and suicide-move detection.
- **The Ko Rule:** Built-in deep snapshot history hashing to catch and prevent illegal infinite loops of recapturing single stones.
- **Pass System:** Built-in skipping system essential for entering advanced endgame states.

## Repository Structure
The project is organized using professional frontend repository standards:

```text
go-web-game/
├── .gitignore
├── LICENSE
├── README.md
├── index.html
├── assets/
│   └── images/
│       └── preview.png
├── src/
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── script.js
