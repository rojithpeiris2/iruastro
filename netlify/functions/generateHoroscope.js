/**
 * Vedic Horoscope Generator
 * This function calculates the Vedic horoscope based on the provided date of birth, time, and location.
 * It returns the positions of planets, ascendant, and nakshatras.
 * @author: Rojith Peiris
 * @date: 2023-10-01
 * @version: 1.0.0  
 * @language: english
 */
const Astronomy = require('astronomy-engine');
const moment = require('moment-timezone');
require('dotenv').config();


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

// Nadi associations for each Nakshatra (index corresponds to nakshatra index)
const nadiAssociations = [
    'Adi',    'Madhya', 'Anthya',  // Ashwini, Bharani, Krittika
    'Adi',    'Madhya', 'Anthya',  // Rohini, Mrigashira, Ardra
    'Adi',    'Madhya', 'Anthya',  // Punarvasu, Pushya, Ashlesha
    'Adi',    'Madhya', 'Anthya',  // Magha, Purva Phalguni, Uttara Phalguni
    'Adi',    'Madhya', 'Anthya',  // Hasta, Chitra, Swati
    'Adi',    'Madhya', 'Anthya',  // Vishakha, Anuradha, Jyeshtha
    'Adi',    'Madhya', 'Anthya',  // Mula, Purva Ashadha, Uttara Ashadha
    'Adi',    'Madhya', 'Anthya',  // Shravana, Dhanishta, Shatabhisha
    'Adi',    'Madhya', 'Anthya'   // Purva Bhadrapada, Uttara Bhadrapada, Revati
];

// Yoni (animal) associations for each Nakshatra
const yoniAssociations = [
    { animal: 'Horse', gender: 'Male' },     // Ashwini
    { animal: 'Elephant', gender: 'Female' }, // Bharani
    { animal: 'Sheep', gender: 'Female' },    // Krittika
    { animal: 'Snake', gender: 'Female' },    // Rohini
    { animal: 'Snake', gender: 'Male' },      // Mrigashira
    { animal: 'Dog', gender: 'Female' },      // Ardra
    { animal: 'Cat', gender: 'Female' },      // Punarvasu
    { animal: 'Sheep', gender: 'Male' },      // Pushya
    { animal: 'Cat', gender: 'Male' },        // Ashlesha
    { animal: 'Rat', gender: 'Female' },      // Magha
    { animal: 'Rat', gender: 'Male' },        // Purva Phalguni
    { animal: 'Cow', gender: 'Female' },      // Uttara Phalguni
    { animal: 'Buffalo', gender: 'Female' },  // Hasta
    { animal: 'Tiger', gender: 'Female' },    // Chitra
    { animal: 'Buffalo', gender: 'Male' },    // Swati
    { animal: 'Tiger', gender: 'Male' },      // Vishakha
    { animal: 'Deer', gender: 'Female' },     // Anuradha
    { animal: 'Deer', gender: 'Male' },       // Jyeshtha
    { animal: 'Dog', gender: 'Male' },        // Mula
    { animal: 'Monkey', gender: 'Female' },   // Purva Ashadha
    { animal: 'Monkey', gender: 'Male' },     // Uttara Ashadha
    { animal: 'Lion', gender: 'Female' },     // Shravana
    { animal: 'Lion', gender: 'Male' },       // Dhanishta
    { animal: 'Horse', gender: 'Female' },    // Shatabhisha
    { animal: 'Elephant', gender: 'Male' },   // Purva Bhadrapada
    { animal: 'Cow', gender: 'Male' },        // Uttara Bhadrapada
    { animal: 'Elephant', gender: 'Female' }  // Revati
];

// Gana associations for each Nakshatra
const ganaAssociations = [
    'Deva',     // Ashwini
    'Manushya', // Bharani
    'Rakshasa', // Krittika
    'Manushya', // Rohini
    'Deva',     // Mrigashira
    'Manushya', // Ardra
    'Deva',     // Punarvasu
    'Deva',     // Pushya
    'Rakshasa', // Ashlesha
    'Rakshasa', // Magha
    'Manushya', // Purva Phalguni
    'Manushya', // Uttara Phalguni
    'Deva',     // Hasta
    'Rakshasa', // Chitra
    'Deva',     // Swati
    'Rakshasa', // Vishakha
    'Deva',     // Anuradha
    'Rakshasa', // Jyeshtha
    'Rakshasa', // Mula
    'Manushya', // Purva Ashadha
    'Manushya', // Uttara Ashadha
    'Deva',     // Shravana
    'Rakshasa', // Dhanishta
    'Rakshasa', // Shatabhisha
    'Manushya', // Purva Bhadrapada
    'Manushya', // Uttara Bhadrapada
    'Deva'      // Revati
];

