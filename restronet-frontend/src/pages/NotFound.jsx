import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Utensils, ChefHat } from 'lucide-react';
import { motion } from 'framer-motion';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden"
      style={{ background: 'hsl(var(--background))' }}
    >
      {/* Background radial glow — orange */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '10%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '700px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse at center, rgba(250,101,0,0.09) 0%, transparent 65%)',
          zIndex: 0,
        }}
      />
      {/* Secondary softer glow bottom-right */}
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: '-5%',
          right: '-8%',
          width: '480px',
          height: '480px',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse at center, rgba(250,101,0,0.05) 0%, transparent 70%)',
          zIndex: 0,
        }}
      />
      {/* Grain texture overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: '200px 200px',
          zIndex: 0,
        }}
      />

      {/* Main content */}
      <div className="relative z-10 max-w-lg w-full text-center flex flex-col items-center">

        {/* Decorative icon — animated float */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="mb-2"
        >
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-0"
            style={{
              background: 'rgba(250,101,0,0.08)',
              border: '1px solid rgba(250,101,0,0.15)',
            }}
          >
            <ChefHat size={30} className="text-primary/65" />
          </motion.div>
        </motion.div>

        {/* Ghostly 404 numerals */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.65, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="select-none leading-none"
          style={{
            fontFamily: 'Cormorant Garamond, Georgia, serif',
            fontSize: 'clamp(8rem, 20vw, 15rem)',
            fontWeight: 500,
            color: '#fa6500',
            opacity: 0.12,
            lineHeight: 1,
            letterSpacing: '-0.04em',
            marginBottom: '-0.18em',
          }}
        >
          404
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="text-[clamp(1.8rem,4vw,2.8rem)] font-medium leading-tight mb-3"
          style={{
            fontFamily: 'Cormorant Garamond, Georgia, serif',
            color: 'hsl(var(--foreground))',
          }}
        >
          Lost in Translation
        </motion.h1>

        {/* Witty subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.34, ease: [0.22, 1, 0.36, 1] }}
          className="text-base leading-relaxed mb-8 max-w-sm"
          style={{ color: 'hsl(var(--muted-foreground))' }}
        >
          This page seems to have left the kitchen. The chef's special you're looking for is no longer on the menu.
        </motion.p>

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.46, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col sm:flex-row gap-3 justify-center w-full max-w-xs sm:max-w-none"
        >
          <motion.button
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/')}
            className="btn-primary px-7 py-3"
          >
            <Home size={16} />
            Go Home
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/discover')}
            className="btn-secondary px-7 py-3"
          >
            <Utensils size={16} />
            Browse Restaurants
          </motion.button>
        </motion.div>

        {/* Suggested searches */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.65, duration: 0.5 }}
          className="mt-12 pt-8 w-full"
          style={{ borderTop: '1px solid hsl(var(--border))' }}
        >
          <p
            className="text-xs font-bold uppercase tracking-[0.18em] mb-4"
            style={{ color: 'hsl(var(--muted-foreground))' }}
          >
            Try searching for
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {['Italian', 'Cafe', 'Rooftop', 'Fine Dining', 'Newari'].map((tag, i) => (
              <motion.button
                key={tag}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.68 + i * 0.06, duration: 0.3 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => navigate(`/search?q=${tag}`)}
                className="px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 bg-surface border border-border text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5"
              >
                {tag}
              </motion.button>
            ))}
          </div>
        </motion.div>

      </div>
    </div>
  );
};

export default NotFound;
