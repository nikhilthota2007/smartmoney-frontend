import React from 'react';

/**
 * The hero landscape: daybreak over a line of hills. Five layers, back to
 * front, each a full-bleed frame that covers the stage the way
 * background-size: cover would (see .art-frame). The hero timeline raises each
 * layer at its own rate; the ambient bits (sun halo, clouds, fireflies) loop
 * on their own clock.
 *
 * All shapes are original and drawn here; there are no image files.
 */

// A small deterministic random source, so the grass is the same every render.
const seeded = (seed) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

const grassBlades = (() => {
  const random = seeded(7);
  const blades = [];
  const along = [
    // [x0, x1, yAt(x)] spans for the two foreground slopes.
    [0, 470, (x) => 885 + (x / 470) ** 2 * 115],
    [1130, 1600, (x) => 865 + ((1600 - x) / 470) ** 2 * 135],
  ];
  along.forEach(([x0, x1, yAt]) => {
    for (let x = x0; x < x1; x += 7 + random() * 9) {
      const y = yAt(x) + 4;
      const h = 18 + random() * 46;
      const lean = (random() - 0.5) * 22;
      blades.push(`M${x - 2.4} ${y}Q${x + lean * 0.4} ${y - h * 0.6} ${x + lean} ${y - h}Q${x + lean * 0.3 + 1} ${y - h * 0.5} ${x + 2.4} ${y}Z`);
    }
  });
  return blades.join('');
})();

const Sapling = ({ x, y, scale = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <path className="art-trunk" d="M-3 0 L-1.5 -88 L1.5 -88 L3 0Z" />
    <ellipse className="art-canopy" cx="0" cy="-104" rx="34" ry="40" />
    <ellipse className="art-canopy-hi" cx="-10" cy="-118" rx="16" ry="18" />
  </g>
);

const HeroArt = () => (
  <div className="hero-art" aria-hidden="true">
    <div className="art-layer art-sky">
      <div className="art-frame">
        <div className="art-sky-fill" />
        <div className="art-clouds ambient">
          <span className="art-cloud art-cloud-1" />
          <span className="art-cloud art-cloud-2" />
          <span className="art-cloud art-cloud-3" />
        </div>
      </div>
    </div>

    <div className="art-layer art-sun">
      <div className="art-frame">
        <span className="art-sun-halo ambient" />
        <span className="art-sun-disc" />
      </div>
    </div>

    <div className="art-layer art-ridge">
      <div className="art-frame">
        <svg viewBox="0 0 1600 1000" preserveAspectRatio="none">
          <defs>
            <linearGradient id="art-ridge-haze" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" className="art-stop-haze" />
              <stop offset="0.6" className="art-stop-ridge" />
            </linearGradient>
          </defs>
          <path
            fill="url(#art-ridge-haze)"
            d="M0 676C120 640 230 604 350 622S560 690 700 664 900 600 1010 588 1200 640 1300 646 1480 612 1600 630V1000H0Z"
          />
        </svg>
      </div>
    </div>

    <div className="art-layer art-hills">
      <div className="art-frame">
        <svg viewBox="0 0 1600 1000" preserveAspectRatio="none">
          <path className="art-hill" d="M0 752C190 712 360 690 540 724S880 806 1080 760 1420 690 1600 716V1000H0Z" />
          <path className="art-hill-front" d="M0 846C250 802 500 790 742 826S1190 902 1600 816V1000H0Z" />
        </svg>
        <span className="art-twinkle ambient" style={{ left: '24%', top: '79%' }} />
        <span className="art-twinkle ambient" style={{ left: '33%', top: '86%', animationDelay: '-1.4s' }} />
        <span className="art-twinkle ambient" style={{ left: '71%', top: '82%', animationDelay: '-2.6s' }} />
      </div>
    </div>

    <div className="art-layer art-foreground">
      <div className="art-frame">
        <svg viewBox="0 0 1600 1000" preserveAspectRatio="none">
          <path className="art-ground" d="M0 884C170 880 330 912 470 1000H0Z" />
          <path className="art-ground" d="M1600 864C1420 858 1260 900 1130 1000H1600Z" />
          <Sapling x={150} y={905} scale={1.15} />
          <Sapling x={268} y={926} scale={0.8} />
          <Sapling x={1420} y={884} scale={1.3} />
          <Sapling x={1310} y={920} scale={0.85} />
          <path className="art-grass" d={grassBlades} />
        </svg>
      </div>
    </div>
  </div>
);

export default HeroArt;