/**
 * Gets the Nadi (pulse/energy flow) for a given Nakshatra
 * @param {number} nakshatraIndex - Index of the Nakshatra (0-26)
 * @returns {string} Returns 'Adi', 'Madhya', or 'Anthya'
 */
function getNadi(nakshatraIndex) {
    return nadiAssociations[nakshatraIndex];
}

/**
 * Gets the Yoni (animal symbol) for a given Nakshatra
 * @param {number} nakshatraIndex - Index of the Nakshatra (0-26)
 * @returns {Object} Returns object with animal name and gender
 */
function getYoni(nakshatraIndex) {
    return yoniAssociations[nakshatraIndex];
}

/**
 * Gets the Gana (temperament) for a given Nakshatra
 * @param {number} nakshatraIndex - Index of the Nakshatra (0-26)
 * @returns {string} Returns 'Deva', 'Manushya', or 'Rakshasa'
 */
function getGana(nakshatraIndex) {
    return ganaAssociations[nakshatraIndex];
}

/**
 * Calculates the Ayanamsa (precession of equinoxes) for a given date
 * @param {Date} date - The date to calculate Ayanamsa for
 * @returns {number} Returns the Ayanamsa value in degrees
 */
function calculateAyanamsa(date) {
    const referenceDate = new Date('1950-01-01T00:00:00Z');
    const referenceDegrees = 23.15;
    const annualRate = 50.2388475 / 3600;
    const yearDiff = (date - referenceDate) / (365.25 * 24 * 60 * 60 * 1000);
    return referenceDegrees + (annualRate * yearDiff);
}

/**
 * Gets the Rashi (zodiac sign) information for a given celestial longitude
 * @param {number} eclipticLongitude - The tropical longitude
 * @param {number} ayanamsa - The Ayanamsa value to convert to sidereal
 * @returns {Object} Returns detailed Rashi information
 */
function getRashi(eclipticLongitude, ayanamsa) {
    const normalizedInput = ((eclipticLongitude % 360) + 360) % 360;
    let siderealLong = normalizedInput - ayanamsa;
    siderealLong = ((siderealLong % 360) + 360) % 360;
    const rashiIndex = Math.floor(siderealLong / 30);
    const degree = siderealLong % 30;

    return {
        rashi: rashis[rashiIndex],
        longitude: degree,
        absoluteLongitude: siderealLong,
        rashiNumber: rashiIndex + 1,
        siderealPosition: siderealLong,
        tropicalPosition: normalizedInput,
        appliedAyanamsa: ayanamsa
    };
}

/**
 * Gets the Nakshatra (lunar mansion) information for Moon's position
 * @param {number} moonLongitude - The Moon's tropical longitude
 * @param {number} ayanamsa - The Ayanamsa value to convert to sidereal
 * @returns {Object} Returns Nakshatra details including Pada, Nadi, Yoni, and Gana
 */
function getNakshatra(moonLongitude, ayanamsa) {
    const siderealLong = moonLongitude - ayanamsa;
    const normalizedLong = ((siderealLong % 360) + 360) % 360;
    const nakshatraIndex = Math.floor(normalizedLong * 27 / 360);
    return {
        nakshatra: nakshatras[nakshatraIndex],
        pada: Math.floor((normalizedLong * 27 % 360) / (360 / 27 / 4)) + 1,
        nadi: getNadi(nakshatraIndex),
        yoni: getYoni(nakshatraIndex),
        gana: getGana(nakshatraIndex)
    };
}

/**
 * Calculates the Ascendant (Lagna) degree for a given time and location
 * @param {Date} dateTime - The date and time of calculation
 * @param {Object} observer - Object containing latitude, longitude of the location
 * @returns {number} Returns the Ascendant degree in tropical zodiac
 */
