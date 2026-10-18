# Doodle Steps

Step-by-step drawing lessons for kids, from first shapes to real sketches. A plain web app, no build step.

- **Watch** mode: each step's new lines draw themselves; previous lines turn dark; a dotted preview shows the next step.
- **Draw** mode: trace over a faint guide with pencil, crayon or eraser, pinch to zoom, and save the picture.
- 30 lessons in three levels (Easy / Medium / Hard), with construction guide lines on the hard sketches.
- Works offline once opened; can be added to the iPad home screen.

## Add a lesson

Open `lessons.js` and add an object to the list:

```js
{ id: 'dog', name: 'Puppy Face', level: 'medium', category: 'animals', blurb: 'Floppy ears', steps: [
  S('Draw a round head', C(150, 150, 72)),       // hint, then SVG elements in a 300x300 box
  G('Lightly sketch an oval', E(150, 150, 60, 40)), // G = guide step (stays light and dashed)
]}
```

Helpers: `P(path)`, `C(cx,cy,r)`, `E(cx,cy,rx,ry,rotate)`, `L(x1,y1,x2,y2)`, `DOT(x,y,r)`, `SH(path)` for shading, `star(...)`, `scallop(...)`, `rays(...)`.
