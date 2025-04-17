import { Handler } from '@netlify/functions';
import * as Astronomy from 'astronomy-engine';
import * as moment from 'moment-timezone';
import 'dotenv/config';

interface Location {
    latitude: number;
    longitude: number;
    elevation?: number;
}

interface YogaRequest {
    dob: string;
    time: string;
    location: Location;
    timezone?: string;
    language?: 'en' | 'si';
}

interface YogaResponse {
    message: string;
    yogas: Yoga[];
}

interface Yoga {
    name: string;
    description: string;
    significance: string;
    effect: string;
    strength: 'Strong' | 'Medium' | 'Weak';
    planets: string[];
}

// Translations
const translations = {
    en: {
        yogas: {
            'RajaYoga': {
                name: 'Raja Yoga',
                description: 'A powerful combination of Jupiter and Saturn in mutual aspects or conjunction',
                significance: 'Royal combination indicating power, authority, and leadership potential',
                effect: 'Brings success in leadership positions, political power, or high administrative roles. The native gains respect and authority in their field.'
            },
            'DhanaYoga': {
                name: 'Dhana Yoga',
                description: 'Beneficial planets in wealth-generating houses',
                significance: 'Wealth-giving combination that promotes financial prosperity',
                effect: 'Creates opportunities for wealth accumulation, business success, and material comforts. The native often gains through multiple sources of income.'
            },
            'GajaKesariYoga': {
                name: 'Gaja Kesari Yoga',
                description: 'Auspicious placement of Jupiter and Moon in angular or trine houses',
                significance: 'Powerful yoga formed by Jupiter and Moon indicating intelligence and success',
                effect: 'Enhances wisdom, social status, and mental capabilities. The native gains recognition and success in their endeavors.'
            },
            'BudhaAdityaYoga': {
                name: 'Budha Aditya Yoga',
                description: 'Close conjunction or aspect between Sun and Mercury',
                significance: 'Yoga of intelligence formed by Sun and Mercury promoting intellectual growth',
                effect: 'Grants strong analytical abilities, leadership qualities, and success in education or communication-related fields.'
            },
            'NeechaBhangaRajaYoga': {
                name: 'Neecha Bhanga Raja Yoga',
                description: 'Cancellation of planetary debilitation through special planetary positions',
                significance: 'Turns weakness into strength, leading to unexpected success',
                effect: 'Overcomes initial setbacks to achieve remarkable success. The native rises from humble beginnings to positions of power.'
            },
            // Pancha Mahapurusha Yogas
            'RuchakaYoga': {
                name: 'Ruchaka Yoga',
                description: 'Mars in own sign or exaltation in a kendra house',
                significance: 'One of the five Mahapurusha Yogas indicating martial excellence',
                effect: 'Grants physical strength, leadership abilities, and success in competitive fields. The native excels in sports, military, or executive positions.'
            },
            'BhadraYoga': {
                name: 'Bhadra Yoga',
                description: 'Mercury in own sign or exaltation in a kendra house',
                significance: 'Mahapurusha Yoga of intelligence and communication',
                effect: 'Enhances intellectual capabilities, business acumen, and communication skills. Success in writing, commerce, or technological fields.'
            },
            'HamsaYoga': {
                name: 'Hamsa Yoga',
                description: 'Jupiter in own sign or exaltation in a kendra house',
                significance: 'Mahapurusha Yoga of wisdom and dharma',
                effect: 'Brings spiritual wisdom, ethical conduct, and success in teaching or advisory roles. The native gains respect for their knowledge and guidance.'
            },
            'MalavyaYoga': {
                name: 'Malavya Yoga',
                description: 'Venus in own sign or exaltation in a kendra house',
                significance: 'Mahapurusha Yoga of luxury and artistic excellence',
                effect: 'Bestows artistic talents, beauty, charm, and material comforts. Success in fine arts, entertainment, or luxury industries.'
            },
            'SashaYoga': {
                name: 'Sasha Yoga',
                description: 'Saturn in own sign or exaltation in a kendra house',
                significance: 'Mahapurusha Yoga of discipline and longevity',
                effect: 'Grants endurance, discipline, and success through hard work. The native achieves lasting success in business or government service.'
            },
            // Additional Yogas
            'ViparitaRajaYoga': {
                name: 'Viparita Raja Yoga',
                description: 'Lords of 6th, 8th or 12th houses placed in mutual kendras',
                significance: 'Turns negative planetary placements into positive outcomes',
                effect: 'Creates success from seemingly adverse situations. The native overcomes obstacles to achieve unexpected prosperity.'
            },
            'MahabhagyaYoga': {
                name: 'Mahabhagya Yoga',
                description: 'Venus and Jupiter together in a kendra or trikona house',
                significance: 'Yoga of great fortune and prosperity',
                effect: 'Brings exceptional luck, wealth, and happiness in life. The native enjoys both material and spiritual benefits.'
            },
            'KesariYoga': {
                name: 'Kesari Yoga',
                description: 'Jupiter in a kendra from Moon',
                significance: 'Yoga of intelligence and prosperity',
                effect: 'Enhances wisdom, wealth, and general well-being. The native succeeds through knowledge and ethical conduct.'
            },
            'LakshmiYoga': {
                name: 'Lakshmi Yoga',
                description: 'Lord of 9th house in a kendra with Jupiter or Venus',
                significance: 'Yoga of wealth and divine grace',
                effect: 'Brings financial prosperity, spiritual growth, and divine blessings. The native gains through righteous means.'
            },
            'AmalaYoga': {
                name: 'Amala Yoga',
                description: 'Benefic planet in the 10th house from Moon',
                significance: 'Yoga of pure fame and success',
                effect: 'Grants spotless reputation, career success, and public recognition. The native achieves success without controversy.'
            }
        },
        messages: {
            success: 'Yogas calculated successfully',
            validationError: 'Validation errors',
            requestBodyMissing: 'Request body is missing',
            invalidDateTime: 'Invalid date or time format',
            unauthorized: 'Unauthorized access. Please provide a valid Bearer token.',
            methodNotAllowed: 'Only POST requests are allowed'
        },
        strength: {
            veryStrong: 'Very Strong',
            strong: 'Strong',
            moderate: 'Moderate',
            weak: 'Weak'
        }
    },
    si: {
        yogas: {
            'RajaYoga': {
                name: 'රාජ යෝග',
                description: 'ගුරු හා ශනි අතර සම්බන්ධතාවය හෝ දෘෂ්ටි',
                significance: 'රාජ යෝග - බලය හා අධිකාරය පෙන්නුම් කරයි',
                effect: 'නායකත්ව තනතුරු, දේශපාලන බලය හෝ පරිපාලන තනතුරු ලබා දෙයි. පුද්ගලයා ඔවුන්ගේ ක්ෂේත්‍රයේ ගෞරවය හා අධිකාරිය ලබා ගනී.'
            },
            'DhanaYoga': {
                name: 'ධන යෝග',
                description: 'ධන භාවයන්හි ශුභ ග්‍රහ පිහිටීම',
                significance: 'ධන යෝග - ධනය ලැබෙන සංයෝග',
                effect: 'ධනය රැස් කිරීමට, ව්‍යාපාර සාර්ථකත්වයට හා භෞතික සැප සම්පත් සඳහා අවස්ථා නිර්මාණය කරයි. පුද්ගලයා බහුවිධ ආදායම් මාර්ග හරහා ලාභ ලබයි.'
            },
            'GajaKesariYoga': {
                name: 'ගජකේසරී යෝග',
                description: 'කේන්ද්‍ර හෝ ත්‍රිකෝණ භාවයන්හි ගුරු හා චන්ද්‍රයා පිහිටීම',
                significance: 'ගජකේසරී යෝග - ගුරු හා චන්ද්‍රයා මගින් සෑදෙන ප්‍රබල යෝග',
                effect: 'ප්‍රඥාව, සමාජ තත්ත්වය සහ මානසික හැකියාවන් වර්ධනය කරයි. පුද්ගලයා පිළිගැනීම හා සාර්ථකත්වය ලබා ගනී.'
            },
            'BudhaAdityaYoga': {
                name: 'බුද්ධාදිත්‍ය යෝග',
                description: 'රවි හා බුධ අතර සමීප සම්බන්ධතාවය හෝ දෘෂ්ටි',
                significance: 'බුද්ධාදිත්‍ය යෝග - රවි හා බුධ මගින් සෑදෙන බුද්ධිමත් යෝග',
                effect: 'ශක්තිමත් විශ්ලේෂණ හැකියාවන්, නායකත්ව ගුණාංග, සහ අධ්‍යාපනික හෝ සන්නිවේදන ක්ෂේත්‍රවල සාර්ථකත්වය ලබා දෙයි.'
            },
            'NeechaBhangaRajaYoga': {
                name: 'නීච භංග රාජ යෝග',
                description: 'විශේෂ ග්‍රහ ස්ථාන හරහා ග්‍රහ නීච භංග වීම',
                significance: 'නීච භංග රාජ යෝග - නීච භංග වීමෙන් ඇතිවන රාජ යෝග',
                effect: 'මුල් කාලීන බාධක ජය ගෙන විශිෂ්ට සාර්ථකත්වයක් ලබා ගනී. පුද්ගලයා පහළ මට්ටමක සිට බලවත් තත්ත්වයකට ඔසවා තබයි.'
            },
            // Pancha Mahapurusha Yogas
            'RuchakaYoga': {
                name: 'රුචක යෝග',
                description: 'කුජ ස්වක්ෂේත්‍ර හෝ උච්ච රාශියේ කේන්ද්‍රයක පිහිටීම',
                significance: 'රුචක යෝග - පංච මහාපුරුෂ යෝග අතරින් එකක්',
                effect: 'කායික ශක්තිය, නායකත්ව හැකියාවන්, සහ තරඟකාරී ක්ෂේත්‍රවල සාර්ථකත්වය ලබා දෙයි. ක්‍රීඩා, යුද හමුදා, හෝ විධායක තනතුරුවල විශිෂ්ටත්වය ලබයි.'
            },
            'BhadraYoga': {
                name: 'භද්‍ර යෝග',
                description: 'බුධ ස්වක්ෂේත්‍ර හෝ උච්ච රාශියේ කේන්ද්‍රයක පිහිටීම',
                significance: 'භද්‍ර යෝග - බුද්ධිය හා සන්නිවේදනය පිළිබඳ මහාපුරුෂ යෝග',
                effect: 'බුද්ධිමය හැකියාවන්, ව්‍යාපාරික දක්ෂතා, සහ සන්නිවේදන කුසලතා වර්ධනය කරයි. ලේඛනය, වාණිජ්‍යය, හෝ තාක්ෂණික ක්ෂේත්‍රවල සාර්ථකත්වය.'
            },
            'HamsaYoga': {
                name: 'හංස යෝග',
                description: 'ගුරු ස්වක්ෂේත්‍ර හෝ උච්ච රාශියේ කේන්ද්‍රයක පිහිටීම',
                significance: 'හංස යෝග - ප්‍රඥාව හා ධර්මය පිළිබඳ මහාපුරුෂ යෝග',
                effect: 'ආධ්‍යාත්මික ප්‍රඥාව, සදාචාරාත්මක හැසිරීම, සහ ඉගැන්වීමේ හෝ උපදේශන කාර්යයන්හි සාර්ථකත්වය ගෙන දෙයි. පුද්ගලයා ඔවුන්ගේ දැනුම හා මඟපෙන්වීම සඳහා ගෞරවය ලබා ගනී.'
            },
            'MalavyaYoga': {
                name: 'මාලවී යෝග',
                description: 'සිකුරු ස්වක්ෂේත්‍ර හෝ උච්ච රාශියේ කේන්ද්‍රයක පිහිටීම',
                significance: 'මාලවී යෝග - සුඛෝපභෝගී හා කලාත්මක විශිෂ්ටත්වය පිළිබඳ මහාපුරුෂ යෝග',
                effect: 'කලාත්මක දක්ෂතා, සෞන්දර්යය, ආකර්ෂණීය බව, සහ භෞතික සැප පහසුකම් ලබා දෙයි. සියුම් කලා, විනෝදාස්වාද, හෝ සුඛෝපභෝගී කර්මාන්තවල සාර්ථකත්වය.'
            },
            'SashaYoga': {
                name: 'ශශ යෝග',
                description: 'ශනි ස්වක්ෂේත්‍ර හෝ උච්ච රාශියේ කේන්ද්‍රයක පිහිටීම',
                significance: 'ශශ යෝග - විනය හා ආයුෂ පිළිබඳ මහාපුරුෂ යෝග',
                effect: 'දීර්ඝායුෂ, විනය, සහ කැපවීමෙන් කරන වැඩ තුළින් සාර්ථකත්වය ලබා දෙයි. පුද්ගලයා ව්‍යාපාර හෝ රාජ්‍ය සේවයේ චිරස්ථායී සාර්ථකත්වයක් ලබා ගනී.'
            },
            // Additional Yogas
            'ViparitaRajaYoga': {
                name: 'විපරීත රාජ යෝග',
                description: '6,8,12 අධිපතීන් අන්‍යෝන්‍ය කේන්ද්‍රයන්හි පිහිටීම',
                significance: 'විපරීත රාජ යෝග - අහිතකර ග්‍රහ පිහිටීම් හිතකර ප්‍රතිඵල බවට හැරවීම',
                effect: 'අහිතකර තත්ත්වයන්ගෙන් සාර්ථකත්වය නිර්මාණය කරයි. පුද්ගලයා බාධක ජය ගනිමින් අනපේක්ෂිත සමෘද්ධිය ලබා ගනී.'
            },
            'MahabhagyaYoga': {
                name: 'මහාභාග්‍ය යෝග',
                description: 'සිකුරු හා ගුරු කේන්ද්‍ර හෝ ත්‍රිකෝණයක එකට පිහිටීම',
                significance: 'මහාභාග්‍ය යෝග - මහත් වාසනාව හා සමෘද්ධිය',
                effect: 'අසාමාන්‍ය වාසනාව, ධනය, සහ ජීවිතයේ සතුට ගෙන එයි. පුද්ගලයා භෞතික හා ආධ්‍යාත්මික යන දෙඅංශයෙන්ම ප්‍රතිලාභ ලබයි.'
            },
            'KesariYoga': {
                name: 'කේසරි යෝග',
                description: 'චන්ද්‍රයාගෙන් කේන්ද්‍රයක ගුරු පිහිටීම',
                significance: 'කේසරි යෝග - බුද්ධිය හා සමෘද්ධිය පිළිබඳ යෝග',
                effect: 'ප්‍රඥාව, ධනය, සහ සාමාන්‍ය යහපැවැත්ම වර්ධනය කරයි. පුද්ගලයා දැනුම හා සදාචාරාත්මක හැසිරීම තුළින් සාර්ථකත්වය ලබා ගනී.'
            },
            'LakshmiYoga': {
                name: 'ලක්ෂ්මී යෝග',
                description: 'නවමාධිපති කේන්ද්‍රයක ගුරු හෝ සිකුරු සමඟ පිහිටීම',
                significance: 'ලක්ෂ්මී යෝග - ධනය හා දිව්‍ය ආශිර්වාද',
                effect: 'මූල්‍ය සමෘද්ධිය, ආධ්‍යාත්මික වර්ධනය, සහ දිව්‍ය ආශිර්වාද ගෙන එයි. පුද්ගලයා ධර්මිෂ්ඨ මාර්ග හරහා ලාභ ලබා ගනී.'
            },
            'AmalaYoga': {
                name: 'අමල යෝග',
                description: 'චන්ද්‍රයාගෙන් දසමයේ ශුභ ග්‍රහයෙක් පිහිටීම',
                significance: 'අමල යෝග - පිරිසිදු කීර්තිය හා සාර්ථකත්වය',
                effect: 'නිර්මල කීර්ති නාමය, වෘත්තීය සාර්ථකත්වය, සහ පොදු පිළිගැනීම ලබා දෙයි. පුද්ගලයා විවාදයකින් තොරව සාර්ථකත්වය ලබා ගනී.'
            }
        },
        messages: {
            success: 'යෝග ගණනය කිරීම සාර්ථකයි',
            validationError: 'වලංගු කිරීමේ දෝෂ',
            requestBodyMissing: 'ඉල්ලීම් අන්තර්ගතය නොමැත',
            invalidDateTime: 'වලංගු නොවන දිනය හෝ වේලා ආකෘතිය',
            unauthorized: 'අවසර නොලත් ප්‍රවේශය. කරුණාකර වලංගු Bearer ටෝකනයක් සපයන්න.',
            methodNotAllowed: 'POST ඉල්ලීම් පමණක් අවසර ඇත'
        },
        strength: {
            veryStrong: 'ඉතා ශක්තිමත්',
            strong: 'ශක්තිමත්',
            moderate: 'මධ්‍යස්ථයි',
            weak: 'දුර්වලයි'
        }
    }
};

