import React, { useEffect, useState } from 'react';
import { createScope, createTimeline, cubicBezier, onScroll, stagger, utils } from 'animejs';
import HeroArt from './HeroArt';
import Phone from './Phone';
import PhoneScreen from './PhoneScreen';
import SplitWords from '../common/SplitWords';
import { money, monthLabel } from '../cards/display';

/**
 * Timeline units are pixels of scroll on a 900px-tall viewport, where the
 * 250svh section is 2250px. onScroll maps the whole section onto the whole
 * timeline, so on any other height every range scales with it.
 */
const SPAN = 2250;
/** Starting distance as a fraction of the perspective: about 8x final size. */
const Z_START = 0.8737;
/** Share of the hero scrolled before the phone's conversation starts (~90px). */
const SCREEN_TRIGGER = 0.04;

const ease = (x1, y1, x2, y2) => cubicBezier(x1, y1, x2, y2);
const RISE = ease(0, 0.83, 0.46, 1);

/** The scroll-scrubbed part: phone, copy, glass and landscape. */
const buildScrollTimeline = (section) =>
  createTimeline({
    defaults: { ease: 'linear' },
    autoplay: onScroll({ target: section, enter: 'top top', leave: 'top bottom', sync: true }),
  })
    .add('.phone-dolly', { '--z': [Z_START, 0], duration: SPAN, ease: ease(0.15, 0, 0.09, 0.99) }, 0)
    .add('.phone-tilt', { rotateY: [-12.4, 23.4], duration: 1290, ease: ease(0.39, 0.15, 0.45, 0.99) }, 0)
    .add('.phone-tilt', { rotateX: [-20.5, 0], duration: 1310, ease: ease(0.55, 0.74, 0.52, 0.85) }, 0)
    .add('.phone-tilt', { rotateX: [0, -4.8], duration: SPAN - 1310, ease: ease(0.52, -0.56, 0.5, 1) }, 1310)
    .add('.phone-tilt', { translateY: ['3.5svh', '0svh'], duration: 825, ease: ease(0.5, 0, 0.5, 1) }, 0)
    .add('.hero-copy', { opacity: [1, 0], filter: ['blur(0px)', 'blur(6px)'], duration: 336, ease: ease(0.5, 0, 0.5, 1) }, 0)
    .add('.phone-glass', { opacity: [1, 0], duration: 200, ease: ease(0.5, 0, 0.5, 1) }, 300)
    .add('.phone-sheen', { translateX: ['-28%', '28%'], duration: 1290 }, 0)
    .add('.phone-glare', { translateX: ['-18%', '22%'], opacity: [1, 0.4], duration: 1290 }, 0)
    .add('.art-sky', { translateY: ['10%', '0%'], duration: SPAN - 490, ease: RISE }, 490)
    .add('.art-sun', { translateY: ['34%', '0%'], duration: SPAN - 490, ease: RISE }, 490)
    .add('.art-ridge', { translateY: ['16%', '0%'], duration: SPAN, ease: RISE }, 0)
    .add('.art-hills', { translateY: ['26%', '0%'], duration: SPAN, ease: RISE }, 0)
    .add('.art-foreground', { translateY: ['44%', '0%'], duration: SPAN, ease: RISE }, 0);

const COUNTER_FORMAT = {
  month: (value) => monthLabel(Math.round(value)),
  count: (value) => String(Math.round(value)),
  money: (value) => money(value),
};

/**
 * The phone's conversation: plays in real time once started, never scrubbed.
 * Words arrive from blur, 3px low; the user's bubble pops in first; the card
 * slides up last and its figures count to their real values.
 */
