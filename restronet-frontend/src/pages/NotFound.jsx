import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Search, ArrowLeft, Frown } from 'lucide-react';
import { motion } from 'framer-motion';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-8 flex justify-center"
        >
          <div className="relative">
            <div className="w-32 h-32 bg-orange-100 rounded-full flex items-center justify-center">
              <Frown size={64} className="text-orange-500" />
            </div>
            <motion.div
              animate={{ 
                rotate: [0, 10, -10, 0],
                y: [0, -5, 5, 0]
              }}
              transition={{ repeat: Infinity, duration: 4 }}
              className="absolute -top-2 -right-2 bg-white p-2 rounded-xl shadow-lg border border-gray-100"
            >
              <span className="text-2xl">🍕</span>
            </motion.div>
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-6xl font-black text-gray-900 mb-4 tracking-tighter"
        >
          404
        </motion.h1>
        
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-2xl font-bold text-gray-800 mb-4"
        >
          Lost in the flavor?
        </motion.h2>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-gray-500 mb-10 leading-relaxed"
        >
          We couldn't find the page you're looking for. It might have been moved or doesn't exist anymore.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 px-8 py-4 bg-white border-2 border-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-50 transition-all active:scale-95"
          >
            <ArrowLeft size={18} />
            Go Back
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex items-center justify-center gap-2 px-8 py-4 bg-orange-500 text-white font-bold rounded-2xl hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/25 active:scale-95"
          >
            <Home size={18} />
            Back Home
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-16 pt-8 border-t border-gray-100"
        >
          <p className="text-sm text-gray-400 font-medium mb-4">Try searching for something else:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {['Italian', 'Cafe', 'Rooftop', 'Fine Dining'].map(tag => (
              <button
                key={tag}
                onClick={() => navigate(`/search?q=${tag}`)}
                className="text-xs font-bold px-3 py-1.5 bg-gray-50 text-gray-500 rounded-lg hover:bg-orange-50 hover:text-orange-600 transition-colors"
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
