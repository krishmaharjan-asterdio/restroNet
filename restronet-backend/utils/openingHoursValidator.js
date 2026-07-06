const validateBookingTime = (openingHours, date, timeStr) => {
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName  = dayNames[new Date(date).getDay()];
  const hours    = openingHours?.[dayName];

  if (!hours) return { allowed: true };

  if (hours.isClosed) {
    return { allowed: false, message: `The restaurant is closed on ${dayName}s.` };
  }

  if (!hours.open || !hours.close) return { allowed: true };

  const toMins = (hhmm) => {
    if (!hhmm || typeof hhmm !== 'string' || !hhmm.includes(':')) return null;
    const [h, m] = hhmm.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  };

  const openMins  = toMins(hours.open);
  const closeMins = toMins(hours.close);
  const reqMins   = toMins(timeStr);

  if (openMins === null || closeMins === null || reqMins === null) return { allowed: true };

  const isOpen = closeMins > openMins
    ? reqMins >= openMins && reqMins < closeMins
    : reqMins >= openMins || reqMins < closeMins;

  if (!isOpen) {
    return {
      allowed: false,
      message: `The restaurant is open ${hours.open}–${hours.close} on ${dayName}s. Please choose a time within opening hours.`,
    };
  }

  return { allowed: true };
};

module.exports = { validateBookingTime };
