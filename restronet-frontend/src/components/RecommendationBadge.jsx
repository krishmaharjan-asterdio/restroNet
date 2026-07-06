export const RecommendationBadge = ({ scoreBreakdown }) => {
  if (!scoreBreakdown) return null;

  const reasons = [];

  if (scoreBreakdown.cuisineMatch > 0)    reasons.push('Matches your cuisine');
  if (scoreBreakdown.tagMatch > 0)        reasons.push('Matches your vibe');
  if (scoreBreakdown.locationScore > 0.5) reasons.push('Near you');
  if (scoreBreakdown.ratingScore > 0.7)   reasons.push('Highly rated');
  if (scoreBreakdown.priceMatch > 0)      reasons.push('Your price range');

  if (reasons.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {reasons.slice(0, 2).map(reason => (
        <span
          key={reason}
          className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300"
        >
          {reason}
        </span>
      ))}
    </div>
  );
};
