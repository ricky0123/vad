# Notes for LLMs working on this repo

## Writing style

Write the way one engineer explains something to another in person: full
connected sentences that carry the reasoning.

Be concise. Concise means no padding and no restating what you just said, but it
does not mean stripping out the connective tissue that makes an explanation
followable. Keep the "because", "so", "which means". Say what something is and
why in the same breath rather than leaving two adjacent sentences to imply the
relationship. Length is fine when it is carrying real content.

Plain language. Avoid jargon where a normal word works, and avoid metaphors,
rhetorical flourishes and marketing tone.

Don't write in clipped declarative fragments, one-line paragraphs used as
punchlines, or the "X. That's Y." pattern. That register reads as trying to
sound impressive, which is the opposite of the point.

## sim

`npm run sim` generates speech with known boundaries, runs it through the VAD,
and reports what it detected. See `scripts/sim/README.md`.
