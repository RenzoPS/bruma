# The site

Next.js 16, React 19, Tailwind 4, GSAP, Motion. Three pages — the place and the
five stations of the process, the menu, the origins — plus Brumita.

## The design system

`apps/web/DESIGN.md` holds it. Two decisions carry the rest.

**The page is the bean's journey.** BRUMA works with the doors open — you can see
them roast, grind and brew. The page does not say that, it does it: scrolling
does not cross sections named *About* and *Products*, it crosses **stations of
the process**, in the real order: green bean → roaster → grinder → cup → bag.

**The palette was not chosen, it was derived.** Coffee changes colour as it
roasts, always in the same sequence — green, yellow, cinnamon, brown. That
progression *is* the accent system, and it advances as you scroll: each section
sets `--etapa`, and every button, rule and underline reads from it. Changing
section recolours the whole interface without touching a component.

The ground is `paper` (#F2F3F0) and stays cold on purpose — a minimal green cast,
technical paper rather than bakery paper. That temperature is what separates this
world from the warm-cream cliché the whole category uses.

No radii, no shadows, no gradients. Depth, where it is needed, is print: overlay
and a 1px rule. That constraint is what shapes the hero and the chat.

## The hero

The first viewport is a five-second pour, scrubbed by scroll. The hero pins for
one viewport, `video.currentTime` advances with the scroll, and the type sits on
an opaque `paper` panel with a 1px rule that slides out of frame as the pour
finishes.

**The type is on a panel and not on the video for a measured reason.** The old
hero put text straight over a photo, justified by contrast measured on that one
image. A video has no such thing: luminance changes frame to frame and no text
colour works for all 121. So it goes back to the system's own rule — text sits on
an opaque block with its rule.

**It is a video and not an image sequence**, and that was measured too. The same
121 frames as WebP stills weigh 3.8 MB at 1280px, which is the weight that sank
the previous version of this site; re-encoded H.264 with a keyframe every 12
frames they weigh **972 KB**. Seeking is not the bottleneck people assume: p50
0.2 ms, p95 1 ms once buffered. A second, tighter crop is served to narrow
screens, and only one of the two downloads.

**The closing beat**: once the panel is gone, the logo and the line *Tostado a la
vista* appear in the middle of the frame — no band, no plate, no scrim. This is
the one place in the whole site where text sits directly on a photograph, and
like every exception here it was measured on the actual image rather than
assumed. The centre of the final frame has a median contrast of 7.9:1 against
`tinta`; the worst 1% of that box drops to 1.7:1, but that 1% is the dark part of
the machine at the lower right, where no glyph lands. The lockup sits 14% above
centre so the cup stays clear.

That entrance runs on Motion, not on the scrub. GSAP only reports when the
timeline passes the point where the panel has finished leaving; the reveal has
its own timing, so it reads as a title card appearing rather than something glued
to the mouse wheel.

Under `prefers-reduced-motion` the video is never mounted — no pin, no scrub, no
972 KB for someone who asked not to see motion. The lockup is not rendered
either. Frame 0 carries the hero on its own.

## Motion

One gesture for the whole site — twelve pixels up and fade in, once — plus the
counters that climb when they enter view, the way an instrument panel does.

**There is exactly one authored moment, and it is the hero.** There used to be a
second: the roast section pinned and ran a stopwatch from `00:00` to `11:20`
while the beans crossfaded from raw to roasted. It was cut. Two sections that pin
and scrub back to back are not two moments, they are the same idea twice, and the
second one spends the patience the first one needed. None of that content was
lost — the roast is station 02 of the process, on clean ground and with its real
numbers, which is where it can actually be read.

Everything turns off under `prefers-reduced-motion`.

## Brumita's surface

A round button, fixed bottom right, carrying the steam mark cropped out of the
brand logo. On hover a note slides in from the right saying *Preguntale a
Brumita* — the label is outside the button, because inside it forces a wide
rectangle that competes with the page's own calls to action. It is the only round
element in the site: the system rounds nothing, but this button already had a
special dispensation for floating, and a circle is what makes it read as an
action rather than a loose block of content. It does not appear over the hero.

The panel is a `paper` column on the right, full screen on a phone. **The
conversation is not chat bubbles.** With no radii and no shadows, an exchange is
composed as what it is in this world: a **printed transcript**. Each turn carries
its narrow caps label — VOS, BRUMITA — and turns are separated by a 1px rule. It
is the grammar of the process stations, applied to a dialogue.

Under each answer is what she consulted, with an icon per source. That is read
from the message's own tool parts, so it cannot claim it checked the menu when it
did not.

Icons are `lucide-react` at 1.5 stroke, the closest thing to the system's 1px
rule that does not break up at 16px. They go where a word would be worse — close,
send, stop, the source of a fact — and they do **not** replace the labels: the
caps rule still says VOS and BRUMITA, because there the word is the content, not
the action.

State is one `useChat` in the layout, so the section on the landing page and the
floating button are two doors to the same conversation, and it survives
navigating between pages.

## Translation

Spanish and English, toggled from the navbar and remembered in `localStorage`. No
per-locale routing: the site has three pages and `/es` and `/en` would double the
URLs to translate a landing page.

There is no i18n library, on purpose. `src/lib/i18n/es.ts` is the source and
`en.ts` is typed against it, so **a missing translation is a compile error** — a
guarantee runtime key lookup cannot give you.

## Images

Almost all of them are AI-generated from the prompts in
[prompts-gemini.md](prompts-gemini.md). Five come from libre-licensed banks and
four of those require attribution — see [creditos-imagenes.md](creditos-imagenes.md),
which also flags that the footer's "all images are AI-generated" line needs
fixing before this ships.
