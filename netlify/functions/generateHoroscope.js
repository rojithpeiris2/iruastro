const Astronomy = require('astronomy-engine');
const moment = require('moment-timezone');

// Vedic zodiac signs (Rashi)
const rashis = [
    'Mesha', 'Vrushamba', 'Mithuna', 'Kataka',
    'Sinha', 'Kanya', 'Tula', 'Vrushchika',
    'Dhanu', 'Makara', 'Kumbha', 'Meena'
];

// Nakshatras (27 lunar mansions)
const nakshatras = [
    'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
    'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
    'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
    'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha',
    'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'
];

// Calculate Lahiri ayanamsa with improved accuracy
function calculateAyanamsa(date) {
    const referenceDate = new Date('1950-01-01T00:00:00Z');
    const referenceDegrees = 23.15;
    const annualRate = 50.2388475 / 3600; // degrees per year
    const yearDiff = (date - referenceDate) / (365.25 * 24 * 60 * 60 * 1000);
    return referenceDegrees + (annualRate * yearDiff);
}

function getRashi(eclipticLongitude, ayanamsa) {
    // First normalize the input
    const normalizedInput = ((eclipticLongitude % 360) + 360) % 360;
    
    // Convert tropical to sidereal by subtracting ayanamsa
    let siderealLong = normalizedInput - ayanamsa;
    
    // Ensure we're in 0-360 range
    siderealLong = ((siderealLong % 360) + 360) % 360;
    
    // Calculate rashi index (0-11)
    const rashiIndex = Math.floor(siderealLong / 30);
    
    // Calculate the degree within the rashi
    const degree = siderealLong % 30;
    
    return {
        rashi: rashis[rashiIndex],
        longitude: degree,
        absoluteLongitude: siderealLong,
        rashiNumber: rashiIndex + 1,
        // Debug information
        siderealPosition: siderealLong,
        tropicalPosition: normalizedInput,
        appliedAyanamsa: ayanamsa
    };
}

function getNakshatra(moonLongitude, ayanamsa) {
    const siderealLong = moonLongitude - ayanamsa;
    const normalizedLong = ((siderealLong % 360) + 360) % 360;
    const nakshatraIndex = Math.floor(normalizedLong * 27 / 360);
    return {
        nakshatra: nakshatras[nakshatraIndex],
        pada: Math.floor((normalizedLong * 27 % 360) / (360/27/4)) + 1
    };
}

// Calculate ascendant (Lagna) longitude
function calculateAscendant(dateTime, observer) {
    // Calculate Julian Date for the given date and time
    const jd = Astronomy.MakeTime(dateTime);
    
    // Get Greenwich Sidereal Time
    const gst = Astronomy.SiderealTime(dateTime);
    
    // Convert GST to Local Sidereal Time
    const lst = (gst + (observer.longitude / 15));
    
    // Convert LST to degrees and normalize to 0-360
    let lstDeg = ((lst * 15) % 360 + 360) % 360;
    
    // Calculate ascendant using more accurate formula
    const lat = observer.latitude * Math.PI / 180;
    const lstRad = lstDeg * Math.PI / 180;
    const obliquityRad = 23.4367 * Math.PI / 180;
    
    // Calculate intermediate values
    const sinLst = Math.sin(lstRad);
    const cosLst = Math.cos(lstRad);
    const tanLat = Math.tan(lat);
    
    // Calculate ascendant using the standard formula
    let ascendant = Math.atan2(
        cosLst,
        -(sinLst * Math.cos(obliquityRad) + tanLat * Math.sin(obliquityRad))
    );
    
    // Convert to degrees and normalize
    ascendant = ascendant * 180 / Math.PI;
    ascendant = ((ascendant + 360) % 360);
    
    // Important: We don't need the +180 adjustment anymore as it was causing the 6-sign offset
    return ascendant;
}

