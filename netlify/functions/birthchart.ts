/**
 * Vedic Horoscope Generator
 * This function calculates the Vedic horoscope based on the provided date of birth, time, and location.
 * It returns the positions of planets, ascendant, and nakshatras.
 * @author: Rojith Peiris
 * @date: 2023-10-01
 * @version: 1.0.0  
 * @language: english
 */
import { Handler } from '@netlify/functions';
import * as Astronomy from 'astronomy-engine';
import * as moment from 'moment-timezone';
import 'dotenv/config';

// Define astronomy types
type Body = 'Sun' | 'Moon' | 'Mercury' | 'Venus' | 'Mars' | 'Jupiter' | 'Saturn';
type LingaType = 'Male' | 'Female' | 'Napunsaka';
type PlanetName = 'Sun' | 'Moon' | 'Mars' | 'Mercury' | 'Jupiter' | 'Venus' | 'Saturn';

interface Location {
    latitude: number;
    longitude: number;
    elevation?: number;
}

interface HoroscopeRequest {
    dob: string;
    time: string;
    location: Location;
    timezone?: string;
    language?: 'en' | 'si';  // 'en' for English, 'si' for Sinhala
}

interface RashiInfo {
    rashi: string;
}

interface NakshatraInfo {
    nakshatra: string;
    pada: number;
    linga: string;
    ruler: string;
    yoni: string;
}

interface PlanetaryPosition extends RashiInfo {
    degree: number;
    nakshatra: string;
    pada: number;
    linga: string;
    ruler: string;
    dignity: string;
}

interface HoroscopeResponse {
    message: string;
    date: string;
    location: Location;
    timezone: string;
    ayanamsa: number;
    lagna: RashiInfo & { degree: number };
    moonNakshatra: NakshatraInfo;
    planetaryPositions: Record<string, PlanetaryPosition>;
}

// Language translations
const translations = {
    en: {
        rashis: [
            'Mesha', 'Vrushamba', 'Mithuna', 'Kataka',
            'Sinha', 'Kanya', 'Tula', 'Vrushchika',
            'Dhanu', 'Makara', 'Kumbha', 'Meena'
        ],
        nakshatras: [
            'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
            'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
            'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
            'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha',
            'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'
        ],
        linga: {
            'Male': 'Male',
            'Female': 'Female',
            'Napunsaka': 'Neutral'
        },
        rulers: {
            'Ketu': 'Ketu',
            'Venus': 'Venus',
            'Sun': 'Sun',
            'Moon': 'Moon',
            'Mars': 'Mars',
            'Rahu': 'Rahu',
            'Jupiter': 'Jupiter',
            'Saturn': 'Saturn',
            'Mercury': 'Mercury'
        },
        yoni: {
            'Horse': 'Horse',
            'Elephant': 'Elephant',
            'Sheep': 'Sheep',
            'Snake': 'Snake',
            'Serpent': 'Serpent',
            'Dog': 'Dog',
            'Cat': 'Cat',
            'Goat': 'Goat',
            'Rat': 'Rat',
            'Cow': 'Cow',
            'Buffalo': 'Buffalo',
            'Tiger': 'Tiger',
            'Deer': 'Deer',
            'Monkey': 'Monkey',
            'Mongoose': 'Mongoose',
            'Lion': 'Lion'
        },
        success_message: 'Vedic horoscope calculated successfully'
    },
    si: {
        rashis: [
            'මේෂ', 'වෘෂභ', 'මිථුන', 'කටක',
            'සිංහ', 'කන්‍යා', 'තුලා', 'වෘශ්චික',
            'ධනු', 'මකර', 'කුම්භ', 'මීන'
        ],
        nakshatras: [
            'අස්විද', 'බෙරණ', 'කැති', 'රෙහෙන', 'මුවසිරස', 'අද',
            'පුනාවාස', 'පුෂ', 'අස්ලිය', 'මා', 'පුවපුල්', 'උත්‍රපල්',
            'හත', 'සිත', 'සා', 'වීසා', 'අනුර', 'දෙට',
            'මූල', 'පුවසල', 'උත්‍රසල', 'සුවණ', 'දෙනට', 'සියාවාස',
            'පුවපුටුප', 'උත්‍රපුටුප', 'රේවතී'             
        ],
        linga: {
            'Male': 'පුරුෂ',
            'Female': 'ස්ත්‍රී',
            'Napunsaka': 'නපුංසක'
        },
        rulers: {
            'Ketu': 'කේතු',
            'Venus': 'සිකුරු',
            'Sun': 'රවි',
            'Moon': 'චන්ද්‍ර',
            'Mars': 'කුජ',
            'Rahu': 'රාහු',
            'Jupiter': 'ගුරු',
            'Saturn': 'ශනි',
            'Mercury': 'බුධ'
        },
        yoni: {
            'Horse': 'අශ්වයා',
            'Elephant': 'ඇතා',
            'Sheep': 'බැටළුවා',
            'Snake': 'සර්පයා',
            'Serpent': 'නාගයා',
            'Dog': 'බල්ලා',
            'Cat': 'පූසා',
            'Goat': 'එළුවා',
            'Rat': 'මීයා',
            'Cow': 'එළදෙන',
            'Buffalo': 'මීහරකා',
            'Tiger': 'කොටියා',
            'Deer': 'මුවා',
            'Monkey': 'වඳුරා',
            'Mongoose': 'මුගටියා',
            'Lion': 'සිංහයා'
        },
        success_message: 'Vedic horoscope calculated successfully'
    }
};

