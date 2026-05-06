/**
 * Computes the cosine similarity between two vectors.
 * 
 * @param {Array<Number>} vecA 
 * @param {Array<Number>} vecB 
 * @returns {Number} Cosine similarity (0 to 1, or -1 to 1 depending on data)
 */
const cosineSimilarity = (vecA, vecB) => {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0 || vecA.length !== vecB.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

module.exports = {
  cosineSimilarity
};
