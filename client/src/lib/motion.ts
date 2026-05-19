import type { Variants, Transition } from 'framer-motion'

export const easeOut: Transition['ease'] = [0.22, 0.9, 0.32, 1]
export const easeInOut: Transition['ease'] = [0.65, 0.05, 0.36, 1]

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: easeOut } },
}

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5, ease: easeOut } },
}

export const stagger = (delay = 0.06, initialDelay = 0): Variants => ({
  hidden: {},
  visible: { transition: { staggerChildren: delay, delayChildren: initialDelay } },
})

export const wordReveal: Variants = {
  hidden: { opacity: 0, y: '0.5em', filter: 'blur(8px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.7, ease: easeOut },
  },
}

export const cardHover = {
  whileHover: { y: -3, boxShadow: '0 22px 50px rgba(51,39,35,0.13)' },
  transition: { duration: 0.25, ease: easeOut },
}

export const pageFade: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: easeOut } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.25, ease: easeOut } },
}

export const scrollFadeUp = {
  initial: 'hidden',
  whileInView: 'visible',
  viewport: { once: true, amount: 0.2 },
  variants: fadeUp,
}
