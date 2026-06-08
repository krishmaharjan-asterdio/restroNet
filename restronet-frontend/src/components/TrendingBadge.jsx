export const TrendingBadge = ({ isTrending }) => {
  if (!isTrending) return null;

  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
      🔥 Trending
    </span>
  );
};