// Nakshatra associations
const lingaAssociations: LingaType[] = [
    'Male',     // Ashwini
    'Female',   // Bharani
    'Female',   // Krittika
    'Female',   // Rohini
    'Male',     // Mrigashira
    'Napunsaka',// Ardra
    'Male',     // Punarvasu
    'Male',     // Pushya
    'Napunsaka',// Ashlesha
    'Male',     // Magha
    'Female',   // Purva Phalguni
    'Male',     // Uttara Phalguni
    'Female',   // Hasta
    'Female',   // Chitra
    'Napunsaka',// Swati
    'Male',     // Vishakha
    'Female',   // Anuradha
    'Female',   // Jyeshtha
    'Male',     // Mula
    'Male',     // Purva Ashadha
    'Female',   // Uttara Ashadha
    'Female',   // Shravana
    'Female',   // Dhanishta
    'Napunsaka',// Shatabhisha
    'Male',     // Purva Bhadrapada
    'Female',   // Uttara Bhadrapada
    'Female'    // Revati
];

const nakshatraRulers = [
    'Ketu',     // Ashwini
    'Venus',    // Bharani
    'Sun',      // Krittika
    'Moon',     // Rohini
    'Mars',     // Mrigashira
    'Rahu',     // Ardra
    'Jupiter',  // Punarvasu
    'Saturn',   // Pushya
    'Mercury',  // Ashlesha
    'Ketu',     // Magha
    'Venus',    // Purva Phalguni
    'Sun',      // Uttara Phalguni
    'Moon',     // Hasta
    'Mars',     // Chitra
    'Rahu',     // Swati
    'Jupiter',  // Vishakha
    'Saturn',   // Anuradha
    'Mercury',  // Jyeshtha
    'Ketu',     // Mula
    'Venus',    // Purva Ashadha
    'Sun',      // Uttara Ashadha
    'Moon',     // Shravana
    'Mars',     // Dhanishta
    'Rahu',     // Shatabhisha
    'Jupiter',  // Purva Bhadrapada
    'Saturn',   // Uttara Bhadrapada
    'Mercury'   // Revati
];

