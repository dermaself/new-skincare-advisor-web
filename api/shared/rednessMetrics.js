const { createLogger } = require('./logger');
const logger = createLogger('RednessMetrics');

/**
 * Calcola l'area di un poligono usando la formula di Shoelace.
 * @param {Array<[number, number]>} vertices - Array di vertici [x, y].
 * @returns {number} L'area del poligono.
 */
function polygonArea(vertices) {
  let area = 0;
  const n = vertices.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += vertices[i][0] * vertices[j][1];
    area -= vertices[j][0] * vertices[i][1];
  }
  return Math.abs(area / 2.0);
}

/**
 * Calcola le metriche di arrossamento dalla risposta dell'API.
 * @param {Object} rednessResult - Il risultato dall'API di redness detection.
 * @returns {Object} Un oggetto con metriche calcolate.
 */
function computeRednessMetrics(rednessResult) {
  if (!rednessResult || !Array.isArray(rednessResult.polygons) || !rednessResult.analysis_width || !rednessResult.analysis_height) {
    logger.warn('Invalid rednessResult provided, returning default metrics', { rednessResult });
    return {
      num_polygons: 0,
      polygons: [],
      analysis_width: 0,
      analysis_height: 0,
      erythema: false,
      redness_perc: 0,
      error: 'Invalid input data'
    };
  }

  const { polygons, analysis_width, analysis_height } = rednessResult;
  const totalImageArea = analysis_width * analysis_height;

  if (totalImageArea === 0) {
      logger.warn('Total image area is zero, cannot compute percentage.');
      return {
        ...rednessResult,
        erythema: false,
        redness_perc: 0,
      };
  }

  const totalPolygonArea = polygons.reduce((sum, polygon) => sum + polygonArea(polygon), 0);
  const redness_perc = (totalPolygonArea / totalImageArea) * 100;
  
  // se è maggiore del 10% è true
  const erythema = redness_perc > 10;

  logger.info('Redness metrics calculated', { totalPolygonArea, totalImageArea, redness_perc, erythema });

  return {
    ...rednessResult,
    erythema,
    redness_perc: parseFloat(redness_perc.toFixed(2)), // Arrotonda a 2 decimali
  };
}

module.exports = { computeRednessMetrics, polygonArea }; 