const buildScreenSequence = (section) => {
  const find = (selector) => [...section.querySelectorAll(selector)];
  const counters = find('.ps-card [data-anim]').map((el) => ({
    el,
    format: COUNTER_FORMAT[el.dataset.anim],
    target: Number(el.dataset.anim === 'month' ? el.dataset.months : el.dataset.value),
    state: { value: 0 },
  }));

  const hide = () => {
    utils.set(find('.ps .sw'), { opacity: 0, filter: 'blur(4px)', translateY: '3px' });
    utils.set(find('.ps-bubble'), { opacity: 0, scale: 0.92 });
    utils.set(find('.ps-card'), { opacity: 0, translateY: '5cqw' });
    utils.set(find('.ps-card .bar-fill'), { scaleX: 0 });
    counters.forEach((counter) => {
      counter.state.value = 0;
      counter.el.textContent = counter.format(0);
    });
  };

  const timeline = createTimeline({ autoplay: false, defaults: { duration: 150, ease: 'out(3)' } });
  const words = (selector, at, gap) =>
    timeline.add(
      find(selector),
      { opacity: [0, 1], filter: ['blur(4px)', 'blur(0px)'], translateY: ['3px', '0px'], delay: stagger(gap) },
      at
    );

  words('.sw-greeting', 600, 200);
  timeline.add(find('.ps-bubble'), { opacity: [0, 1], scale: [0.92, 1], duration: 100, ease: 'out(2)' }, 1500);
  words('.sw-user', 1600, 70);
  words('.sw-reply-0', 2600, 50);
  words('.sw-reply-1', 3900, 50);
  timeline.add(find('.ps-card'), { opacity: [0, 1], translateY: ['5cqw', '0cqw'], duration: 700 }, 5200);
  timeline.add(find('.ps-card .bar-fill'), { scaleX: [0, 1], duration: 1000, ease: 'inOut(2)', delay: stagger(140) }, 5450);
  counters.forEach(({ el, format, target, state }) => {
    timeline.add(state, { value: [0, target], duration: 1100, onUpdate: () => { el.textContent = format(state.value); } }, 5400);
  });

  hide();
  return {
    play: () => {
      hide();
      timeline.restart();
    },
    reset: () => {
      timeline.pause();
      hide();
    },
  };
};

const ScrollCue = () => (
  <svg className="scroll-cue" viewBox="0 0 20 22" aria-hidden="true">
    {[0, 1, 2].map((row) => (
      <path key={row} className="scroll-cue-chevron" style={{ '--row': row }} d={`M3 ${3 + row * 6}l7 6 7-6`} />
    ))}
  </svg>
);

/**
 * Section 1. A 250svh runway with a sticky 100dvh stage: landscape, phone and
 * copy share one grid cell. With motion off it is a single still screen in
 * the finished state.
 */
const Hero = ({ demo, motion, sectionRef }) => {
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const section = sectionRef.current;
    if (!motion || !section) return undefined;

    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    observer.observe(section);

    let removeScroll = () => {};
    const scope = createScope({ root: sectionRef }).add(() => {
      buildScrollTimeline(section);
      const sequence = buildScreenSequence(section);

      // Start once ~4% in; restart only after a return to the very top.
      let armed = true;
      const check = () => {
        const progress = -section.getBoundingClientRect().top / section.offsetHeight;
        if (armed && progress >= SCREEN_TRIGGER) {
          armed = false;
          sequence.play();
        } else if (!armed && progress <= 0) {
          armed = true;
          sequence.reset();
        }
      };
      window.addEventListener('scroll', check, { passive: true });
      removeScroll = () => window.removeEventListener('scroll', check);
      check();
    });

    return () => {
      observer.disconnect();
      removeScroll();
      scope.revert();
    };
  }, [motion, sectionRef]);

  return (
    <section
      className="hero"
      ref={sectionRef}
      data-inview={inView ? 'true' : 'false'}
      aria-labelledby="hero-title"
    >
      <div className="hero-stage">
        <HeroArt />
        <div className="hero-scene" aria-hidden="true">
          <Phone>
            <PhoneScreen demo={demo} />
          </Phone>
        </div>
        <div className="hero-copy">
          <h1 className="hero-title" id="hero-title">
            <SplitWords text="Money, minus the dread." />
          </h1>
          <p className="hero-scroll" aria-hidden="true">
            Scroll
            <ScrollCue />
          </p>
        </div>
      </div>
      <p className="visually-hidden">
        On the phone, someone with {money(demo.payoff.totalDebt)} on two cards asks for help. SmartMoney works out
        that an extra {money(demo.payoff.extraPayment)} a month makes them debt-free by{' '}
        {monthLabel(demo.payoff.avalanche.months)}, {demo.payoff.comparedToMinimumsOnly.monthsSaved} months sooner,
        with {money(demo.payoff.comparedToMinimumsOnly.interestSaved)} less interest.
      </p>
    </section>
  );
};

export default Hero;