const yoniAssociations = [
    'Horse',    // Ashwini
    'Elephant', // Bharani
    'Sheep',    // Krittika
    'Snake',    // Rohini
    'Serpent',  // Mrigashira
    'Dog',      // Ardra
    'Cat',      // Punarvasu
    'Goat',     // Pushya
    'Cat',      // Ashlesha
    'Rat',      // Magha
    'Rat',      // Purva Phalguni
    'Cow',      // Uttara Phalguni
    'Buffalo',  // Hasta
    'Tiger',    // Chitra
    'Deer',     // Swati
    'Tiger',    // Vishakha
    'Deer',     // Anuradha
    'Deer',     // Jyeshtha
    'Dog',      // Mula
    'Monkey',   // Purva Ashadha
    'Mongoose', // Uttara Ashadha
    'Monkey',   // Shravana
    'Lion',     // Dhanishta
    'Horse',    // Shatabhisha
    'Lion',     // Purva Bhadrapada
    'Cow',      // Uttara Bhadrapada
    'Elephant'  // Revati
];

// Planetary Dignity data
const planetaryRulers = {
    'Sun': 'Leo',
    'Moon': 'Cancer',
    'Mars': 'Aries',      // Also rules Scorpio
    'Mercury': 'Gemini',  // Also rules Virgo
    'Jupiter': 'Sagittarius', // Also rules Pisces
    'Venus': 'Taurus',    // Also rules Libra
    'Saturn': 'Capricorn' // Also rules Aquarius
};

const planetaryExaltation = {
    'Sun': 'Aries',
    'Moon': 'Taurus',
    'Mars': 'Capricorn',
    'Mercury': 'Virgo',
    'Jupiter': 'Cancer',
    'Venus': 'Pisces',
    'Saturn': 'Libra'
};

const planetaryDebilitation = {
    'Sun': 'Libra',
    'Moon': 'Scorpio',
    'Mars': 'Cancer',
    'Mercury': 'Pisces',
    'Jupiter': 'Capricorn',
    'Venus': 'Virgo',
    'Saturn': 'Aries'
};

const planetaryFriendships = {
    'Sun': ['Moon', 'Mars', 'Jupiter'],
    'Moon': ['Sun', 'Mercury'],
    'Mars': ['Sun', 'Moon', 'Jupiter'],
    'Mercury': ['Sun', 'Venus'],
    'Jupiter': ['Sun', 'Moon', 'Mars'],
    'Venus': ['Mercury', 'Saturn'],
    'Saturn': ['Mercury', 'Venus']
};

interface PlanetaryDignity {
    dignity: string;
}

function getDignity(planet: string, rashi: string, language: string = 'en'): PlanetaryDignity {
    // First, standardize the rashi name to English
    let rashiInEnglish: string;
    
    if (language === 'si') {
        const index = translations['si'].rashis.findIndex(r => r === rashi);
        if (index === -1) {
            console.warn(`Invalid rashi name: ${rashi}`);
            return {
                dignity: language === 'si' ? 'නොදනී' : 'Unknown'
            };
        }
        rashiInEnglish = translations['en'].rashis[index];
    } else {
        rashiInEnglish = rashi;
    }

    // Convert Sinhala rashi names to standard English names for comparison
    const standardRashi = {
        'Mesha': 'Aries',
        'Vrushamba': 'Taurus',
        'Mithuna': 'Gemini',
        'Kataka': 'Cancer',
        'Sinha': 'Leo',
        'Kanya': 'Virgo',
        'Tula': 'Libra',
        'Vrushchika': 'Scorpio',
        'Dhanu': 'Sagittarius',
        'Makara': 'Capricorn',
        'Kumbha': 'Aquarius',
        'Meena': 'Pisces'
    }[rashiInEnglish] || rashiInEnglish;

    const planetName = planet as PlanetName;

    // Check exaltation
    if (planetaryExaltation[planetName] === standardRashi) {
        return {
            dignity: language === 'si' ? 'උච්ච' : 'Exalted'
        };
    }

    // Check debilitation
    if (planetaryDebilitation[planetName] === standardRashi) {
        return {
            dignity: language === 'si' ? 'නීච' : 'Debilitated'
        };
    }

    // Check own sign
    if (planetaryRulers[planetName] === standardRashi ||
        (planet === 'Mars' && standardRashi === 'Scorpio') ||
        (planet === 'Mercury' && standardRashi === 'Virgo') ||
        (planet === 'Jupiter' && standardRashi === 'Pisces') ||
        (planet === 'Venus' && standardRashi === 'Libra') ||
        (planet === 'Saturn' && standardRashi === 'Aquarius')) {
        return {
            dignity: language === 'si' ? 'ස්වක්ෂේත්‍ර' : 'Own Sign'
        };
    }

    // Check friendly sign
    const signRuler = Object.entries(planetaryRulers).find(([_, sign]) => sign === standardRashi)?.[0] as PlanetName | undefined;
    if (signRuler && planetaryFriendships[planetName]?.includes(signRuler)) {
        return {
            dignity: language === 'si' ? 'මිත්‍ර' : 'Friendly'
        };
    }

    // Default to Enemy/Neutral
    return {
        dignity: language === 'si' ? 'නීච' : 'Enemy'
    };
}