// Zodiac constants
const RASHI_LENGTH = 30;
const TOTAL_RASHIS = 12;

// House categories
const KENDRAS = [1, 4, 7, 10];
const TRIKONAS = [1, 5, 9];
const DUSTHANAS = [6, 8, 12];

type PlanetName = 'Sun' | 'Moon' | 'Mars' | 'Mercury' | 'Jupiter' | 'Venus' | 'Saturn';

// Planetary dignity data
const OWN_SIGNS: Partial<Record<PlanetName, readonly string[]>> = {
    'Mars': ['Aries', 'Scorpio'],
    'Mercury': ['Gemini', 'Virgo'],
    'Jupiter': ['Sagittarius', 'Pisces'],
    'Venus': ['Taurus', 'Libra'],
    'Saturn': ['Capricorn', 'Aquarius'],
    'Sun': ['Leo'],
    'Moon': ['Cancer']
} as const;

const EXALTATION_SIGNS: Record<PlanetName, string> = {
    'Sun': 'Aries',
    'Moon': 'Taurus',
    'Mars': 'Capricorn',
    'Mercury': 'Virgo',
    'Jupiter': 'Cancer',
    'Venus': 'Pisces',
    'Saturn': 'Libra'
};

const BENEFICS = ['Jupiter', 'Venus', 'Mercury', 'Moon'];

