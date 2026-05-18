import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-warm-50 flex items-center justify-center px-6">
      <div className="max-w-lg w-full text-center">

        {/* Large decorative 404 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative select-none"
        >
          <span
            className="text-[8rem] font-medium leading-none text-warm-200 block"
            style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}
          >
            404
          </span>
          {/* Heading overlaid on top */}
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
            className="text-3xl font-medium text-warm-900 -mt-6"
            style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}
          >
            Page not found
          </motion.h1>
        </motion.div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="text-warm-500 text-base mt-3 mb-8 leading-relaxed"
        >
          We couldn't find the page you're looking for. It may have been moved or no longer exists.
        </motion.p>

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.5 }}
          className="flex flex-col sm:flex-row gap-3 justify-center"
        >
          <button
            onClick={() => navigate(-1)}
            className="bg-white hover:bg-warm-50 text-warm-800 font-semibold px-5 py-2.5 rounded-xl border border-warm-200 shadow-card transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft size={16} />
            Go Back
          </button>
          <button
            onClick={() => navigate('/')}
            className="bg-primary hover:bg-primary-hover text-white font-semibold px-5 py-2.5 rounded-xl shadow-primary transition-all flex items-center justify-center gap-2"
          >
            <Home size={16} />
            Back Home
          </button>
        </motion.div>

        {/* Suggested searches */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.75, duration: 0.5 }}
          className="mt-12 pt-8 border-t border-warm-200"
        >
          <p className="text-sm text-warm-400 font-medium mb-4">Try searching for:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {['Italian', 'Cafe', 'Rooftop', 'Fine Dining'].map(tag => (
              <button
                key={tag}
                onClick={() => navigate(`/search?q=${tag}`)}
                className="bg-white border border-warm-200 rounded-full px-4 py-2 text-sm font-medium text-warm-600 hover:border-primary/40 hover:text-primary cursor-pointer transition-all"
              >
                {tag}
              </button>
            ))}
          </div>
        </motion.div>

      </div>
    </div>
  );
};

export default NotFound;