function getRashiName(index: number, language: string = 'en'): string {
    return translations[language === 'si' ? 'si' : 'en'].rashis[index];
}

function getNakshatraName(index: number, language: string = 'en'): string {
    return translations[language === 'si' ? 'si' : 'en'].nakshatras[index];
}

function translateLinga(linga: LingaType, language: string = 'en'): string {
    return translations[language === 'si' ? 'si' : 'en'].linga[linga];
}

function translateRuler(ruler: string, language: string = 'en'): string {
    return translations[language === 'si' ? 'si' : 'en'].rulers[ruler as keyof typeof translations['en']['rulers']];
}

function translateYoni(yoni: string, language: string = 'en'): string {
    return translations[language === 'si' ? 'si' : 'en'].yoni[yoni as keyof typeof translations['en']['yoni']];
}

function getNakshatra(moonLongitude: number, ayanamsa: number, language: string = 'en'): NakshatraInfo {
    const siderealLong = moonLongitude - ayanamsa;
    const normalizedLong = ((siderealLong % 360) + 360) % 360;
    const nakshatraIndex = Math.floor(normalizedLong * 27 / 360);
    
    // Calculate pada (1-4)
    const nakshatraProgress = (normalizedLong * 27 % 360) / (360 / 27);
    const pada = Math.min(Math.max(Math.floor((nakshatraProgress % 1) * 4) + 1, 1), 4);
    
    return {
        nakshatra: getNakshatraName(nakshatraIndex, language),
        pada: pada,
        linga: translateLinga(lingaAssociations[nakshatraIndex], language),
        ruler: translateRuler(nakshatraRulers[nakshatraIndex], language),
        yoni: translateYoni(yoniAssociations[nakshatraIndex], language)
    };
}