// Helper functions first
function getRashi(longitude: number): number {
    const normalizedLongitude = ((longitude % 360) + 360) % 360;
    return Math.floor(normalizedLongitude / 30);
}

function getZodiacSign(position: number): string {
    const zodiacSigns = [
        'Aries', 'Taurus', 'Gemini', 'Cancer', 
        'Leo', 'Virgo', 'Libra', 'Scorpio', 
        'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
    ];
    const normalizedPosition = ((position % 360) + 360) % 360;
    const signIndex = Math.floor(normalizedPosition / 30);
    return zodiacSigns[signIndex];
}

function getHouse(longitude: number, ascendantLongitude: number): number {
    // Normalize longitudes to 0-360 range
    const normalizedLongitude = ((longitude % 360) + 360) % 360;
    const normalizedAscendant = ((ascendantLongitude % 360) + 360) % 360;
    // Calculate relative position from ascendant
    let relativePosition = Math.floor(normalizedLongitude / 30)-Math.floor(normalizedAscendant / 30);
    if (relativePosition < 0) {
        relativePosition += 12;
    }

    // Convert to house number (1-12)
    const house = relativePosition + 1;
    return ((house - 1 + 12) % 12) + 1;
}

function isInKendra(longitude: number, ascendantLongitude: number): boolean {
    const house = getHouse(longitude, ascendantLongitude);
    return KENDRAS.includes(house);
}

