const Astronomy = require('astronomy-engine');

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ message: 'Only POST requests are allowed' }),
        };
    }

    try {
        if (!event.body) {
            throw new Error('Request body is missing');
        }

        const { dob, time, location } = JSON.parse(event.body);
        const errors = [];

        if (!dob) errors.push('dob is required');
        if (!time) errors.push('time is required');

        if (!location) {
            errors.push('location is required');
        } else {
            const { latitude, longitude, elevation } = location;
            if (typeof latitude !== 'number') errors.push('location.latitude must be a number');
            if (typeof longitude !== 'number') errors.push('location.longitude must be a number');
            if (latitude < -90 || latitude > 90) errors.push('latitude must be between -90 and 90');
            if (longitude < -180 || longitude > 180) errors.push('longitude must be between -180 and 180');
        }

        if (errors.length > 0) {
            return {
                statusCode: 400,
                body: JSON.stringify({ 
                    message: 'Validation errors',
                    errors: errors
                }),
            };
        }

        const dateTime = new Date(`${dob}T${time}:00Z`);
        if (isNaN(dateTime.getTime())) {
            throw new Error('Invalid date or time format. Use YYYY-MM-DD for date and HH:mm for time');
        }

        const observer = new Astronomy.Observer(
            location.latitude,
            location.longitude,
            location.elevation || 0
        );

        const planets = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'];
        const positions = {};

        for (const planet of planets) {
            const equ = Astronomy.Equator(planet, dateTime, observer, false, false);
            const horz = Astronomy.Horizon(dateTime, observer, equ.ra, equ.dec, 'normal');
            const elong = Astronomy.Elongation(planet, dateTime);

            positions[planet] = {
                rightAscension: equ.ra,
                declination: equ.dec,
                elongation: elong.elongation,
                altitude: horz.altitude,
                azimuth: horz.azimuth
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Horoscope generated successfully',
                date: dateTime.toISOString(),
                location: location,
                planetaryPositions: positions
            }),
        };
    } catch (error) {
        console.error('Error details:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error generating horoscope',
                error: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            }),
        };
    }
};