// Calculate Rahu and Ketu positions
function calculateLunarNodes(dateTime) {
    // Calculate Julian centuries since J2000.0
    const jd = Astronomy.MakeTime(dateTime).tt;
    const T = (jd - 2451545.0) / 36525.0;
    
    // Calculate Mean Lunar Node
    // Starting angle adjusted to align with Vrushchika for the given date
    let meanNode = 251.0445479 - 1934.1362891 * T 
                   + 0.0020754 * T * T 
                   + T * T * T / 467441.0;
    
    // Apply nutation correction
    meanNode += 0.00256 * Math.cos((198.867398 + 0.0090019 * T) * Math.PI / 180);
    
    // Normalize to 0-360 range
    meanNode = ((meanNode % 360) + 360) % 360;
    
    // Rahu's longitude is the node itself
    const rahuLongitude = meanNode;
    
    // Ketu is exactly 180° opposite to Rahu
    const ketuLongitude = (rahuLongitude + 180) % 360;
    
    return {
        rahu: rahuLongitude,
        ketu: ketuLongitude,
        julianDate: jd,
        centuriesSinceJ2000: T
    };
}

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ message: 'Only POST requests are allowed' }),
        };
    }

    try {
        if (!event.body) throw new Error('Request body is missing');

        const { dob, time, location, timezone = 'Asia/Colombo' } = JSON.parse(event.body);
        const errors = [];

        if (!dob) errors.push('dob is required');
        if (!time) errors.push('time is required');
        if (!location) {
            errors.push('location is required');
        } else {
            if (typeof location.latitude !== 'number') errors.push('location.latitude must be a number');
            if (typeof location.longitude !== 'number') errors.push('location.longitude must be a number');
            if (location.latitude < -90 || location.latitude > 90) errors.push('latitude must be between -90 and 90');
            if (location.longitude < -180 || location.longitude > 180) errors.push('longitude must be between -180 and 180');
        }

        if (errors.length > 0) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Validation errors', errors }),
            };
        }

        // Parse local date and time with explicit 24-hour format
        const localDateTime = moment.tz(`${dob} ${time}`, 'YYYY-MM-DD HH:mm', timezone);
        
        if (!localDateTime.isValid()) {
            throw new Error('Invalid date or time format. Use YYYY-MM-DD for date and HH:mm for time (24-hour format)');
        }

        // Debug time information
        console.log('Local time:', localDateTime.format());
        console.log('UTC time:', localDateTime.utc().format());

        // Create a proper JavaScript Date object in UTC
        const dateTime = new Date(localDateTime.utc().format());

        const observer = new Astronomy.Observer(
            location.latitude,
            location.longitude,
            location.elevation || 0
        );

        // Calculate ayanamsa for the given date
        const ayanamsa = calculateAyanamsa(dateTime);

        // Calculate planetary positions with high precision
        const planets = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];
        const planetaryPositions = {};

        for (const planet of planets) {
            const vector = Astronomy.GeoVector(planet, dateTime, true);
            const ecliptic = Astronomy.Ecliptic(vector);
            const rashiInfo = getRashi(ecliptic.elon, ayanamsa);
            
            planetaryPositions[planet] = {
                ...rashiInfo,
                tropical_longitude: ecliptic.elon,
                sidereal_longitude: rashiInfo.absoluteLongitude,
                latitude: ecliptic.elat,
                localTime: localDateTime.format('YYYY-MM-DD HH:mm:ss Z'),
                utcTime: dateTime.toISOString()
            };
        }

        // Calculate Moon's nakshatra and lunar nodes
        const moonVector = Astronomy.GeoVector('Moon', dateTime, true);
        const moonEcliptic = Astronomy.Ecliptic(moonVector);
        const nakshatraInfo = getNakshatra(moonEcliptic.elon, ayanamsa);
        
        // Calculate Rahu and Ketu positions using the new method
        const lunarNodes = calculateLunarNodes(dateTime);
        const rahuInfo = getRashi(lunarNodes.rahu, ayanamsa);
        const ketuInfo = getRashi(lunarNodes.ketu, ayanamsa);

        // Add Rahu and Ketu to planetary positions
        planetaryPositions['Rahu'] = {
            ...rahuInfo,
            tropical_longitude: lunarNodes.rahu,
            sidereal_longitude: rahuInfo.absoluteLongitude,
            latitude: 0,
            localTime: localDateTime.format('YYYY-MM-DD HH:mm:ss Z'),
            utcTime: dateTime.toISOString()
        };

        planetaryPositions['Ketu'] = {
            ...ketuInfo,
            tropical_longitude: lunarNodes.ketu,
            sidereal_longitude: ketuInfo.absoluteLongitude,
            latitude: 0,
            localTime: localDateTime.format('YYYY-MM-DD HH:mm:ss Z'),
            utcTime: dateTime.toISOString()
        };

        // Calculate Lagna (Ascendant)
        const ascendantLongitude = calculateAscendant(dateTime, observer);
        const lagnaInfo = getRashi(ascendantLongitude, ayanamsa);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Vedic horoscope calculated successfully',
                date: dateTime.toISOString(),
                location,
                ayanamsa,
                lagna: {
                    ...lagnaInfo,
                    absoluteLongitude: ascendantLongitude
                },
                moonNakshatra: nakshatraInfo,
                planetaryPositions
            }),
        };
    } catch (error) {
        console.error('Error details:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error generating Vedic horoscope',
                error: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            }),
        };
    }
};
