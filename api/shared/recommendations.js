const axios = require('axios');
const config = require('./config');
const { createLogger } = require('./logger');

const logger = createLogger('recommendations');

// URL dell'API di raccomandazioni esterna
const RECOMMENDATIONS_API_URL = 'https://azure-products-recommendation-api-ekbsh3gzhug3cecv.westeurope-01.azurewebsites.net/api/RecommendationFunction';

/**
 * Mappa i dati di analisi acne al formato richiesto dall'API di raccomandazioni
 * @param {Object} acneAnalysis - Risultato dell'analisi acne
 * @param {Object} userData - Dati utente opzionali
 * @returns {Object} Payload per l'API di raccomandazioni
 */
function mapAcneToRecommendationPayload(acneAnalysis, userData = {}) {
  // Mappa la severità dall'analisi acne
  const severityMapping = {
    'None': 'none',
    'Mild': 'mild', 
    'Moderate': 'moderate',
    'Severe': 'severe'
  };

  // Mappa il tipo di acne basato sui conteggi
  function determineAcneType(counts) {
    const { Cysts = 0, Nodules = 0, Papules = 0, Pustules = 0, Comedones = 0 } = counts;
    
    // Logica per determinare il tipo di acne basata sui conteggi
    if (Cysts > 0 || Nodules > 0) {
      return 'nodulocystic';
    } else if (Papules > 0 || Pustules > 0) {
      return 'papulopustular';
    } else if (Comedones > 0) {
      return 'comedonic';
    } else {
      return 'mild';
    }
  }

  const payload = {
    first_name: userData.first_name || 'User',
    last_name: userData.last_name || '',
    birthdate: userData.birthdate || '1990-01-01',
    gender: userData.gender || 'female',
    acne_type: determineAcneType(acneAnalysis.counts),
    acne_severity: severityMapping[acneAnalysis.severity] || 'mild',
    erythema: userData.erythema || false,
    budget_level: userData.budget_level || 'Medium',
    shop_domain: userData.shop_domain || 'dermaself'
  };

  logger.info('Mapped acne analysis to recommendation payload', {
    acneAnalysis: acneAnalysis,
    payload: payload
  });

  return payload;
}

/**
 * Chiama l'API di raccomandazioni esterna
 * @param {Object} acneAnalysis - Risultato dell'analisi acne  
 * @param {Object} userData - Dati utente opzionali
 * @returns {Promise<Object>} Raccomandazioni prodotti
 */
async function getProductRecommendations(acneAnalysis, userData = {}) {
  const startTime = Date.now();
  
  try {
    const payload = mapAcneToRecommendationPayload(acneAnalysis, userData);
    
    logger.info('Calling recommendations API', {
      url: RECOMMENDATIONS_API_URL,
      payload: payload
    });

    const response = await axios.post(RECOMMENDATIONS_API_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 30000 // 30 secondi timeout
    });

    const duration = Date.now() - startTime;

    logger.info('Recommendations API response received', {
      status: response.status,
      duration: duration,
      hasRoutine: !!response.data.skincare_routine,
      routineModules: response.data.skincare_routine?.length || 0
    });

    return {
      success: true,
      data: response.data,
      duration: duration
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Recommendations API failed', {
      error: error.message,
      status: error.response?.status,
      duration: duration,
      url: RECOMMENDATIONS_API_URL
    });

    // Ritorna un fallback in caso di errore
    return {
      success: false,
      error: error.message,
      fallback: {
        user: {
          first_name: userData.first_name || 'User',
          last_name: userData.last_name || '',
          age: '25',
          gender: userData.gender || 'female'
        },
        skincare_routine: [],
        message: 'Raccomandazioni temporaneamente non disponibili'
      },
      duration: duration
    };
  }
}

/**
 * Combina l'analisi acne con le raccomandazioni prodotti
 * @param {Object} inferenceResult - Risultato dell'inferenza Roboflow
 * @param {Object} userData - Dati utente opzionali
 * @returns {Promise<Object>} Risultato combinato
 */
async function enrichWithRecommendations(inferenceResult, userData = {}) {
  try {
    const recommendations = await getProductRecommendations(inferenceResult.acne, userData);
    
    return {
      ...inferenceResult,
      recommendations: recommendations.success ? recommendations.data : recommendations.fallback,
      recommendations_meta: {
        success: recommendations.success,
        duration: recommendations.duration,
        error: recommendations.error || null
      }
    };
    
  } catch (error) {
    logger.error('Error enriching with recommendations', error);
    
    // Ritorna il risultato originale senza raccomandazioni in caso di errore
    return {
      ...inferenceResult,
      recommendations: null,
      recommendations_meta: {
        success: false,
        error: error.message
      }
    };
  }
}

module.exports = {
  getProductRecommendations,
  enrichWithRecommendations,
  mapAcneToRecommendationPayload
}; 