function isInTrikona(position: number): boolean {
    const house = Math.floor(position / RASHI_LENGTH) + 1;
    return TRIKONAS.includes(house);
}

function getHouseFromMoon(moonPosition: number, planetPosition: number): number {
    const houses = Math.floor((planetPosition - moonPosition + 360) / RASHI_LENGTH) % TOTAL_RASHIS + 1;
    return houses;
}

function checkPlanetInOwnSign(planet: PlanetName, position: number): boolean {
    const rashi = getRashi(position);
    const rashiName = getZodiacSign(position);
    const planetSigns = OWN_SIGNS[planet];
    return planetSigns ? planetSigns.includes(rashiName) : false;
}

function checkPlanetInExaltation(planet: PlanetName, position: number): boolean {
    const rashiName = getZodiacSign(position);
    return EXALTATION_SIGNS[planet] === rashiName;
}

function calculateAyanamsa(date: Date): number {
    const referenceDate = new Date('1950-01-01T00:00:00Z');
    const referenceDegrees = 23.15;
    const annualRate = 50.2388475 / 3600;
    const yearDiff = (date.getTime() - referenceDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    return referenceDegrees + (annualRate * yearDiff);
}

function calculateAscendant(dateTime: Date, observer: Astronomy.Observer): number {
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

function calculateYogas(planetaryPositions: Record<string, number>, language: string = 'en'): Yoga[] {
    const yogas: Yoga[] = [];
    const lang = language === 'si' ? 'si' : 'en';

    const rashiNames = [
        'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
        'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
    ];
    
    // Calculate Pancha Mahapurusha Yogas
    
    // Ruchaka Yoga (Mars)
    if ((checkPlanetInOwnSign('Mars', planetaryPositions['Mars']) || 
         checkPlanetInExaltation('Mars', planetaryPositions['Mars'])) && 
         isInKendra(planetaryPositions['Mars'], planetaryPositions['Ascendant'])) {
        const yogaInfo = translations[lang].yogas['RuchakaYoga'];
        yogas.push({
            name: yogaInfo.name,
            description: yogaInfo.description,
            significance: yogaInfo.significance,
            effect: yogaInfo.effect,
            strength: checkPlanetInExaltation('Mars', planetaryPositions['Mars']) ? 'Strong' : 'Medium',
            planets: ['Mars']
        });
    }

    // Bhadra Yoga (Mercury)
    const mercuryLongitude = ((planetaryPositions['Mercury'] + 360) % 360);
    const mercuryHouse = getHouse(mercuryLongitude, planetaryPositions['Ascendant']);
    const mercuryRashi = getRashi(mercuryLongitude);
    const mercuryRashiName = rashiNames[mercuryRashi];
    
    if (KENDRAS.includes(mercuryHouse) && 
        (OWN_SIGNS['Mercury']?.includes(mercuryRashiName) || 
         EXALTATION_SIGNS['Mercury'] === mercuryRashiName)) {
        const yogaInfo = translations[lang].yogas['BhadraYoga'];
        yogas.push({
            name: yogaInfo.name,
            description: yogaInfo.description,
            significance: yogaInfo.significance,
            effect: yogaInfo.effect,
            strength: EXALTATION_SIGNS['Mercury'] === mercuryRashiName ? 'Strong' : 'Strong',
            planets: ['Mercury']
        });
    }

    // Hamsa Yoga (Jupiter)
    if ((checkPlanetInOwnSign('Jupiter', planetaryPositions['Jupiter']) || 
         checkPlanetInExaltation('Jupiter', planetaryPositions['Jupiter'])) && 
         isInKendra(planetaryPositions['Jupiter'], planetaryPositions['Ascendant'])) {
        const yogaInfo = translations[lang].yogas['HamsaYoga'];
        yogas.push({
            name: yogaInfo.name,
            description: yogaInfo.description,
            significance: yogaInfo.significance,
            effect: yogaInfo.effect,
            strength: checkPlanetInExaltation('Jupiter', planetaryPositions['Jupiter']) ? 'Strong' : 'Medium',
            planets: ['Jupiter']
        });
    }

    // Malavya Yoga (Venus)
    const venusLongitude = ((planetaryPositions['Venus'] + 360) % 360);
    const venusHouse = getHouse(venusLongitude, planetaryPositions['Ascendant']);
    const venusRashi = getRashi(venusLongitude);
    const venusRashiName = rashiNames[venusRashi];
    
    // Malavya Yoga conditions
    const isInKendraHouse = KENDRAS.includes(venusHouse);
    const isInOwnSign = OWN_SIGNS['Venus']?.includes(venusRashiName);
    const isInExaltation = EXALTATION_SIGNS['Venus'] === venusRashiName;

    if (isInKendraHouse && (isInOwnSign || isInExaltation)) {
    
        const yogaInfo = translations[lang].yogas['MalavyaYoga'];
        yogas.push({
            name: yogaInfo.name,
            description: yogaInfo.description,
            significance: yogaInfo.significance,
            effect: yogaInfo.effect,
            strength: isInExaltation ? 'Strong' : 'Medium',
            planets: ['Venus']
        });
    }

    // Sasha Yoga (Saturn)
    if ((checkPlanetInOwnSign('Saturn', planetaryPositions['Saturn']) || 
         checkPlanetInExaltation('Saturn', planetaryPositions['Saturn'])) && 
         isInKendra(planetaryPositions['Saturn'], planetaryPositions['Ascendant'])) {
        const yogaInfo = translations[lang].yogas['SashaYoga'];
        yogas.push({
            name: yogaInfo.name,
            description: yogaInfo.description,
            significance: yogaInfo.significance,
            effect: yogaInfo.effect,
            strength: checkPlanetInExaltation('Saturn', planetaryPositions['Saturn']) ? 'Strong' : 'Medium',
            planets: ['Saturn']
        });
    }

    // Mahabhagya Yoga (Venus and Jupiter)
    if (Math.abs(planetaryPositions['Venus'] - planetaryPositions['Jupiter']) < 10 &&
        (isInKendra(planetaryPositions['Venus'], planetaryPositions['Ascendant']) || 
         isInTrikona(planetaryPositions['Venus']))) {
        const yogaInfo = translations[lang].yogas['MahabhagyaYoga'];
        yogas.push({
            name: yogaInfo.name,
            description: yogaInfo.description,
            significance: yogaInfo.significance,
            effect: yogaInfo.effect,
            strength: 'Strong',
            planets: ['Venus', 'Jupiter']
        });
    }

    // Kesari Yoga (Jupiter in Kendra from Moon)
    const jupiterHouseFromMoon = getHouseFromMoon(planetaryPositions['Moon'], planetaryPositions['Jupiter']);

    if (KENDRAS.includes(jupiterHouseFromMoon)) {
        const yogaInfo = translations[lang].yogas['KesariYoga'];
        yogas.push({
            name: yogaInfo.name,
            description: yogaInfo.description,
            significance: yogaInfo.significance,
            effect: yogaInfo.effect,
            strength: 'Medium',
            planets: ['Jupiter', 'Moon']
        });
    }

    // Amala Yoga (Benefic in 10th from Moon)
    const tenthHouseFromMoon = (getHouseFromMoon(planetaryPositions['Moon'], 0) + 9) % 12 + 1;
    for (const planet of BENEFICS) {
        if (getHouseFromMoon(planetaryPositions['Moon'], planetaryPositions[planet]) === tenthHouseFromMoon) {
            const yogaInfo = translations[lang].yogas['AmalaYoga'];
            yogas.push({
                name: yogaInfo.name,
                description: yogaInfo.description,
                significance: yogaInfo.significance,
                effect: yogaInfo.effect,
                strength: 'Medium',
                planets: [planet, 'Moon']
            });
            break;
        }
    }

    // Raja Yoga (Jupiter and Saturn close to each other)
    if (Math.abs(planetaryPositions['Jupiter'] - planetaryPositions['Saturn']) < 10) {
        const yogaInfo = translations[lang].yogas['RajaYoga'];
        yogas.push({
            name: yogaInfo.name,
            description: yogaInfo.description,
            significance: yogaInfo.significance,
            effect: yogaInfo.effect,
            strength: 'Strong',
            planets: ['Jupiter', 'Saturn']
        });
    }

    // Gaja Kesari Yoga (Jupiter and Moon)
    if (Math.abs(planetaryPositions['Jupiter'] - planetaryPositions['Moon']) < 120) {
        const yogaInfo = translations[lang].yogas['GajaKesariYoga'];
        yogas.push({
            name: yogaInfo.name,
            description: yogaInfo.description,
            significance: yogaInfo.significance,
            effect: yogaInfo.effect,
            strength: Math.abs(planetaryPositions['Jupiter'] - planetaryPositions['Moon']) < 30 ? 'Strong' : 'Medium',
            planets: ['Jupiter', 'Moon']
        });
    }

    // Budha Aditya Yoga (Mercury and Sun)
    console.log("Budha Adity"+Math.abs(planetaryPositions['Mercury'] - planetaryPositions['Sun']));

    if (Math.abs(planetaryPositions['Mercury'] - planetaryPositions['Sun']) < 15) {
        const yogaInfo = translations[lang].yogas['BudhaAdityaYoga'];
        yogas.push({
            name: yogaInfo.name,
            description: yogaInfo.description,
            significance: yogaInfo.significance,
            effect: yogaInfo.effect,
            strength: Math.abs(planetaryPositions['Mercury'] - planetaryPositions['Sun']) < 5 ? 'Strong' : 'Medium',
            planets: ['Mercury', 'Sun']
        });
    }

    // Dhana Yoga (Benefics in wealth houses)
    const wealthHouses = [2, 5, 9, 11];
    const beneficsInWealthHouses = BENEFICS.some(planet => 
        wealthHouses.includes(getHouse(planetaryPositions[planet], planetaryPositions['Ascendant']))
    );
    if (beneficsInWealthHouses) {
        const yogaInfo = translations[lang].yogas['DhanaYoga'];
        yogas.push({
            name: yogaInfo.name,
            description: yogaInfo.description,
            significance: yogaInfo.significance,
            effect: yogaInfo.effect,
            strength: 'Medium',
            planets: BENEFICS
        });
    }

    // Neecha Bhanga Raja Yoga (Debilitated planet getting cancelled)
    const planets: PlanetName[] = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
    for (const planet of planets) {
        const planetPosition = planetaryPositions[planet];
        const rashiName = getZodiacSign(planetPosition);
        
        if (EXALTATION_SIGNS[planet as PlanetName] === rashiName && 
            isInKendra(planetaryPositions[planet], planetaryPositions['Ascendant'])) {
            const yogaInfo = translations[lang].yogas['NeechaBhangaRajaYoga'];
            yogas.push({
                name: yogaInfo.name,
                description: yogaInfo.description,
                significance: yogaInfo.significance,
                effect: yogaInfo.effect,
                strength: 'Strong',
                planets: [planet]
            });
        }
    }

    // Viparita Raja Yoga (Malefics in 6th, 8th, or 12th causing unexpected good)
    const malefics = ['Mars', 'Saturn', 'Sun'];
    const dusthanaLords = malefics.filter(planet =>
        DUSTHANAS.includes(getHouse(planetaryPositions[planet], planetaryPositions['Ascendant']))
    );
    
    if (dusthanaLords.length >= 2) {
        const yogaInfo = translations[lang].yogas['ViparitaRajaYoga'];
        yogas.push({
            name: yogaInfo.name,
            description: yogaInfo.description,
            significance: yogaInfo.significance,
            effect: yogaInfo.effect,
            strength: dusthanaLords.length === 3 ? 'Strong' : 'Medium',
            planets: dusthanaLords
        });
    }

    // Lakshmi Yoga (9th lord with benefics)
    const ninthHouse = (getHouse(0, planetaryPositions['Ascendant']) + 8) % 12 + 1;
    const ninthLordPosition = planetaryPositions[Object.keys(planetaryPositions)[ninthHouse - 1]];
    const beneficsWithNinthLord = BENEFICS.some(benefic => 
        Math.abs(planetaryPositions[benefic] - ninthLordPosition) < 10
    );
    
    if (beneficsWithNinthLord) {
        const yogaInfo = translations[lang].yogas['LakshmiYoga'];
        yogas.push({
            name: yogaInfo.name,
            description: yogaInfo.description,
            significance: yogaInfo.significance,
            effect: yogaInfo.effect,
            strength: 'Strong',
            planets: [...BENEFICS, Object.keys(planetaryPositions)[ninthHouse - 1]]
        });
    }

    return yogas;
}

function validateToken(event: any): boolean {
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return false;
    }
    const token = authHeader.split(' ')[1];
    return token === process.env.IRUASTRO_ACCESS_TOKEN;
}

export const handler: Handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ message: translations.en.messages.methodNotAllowed }),
        };
    }

    // Validate Bearer token
    if (!validateToken(event)) {
        return {
            statusCode: 401,
            body: JSON.stringify({ 
                message: translations.en.messages.unauthorized,
                error: 'UNAUTHORIZED'
            }),
        };
    }

    try {
        if (!event.body) throw new Error(translations.en.messages.requestBodyMissing);
        const { dob, time, location, timezone = 'Asia/Colombo', language = 'en' }: YogaRequest = JSON.parse(event.body);

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
                body: JSON.stringify({ message: translations.en.messages.validationError, errors }),
            };
        }

        const localDateTime = moment.tz(`${dob} ${time}`, 'YYYY-MM-DD HH:mm', timezone);
        if (!localDateTime.isValid()) throw new Error(translations.en.messages.invalidDateTime);

        const dateTime = new Date(localDateTime.utc().format());
        const ayanamsa = calculateAyanamsa(dateTime);
        const planets: ('Sun' | 'Moon' | 'Mercury' | 'Venus' | 'Mars' | 'Jupiter' | 'Saturn')[] = 
            ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];

        // Calculate planetary positions and zodiac signs
        const planetaryPositions: Record<string, number> = {};
        const planetaryZodiacSigns: Record<string, string> = {};
        
        for (const planet of planets) {
            const vector = Astronomy.GeoVector(planet as Astronomy.Body, dateTime, true);
            const ecliptic = Astronomy.Ecliptic(vector);
            const position = ((ecliptic.elon - ayanamsa + 360) % 360);
            planetaryPositions[planet] = position;
            planetaryZodiacSigns[planet] = getZodiacSign(position);
        }

        // Calculate Ascendant position
        const observer: Astronomy.Observer = {
            latitude: location.latitude,
            longitude: location.longitude,
            height: location.elevation || 0  // Using elevation if provided, otherwise 0 meters
        };
        
        // Calculate Ascendant using proper astronomical method
        const ascendantLongitude = calculateAscendant(dateTime, observer);
        const siderealAscendant = ((ascendantLongitude - ayanamsa + 360) % 360);
        
        // Add Ascendant to planetary positions
        planetaryPositions['Ascendant'] = siderealAscendant;
        planetaryZodiacSigns['Ascendant'] = getZodiacSign(siderealAscendant);

        // Calculate yogas based on planetary positions
        const yogas = calculateYogas(planetaryPositions, language);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: translations.en.messages.success,
                yogas,// Including zodiac signs for each planet
                planetaryPositions,
                planetaryZodiacSigns
            }),
        };

    } catch (error: any) {
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                message: error?.message || translations.en.messages.invalidDateTime,
                error: error?.name || 'UNKNOWN_ERROR'
            }),
        };
    }
};