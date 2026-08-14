# Broken Python

A keyword-eating Snake game. Slither through a code maze, collect valid Python keywords in order, and dodge imposters — plus a rogue compiler bug on the last level.

Play in the browser. **No account. No login.**

## Play

Open the hosted game (no account required):

- **https://broken-python-arcade.web.app**
- https://broken-python-arcade.firebaseapp.com

Or run it locally:

```bash
npx -y serve public
```

Then visit the URL printed in the terminal.

## How to play

- Eat **green** keywords to fill the blanks in the console
- **Red** tiles are fakes
- Words must be eaten in order (`def` then `return`)
- Hit the **top wall** (the console) to spit out a wrong word
- Don't crash into walls, yourself, or the enemy snake
- Arrows / WASD / swipe / on-screen d-pad
- `P` or `Esc` pauses, `M` mutes

Five levels: `print`, `if`, `range`, `def` + `return`, and a boss chase for `break`.

## Desktop prototype

The original Pygame hackathon build lives in [`legacy/snake.py`](legacy/snake.py).

```bash
pip install pygame
python legacy/snake.py
```
