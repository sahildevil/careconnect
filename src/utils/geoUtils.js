import { Platform } from 'react-native';

const GOOGLE_API_KEY = process.env.maps_api_key;

/**
 * Calculate straight-line distance using Haversine formula
 * @param {number} lat1 - Patient's latitude
 * @param {number} lng1 - Patient's longitude 
 * @param {number} lat2 - Doctor's latitude
 * @param {number} lng2 - Doctor's longitude
 * @returns {number} Distance in kilometers
 */
export const calculateHaversineDistance = (lat1, lng1, lat2, lng2) => {
  if (!lat1 || !lng1 || !lat2 || !lng2) {
    return null;
  }
  
  const R = 6371; // Radius of Earth in kilometers
  const rlat1 = lat1 * (Math.PI/180);
  const rlat2 = lat2 * (Math.PI/180); 
  const difflat = rlat2 - rlat1; 
  const difflon = (lng2 - lng1) * (Math.PI/180);

  const d = 2 * R * Math.asin(
    Math.sqrt(
      Math.sin(difflat/2) * Math.sin(difflat/2) +
      Math.cos(rlat1) * Math.cos(rlat2) * 
      Math.sin(difflon/2) * Math.sin(difflon/2)
    )
  );
  
  return d;
};

/**
 * Calculate route distances using Google Maps Distance Matrix API
 * @param {Object} patientLocation - {latitude, longitude}
 * @param {Array} doctorsList - Array of doctor objects with latitude/longitude
 * @returns {Promise} Promise resolving to array of doctors with distance/duration
 */
export const calculateRouteDistances = async (patientLocation, doctorsList) => {
  try {
    // Filter out doctors without valid coordinates
    const doctorsWithCoords = doctorsList.filter(doctor => 
      doctor.latitude && doctor.longitude
    );
    
    if (doctorsWithCoords.length === 0) {
      return [];
    }

    // Process in batches of 25 (API limit)
    const batchSize = 25;
    let results = [];
    
    for (let i = 0; i < doctorsWithCoords.length; i += batchSize) {
      const batchDoctors = doctorsWithCoords.slice(i, i + batchSize);
      
      // Format destinations for API
      const destinations = batchDoctors.map(doctor => 
        `${doctor.latitude},${doctor.longitude}`
      ).join('|');
      
      const origin = `${patientLocation.latitude},${patientLocation.longitude}`;
      
      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?` +
        `origins=${origin}&destinations=${destinations}` +
        `&mode=driving&units=metric&key=${GOOGLE_API_KEY}`;
        
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === 'OK') {
        // Process results for this batch
        const elements = data.rows[0].elements;
        
        for (let j = 0; j < elements.length; j++) {
          const element = elements[j];
          
          if (element.status === 'OK') {
            const batchIndex = i + j;
            if (batchIndex < doctorsWithCoords.length) {
              results.push({
                ...doctorsWithCoords[j],
                distance: element.distance.value / 1000, // Convert to km
                distanceText: element.distance.text,
                duration: element.duration.text,
                durationValue: element.duration.value, // in seconds
                distanceSource: 'route'
              });
            }
          }
        }
      } else {
        console.error('Error from Distance Matrix API:', data.status);
        // Fall back to Haversine for this batch
        const haversineResults = batchDoctors.map(doctor => ({
          ...doctor,
          distance: calculateHaversineDistance(
            patientLocation.latitude, 
            patientLocation.longitude,
            parseFloat(doctor.latitude), 
            parseFloat(doctor.longitude)
          ),
          distanceSource: 'haversine'
        }));
        results = [...results, ...haversineResults];
      }
    }

    // Sort by distance
    return results.sort((a, b) => a.distance - b.distance);
  } catch (error) {
    console.error('Error calculating route distances:', error);
    
    // Fall back to Haversine for all doctors
    return doctorsList.map(doctor => ({
      ...doctor,
      distance: calculateHaversineDistance(
        patientLocation.latitude, 
        patientLocation.longitude,
        parseFloat(doctor.latitude), 
        parseFloat(doctor.longitude)
      ),
      distanceSource: 'haversine'
    })).sort((a, b) => {
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
    });
  }
};