function calculateAyanamsa(date: Date): number {
    const referenceDate = new Date('1950-01-01T00:00:00Z');
    const referenceDegrees = 23.15;
    const annualRate = 50.2388475 / 3600;
    const yearDiff = (date.getTime() - referenceDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    return referenceDegrees + (annualRate * yearDiff);
}

function getRashi(eclipticLongitude: number, ayanamsa: number, language: string = 'en'): RashiInfo {
    const normalizedInput = ((eclipticLongitude % 360) + 360) % 360;
    let siderealLong = normalizedInput - ayanamsa;
    siderealLong = ((siderealLong % 360) + 360) % 360;
    const rashiIndex = Math.floor(siderealLong / 30);

    return {
        rashi: getRashiName(rashiIndex, language)
    };
}

function calculateAscendant(dateTime: Date, observer: Astronomy.Observer): number {
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

function calculateLunarNodes(dateTime: Date): {
    rahu: number;
    ketu: number;
    julianDate: number;
    centuriesSinceJ2000: number;
} {
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

function validateToken(event: any): boolean {
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return false;
    }

    console.log("token", process.env.IRUASTRO_ACCESS_TOKEN);
    console.log("authHeader", authHeader);
    const token = authHeader.split(' ')[1];
    return token === process.env.IRUASTRO_ACCESS_TOKEN;
}

export const handler: Handler = async (event) => {
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
        const { dob, time, location, timezone = 'Asia/Colombo', language = 'en' }: HoroscopeRequest = JSON.parse(event.body);

        const errors: string[] = [];

        if (!dob) errors.push('dob is required');
        if (!time) errors.push('time is required');
        if (
            !location || 
            typeof location.latitude !== 'number' || 
            typeof location.longitude !== 'number'
        ) {
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
        const planets: Body[] = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];
        const planetaryPositions: Record<string, PlanetaryPosition> = {};

        // Calculate planetary positions with language support
        for (const planet of planets) {
            const vector = Astronomy.GeoVector(planet as Astronomy.Body, dateTime, true);
            const ecliptic = Astronomy.Ecliptic(vector);
            const rashiInfo = getRashi(ecliptic.elon, ayanamsa, language);
            const nakshatraInfo = getNakshatra(ecliptic.elon, ayanamsa, language);
            const dignityInfo = getDignity(planet, rashiInfo.rashi, language);

            planetaryPositions[planet] = {
                ...rashiInfo,
                degree: ecliptic.elon - ayanamsa,
                nakshatra: nakshatraInfo.nakshatra,
                pada: nakshatraInfo.pada,
                linga: nakshatraInfo.linga,
                ruler: nakshatraInfo.ruler,
                dignity: dignityInfo.dignity
            };
        }

        // Calculate Moon Nakshatra with language support
        const moonVector = Astronomy.GeoVector('Moon' as Astronomy.Body, dateTime, true);
        const moonEcliptic = Astronomy.Ecliptic(moonVector);
        const nakshatraInfo = getNakshatra(moonEcliptic.elon, ayanamsa, language);

        // Calculate Lunar Nodes with language support
        const lunarNodes = calculateLunarNodes(dateTime);
        const rahuInfo = getRashi(lunarNodes.rahu, ayanamsa, language);
        const ketuInfo = getRashi(lunarNodes.ketu, ayanamsa, language);
        const rahuNakshatra = getNakshatra(lunarNodes.rahu, ayanamsa, language);
        const ketuNakshatra = getNakshatra(lunarNodes.ketu, ayanamsa, language);

        planetaryPositions['Rahu'] = {
            ...rahuInfo,
            degree: lunarNodes.rahu - ayanamsa,
            nakshatra: rahuNakshatra.nakshatra,
            pada: rahuNakshatra.pada,
            linga: rahuNakshatra.linga,
            ruler: rahuNakshatra.ruler,
            dignity: language === 'si' ? 'මධ්‍යස්ථ' : 'Neutral'
        };

        planetaryPositions['Ketu'] = {
            ...ketuInfo,
            degree: lunarNodes.ketu - ayanamsa,
            nakshatra: ketuNakshatra.nakshatra,
            pada: ketuNakshatra.pada,
            linga: ketuNakshatra.linga,
            ruler: ketuNakshatra.ruler,
            dignity: language === 'si' ? 'මධ්‍යස්ථ' : 'Neutral'
        };

        // Calculate Ascendant with language support
        const ascendantLongitude = calculateAscendant(dateTime, observer);
        const lagnaInfo = getRashi(ascendantLongitude, ayanamsa, language);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: translations[language === 'si' ? 'si' : 'en'].success_message,
                date: dateTime.toISOString(),
                location,
                timezone,
                ayanamsa,
                lagna: {
                    rashi: lagnaInfo.rashi,
                    degree: ascendantLongitude
                },
                moonNakshatra: nakshatraInfo,
                planetaryPositions
            }),
        };
    } catch (error: any) {
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                message: error?.message || 'An unexpected error occurred',
                error: error?.name || 'UNKNOWN_ERROR'
            }),
        };
    }
};
