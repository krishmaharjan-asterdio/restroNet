/**
 * Calculates the Haversine distance between two points on the Earth.
 * 
 * @param {Array<Number>} coord1 - [longitude, latitude] of the first point
 * @param {Array<Number>} coord2 - [longitude, latitude] of the second point
 * @returns {Number} - The distance in kilometers
 */
const calculateHaversineDistance = (coord1, coord2) => {
  if (!coord1 || !coord2 || coord1.length !== 2 || coord2.length !== 2) {
    return 0; // Invalid coordinates
  }

  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;

  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2); 
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  const distance = R * c; // Distance in km
  
  return distance;
};

module.exports = {
  calculateHaversineDistance
};