function calculateAscendant(dateTime, observer) {
    const jd = Astronomy.MakeTime(dateTime);
    const gst = Astronomy.SiderealTime(dateTime);
    const lst = (gst + (observer.longitude / 15));
    let lstDeg = ((lst * 15) % 360 + 360) % 360;
    const lat = observer.latitude * Math.PI / 180;
    const lstRad = lstDeg * Math.PI / 180;
    const obliquityRad = 23.4367 * Math.PI / 180;
    const sinLst = Math.sin(lstRad);
    const cosLst = Math.cos(lstRad);
    const tanLat = Math.tan(lat);

    let ascendant = Math.atan2(
        cosLst,
        -(sinLst * Math.cos(obliquityRad) + tanLat * Math.sin(obliquityRad))
    );

    ascendant = ascendant * 180 / Math.PI;
    return ((ascendant + 360) % 360);
}

/**
 * Calculates the positions of Rahu (North Node) and Ketu (South Node)
 * @param {Date} dateTime - The date and time of calculation
 * @returns {Object} Returns positions of Rahu and Ketu with additional details
 */
function calculateLunarNodes(dateTime) {
    const jd = Astronomy.MakeTime(dateTime).tt;
    const T = (jd - 2451545.0) / 36525.0;
    let meanNode = 251.0445479 - 1934.1362891 * T
        + 0.0020754 * T * T
        + T * T * T / 467441.0;
    meanNode += 0.00256 * Math.cos((198.867398 + 0.0090019 * T) * Math.PI / 180);
    meanNode = ((meanNode % 360) + 360) % 360;
    return {
        rahu: meanNode,
        ketu: (meanNode + 180) % 360,
        julianDate: jd,
        centuriesSinceJ2000: T
    };
}

/**
 * Validates the Bearer token from the request headers
 * @param {Object} event - The Netlify event object containing request details
 * @returns {boolean} Returns true if token is valid, false otherwise
 */
function validateToken(event) {
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return false;
    }

    console.log("token", process.env.IRUASTRO_ACCESS_TOKEN);
    console.log("authHeader", authHeader);
    const token = authHeader.split(' ')[1];
    return token === process.env.IRUASTRO_ACCESS_TOKEN;
}

/**
 * Main handler function for the Netlify serverless function
 * Processes incoming requests and generates Vedic horoscope
 * @param {Object} event - The Netlify event object containing request details
 * @returns {Promise<Object>} Returns horoscope calculation results
 */
exports.handler = async (event) => {
    // Check HTTP method
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ message: 'Only POST requests are allowed' }),
        };
    }

    // Validate Bearer token
    if (!validateToken(event)) {
        return {
            statusCode: 401,
            body: JSON.stringify({ 
                message: "Unauthorized access. Please provide a valid Bearer token.",
                error: 'UNAUTHORIZED'
            }),
        };
    }

    try {
        if (!event.body) throw new Error('Request body is missing');
        const { dob, time, location, timezone = 'Asia/Colombo' } = JSON.parse(event.body);

        const errors = [];
        if (!dob) errors.push('dob is required');
        if (!time) errors.push('time is required');
        if (!location || typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
            errors.push('Valid location.latitude and location.longitude are required');
        }

        if (errors.length > 0) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Validation errors', errors }),
            };
        }

        const localDateTime = moment.tz(`${dob} ${time}`, 'YYYY-MM-DD HH:mm', timezone);
        if (!localDateTime.isValid()) throw new Error('Invalid date or time format');

        const dateTime = new Date(localDateTime.utc().format());
        const observer = new Astronomy.Observer(
            location.latitude,
            location.longitude,
            location.elevation || 0
        );

        const ayanamsa = calculateAyanamsa(dateTime);
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

        const moonVector = Astronomy.GeoVector('Moon', dateTime, true);
        const moonEcliptic = Astronomy.Ecliptic(moonVector);
        const nakshatraInfo = getNakshatra(moonEcliptic.elon, ayanamsa);

        const lunarNodes = calculateLunarNodes(dateTime);
        const rahuInfo = getRashi(lunarNodes.rahu, ayanamsa);
        const ketuInfo = getRashi(lunarNodes.ketu, ayanamsa);

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

        const ascendantLongitude = calculateAscendant(dateTime, observer);
        const lagnaInfo = getRashi(ascendantLongitude, ayanamsa);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Vedic horoscope calculated successfully',
                date: dateTime.toISOString(),
                location,
                timezone,
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
        return {
            statusCode: 500,
            body: JSON.stringify({ message: error.message }),
        };
    }
};
