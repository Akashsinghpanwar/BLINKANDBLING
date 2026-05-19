import { AnimatePresence, motion } from 'framer-motion'
import { useLocation } from 'wouter'
import { pageFade } from '../lib/motion'

interface Props { children: React.ReactNode }

export default function PageTransition({ children }: Props) {
  const [location] = useLocation()
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location}
        variants={pageFade}
        initial="hidden"
        animate="visible"
        exit="exit"
        style={{ minHeight: '100%' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
